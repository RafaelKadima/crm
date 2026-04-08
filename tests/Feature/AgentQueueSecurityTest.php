<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AgentQueueSecurityTest extends TestCase
{
    use RefreshDatabase;

    public function test_agent_context_rejects_without_internal_key(): void
    {
        $response = $this->postJson('/api/agent/context', [
            'ticket_id' => '00000000-0000-0000-0000-000000000000',
            'lead_id' => '00000000-0000-0000-0000-000000000000',
            'agent_id' => '00000000-0000-0000-0000-000000000000',
            'tenant_id' => '00000000-0000-0000-0000-000000000000',
            'combined_message' => 'test',
            'message_count' => 1,
        ]);

        $response->assertStatus(401);
    }

    public function test_agent_context_rejects_with_invalid_key(): void
    {
        $response = $this->postJson('/api/agent/context', [
            'ticket_id' => '00000000-0000-0000-0000-000000000000',
        ], [
            'X-Internal-Key' => 'invalid-key',
        ]);

        $response->assertStatus(401);
    }

    public function test_agent_response_rejects_without_internal_key(): void
    {
        $response = $this->postJson('/api/agent/response', [
            'ticket_id' => '00000000-0000-0000-0000-000000000000',
        ]);

        $response->assertStatus(401);
    }

    public function test_agent_response_rejects_with_invalid_key(): void
    {
        $response = $this->postJson('/api/agent/response', [
            'ticket_id' => '00000000-0000-0000-0000-000000000000',
        ], [
            'X-Internal-Key' => 'wrong-key',
        ]);

        $response->assertStatus(401);
    }
}
