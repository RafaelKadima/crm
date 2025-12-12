<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MetaAdsApiLog extends Model
{
    use HasFactory, HasUuids, BelongsToTenant;

    protected $table = 'meta_ads_api_logs';

    protected $fillable = [
        'tenant_id',
        'ad_account_id',
        'endpoint',
        'method',
        'request_payload',
        'response_body',
        'status_code',
        'duration_ms',
        'error_code',
        'error_message',
        'request_id',
    ];

    protected $casts = [
        'request_payload' => 'array',
        'response_body' => 'array',
        'status_code' => 'integer',
        'duration_ms' => 'integer',
    ];

    /**
     * Relacionamento com conta de anúncios
     */
    public function adAccount()
    {
        return $this->belongsTo(AdAccount::class);
    }

    /**
     * Scope para erros
     */
    public function scopeErrors($query)
    {
        return $query->where('status_code', '>=', 400);
    }

    /**
     * Scope para sucesso
     */
    public function scopeSuccessful($query)
    {
        return $query->where('status_code', '<', 400);
    }

    /**
     * Verifica se é erro
     */
    public function isError(): bool
    {
        return $this->status_code >= 400;
    }

    /**
     * Loga uma chamada à API
     */
    public static function logRequest(
        string $tenantId,
        ?string $adAccountId,
        string $endpoint,
        string $method,
        ?array $requestPayload,
        ?array $responseBody,
        int $statusCode,
        ?int $durationMs = null,
        ?string $errorCode = null,
        ?string $errorMessage = null,
        ?string $requestId = null
    ): self {
        return static::create([
            'tenant_id' => $tenantId,
            'ad_account_id' => $adAccountId,
            'endpoint' => $endpoint,
            'method' => $method,
            'request_payload' => $requestPayload,
            'response_body' => $responseBody,
            'status_code' => $statusCode,
            'duration_ms' => $durationMs,
            'error_code' => $errorCode,
            'error_message' => $errorMessage,
            'request_id' => $requestId,
        ]);
    }

    /**
     * Retorna estatísticas de erros recentes
     */
    public static function getErrorStats(string $tenantId, int $hours = 24): array
    {
        $since = now()->subHours($hours);

        $total = static::where('tenant_id', $tenantId)
            ->where('created_at', '>=', $since)
            ->count();

        $errors = static::where('tenant_id', $tenantId)
            ->where('created_at', '>=', $since)
            ->errors()
            ->count();

        $avgDuration = static::where('tenant_id', $tenantId)
            ->where('created_at', '>=', $since)
            ->avg('duration_ms');

        return [
            'total_requests' => $total,
            'total_errors' => $errors,
            'error_rate' => $total > 0 ? round(($errors / $total) * 100, 2) : 0,
            'avg_duration_ms' => round($avgDuration ?? 0),
        ];
    }
}

