<?php

namespace App\Services;

use App\Enums\MessageDirectionEnum;
use App\Enums\SenderTypeEnum;
use App\Events\TicketMessageCreated;
use App\Models\Channel;
use App\Models\StepReply;
use App\Models\StepReplyExecution;
use App\Models\StepReplyStep;
use App\Models\Ticket;
use App\Models\TicketMessage;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * State machine engine pra StepReplies. Métodos públicos:
 *
 *   start(StepReply, Ticket): StepReplyExecution
 *     Inicia uma execução, executa steps automáticos até parar num
 *     wait_input/branch ou terminal.
 *
 *   handleInbound(TicketMessage, Ticket, Channel): bool
 *     Verifica se ticket tem execução running; se sim, avança a
 *     máquina com o input. Retorna true se "consumiu" o inbound
 *     (caller deve skipar AutoReply/AI).
 *
 *   findTriggeredFlow(string $body, Ticket, Channel): ?StepReply
 *     Procura step_reply ativo que bate com keyword inbound (trigger).
 *
 *   timeoutCheck(): int
 *     Marca execuções com wait_input estouradas como timed_out.
 *     Chamado pelo scheduler (próximo sprint).
 *
 * Conceito de "step automático" = qualquer step que não pausa
 * (send_message, condition, end, handoff_human). Após executá-lo,
 * o engine roda o próximo na mesma chamada. Loop para em wait_input
 * ou branch (que esperam input do cliente).
 *
 * Proteção contra loop infinito: max 50 steps por dispatch.
 */
class StepReplyEngine
{
    private const MAX_STEPS_PER_RUN = 50;

    /**
     * Inicia execução de um fluxo num ticket. Cancela qualquer
     * execução pendente do mesmo ticket.
     */
    public function start(StepReply $flow, Ticket $ticket): ?StepReplyExecution
    {
        $first = $flow->firstStep();
        if (!$first) {
            Log::warning('StepReply: flow without steps', ['flow_id' => $flow->id]);
            return null;
        }

        // Cancela executions ativas anteriores do mesmo ticket
        StepReplyExecution::query()
            ->where('ticket_id', $ticket->id)
            ->where('status', StepReplyExecution::STATUS_RUNNING)
            ->update([
                'status' => StepReplyExecution::STATUS_CANCELLED,
                'ended_at' => now(),
            ]);

        $execution = StepReplyExecution::create([
            'tenant_id' => $ticket->tenant_id,
            'ticket_id' => $ticket->id,
            'step_reply_id' => $flow->id,
            'current_step_id' => $first->id,
            'context' => [],
            'status' => StepReplyExecution::STATUS_RUNNING,
            'started_at' => now(),
            'last_advanced_at' => now(),
        ]);

        $this->advance($execution, $ticket);

        return $execution->fresh();
    }

    /**
     * Processa inbound em ticket que pode ter execução running.
     * Retorna true se consumiu o input.
     */
    public function handleInbound(TicketMessage $inbound, Ticket $ticket, Channel $channel): bool
    {
        $execution = StepReplyExecution::query()
            ->where('ticket_id', $ticket->id)
            ->where('status', StepReplyExecution::STATUS_RUNNING)
            ->latest('started_at')
            ->first();

        if (!$execution || !$execution->currentStep) {
            return false;
        }

        $current = $execution->currentStep;
        if (!$current->isWaitingType()) {
            // Engine não estava esperando input — não consome
            return false;
        }

        $body = trim((string) $inbound->message);
        $this->captureInput($execution, $current, $body);

        $execution->update(['last_advanced_at' => now()]);
        $this->advanceFromStep($execution, $ticket, $current, $body);

        return true;
    }

