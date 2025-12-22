<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SaleItem extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'sale_id',
        'product_id',
        'description',
        'quantity',
        'unit_price',
        'discount',
        'total',
        'notes',
    ];

    protected $casts = [
        'quantity' => 'decimal:2',
        'unit_price' => 'decimal:2',
        'discount' => 'decimal:2',
        'total' => 'decimal:2',
    ];

    // =====================
    // RELATIONSHIPS
    // =====================

    public function sale(): BelongsTo
    {
        return $this->belongsTo(Sale::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    // =====================
    // BOOT
    // =====================

    protected static function boot()
    {
        parent::boot();

        // Auto-calculate total before saving
        static::saving(function (SaleItem $item) {
            $item->total = ($item->quantity * $item->unit_price) - ($item->discount ?? 0);
        });

        // Recalculate sale total when item changes
        static::saved(function (SaleItem $item) {
            $item->sale->recalculateAndSave();
        });

        static::deleted(function (SaleItem $item) {
            $item->sale->recalculateAndSave();
        });
    }

    // =====================
    // METHODS
    // =====================

    /**
     * Cria um item a partir de um produto.
     */
    public static function fromProduct(Product $product, float $quantity = 1, ?float $customPrice = null): array
    {
        $unitPrice = $customPrice ?? $product->price;

        return [
            'product_id' => $product->id,
            'description' => $product->name,
            'quantity' => $quantity,
            'unit_price' => $unitPrice,
            'discount' => 0,
            'total' => $quantity * $unitPrice,
        ];
    }

    /**
     * Verifica se é um item manual (sem produto).
     */
    public function isManual(): bool
    {
        return is_null($this->product_id);
    }

    /**
     * Retorna o subtotal antes do desconto.
     */
    public function getSubtotal(): float
    {
        return $this->quantity * $this->unit_price;
    }
}
