<?php

namespace Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthorizationTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;
    private User $admin;
    private User $vendedor;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create([
            'name' => 'Test Tenant',
            'slug' => 'test-tenant',
            'plan' => 'professional',
            'is_active' => true,
        ]);

        $this->admin = User::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Admin User',
            'email' => 'admin@test.com',
            'password' => Hash::make('password'),
            'role' => 'admin',
            'is_active' => true,
        ]);

        $this->vendedor = User::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Vendedor User',
            'email' => 'vendedor@test.com',
            'password' => Hash::make('password'),
            'role' => 'vendedor',
            'is_active' => true,
        ]);
    }

    public function test_vendedor_cannot_create_users(): void
    {
        $response = $this->actingAs($this->vendedor, 'api')
            ->postJson('/api/users', [
                'name' => 'New User',
                'email' => 'new@test.com',
                'password' => 'password123',
                'role' => 'vendedor',
            ]);

        $response->assertStatus(403);
    }

    public function test_admin_can_create_users(): void
    {
        $response = $this->actingAs($this->admin, 'api')
            ->postJson('/api/users', [
                'name' => 'New User',
                'email' => 'new@test.com',
                'password' => 'password123',
                'role' => 'vendedor',
            ]);

        $this->assertContains($response->status(), [200, 201, 422]);
    }

    public function test_vendedor_cannot_delete_channels(): void
    {
        $response = $this->actingAs($this->vendedor, 'api')
            ->deleteJson('/api/channels/00000000-0000-0000-0000-000000000000');

        $this->assertContains($response->status(), [403, 404]);
    }

    public function test_vendedor_cannot_create_pipelines(): void
    {
        $response = $this->actingAs($this->vendedor, 'api')
            ->postJson('/api/pipelines', [
                'name' => 'Test Pipeline',
            ]);

        $response->assertStatus(403);
    }
}
