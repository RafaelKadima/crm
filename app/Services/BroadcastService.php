<?php

namespace App\Services;

use App\Enums\BroadcastMessageStatusEnum;
use App\Enums\BroadcastStatusEnum;
use App\Enums\WhatsAppTemplateStatusEnum;
use App\Jobs\ProcessBroadcastJob;
use App\Models\Broadcast;
use App\Models\BroadcastMessage;
use App\Models\Channel;
use App\Models\Contact;
use App\Models\Lead;
use App\Models\User;
use App\Models\WhatsAppTemplate;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class BroadcastService
{
    /**
     * Resolve destinatários únicos baseado nos filtros.
     * Vendedores só veem seus próprios leads; admin/gestor veem todos.
     */
    public function resolveRecipients(array $filters, User $user): Collection
    {
        $query = Lead::where('tenant_id', $user->tenant_id)
            ->whereHas('contact', fn ($q) => $q->whereNotNull('phone')->where('phone', '!=', ''));

        // Vendedor só pode enviar para leads que é responsável
        if (!$user->isAdmin() && !$user->isGestor()) {
            $query->where('owner_id', $user->id);
        }

        if (!empty($filters['pipeline_id'])) {
            $query->where('pipeline_id', $filters['pipeline_id']);
        }

        if (!empty($filters['stage_id'])) {
            $query->where('stage_id', $filters['stage_id']);
        }

        if (!empty($filters['owner_id'])) {
            $query->where('owner_id', $filters['owner_id']);
        }

        if (!empty($filters['channel_id'])) {
            $query->where('channel_id', $filters['channel_id']);
        }

        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        // Busca contacts únicos (mesmo contato pode ter vários leads)
        $contactIds = $query->pluck('contact_id')->unique();

        return Contact::whereIn('id', $contactIds)
            ->whereNotNull('phone')
            ->where('phone', '!=', '')
            ->get();
    }

    /**
     * Preview dos filtros — retorna todos os contatos para seleção.
     */
    public function previewRecipients(array $filters, User $user): array
    {
        $contacts = $this->resolveRecipients($filters, $user);

        return [
            'total' => $contacts->count(),
            'contacts' => $contacts->map(fn (Contact $c) => [
                'id' => $c->id,
                'name' => $c->name,
                'phone' => $c->phone,
            ])->values()->all(),
        ];
    }

    /**
     * Cria um broadcast com todos os recipients como PENDING.
     */
    public function createBroadcast(array $data, User $user): Broadcast
    {
        $template = WhatsAppTemplate::findOrFail($data['whatsapp_template_id']);

        if ($template->status !== WhatsAppTemplateStatusEnum::APPROVED) {
            throw new \InvalidArgumentException('Template precisa estar aprovado para uso em broadcast.');
        }

        $channel = Channel::findOrFail($data['channel_id']);

        if ($channel->type->value !== 'whatsapp') {
            throw new \InvalidArgumentException('Canal precisa ser WhatsApp para broadcasts.');
        }

        $contacts = $this->resolveRecipients($data['filters'] ?? [], $user);

        // Se contact_ids fornecidos, filtra apenas os selecionados
        if (!empty($data['contact_ids'])) {
            $selectedIds = collect($data['contact_ids']);
            $contacts = $contacts->filter(fn (Contact $c) => $selectedIds->contains($c->id));
        }

        if ($contacts->isEmpty()) {
            throw new \InvalidArgumentException('Nenhum contato selecionado para o broadcast.');
        }

        return DB::transaction(function () use ($data, $user, $contacts) {
            $broadcast = Broadcast::create([
                'tenant_id' => $user->tenant_id,
                'channel_id' => $data['channel_id'],
                'created_by' => $user->id,
                'whatsapp_template_id' => $data['whatsapp_template_id'],
                'name' => $data['name'],
                'filters' => $data['filters'] ?? [],
                'template_variables' => $data['template_variables'] ?? [],
                'status' => BroadcastStatusEnum::DRAFT,
                'total_recipients' => $contacts->count(),
            ]);

            // Cria mensagens individuais em batch
            $messages = $contacts->map(fn (Contact $contact) => [
                'id' => (string) \Illuminate\Support\Str::uuid(),
                'broadcast_id' => $broadcast->id,
                'contact_id' => $contact->id,
                'phone' => $contact->phone,
                'status' => BroadcastMessageStatusEnum::PENDING->value,
                'created_at' => now(),
                'updated_at' => now(),
            ])->all();

            // Insert em chunks para não estourar memória
            foreach (array_chunk($messages, 500) as $chunk) {
                BroadcastMessage::insert($chunk);
            }

            return $broadcast;
        });
    }

    /**
     * Inicia o envio de um broadcast.
     */
    public function startBroadcast(Broadcast $broadcast): void
    {
        if (!$broadcast->status->canStart()) {
            throw new \InvalidArgumentException("Broadcast não pode ser iniciado no status {$broadcast->status->value}.");
        }

        $broadcast->update([
            'status' => BroadcastStatusEnum::SENDING,
            'started_at' => $broadcast->started_at ?? now(),
        ]);

        ProcessBroadcastJob::dispatch($broadcast);
    }

    /**
     * Pausa o envio.
     */
    public function pauseBroadcast(Broadcast $broadcast): void
    {
        if (!$broadcast->status->canPause()) {
            throw new \InvalidArgumentException("Broadcast não pode ser pausado no status {$broadcast->status->value}.");
        }

        $broadcast->update(['status' => BroadcastStatusEnum::PAUSED]);
    }

    /**
     * Cancela o broadcast.
     */
    public function cancelBroadcast(Broadcast $broadcast): void
    {
        if (!$broadcast->status->canCancel()) {
            throw new \InvalidArgumentException("Broadcast não pode ser cancelado no status {$broadcast->status->value}.");
        }

        $broadcast->update(['status' => BroadcastStatusEnum::CANCELLED]);
    }
}
