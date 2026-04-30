<?php

namespace Tests\Feature\Meta;

use App\Enums\MetaIntegrationStatusEnum;
use App\Models\MetaIntegration;
use App\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use RuntimeException;
use Tests\TestCase;

/**
 * Garante que o lookup de credenciais Meta App por integração funciona com o
 * registry config('services.meta.apps') — incluindo o cenário de 2 apps
 * (regular + coexistence) que motivou todo esse refactor.
 */
class MetaIntegrationCredentialsTest extends TestCase
{
    use RefreshDatabase;

    private const REGULAR_APP = ['app_id' => 'regular-app-123', 'app_secret' => 'regular-secret-xyz'];
    private const COEX_APP = ['app_id' => 'coex-app-456', 'app_secret' => 'coex-secret-abc'];

    protected function setUp(): void
    {
        parent::setUp();

        // Configura o registry com 2 apps distintos pra simular o cenário real.
        config([
            'services.meta.apps' => [
                self::REGULAR_APP['app_id'] => [
                    'app_secret' => self::REGULAR_APP['app_secret'],
                    'labels' => ['regular'],
                ],
                self::COEX_APP['app_id'] => [
                    'app_secret' => self::COEX_APP['app_secret'],
                    'labels' => ['coexistence'],
                ],
            ],
        ]);
    }

    private function createIntegration(string $metaAppId, bool $isCoexistence = false): MetaIntegration
    {
        $tenant = Tenant::create([
            'name' => 'Test Tenant',
            'slug' => 'test-tenant-' . uniqid(),
            'plan' => 'basic',
            'is_active' => true,
        ]);

        return MetaIntegration::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'phone_number_id' => 'phone-' . uniqid(),
            'waba_id' => 'waba-' . uniqid(),
            'business_id' => 'business-' . uniqid(),
            'access_token' => 'EAAtest' . uniqid(),
            'meta_app_id' => $metaAppId,
            'is_coexistence' => $isCoexistence,
            'status' => MetaIntegrationStatusEnum::ACTIVE,
        ]);
    }

    public function test_metaAppCredentials_devolve_credenciais_do_app_regular(): void
    {
        $integration = $this->createIntegration(self::REGULAR_APP['app_id']);

        $creds = $integration->metaAppCredentials();

        $this->assertSame(self::REGULAR_APP['app_id'], $creds['app_id']);
        $this->assertSame(self::REGULAR_APP['app_secret'], $creds['app_secret']);
    }

    public function test_metaAppCredentials_devolve_credenciais_do_app_coexistence_quando_meta_app_id_aponta_pra_ele(): void
    {
        $integration = $this->createIntegration(self::COEX_APP['app_id'], isCoexistence: true);

        $creds = $integration->metaAppCredentials();

        $this->assertSame(self::COEX_APP['app_id'], $creds['app_id']);
        $this->assertSame(self::COEX_APP['app_secret'], $creds['app_secret']);
    }

    public function test_metaAppCredentials_lanca_se_meta_app_id_for_null(): void
    {
        $integration = $this->createIntegration(self::REGULAR_APP['app_id']);
        $integration->meta_app_id = null;

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessageMatches('/sem meta_app_id/');

        $integration->metaAppCredentials();
    }

    public function test_metaAppCredentials_lanca_se_app_id_nao_existe_no_registry(): void
    {
        $integration = $this->createIntegration('app-orfao-789');

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessageMatches('/não está configurado em services\.meta\.apps/');

        $integration->metaAppCredentials();
    }

    public function test_metaAppAccessToken_concatena_app_id_e_secret_no_formato_da_graph_api(): void
    {
        $integration = $this->createIntegration(self::REGULAR_APP['app_id']);

        $this->assertSame(
            self::REGULAR_APP['app_id'] . '|' . self::REGULAR_APP['app_secret'],
            $integration->metaAppAccessToken()
        );
    }

    public function test_integracoes_com_meta_app_id_diferentes_devolvem_secrets_diferentes(): void
    {
        $regular = $this->createIntegration(self::REGULAR_APP['app_id']);
        $coex = $this->createIntegration(self::COEX_APP['app_id'], isCoexistence: true);

        // Esse é o cenário que estava quebrando produção — mesmo banco, mesmo
        // código, mas cada token resolve pro app correto.
        $this->assertNotSame(
            $regular->metaAppAccessToken(),
            $coex->metaAppAccessToken()
        );
    }
}
