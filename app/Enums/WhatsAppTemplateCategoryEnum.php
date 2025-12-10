<?php

namespace App\Enums;

/**
 * Categorias de templates do WhatsApp Business API.
 * 
 * @see https://developers.facebook.com/docs/whatsapp/business-management-api/message-templates
 */
enum WhatsAppTemplateCategoryEnum: string
{
    case MARKETING = 'MARKETING';
    case AUTHENTICATION = 'AUTHENTICATION';
    case UTILITY = 'UTILITY';

    /**
     * Retorna a descrição da categoria.
     */
    public function description(): string
    {
        return match($this) {
            self::MARKETING => 'Promoções, ofertas e mensagens de marketing',
            self::AUTHENTICATION => 'Códigos de verificação e autenticação',
            self::UTILITY => 'Atualizações de pedidos, lembretes e notificações',
        };
    }

    /**
     * Retorna todas as categorias com descrição.
     */
    public static function toArray(): array
    {
        return array_map(fn($case) => [
            'value' => $case->value,
            'label' => $case->value,
            'description' => $case->description(),
        ], self::cases());
    }
}