    /**
     * Encontra um StepReply com trigger=keyword cujo trigger_config
     * bate com o inbound. Filtros tenant + channel + queue.
     */
    public function findTriggeredFlow(string $body, Ticket $ticket, Channel $channel): ?StepReply
    {
        $body = trim($body);
        if ($body === '') {
            return null;
        }

        $queueId = $ticket->lead?->queue_id;

        $candidates = StepReply::query()
            ->where('tenant_id', $channel->tenant_id)
            ->where('is_active', true)
            ->where('trigger_type', StepReply::TRIGGER_KEYWORD)
            ->where(fn ($q) => $q->whereNull('channel_id')->orWhere('channel_id', $channel->id))
            ->where(function ($q) use ($queueId) {
                $q->whereNull('queue_id');
                if ($queueId) {
                    $q->orWhere('queue_id', $queueId);
                }
            })
            ->orderByDesc('priority')
            ->orderBy('created_at')
            ->get();

        foreach ($candidates as $flow) {
            if ($this->triggerMatches($body, $flow->trigger_config ?? [])) {
                return $flow;
            }
        }

        return null;
    }

    /**
     * Cancela execuções com wait_input/branch que excederam o
     * timeout configurado. Retorna número de execuções afetadas.
     */
    public function timeoutCheck(): int
    {
        $count = 0;

        StepReplyExecution::query()
            ->with('currentStep')
            ->where('status', StepReplyExecution::STATUS_RUNNING)
            ->orderBy('last_advanced_at')
            ->chunkById(100, function ($executions) use (&$count) {
                foreach ($executions as $execution) {
                    $step = $execution->currentStep;
                    if (!$step || !$step->isWaitingType()) {
                        continue;
                    }

                    $timeout = (int) ($step->config['timeout_seconds'] ?? 0);
                    if ($timeout <= 0) {
                        continue;
                    }

                    if ($execution->last_advanced_at->addSeconds($timeout)->isPast()) {
                        $execution->update([
                            'status' => StepReplyExecution::STATUS_TIMED_OUT,
                            'ended_at' => now(),
                        ]);
                        $count++;
                    }
                }
            });

        return $count;
    }

    // ─────────────────────────────────────────────────────────────
    // Internals
    // ─────────────────────────────────────────────────────────────

    protected function triggerMatches(string $body, array $config): bool
    {
        $keywords = $config['keywords'] ?? [];
        $matchType = $config['match_type'] ?? 'contains';
        if (empty($keywords)) {
            return false;
        }

        $bodyLower = mb_strtolower($body);
        foreach ($keywords as $kw) {
            $needle = mb_strtolower(trim((string) $kw));
            if ($needle === '') {
                continue;
            }
            if ($matchType === 'exact' && $bodyLower === $needle) {
                return true;
            }
            if ($matchType === 'contains' && mb_strpos($bodyLower, $needle) !== false) {
                return true;
            }
        }
        return false;
    }

    /**
     * Captura input do cliente conforme o tipo do step atual.
     */
    protected function captureInput(StepReplyExecution $execution, StepReplyStep $step, string $body): void
    {
        $context = $execution->context ?? [];

        if ($step->type === StepReplyStep::TYPE_WAIT_INPUT) {
            $field = $step->config['save_to_field'] ?? null;
            if ($field) {
                $context[$field] = $body;
            }
            $context['_last_input'] = $body;
        }

        if ($step->type === StepReplyStep::TYPE_BRANCH) {
            $context['_last_branch_input'] = $body;
        }

        $execution->update(['context' => $context]);
    }

    /**
     * Avança a partir do step atual após captura de input. Se for
     * branch, escolhe target_step_order baseado na resposta. Se for
     * wait_input, segue linearmente pro próximo.
     */
    protected function advanceFromStep(
        StepReplyExecution $execution,
        Ticket $ticket,
        StepReplyStep $current,
        string $body,
    ): void {
        $next = null;

        if ($current->type === StepReplyStep::TYPE_BRANCH) {
            $next = $this->resolveBranchTarget($current, $body);
        }

        if (!$next) {
            $next = $this->nextLinearStep($current);
        }

        if (!$next) {
            // Sem próximo step → completa execução
            $execution->update([
                'status' => StepReplyExecution::STATUS_COMPLETED,
                'ended_at' => now(),
            ]);
            return;
        }

        $execution->update(['current_step_id' => $next->id]);
        $this->advance($execution->fresh(), $ticket);
    }

