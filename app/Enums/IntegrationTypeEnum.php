<?php

namespace App\Enums;

enum IntegrationTypeEnum: string
{
    case ERP = 'erp';
    case CRM = 'crm';
    case SALES_SYSTEM = 'sales_system';
    case OTHER = 'other';

    public function label(): string
    {
        return match ($this) {
            self::ERP => 'ERP',
            self::CRM => 'CRM',
            self::SALES_SYSTEM => 'Sistema de Vendas',
            self::OTHER => 'Outro',
        };
    }
}


