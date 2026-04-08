<?php

namespace Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    private function createTenant(): Tenant
    {
        return Tenant::create([
            'name' => 'Test Tenant',
            'slug' => 'test-tenant',
            'plan' => 'professional',
            'is_active' => true,
        ]);
    }

    private function createUser(Tenant $tenant, array $overrides = []): User
    {
        return User::create(array_merge([
            'tenant_id' => $tenant->id,
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => Hash::make('password123'),
            'role' => 'admin',
            'is_active' => true,
            'is_super_admin' => false,
        ], $overrides));
    }

    public function test_login_with_valid_credentials(): void
    {
        $tenant = $this->createTenant();
        $this->createUser($tenant);

        $response = $this->postJson('/api/login', [
            'email' => 'test@example.com',
            'password' => 'password123',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'access_token',
                'token_type',
                'user' => ['id', 'name', 'email', 'role'],
            ]);
    }

    public function test_login_with_invalid_credentials(): void
    {
        $tenant = $this->createTenant();
        $this->createUser($tenant);

        $response = $this->postJson('/api/login', [
            'email' => 'test@example.com',
            'password' => 'wrong-password',
        ]);

        $response->assertStatus(422);
    }

    public function test_login_with_inactive_user(): void
    {
        $tenant = $this->createTenant();
        $this->createUser($tenant, ['is_active' => false]);

        $response = $this->postJson('/api/login', [
            'email' => 'test@example.com',
            'password' => 'password123',
        ]);

        $response->assertStatus(422);
    }

    public function test_login_with_inactive_tenant(): void
    {
        $tenant = Tenant::create([
            'name' => 'Inactive Tenant',
            'slug' => 'inactive',
            'plan' => 'basic',
            'is_active' => false,
        ]);
        $this->createUser($tenant);

        $response = $this->postJson('/api/login', [
            'email' => 'test@example.com',
            'password' => 'password123',
        ]);

        $response->assertStatus(422);
    }

    public function test_login_validates_email_required(): void
    {
        $response = $this->postJson('/api/login', [
            'password' => 'password123',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    public function test_protected_route_requires_auth(): void
    {
        $response = $this->getJson('/api/me');

        $response->assertStatus(401);
    }

    public function test_authenticated_user_can_access_me(): void
    {
        $tenant = $this->createTenant();
        $user = $this->createUser($tenant);

        $response = $this->actingAs($user, 'api')
            ->getJson('/api/me');

        $response->assertStatus(200);
    }

    public function test_super_admin_routes_require_super_admin(): void
    {
        $tenant = $this->createTenant();
        $user = $this->createUser($tenant, ['is_super_admin' => false]);

        $response = $this->actingAs($user, 'api')
            ->getJson('/api/super-admin/dashboard');

        $response->assertStatus(403);
    }

    public function test_super_admin_can_access_super_admin_routes(): void
    {
        $tenant = $this->createTenant();
        $user = $this->createUser($tenant, ['is_super_admin' => true]);

        $response = $this->actingAs($user, 'api')
            ->getJson('/api/super-admin/dashboard');

        $response->assertStatus(200);
    }
}
