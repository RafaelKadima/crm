<?php

namespace App\Console\Commands;

use App\Models\MetaIntegration;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;

/**
 * Audita os escopos OAuth dos tokens das MetaIntegration ativas.
 *
 * Objetivo:
 *  - Tenants em coexistência muitas vezes recebem só `whatsapp_business_messaging`
 *    no token, e por isso `POST /{WABA_ID}/message_templates` devolve "(#100)
 *    Need permission on either WhatsApp Business Account".
 *  - Este comando consulta o endpoint `/debug_token` da Graph API pra cada
 *    integração e grava o resultado em `meta_integrations.scopes` +
 *    `meta_integrations.metadata.scope_audit`, permitindo decidir antes de
 *    chamar `/message_templates` se a integração tem ou não permissão.
 *
 * Uso:
 *   php artisan whatsapp:audit-template-scopes
 *   php artisan whatsapp:audit-template-scopes --tenant=UUID
 *   php artisan whatsapp:audit-template-scopes --only-coexistence
 *   php artisan whatsapp:audit-template-scopes --dry-run
 */
class AuditWhatsAppTemplateScopesCommand extends Command
{
    protected $signature = 'whatsapp:audit-template-scopes
        {--tenant= : Limita a auditoria a um tenant_id específico}
        {--only-coexistence : Audita apenas integrações marcadas como coexistence}
        {--dry-run : Não persiste o resultado, só exibe a tabela}';

    protected $description = 'Audita escopos OAuth das MetaIntegration e identifica quais tokens podem criar templates via API.';

    /**
     * Permissão obrigatória para `POST /{WABA_ID}/message_templates`.
     */
    private const REQUIRED_TEMPLATE_SCOPE = 'whatsapp_business_management';

    /**
     * Permissão de envio (validação adicional — espera-se sempre presente).
     */
    private const REQUIRED_MESSAGING_SCOPE = 'whatsapp_business_messaging';

