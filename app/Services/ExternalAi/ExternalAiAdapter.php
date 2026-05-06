<?php

namespace App\Services\ExternalAi;

use App\Models\Ticket;

/**
 * Contrato pra adapters de IA externa (Dialogflow, Dify, etc).
 * Cada adapter encapsula chamada HTTP do provider e devolve sempre
 * a mesma shape: ExternalAiResponse.
 */
interface ExternalAiAdapter
{
    /**
     * Envia uma mensagem do usuário e retorna a resposta da IA.
     *
     * @param Ticket $ticket  Contexto do ticket (tenant, lead, etc)
     * @param string $message Texto que o cliente enviou
     * @param array  $config  Bloco external_ai_config do channel
     *                         (api_key, project_id, agent_id, ...)
     * @return ExternalAiResponse
     */
    public function sendMessage(Ticket $ticket, string $message, array $config): ExternalAiResponse;

    /**
     * Identificador do provider — `dialogflow`, `dify`, etc.
     */
    public function name(): string;
}
