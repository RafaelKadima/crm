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

        foreach ($secrets as $candidate) {
            $expected = 'sha256=' . hash_hmac('sha256', $body, $candidate['secret']);
            if (hash_equals($expected, $signature)) {
                Log::info('Meta webhook signature verified', [
                    'app_ids' => $candidate['app_ids'],
                    'labels' => $candidate['labels'],
                ]);
                return $next($request);
            }
        }

        // Falha: enumera quais apps foram tentados (não os secrets) pra dar
        // pista direta no observability — ex.: se aparece só [regular,embedded]
        // e a integration ativa é coexistence, falta o META_COEXISTENCE_APP_SECRET.
        $appIdsTried = array_values(array_unique(array_merge(...array_column($secrets, 'app_ids'))));
        $labelsTried = array_values(array_unique(array_merge(...array_column($secrets, 'labels'))));

        app(SecurityIncidentService::class)->record(
            type: SecurityIncidentTypeEnum::INVALID_WEBHOOK_SIGNATURE,
            metadata: [
                'reason' => 'signature_mismatch',
                'body_size' => strlen($body),
                'app_ids_tried' => $appIdsTried,
                'labels_tried' => $labelsTried,
                'secrets_count' => count($secrets),
            ],
        );

        abort(401, 'Invalid webhook signature');
    }

    /**
     * Coleta candidates {secret, app_ids[], labels[]} para verificação.
     *
     * Source primária é o registry `services.meta.apps` (já keyed por app_id e
     * filtrado pra entries com secret presente). Fallback pros campos diretos
     * só quando o registry está vazio — útil em testing isolado, não em prod.
     *
     * Dedup é por secret: dois apps configurados com o mesmo segredo (caso
     * comum em dev quando embedded faz fallback pro regular) viram um único
     * candidate com app_ids/labels agregados.
     *
     * @return array<int, array{secret: string, app_ids: list<string>, labels: list<string>}>
     */
    protected function collectSecrets(): array
    {
        $candidates = [];

        foreach ((array) config('services.meta.apps', []) as $appId => $entry) {
            if (!empty($entry['app_secret'])) {
                $candidates[] = [
                    'secret' => $entry['app_secret'],
                    'app_id' => (string) $appId,
                    'labels' => $entry['labels'] ?? [],
                ];
            }
        }

        if (empty($candidates)) {
            $direct = [
                'regular' => config('services.meta.app_secret'),
                'embedded' => config('services.meta.embedded_app_secret'),
                'coexistence' => config('services.meta.coexistence_app_secret'),
            ];
            foreach ($direct as $label => $secret) {
                if (!empty($secret)) {
                    $candidates[] = [
                        'secret' => $secret,
                        'app_id' => 'unknown',
                        'labels' => [$label],
                    ];
                }
            }
        }

        $bySecret = [];
        foreach ($candidates as $c) {
            $k = $c['secret'];
            if (!isset($bySecret[$k])) {
                $bySecret[$k] = ['secret' => $k, 'app_ids' => [], 'labels' => []];
            }
            if ($c['app_id'] !== '' && !in_array($c['app_id'], $bySecret[$k]['app_ids'], true)) {
                $bySecret[$k]['app_ids'][] = $c['app_id'];
            }
            foreach ($c['labels'] as $l) {
                if (!in_array($l, $bySecret[$k]['labels'], true)) {
                    $bySecret[$k]['labels'][] = $l;
                }
            }
        }

        return array_values($bySecret);
    }
}
