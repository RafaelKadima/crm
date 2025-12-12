<?php

namespace App\Models;

use App\Services\AiUnitsService;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AiPackagePurchase extends Model
{
    use HasUuids;

    protected $fillable = [
        'tenant_id',
        'user_id',
        'package_type',
        'package_id',
        'quantity',
        'price_brl',
        'status',
        'payment_reference',
        'expires_at',
        'consumed',
    ];

    protected function casts(): array
    {
        return [
            'price_brl' => 'decimal:2',
            'expires_at' => 'date',
        ];
    }

    /**
     * Status possíveis
     */
    public const STATUS_PENDING = 'pending';
    public const STATUS_PAID = 'paid';
    public const STATUS_CANCELLED = 'cancelled';
    public const STATUS_EXPIRED = 'expired';

    /**
     * Tipos de pacotes
     */
    public const TYPE_AI_UNITS = 'ai_units';
    public const TYPE_RAG = 'rag';
    public const TYPE_AUDIO = 'audio';
    public const TYPE_IMAGE = 'image';

    /**
     * Relacionamento com tenant
     */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * Relacionamento com usuário que comprou
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Retorna informações do pacote
     */
    public function getPackageInfo(): ?array
    {
        $service = app(AiUnitsService::class);
        return $service->getPackage($this->package_type, $this->package_id);
    }

    /**
     * Retorna quantidade restante
     */
    public function getRemainingAttribute(): int
    {
        return max(0, $this->quantity - $this->consumed);
    }

    /**
     * Verifica se o pacote está ativo
     */
    public function isActive(): bool
    {
        if ($this->status !== self::STATUS_PAID) {
            return false;
        }

        if ($this->expires_at && $this->expires_at->isPast()) {
            return false;
        }

        return $this->remaining > 0;
    }

    /**
     * Consome quantidade do pacote
     */
    public function consume(int $amount = 1): bool
    {
        if (!$this->isActive()) {
            return false;
        }

        if ($this->remaining < $amount) {
            return false;
        }

        $this->increment('consumed', $amount);
        return true;
    }

    /**
     * Cria uma nova compra de pacote
     */
    public static function purchase(
        string $tenantId,
        string $packageType,
        string $packageId,
        ?string $userId = null,
        ?string $paymentReference = null
    ): ?self {
        $service = app(AiUnitsService::class);
        $packageInfo = $service->getPackage($packageType, $packageId);

        if (!$packageInfo) {
            return null;
        }

        // Determina a quantidade baseada no tipo de pacote
        $quantity = match ($packageType) {
            self::TYPE_AI_UNITS => $packageInfo['units'],
            self::TYPE_RAG => $packageInfo['documents'],
            self::TYPE_AUDIO => $packageInfo['minutes'],
            self::TYPE_IMAGE => $packageInfo['analyses'],
            default => 0,
        };

        // Define expiração (pacotes expiram em 90 dias por padrão)
        $expiresAt = now()->addDays(90);

        $purchase = self::create([
            'tenant_id' => $tenantId,
            'user_id' => $userId,
            'package_type' => $packageType,
            'package_id' => $packageId,
            'quantity' => $quantity,
            'price_brl' => $packageInfo['price'],
            'status' => self::STATUS_PENDING,
            'payment_reference' => $paymentReference,
            'expires_at' => $expiresAt,
        ]);

        return $purchase;
    }

    /**
     * Confirma pagamento e ativa o pacote
     */
    public function confirmPayment(?string $paymentReference = null): bool
    {
        if ($this->status !== self::STATUS_PENDING) {
            return false;
        }

        $this->update([
            'status' => self::STATUS_PAID,
            'payment_reference' => $paymentReference ?? $this->payment_reference,
        ]);

        // Se for pacote de Unidades de IA, adiciona ao bônus do tenant
        if ($this->package_type === self::TYPE_AI_UNITS) {
            $quota = TenantQuota::getForTenant($this->tenant_id);
            if ($quota) {
                $quota->addBonusUnits($this->quantity);
            }
        }

        return true;
    }

    /**
     * Cancela a compra
     */
    public function cancel(): bool
    {
        if ($this->status === self::STATUS_PAID && $this->consumed > 0) {
            return false; // Não pode cancelar se já consumiu
        }

        $this->update(['status' => self::STATUS_CANCELLED]);
        return true;
    }

    /**
     * Retorna compras ativas de um tenant por tipo
     */
    public static function getActivePurchases(string $tenantId, ?string $type = null): \Illuminate\Database\Eloquent\Collection
    {
        $query = self::where('tenant_id', $tenantId)
            ->where('status', self::STATUS_PAID)
            ->where(function ($q) {
                $q->whereNull('expires_at')
                    ->orWhere('expires_at', '>', now());
            })
            ->whereRaw('consumed < quantity');

        if ($type) {
            $query->where('package_type', $type);
        }

        return $query->orderBy('created_at')->get();
    }

    /**
     * Retorna total disponível de um tipo de pacote para o tenant
     */
    public static function getTotalAvailable(string $tenantId, string $type): int
    {
        return self::getActivePurchases($tenantId, $type)
            ->sum(fn ($p) => $p->remaining);
    }

    /**
     * Consome de pacotes ativos (FIFO - mais antigo primeiro)
     */
    public static function consumeFromPurchases(string $tenantId, string $type, int $amount): int
    {
        $purchases = self::getActivePurchases($tenantId, $type);
        $consumed = 0;

        foreach ($purchases as $purchase) {
            if ($consumed >= $amount) {
                break;
            }

            $toConsume = min($purchase->remaining, $amount - $consumed);
            if ($purchase->consume($toConsume)) {
                $consumed += $toConsume;
            }
        }

        return $consumed;
    }

    /**
     * Escopo para compras pendentes
     */
    public function scopePending($query)
    {
        return $query->where('status', self::STATUS_PENDING);
    }

    /**
     * Escopo para compras pagas
     */
    public function scopePaid($query)
    {
        return $query->where('status', self::STATUS_PAID);
    }

    /**
     * Escopo para compras ativas (pagas e não expiradas)
     */
    public function scopeActive($query)
    {
        return $query->where('status', self::STATUS_PAID)
            ->where(function ($q) {
                $q->whereNull('expires_at')
                    ->orWhere('expires_at', '>', now());
            })
            ->whereRaw('consumed < quantity');
    }
}