    /**
     * Loop de execução de steps automáticos. Para em wait/branch ou
     * terminal. Hard cap de MAX_STEPS_PER_RUN.
     */
    protected function advance(StepReplyExecution $execution, Ticket $ticket): void
    {
        $iterations = 0;
        $current = $execution->currentStep;

        while ($current && $iterations++ < self::MAX_STEPS_PER_RUN) {
            try {
                $next = $this->execute($execution, $ticket, $current);
            } catch (\Throwable $e) {
                Log::error('StepReplyEngine: step execution failed', [
                    'execution_id' => $execution->id,
                    'step_id' => $current->id,
                    'error' => $e->getMessage(),
                ]);
                $execution->update([
                    'status' => StepReplyExecution::STATUS_CANCELLED,
                    'ended_at' => now(),
                ]);
                return;
            }

            if ($current->isTerminalType()) {
                $execution->update([
                    'status' => $current->type === StepReplyStep::TYPE_HANDOFF_HUMAN
                        ? StepReplyExecution::STATUS_HANDED_OFF
                        : StepReplyExecution::STATUS_COMPLETED,
                    'ended_at' => now(),
                ]);
                return;
            }

            if ($current->isWaitingType()) {
                // Para aqui, espera próximo inbound
                return;
            }

            if (!$next) {
                $execution->update([
                    'status' => StepReplyExecution::STATUS_COMPLETED,
                    'ended_at' => now(),
                ]);
                return;
            }

            $execution->update([
                'current_step_id' => $next->id,
                'last_advanced_at' => now(),
            ]);

            $current = $next;
            $execution = $execution->fresh();
        }

        if ($iterations >= self::MAX_STEPS_PER_RUN) {
            Log::warning('StepReplyEngine: max steps reached, halting', [
                'execution_id' => $execution->id,
            ]);
            $execution->update([
                'status' => StepReplyExecution::STATUS_CANCELLED,
                'ended_at' => now(),
            ]);
        }
    }

    /**
     * Executa um step e retorna o próximo (ou null pra parar).
     */
    protected function execute(
        StepReplyExecution $execution,
        Ticket $ticket,
        StepReplyStep $step,
    ): ?StepReplyStep {
        $config = $step->config ?? [];

        switch ($step->type) {
            case StepReplyStep::TYPE_SEND_MESSAGE:
                $this->actionSendMessage($execution, $ticket, $config);
                return $this->nextLinearStep($step);

            case StepReplyStep::TYPE_BRANCH:
                $this->actionSendBranchPrompt($execution, $ticket, $config);
                return null; // pausa, espera input

            case StepReplyStep::TYPE_WAIT_INPUT:
                return null; // pausa imediata

            case StepReplyStep::TYPE_CONDITION:
                return $this->resolveCondition($step, $execution);

            case StepReplyStep::TYPE_HANDOFF_HUMAN:
                $this->actionHandoffHuman($ticket, $config);
                return null;

            case StepReplyStep::TYPE_END:
                if (!empty($config['message'])) {
                    $this->sendText($ticket, (string) $config['message']);
                }
                return null;
        }

        return null;
    }

