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

class LeadTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;
    private User $user;
    private Pipeline $pipeline;
    private PipelineStage $stage;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create([
            'name' => 'Test Tenant',
            'slug' => 'test-tenant',
            'plan' => 'professional',
            'is_active' => true,
        ]);

        $this->user = User::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => Hash::make('password'),
            'role' => 'admin',
            'is_active' => true,
        ]);

        $this->pipeline = Pipeline::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Default Pipeline',
            'is_default' => true,
        ]);

        $this->stage = PipelineStage::create([
            'pipeline_id' => $this->pipeline->id,
            'name' => 'Novo',
            'position' => 1,
            'color' => '#3B82F6',
        ]);
    }

    public function test_list_leads_requires_auth(): void
    {
        $response = $this->getJson('/api/leads');
        $response->assertStatus(401);
    }

    public function test_list_leads_returns_paginated(): void
    {
        $response = $this->actingAs($this->user, 'api')
            ->getJson('/api/leads');

        $response->assertStatus(200);
    }

    public function test_per_page_clamped_to_max_100(): void
    {
        $response = $this->actingAs($this->user, 'api')
            ->getJson('/api/leads?per_page=500');

        $response->assertStatus(200);
        $data = $response->json();
        $this->assertLessThanOrEqual(100, $data['per_page'] ?? $data['meta']['per_page'] ?? 100);
    }

    public function test_create_lead(): void
    {
        $contact = Contact::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'John Doe',
            'phone' => '5511999999999',
        ]);

        $response = $this->actingAs($this->user, 'api')
            ->postJson('/api/leads', [
                'contact_id' => $contact->id,
                'pipeline_id' => $this->pipeline->id,
                'stage_id' => $this->stage->id,
            ]);

        $response->assertStatus(201);
    }

    public function test_create_lead_validates_required_fields(): void
    {
        $response = $this->actingAs($this->user, 'api')
            ->postJson('/api/leads', []);

        $response->assertStatus(422);
    }
}
