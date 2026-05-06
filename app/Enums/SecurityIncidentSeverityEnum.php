<?php

namespace App\Enums;

enum SecurityIncidentSeverityEnum: string
{
    case LOW = 'low';
    case MEDIUM = 'medium';
    case HIGH = 'high';
    case CRITICAL = 'critical';

    /**
     * A partir de qual severidade o evento dispara notificação Sentry.
     */
    public function shouldNotifySentry(): bool
    {
        return match ($this) {
            self::LOW, self::MEDIUM => false,
            self::HIGH, self::CRITICAL => true,
        };
    }
}
