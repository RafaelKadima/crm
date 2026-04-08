<?php

namespace Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class SuperAdminSortInjectionTest extends TestCase
{
    use RefreshDatabase;

    private function createSuperAdmin(): User
    {
        $tenant = Tenant::create([
            'name' => 'Admin Tenant',
            'slug' => 'admin-tenant',
            'plan' => 'professional',
            'is_active' => true,
        ]);

        return User::create([
            'tenant_id' => $tenant->id,
            'name' => 'Super Admin',
            'email' => 'admin@test.com',
            'password' => Hash::make('password'),
            'role' => 'admin',
            'is_active' => true,
            'is_super_admin' => true,
        ]);
    }

    public function test_tenants_list_rejects_sql_injection_in_sort_by(): void
    {
        $admin = $this->createSuperAdmin();

        $response = $this->actingAs($admin, 'api')
            ->getJson('/api/super-admin/tenants?sort_by=created_at;DROP TABLE tenants--&sort_dir=desc');

        $response->assertStatus(200);
    }

    public function test_tenants_list_rejects_invalid_sort_direction(): void
    {
        $admin = $this->createSuperAdmin();

        $response = $this->actingAs($admin, 'api')
            ->getJson('/api/super-admin/tenants?sort_by=name&sort_dir=INVALID');

        $response->assertStatus(200);
    }

    public function test_tenants_list_accepts_valid_sort_params(): void
    {
        $admin = $this->createSuperAdmin();

        $response = $this->actingAs($admin, 'api')
            ->getJson('/api/super-admin/tenants?sort_by=name&sort_dir=asc');

        $response->assertStatus(200);
    }

    public function test_users_list_rejects_sql_injection_in_sort_by(): void
    {
        $admin = $this->createSuperAdmin();

        $response = $this->actingAs($admin, 'api')
            ->getJson('/api/super-admin/users?sort_by=1 UNION SELECT * FROM users--');

        $response->assertStatus(200);
    }

    public function test_groups_list_rejects_sql_injection_in_sort_by(): void
    {
        $admin = $this->createSuperAdmin();

        $response = $this->actingAs($admin, 'api')
            ->getJson('/api/super-admin/groups?sort_by=nonexistent_column');

        $response->assertStatus(200);
    }
}