    public function handle(): int
    {
        $appId = config('services.meta.app_id');
        $appSecret = config('services.meta.app_secret');
        $apiVersion = config('services.meta.api_version', 'v22.0');

        if (!$appId || !$appSecret) {
            $this->error('META_APP_ID / META_APP_SECRET não configurados em config/services.php → meta.');
            return self::FAILURE;
        }

        $appAccessToken = "{$appId}|{$appSecret}";
        $debugUrl = "https://graph.facebook.com/{$apiVersion}/debug_token";

        $query = MetaIntegration::withoutGlobalScopes()->active();

        if ($tenantId = $this->option('tenant')) {
            $query->where('tenant_id', $tenantId);
        }

        if ($this->option('only-coexistence')) {
            $query->coexistence();
        }

        $integrations = $query->get();

        if ($integrations->isEmpty()) {
            $this->warn('Nenhuma MetaIntegration ativa encontrada com os filtros informados.');
            return self::SUCCESS;
        }

        $this->info("Auditando {$integrations->count()} integração(ões)...");
        $this->newLine();

        $rows = [];
        $okCount = 0;
        $needsReauthCount = 0;
        $errorCount = 0;

        foreach ($integrations as $integration) {
            $userToken = $integration->access_token;

            if (empty($userToken)) {
                $rows[] = $this->buildRow($integration, null, 'sem_token', 'access_token vazio');
                $errorCount++;
                continue;
            }

            try {
                $response = Http::timeout(15)->get($debugUrl, [
                    'input_token' => $userToken,
                    'access_token' => $appAccessToken,
                ]);

                if (!$response->successful()) {
                    $rows[] = $this->buildRow(
                        $integration,
                        null,
                        'http_error',
                        "HTTP {$response->status()}: " . ($response->json('error.message') ?? 'erro Graph API')
                    );
                    $errorCount++;
                    continue;
                }

                $data = $response->json('data') ?? [];
                $scopes = $data['scopes'] ?? [];
                $isValid = (bool) ($data['is_valid'] ?? false);
                $expiresAt = isset($data['expires_at']) && $data['expires_at'] > 0
                    ? \Carbon\Carbon::createFromTimestamp($data['expires_at'])
                    : null;

                $hasManagement = in_array(self::REQUIRED_TEMPLATE_SCOPE, $scopes, true);
                $hasMessaging = in_array(self::REQUIRED_MESSAGING_SCOPE, $scopes, true);

                $auditResult = [
                    'audited_at' => now()->toIso8601String(),
                    'is_valid' => $isValid,
                    'has_management' => $hasManagement,
                    'has_messaging' => $hasMessaging,
                    'can_manage_templates' => $hasManagement && $isValid,
                    'scopes' => $scopes,
                    'expires_at' => $expiresAt?->toIso8601String(),
                ];

                if (!$this->option('dry-run')) {
                    $integration->scopes = $scopes;
                    $metadata = $integration->metadata ?? [];
                    $metadata['scope_audit'] = $auditResult;
                    $integration->metadata = $metadata;
                    $integration->save();
                }

                if (!$isValid) {
                    $rows[] = $this->buildRow($integration, $auditResult, 'invalid', 'token reportado como inválido pela Meta');
                    $needsReauthCount++;
                    continue;
                }

                if ($hasManagement) {
                    $rows[] = $this->buildRow($integration, $auditResult, 'ok', 'pode criar templates via API');
                    $okCount++;
                } else {
                    $rows[] = $this->buildRow(
                        $integration,
                        $auditResult,
                        'needs_reauth',
                        'falta permissão whatsapp_business_management — reconecte com escopo completo'
                    );
                    $needsReauthCount++;
                }
            } catch (\Throwable $e) {
                $rows[] = $this->buildRow($integration, null, 'exception', $e->getMessage());
                $errorCount++;
            }
        }

        $this->table(
            ['Tenant', 'Phone Number ID', 'Coex.', 'Status', 'Mgmt', 'Msg', 'Scopes', 'Observação'],
            $rows
        );

        $this->newLine();
        $this->info("Resumo: {$okCount} OK | {$needsReauthCount} precisam de reauth | {$errorCount} erros");

        if ($this->option('dry-run')) {
            $this->warn('[dry-run] Resultado NÃO foi persistido em meta_integrations.');
        } else {
            $this->info('Resultado persistido em meta_integrations.scopes e meta_integrations.metadata.scope_audit.');
        }

        return self::SUCCESS;
    }

    /**
     * Monta uma linha da tabela de saída.
     *
     * @param  array<string,mixed>|null  $audit
     */
    private function buildRow(MetaIntegration $integration, ?array $audit, string $status, string $note): array
    {
        $statusLabel = match ($status) {
            'ok' => '<fg=green>OK</>',
            'needs_reauth', 'invalid' => '<fg=yellow>REAUTH</>',
            default => '<fg=red>ERRO</>',
        };

        $scopesShort = '—';
        $hasMgmt = '—';
        $hasMsg = '—';

        if ($audit) {
            $hasMgmt = $audit['has_management'] ? '<fg=green>✓</>' : '<fg=red>✗</>';
            $hasMsg = $audit['has_messaging'] ? '<fg=green>✓</>' : '<fg=red>✗</>';

            // Mostra só o sufixo dos scopes pra caber na tabela.
            $shortNames = array_map(
                fn ($s) => str_replace(['whatsapp_business_', 'business_'], '', $s),
                $audit['scopes'] ?? []
            );
            $scopesShort = empty($shortNames) ? '∅' : implode(',', $shortNames);
        }

        return [
            substr((string) $integration->tenant_id, 0, 8) . '…',
            $integration->phone_number_id ?? '—',
            $integration->is_coexistence ? '<fg=cyan>sim</>' : 'não',
            $statusLabel,
            $hasMgmt,
            $hasMsg,
            $scopesShort,
            $note,
        ];
    }
}
