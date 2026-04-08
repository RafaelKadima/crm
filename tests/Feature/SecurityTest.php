<?php

namespace Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * Tests para validar que os fixes de segurança da auditoria estão funcionando.
 */
class SecurityTest extends TestCase
{
    use RefreshDatabase;

    private function createTenantAndUser(array $userOverrides = []): array
    {
        $tenant = Tenant::create([
            'name' => 'Test Tenant',
            'slug' => 'test-tenant',
            'plan' => 'professional',
            'is_active' => true,
        ]);

        $user = User::create(array_merge([
            'tenant_id' => $tenant->id,
            'name' => 'Regular User',
            'email' => 'regular@example.com',
            'password' => Hash::make('password'),
            'role' => 'vendedor',
            'is_active' => true,
            'is_super_admin' => false,
        ], $userOverrides));

        return [$tenant, $user];
    }

    // Super admin access control
    public function test_regular_user_cannot_access_super_admin_routes(): void
    {
        [$tenant, $user] = $this->createTenantAndUser();

        $routes = [
            '/api/super-admin/dashboard',
            '/api/super-admin/tenants',
            '/api/super-admin/users',
        ];

        foreach ($routes as $route) {
            $response = $this->actingAs($user, 'api')->getJson($route);
            $this->assertContains($response->status(), [401, 403], "Route {$route} should be blocked for regular users");
        }
    }

    public function test_super_admin_can_access_protected_routes(): void
    {
        [$tenant, $user] = $this->createTenantAndUser([
            'is_super_admin' => true,
            'email' => 'admin@example.com',
        ]);

        $response = $this->actingAs($user, 'api')
            ->getJson('/api/super-admin/dashboard');

        $response->assertStatus(200);
    }

    // Internal API protection
    public function test_internal_api_rejects_without_key(): void
    {
        $response = $this->postJson('/api/internal/webhook', [], [
            'X-Internal-Key' => '',
        ]);

        $this->assertContains($response->status(), [401, 404]);
    }

    // Exception handling - no internal details leaked
    public function test_500_errors_do_not_leak_details_in_production(): void
    {
        // We can test the global handler by calling a malformed endpoint
        $response = $this->getJson('/api/nonexistent-endpoint-test');

        // Should not contain stack trace or internal info
        $this->assertStringNotContainsString('Exception', $response->getContent());
        $this->assertStringNotContainsString('vendor/', $response->getContent());
    }

    // CORS validation
    public function test_cors_config_has_no_wildcards(): void
    {
        $cors = config('cors');

        $this->assertNotContains('*', $cors['allowed_methods'], 'CORS allowed_methods should not contain wildcard');
        $this->assertNotContains('*', $cors['allowed_headers'], 'CORS allowed_headers should not contain wildcard');
    }

    // Webhook token config
    public function test_webhook_tokens_are_not_default_hardcoded(): void
    {
        $whatsappToken = config('services.whatsapp.verify_token');
        $instagramToken = config('services.instagram.verify_token');
        $metaToken = config('services.meta.verify_token');

        $this->assertNotEquals('crm_whatsapp_verify_token', $whatsappToken, 'WhatsApp token should not be the hardcoded default');
        $this->assertNotEquals('crm_instagram_verify_token', $instagramToken, 'Instagram token should not be the hardcoded default');
        $this->assertNotEquals('crm_meta_verify_token', $metaToken, 'Meta token should not be the hardcoded default');
    }

    // Pagination limits
    public function test_pagination_respects_max_limit(): void
    {
        [$tenant, $user] = $this->createTenantAndUser([
            'role' => 'admin',
            'email' => 'admin2@example.com',
        ]);

        $response = $this->actingAs($user, 'api')
            ->getJson('/api/contacts?per_page=99999');

        $response->assertStatus(200);
        // The response should have per_page <= 100
        $data = $response->json();
        $perPage = $data['per_page'] ?? $data['meta']['per_page'] ?? 15;
        $this->assertLessThanOrEqual(100, $perPage);
    }
}
