<?php

namespace Tests\Feature;

use App\Models\Contact;
use App\Models\Lead;
use App\Models\Pipeline;
use App\Models\PipelineStage;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class TenantIsolationTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenantA;
    private Tenant $tenantB;
    private User $userA;
    private User $userB;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenantA = Tenant::create([
            'name' => 'Tenant A',
            'slug' => 'tenant-a',
            'plan' => 'professional',
            'is_active' => true,
        ]);

        $this->tenantB = Tenant::create([
            'name' => 'Tenant B',
            'slug' => 'tenant-b',
            'plan' => 'professional',
            'is_active' => true,
        ]);

        $this->userA = User::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'User A',
            'email' => 'usera@test.com',
            'password' => Hash::make('password'),
            'role' => 'admin',
            'is_active' => true,
        ]);

        $this->userB = User::create([
            'tenant_id' => $this->tenantB->id,
            'name' => 'User B',
            'email' => 'userb@test.com',
            'password' => Hash::make('password'),
            'role' => 'admin',
            'is_active' => true,
        ]);
    }

    public function test_user_cannot_see_leads_from_other_tenant(): void
    {
        $pipeline = Pipeline::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'Pipeline A',
            'is_default' => true,
        ]);

        $stage = PipelineStage::create([
            'pipeline_id' => $pipeline->id,
            'name' => 'Novo',
            'position' => 1,
            'color' => '#3B82F6',
        ]);

        $contact = Contact::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'Contact A',
            'phone' => '5511999999999',
        ]);

        Lead::create([
            'tenant_id' => $this->tenantA->id,
            'contact_id' => $contact->id,
            'pipeline_id' => $pipeline->id,
            'stage_id' => $stage->id,
            'owner_id' => $this->userA->id,
        ]);

        // User B should see 0 leads from Tenant A
        $response = $this->actingAs($this->userB, 'api')
            ->getJson('/api/leads');

        $response->assertStatus(200);
        $data = $response->json();
        $total = $data['total'] ?? $data['meta']['total'] ?? count($data['data'] ?? []);
        $this->assertEquals(0, $total);
    }

    public function test_user_cannot_see_contacts_from_other_tenant(): void
    {
        Contact::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'Secret Contact',
            'phone' => '5511888888888',
        ]);

        $response = $this->actingAs($this->userB, 'api')
            ->getJson('/api/contacts');

        $response->assertStatus(200);
        $data = $response->json();
        $total = $data['total'] ?? $data['meta']['total'] ?? count($data['data'] ?? []);
        $this->assertEquals(0, $total);
    }
}