    protected function actionSendMessage(StepReplyExecution $execution, Ticket $ticket, array $config): void
    {
        $text = $this->interpolate($config['text'] ?? '', $execution->context ?? []);
        if ($text === '' && empty($config['media_url'])) {
            return;
        }

        $channel = $ticket->channel;
        if (!$channel) return;

        /** @var WhatsAppService $whatsApp */
        $whatsApp = app(WhatsAppService::class)->loadFromChannel($channel);

        if (!empty($config['media_url'])) {
            $whatsApp->sendMediaMessage(
                $ticket->contact->phone,
                $config['media_url'],
                $config['media_type'] ?? 'image',
                $text,
            );
        } else {
            $whatsApp->sendTextMessage($ticket->contact->phone, $text);
        }

        $this->persistOutbound($ticket, $text, [
            'step_reply_execution_id' => $execution->id,
            'media_url' => $config['media_url'] ?? null,
            'media_type' => $config['media_type'] ?? null,
        ]);
    }

    protected function actionSendBranchPrompt(StepReplyExecution $execution, Ticket $ticket, array $config): void
    {
        $prompt = $this->interpolate($config['prompt'] ?? '', $execution->context ?? []);
        $options = $config['options'] ?? [];

        if (empty($options)) {
            return;
        }

        $channel = $ticket->channel;
        if (!$channel || !$ticket->contact?->phone) return;

        /** @var \App\Services\WhatsAppService $whatsApp */
        $whatsApp = app(\App\Services\WhatsAppService::class)->loadFromChannel($channel);
        $phone = $ticket->contact->phone;

        // Cloud API Interactive Lists suporta até 10 rows. Usa quando
        // possível pra ter UI nativa (chip clicável → drawer); cai no
        // texto numerado simples como fallback.
        $isWhatsapp = $channel->type instanceof \App\Enums\ChannelTypeEnum
            ? $channel->type === \App\Enums\ChannelTypeEnum::WHATSAPP
            : (string) $channel->type === 'whatsapp';

        if ($isWhatsapp && count($options) <= 10 && !($config['force_text'] ?? false)) {
            try {
                $rows = array_map(function ($opt, $i) {
                    return [
                        'id' => (string) ($opt['value'] ?? $i + 1),
                        'title' => (string) ($opt['label'] ?? "Opção " . ($i + 1)),
                        'description' => $opt['description'] ?? null,
                    ];
                }, $options, array_keys($options));

                $whatsApp->sendInteractiveList(
                    to: $phone,
                    body: $prompt !== '' ? $prompt : 'Escolha uma opção',
                    buttonText: $config['button_text'] ?? 'Ver opções',
                    rows: $rows,
                    header: $config['header'] ?? null,
                    footer: $config['footer'] ?? null,
                );

                // Persiste como TicketMessage com snapshot pra histórico
                $persistedText = $prompt . "\n" . collect($options)
                    ->map(fn ($o, $i) => "• " . ($o['label'] ?? "Opção " . ($i + 1)))
                    ->implode("\n");

                $this->persistOutbound($ticket, $persistedText, [
                    'step_reply_execution_id' => $execution->id,
                    'branch_prompt' => true,
                    'interactive' => true,
                ]);
                return;
            } catch (\Throwable $e) {
                Log::warning('Interactive list failed, falling back to text', [
                    'execution_id' => $execution->id,
                    'error' => $e->getMessage(),
                ]);
                // continua no fallback de texto
            }
        }

        // Fallback: texto numerado (sempre funciona, sem dependência de
        // canal/feature support)
        $lines = [$prompt, ''];
        foreach ($options as $i => $opt) {
            $label = $opt['label'] ?? "Opção " . ($i + 1);
            $value = $opt['value'] ?? ($i + 1);
            $lines[] = "{$value}. {$label}";
        }
        $text = implode("\n", $lines);

        $whatsApp->sendTextMessage($phone, $text);

        $this->persistOutbound($ticket, $text, [
            'step_reply_execution_id' => $execution->id,
            'branch_prompt' => true,
        ]);
    }

    protected function actionHandoffHuman(Ticket $ticket, array $config): void
    {
        if (!empty($config['message'])) {
            $this->sendText($ticket, $this->interpolate((string) $config['message'], []));
        }

        $updates = [];
        if (!empty($config['queue_id'])) {
            $updates['ia_enabled'] = false;
        }
        if (!empty($updates)) {
            $ticket->update($updates);
        }
    }

