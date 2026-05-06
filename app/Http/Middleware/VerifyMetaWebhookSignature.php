<?php

namespace App\Http\Middleware;

use App\Enums\SecurityIncidentTypeEnum;
use App\Services\SecurityIncidentService;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

/**
 * Valida a assinatura X-Hub-Signature-256 enviada pela Meta nos webhooks
 * (WhatsApp Cloud API, Instagram Direct, Facebook Messenger).
 *
 * A Meta envia HMAC-SHA256 do raw body usando o app_secret. Como o sistema
 * tem múltiplos apps registrados (regular, embedded, coexistence — ver
 * config/services.meta.apps), aceitamos a assinatura se ela bater com
 * qualquer um dos app_secrets cadastrados.
 *
 * Fail-open só em ambiente local/testing quando nenhum secret está configurado;
 * em produção, ausência de secrets é fatal.
 */
class VerifyMetaWebhookSignature
{
    public function handle(Request $request, Closure $next): Response
    {
        $signature = $request->header('X-Hub-Signature-256', '');
        $body = $request->getContent();

        $secrets = $this->collectSecrets();

        if (empty($secrets)) {
            if (app()->environment('local', 'testing')) {
                Log::warning('Meta webhook: no app_secrets configured — skipping HMAC verification (dev mode)');
                return $next($request);
            }

            Log::error('Meta webhook: no META_APP_SECRET configured in production', [
                'path' => $request->path(),
            ]);
            abort(500, 'Webhook signature verification not configured');
        }

        if (empty($signature) || !str_starts_with($signature, 'sha256=')) {
            app(SecurityIncidentService::class)->record(
                type: SecurityIncidentTypeEnum::INVALID_WEBHOOK_SIGNATURE,
                metadata: [
                    'reason' => empty($signature) ? 'missing_header' : 'malformed_header',
                    'has_header' => !empty($signature),
                ],
            );
            abort(401, 'Invalid webhook signature');
        }

        foreach ($secrets as $secret) {
            $expected = 'sha256=' . hash_hmac('sha256', $body, $secret);
            if (hash_equals($expected, $signature)) {
                return $next($request);
            }
        }

        app(SecurityIncidentService::class)->record(
            type: SecurityIncidentTypeEnum::INVALID_WEBHOOK_SIGNATURE,
            metadata: [
                'reason' => 'signature_mismatch',
                'body_size' => strlen($body),
                'secrets_tried' => count($secrets),
            ],
        );

        abort(401, 'Invalid webhook signature');
    }

    /**
     * Coleta todos os app_secrets registrados (regular + embedded + coexistence).
     * Deduplica para não tentar o mesmo secret várias vezes quando os apps
     * compartilham credenciais.
     *
     * @return array<int, string>
     */
    protected function collectSecrets(): array
    {
        $candidates = [
            config('services.meta.app_secret'),
            config('services.meta.embedded_app_secret'),
            config('services.meta.coexistence_app_secret'),
        ];

        foreach ((array) config('services.meta.apps', []) as $entry) {
            if (!empty($entry['app_secret'])) {
                $candidates[] = $entry['app_secret'];
            }
        }

        return array_values(array_unique(array_filter($candidates)));
    }
}
