<?php

namespace Tests\Feature\Middleware;

use App\Http\Middleware\VerifyMetaWebhookSignature;
use App\Models\SecurityIncident;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

/**
 * Garante que a verificação HMAC dos webhooks Meta:
 *  - Aceita assinatura de qualquer app_secret cadastrado no registry
 *  - Loga app_id/labels que bateram (observabilidade pra debug em prod)
 *  - Quando falha, registra app_ids_tried/labels_tried no incident — não só
 *    "secrets_tried: 2" sem identificar quais apps participaram
 *  - Deduplica quando dois apps compartilham o mesmo secret
 */
class VerifyMetaWebhookSignatureTest extends TestCase
{
    use RefreshDatabase;

    private const REGULAR = ['app_id' => 'app-regular-1', 'app_secret' => 'sec-regular-XYZ'];
    private const COEX = ['app_id' => 'app-coex-2', 'app_secret' => 'sec-coex-ABC'];

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'services.meta.apps' => [
                self::REGULAR['app_id'] => [
                    'app_secret' => self::REGULAR['app_secret'],
                    'labels' => ['regular'],
                ],
                self::COEX['app_id'] => [
                    'app_secret' => self::COEX['app_secret'],
                    'labels' => ['coexistence'],
                ],
            ],
        ]);

        Route::post('/_test/webhook', fn () => response()->json(['ok' => true]))
            ->middleware(VerifyMetaWebhookSignature::class);
    }

    private function sign(string $body, string $secret): string
    {
        return 'sha256=' . hash_hmac('sha256', $body, $secret);
    }

    public function test_signature_valida_do_app_regular_passa(): void
    {
        $body = json_encode(['object' => 'whatsapp_business_account']);
        $sig = $this->sign($body, self::REGULAR['app_secret']);

        $this->postJson('/_test/webhook', json_decode($body, true), [
            'X-Hub-Signature-256' => $sig,
        ])->assertOk();
    }

    public function test_signature_valida_do_app_coexistence_passa(): void
    {
        $body = json_encode(['object' => 'whatsapp_business_account']);
        $sig = $this->sign($body, self::COEX['app_secret']);

        $this->postJson('/_test/webhook', json_decode($body, true), [
            'X-Hub-Signature-256' => $sig,
        ])->assertOk();
    }

    public function test_signature_invalida_aborta_e_grava_incident_com_app_ids_tried(): void
    {
        $body = json_encode(['object' => 'whatsapp_business_account']);
        $sig = $this->sign($body, 'secret-que-nao-existe-em-lugar-nenhum');

        $this->postJson('/_test/webhook', json_decode($body, true), [
            'X-Hub-Signature-256' => $sig,
        ])->assertStatus(401);

        $incident = SecurityIncident::query()->latest('id')->first();
        $this->assertNotNull($incident, 'SecurityIncident deveria ter sido gravado');
        $this->assertSame('signature_mismatch', $incident->metadata['reason']);
        $this->assertEqualsCanonicalizing(
            [self::REGULAR['app_id'], self::COEX['app_id']],
            $incident->metadata['app_ids_tried'],
        );
        $this->assertEqualsCanonicalizing(
            ['regular', 'coexistence'],
            $incident->metadata['labels_tried'],
        );
        // Fingerprints pra debug sem expor secret/payload completo
        $this->assertSame(md5($body), $incident->metadata['body_md5']);
        $this->assertSame(substr($body, 0, 80), $incident->metadata['body_first_chars']);
        $this->assertSame(substr($sig, 0, 12), $incident->metadata['signature_prefix']);
        $this->assertCount(2, $incident->metadata['expected_prefixes']);
        foreach ($incident->metadata['expected_prefixes'] as $entry) {
            $this->assertSame(12, strlen($entry['expected']));
            $this->assertStringStartsWith('sha256=', $entry['expected']);
        }
    }

    public function test_header_ausente_aborta_com_incident_de_missing_header(): void
    {
        $this->postJson('/_test/webhook', ['object' => 'x'])
            ->assertStatus(401);

        $incident = SecurityIncident::query()->latest('id')->first();
        $this->assertSame('missing_header', $incident->metadata['reason']);
    }

    public function test_header_malformado_aborta(): void
    {
        $this->postJson('/_test/webhook', ['object' => 'x'], [
            'X-Hub-Signature-256' => 'not-sha256-prefix',
        ])->assertStatus(401);

        $incident = SecurityIncident::query()->latest('id')->first();
        $this->assertSame('malformed_header', $incident->metadata['reason']);
    }

    public function test_dedup_de_secret_compartilhado_entre_dois_apps(): void
    {
        // Cenário: dev local com embedded fazendo fallback pro regular —
        // mesmo secret em dois app_ids. O middleware deve tentar uma vez só
        // e o candidate carregar os dois app_ids agregados.
        $sharedSecret = 'shared-secret-DEDUP';
        config([
            'services.meta.apps' => [
                'app-A' => ['app_secret' => $sharedSecret, 'labels' => ['regular']],
                'app-B' => ['app_secret' => $sharedSecret, 'labels' => ['embedded']],
            ],
        ]);

        $body = json_encode(['object' => 'x']);
        $this->postJson('/_test/webhook', json_decode($body, true), [
            'X-Hub-Signature-256' => $this->sign($body, $sharedSecret),
        ])->assertOk();

        // E na falha, ambos os app_ids aparecem como tried.
        $this->postJson('/_test/webhook', json_decode($body, true), [
            'X-Hub-Signature-256' => $this->sign($body, 'wrong'),
        ])->assertStatus(401);

        $incident = SecurityIncident::query()->latest('id')->first();
        $this->assertEqualsCanonicalizing(['app-A', 'app-B'], $incident->metadata['app_ids_tried']);
        $this->assertSame(1, $incident->metadata['secrets_count']);
    }
}
