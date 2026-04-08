<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WebhookTest extends TestCase
{
    use RefreshDatabase;

    public function test_whatsapp_webhook_verification_with_valid_token(): void
    {
        $token = config('services.whatsapp.verify_token');

        $response = $this->get('/api/webhooks/whatsapp?' . http_build_query([
            'hub_mode' => 'subscribe',
            'hub_verify_token' => $token,
            'hub_challenge' => 'test_challenge_123',
        ]));

        $response->assertStatus(200)
            ->assertSee('test_challenge_123');
    }

    public function test_whatsapp_webhook_verification_rejects_invalid_token(): void
    {
        $response = $this->get('/api/webhooks/whatsapp?' . http_build_query([
            'hub_mode' => 'subscribe',
            'hub_verify_token' => 'invalid_token_here',
            'hub_challenge' => 'test_challenge_123',
        ]));

        $response->assertStatus(403);
    }

    public function test_whatsapp_webhook_receives_post(): void
    {
        $payload = [
            'entry' => [[
                'changes' => [[
                    'value' => [
                        'metadata' => [
                            'phone_number_id' => 'nonexistent_123',
                        ],
                        'messages' => [[
                            'id' => 'msg_test_1',
                            'from' => '5511999999999',
                            'timestamp' => time(),
                            'type' => 'text',
                            'text' => ['body' => 'Hello test'],
                        ]],
                    ],
                ]],
            ]],
        ];

        $response = $this->postJson('/api/webhooks/whatsapp', $payload);

        // Should return 200 even if channel not found (to prevent Meta retries)
        $response->assertStatus(200);
    }

    public function test_simulate_message_blocked_in_production(): void
    {
        // Set environment to production
        app()->detectEnvironment(fn () => 'production');

        $response = $this->postJson('/api/webhooks/simulate-message', [
            'ticket_id' => '00000000-0000-0000-0000-000000000001',
            'message' => 'test',
        ]);

        $response->assertStatus(403);
    }

    public function test_meta_webhook_verification_with_valid_token(): void
    {
        $token = config('services.meta.verify_token');

        $response = $this->get('/api/webhooks/meta?' . http_build_query([
            'hub.mode' => 'subscribe',
            'hub.verify_token' => $token,
            'hub.challenge' => 'meta_challenge_456',
        ]));

        $response->assertStatus(200);
    }

    public function test_meta_webhook_rejects_invalid_token(): void
    {
        $response = $this->get('/api/webhooks/meta?' . http_build_query([
            'hub.mode' => 'subscribe',
            'hub.verify_token' => 'wrong_token',
            'hub.challenge' => 'meta_challenge_456',
        ]));

        $response->assertStatus(403);
    }
}
