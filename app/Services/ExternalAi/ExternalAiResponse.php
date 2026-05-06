<?php

namespace App\Services\ExternalAi;

/**
 * Resposta normalizada de qualquer adapter externo.
 *
 * `text`         — mensagem pra enviar ao cliente (vazia = não responde)
 * `session_id`   — id de sessão a persistir no ticket pra próximas msgs
 * `should_handoff_human` — IA não soube responder → deixa pro humano
 * `metadata`     — payload original do provider, debug
 */
final readonly class ExternalAiResponse
{
    public function __construct(
        public string $text,
        public ?string $sessionId = null,
        public bool $shouldHandoffHuman = false,
        public array $metadata = [],
    ) {}

    public static function empty(): self
    {
        return new self(text: '', shouldHandoffHuman: true);
    }
}
