<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserSession extends Model
{
    use HasUuids;

    protected $fillable = [
        'user_id',
        'token_id',
        'ip',
        'user_agent',
        'device_name',
        'last_activity_at',
        'revoked_at',
    ];

    protected function casts(): array
    {
        return [
            'last_activity_at' => 'datetime',
            'revoked_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function isActive(): bool
    {
        return is_null($this->revoked_at);
    }

    /**
     * Heurística simples — extrai marca/SO básico do user-agent. Pra
     * algo mais sofisticado, considerar `jenssegers/agent` no futuro.
     */
    public static function parseDeviceName(?string $userAgent): string
    {
        if (empty($userAgent)) {
            return 'Desconhecido';
        }

        $ua = strtolower($userAgent);

        $os = match (true) {
            str_contains($ua, 'iphone') => 'iPhone',
            str_contains($ua, 'ipad') => 'iPad',
            str_contains($ua, 'android') => 'Android',
            str_contains($ua, 'mac os') || str_contains($ua, 'macintosh') => 'macOS',
            str_contains($ua, 'windows') => 'Windows',
            str_contains($ua, 'linux') => 'Linux',
            default => null,
        };

        $browser = match (true) {
            str_contains($ua, 'edg/') => 'Edge',
            str_contains($ua, 'firefox') => 'Firefox',
            str_contains($ua, 'opr/') || str_contains($ua, 'opera') => 'Opera',
            str_contains($ua, 'chrome') => 'Chrome',
            str_contains($ua, 'safari') => 'Safari',
            default => null,
        };

        if ($os && $browser) {
            return "{$browser} em {$os}";
        }
        return $browser ?? $os ?? substr($userAgent, 0, 50);
    }
}