    protected function resolveBranchTarget(StepReplyStep $step, string $body): ?StepReplyStep
    {
        $options = $step->config['options'] ?? [];
        $bodyTrim = trim($body);

        foreach ($options as $opt) {
            $value = (string) ($opt['value'] ?? '');
            if ($value !== '' && $bodyTrim === $value) {
                $targetOrder = $opt['target_step_order'] ?? null;
                if ($targetOrder) {
                    return $this->stepByOrder($step->step_reply_id, (int) $targetOrder);
                }
            }
        }

        // Default fallback se configurado
        $fallback = $step->config['default_step_order'] ?? null;
        if ($fallback) {
            return $this->stepByOrder($step->step_reply_id, (int) $fallback);
        }

        return null;
    }

    protected function resolveCondition(StepReplyStep $step, StepReplyExecution $execution): ?StepReplyStep
    {
        $config = $step->config ?? [];
        $field = $config['field'] ?? '';
        $operator = $config['operator'] ?? 'equals';
        $expected = $config['value'] ?? null;

        $actual = data_get($execution->context ?? [], str_replace('context.', '', $field));

        $result = match ($operator) {
            'equals' => (string) $actual === (string) $expected,
            'contains' => $actual !== null && str_contains((string) $actual, (string) $expected),
            'gt' => is_numeric($actual) && is_numeric($expected) && (float) $actual > (float) $expected,
            'lt' => is_numeric($actual) && is_numeric($expected) && (float) $actual < (float) $expected,
            'empty' => empty($actual),
            'not_empty' => !empty($actual),
            default => false,
        };

        $targetOrder = $result
            ? ($config['true_step_order'] ?? null)
            : ($config['false_step_order'] ?? null);

        if (!$targetOrder) {
            return $this->nextLinearStep($step);
        }

        return $this->stepByOrder($step->step_reply_id, (int) $targetOrder);
    }

    protected function nextLinearStep(StepReplyStep $step): ?StepReplyStep
    {
        return StepReplyStep::query()
            ->where('step_reply_id', $step->step_reply_id)
            ->where('order', '>', $step->order)
            ->orderBy('order')
            ->first();
    }

    protected function stepByOrder(string $flowId, int $order): ?StepReplyStep
    {
        return StepReplyStep::query()
            ->where('step_reply_id', $flowId)
            ->where('order', $order)
            ->first();
    }

    /**
     * Substitui {{var}} pelo conteúdo do context. Suporta caminhos
     * dot-notation: {{foo.bar}}.
     */
    protected function interpolate(string $template, array $context): string
    {
        return preg_replace_callback('/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/', function ($m) use ($context) {
            $val = data_get($context, $m[1], '');
            return is_scalar($val) ? (string) $val : '';
        }, $template);
    }

    protected function persistOutbound(Ticket $ticket, string $text, array $metadata): void
    {
        $message = TicketMessage::create([
            'tenant_id' => $ticket->tenant_id,
            'ticket_id' => $ticket->id,
            'sender_type' => SenderTypeEnum::SYSTEM,
            'direction' => MessageDirectionEnum::OUTBOUND,
            'message' => $text,
            'metadata' => $metadata,
            'sent_at' => now(),
        ]);
        event(new TicketMessageCreated($message, $ticket));
    }

    protected function sendText(Ticket $ticket, string $text): void
    {
        $channel = $ticket->channel;
        if (!$channel || !$ticket->contact?->phone) {
            return;
        }
        /** @var WhatsAppService $whatsApp */
        $whatsApp = app(WhatsAppService::class)->loadFromChannel($channel);
        $whatsApp->sendTextMessage($ticket->contact->phone, $text);
        $this->persistOutbound($ticket, $text, ['step_reply_internal' => true]);
    }
}
