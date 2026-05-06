<?php

namespace App\Enums;

enum SecurityIncidentTypeEnum: string
{
    case INVALID_WEBHOOK_SIGNATURE = 'invalid_webhook_signature';
    case BRUTE_FORCE_LOGIN = 'brute_force_login';
    case INVALID_2FA_ATTEMPT = 'invalid_2fa_attempt';
    case SUSPICIOUS_TOKEN_USE = 'suspicious_token_use';
    case GATE_BYPASS_SUPER_ADMIN = 'gate_bypass_super_admin';
    case TOKEN_REVOKED_USED = 'token_revoked_used';
    case PERMISSION_ESCALATION_ATTEMPT = 'permission_escalation_attempt';

    public function defaultSeverity(): SecurityIncidentSeverityEnum
    {
        return match ($this) {
            self::INVALID_WEBHOOK_SIGNATURE => SecurityIncidentSeverityEnum::HIGH,
            self::BRUTE_FORCE_LOGIN => SecurityIncidentSeverityEnum::MEDIUM,
            self::INVALID_2FA_ATTEMPT => SecurityIncidentSeverityEnum::MEDIUM,
            self::SUSPICIOUS_TOKEN_USE => SecurityIncidentSeverityEnum::HIGH,
            self::TOKEN_REVOKED_USED => SecurityIncidentSeverityEnum::HIGH,
            self::PERMISSION_ESCALATION_ATTEMPT => SecurityIncidentSeverityEnum::CRITICAL,
            self::GATE_BYPASS_SUPER_ADMIN => SecurityIncidentSeverityEnum::LOW,
        };
    }
}
