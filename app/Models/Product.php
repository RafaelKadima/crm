<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Product extends Model
{
    use HasFactory, HasUuids, BelongsToTenant, SoftDeletes;

    /**
     * Número máximo de imagens por produto
     */
    public const MAX_IMAGES = 4;

    protected $fillable = [
        'tenant_id',
        'category_id',
        'name',
        'slug',
        'sku',
        'description',
        'short_description',
        'specifications',
        'price',
        'promotional_price',
        'cost_price',
        'stock',
        'track_stock',
        'is_active',
        'show_on_landing_page',
        'order',
    ];

    protected function casts(): array
    {
        return [
            'specifications' => 'array',
            'price' => 'decimal:2',
            'promotional_price' => 'decimal:2',
            'cost_price' => 'decimal:2',
            'stock' => 'integer',
            'track_stock' => 'boolean',
            'is_active' => 'boolean',
            'show_on_landing_page' => 'boolean',
            'order' => 'integer',
        ];
    }

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($product) {
            if (empty($product->slug)) {
                $product->slug = Str::slug($product->name);
            }
        });
    }

    /**
     * Categoria do produto
     */
    public function category(): BelongsTo
    {
        return $this->belongsTo(ProductCategory::class, 'category_id');
    }

    /**
     * Imagens do produto
     */
    public function images(): HasMany
    {
        return $this->hasMany(ProductImage::class)->orderBy('order');
    }

    /**
     * Imagem principal
     */
    public function primaryImage(): HasMany
    {
        return $this->hasMany(ProductImage::class)->where('is_primary', true);
    }

    /**
     * Leads interessados neste produto
     */
    public function leads(): BelongsToMany
    {
        return $this->belongsToMany(Lead::class, 'lead_products')
            ->withPivot(['quantity', 'unit_price', 'notes'])
            ->withTimestamps();
    }

    /**
     * Preço atual (promocional se houver)
     */
    public function getCurrentPriceAttribute(): float
    {
        if ($this->promotional_price && $this->promotional_price > 0) {
            return (float) $this->promotional_price;
        }
        return (float) $this->price;
    }

    /**
     * Verifica se está em promoção
     */
    public function getIsOnSaleAttribute(): bool
    {
        return $this->promotional_price && $this->promotional_price > 0 && $this->promotional_price < $this->price;
    }

    /**
     * Porcentagem de desconto
     */
    public function getDiscountPercentAttribute(): ?int
    {
        if (!$this->is_on_sale) return null;
        return (int) round((($this->price - $this->promotional_price) / $this->price) * 100);
    }

    /**
     * URL da imagem principal
     */
    public function getPrimaryImageUrlAttribute(): ?string
    {
        $image = $this->images()->where('is_primary', true)->first();
        return $image?->url ?? $this->images()->first()?->url;
    }

    /**
     * Verifica disponibilidade em estoque
     */
    public function getInStockAttribute(): bool
    {
        if (!$this->track_stock) return true;
        return $this->stock > 0;
    }

    /**
     * Scope: Ativos
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope: Para landing page
     */
    public function scopeForLandingPage($query)
    {
        return $query->where('show_on_landing_page', true)->where('is_active', true);
    }

    /**
     * Verifica se pode adicionar mais imagens
     */
    public function canAddMoreImages(): bool
    {
        return $this->images()->count() < self::MAX_IMAGES;
    }

    /**
     * Retorna quantidade de imagens
     */
    public function getImagesCountAttribute(): int
    {
        return $this->images()->count();
    }
}

