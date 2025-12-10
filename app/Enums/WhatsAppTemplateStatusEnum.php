<?php

namespace App\Enums;

/**
 * Status dos templates do WhatsApp Business API.
 */
enum WhatsAppTemplateStatusEnum: string
{
    case PENDING = 'PENDING';
    case APPROVED = 'APPROVED';
    case REJECTED = 'REJECTED';
    case PAUSED = 'PAUSED';
    case DISABLED = 'DISABLED';
    case IN_APPEAL = 'IN_APPEAL';
    case PENDING_DELETION = 'PENDING_DELETION';
    case DELETED = 'DELETED';
    case LIMIT_EXCEEDED = 'LIMIT_EXCEEDED';

    /**
     * Retorna a descrição do status.
     */
    public function description(): string
    {
        return match($this) {
            self::PENDING => 'Aguardando aprovação do Meta',
            self::APPROVED => 'Template aprovado e pronto para uso',
            self::REJECTED => 'Template rejeitado pelo Meta',
            self::PAUSED => 'Template pausado',
            self::DISABLED => 'Template desabilitado',
            self::IN_APPEAL => 'Em recurso de revisão',
            self::PENDING_DELETION => 'Pendente de exclusão',
            self::DELETED => 'Template excluído',
            self::LIMIT_EXCEEDED => 'Limite de envios excedido',
        };
    }

    /**
     * Retorna a cor do badge para UI.
     */
    public function color(): string
    {
        return match($this) {
            self::APPROVED => 'green',
            self::PENDING, self::IN_APPEAL => 'yellow',
            self::REJECTED, self::DISABLED, self::DELETED => 'red',
            self::PAUSED, self::PENDING_DELETION => 'gray',
            self::LIMIT_EXCEEDED => 'orange',
        };
    }

    /**
     * Verifica se o template pode ser usado para envio.
     */
    public function canSend(): bool
    {
        return $this === self::APPROVED;
    }
}

