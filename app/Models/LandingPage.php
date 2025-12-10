<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class LandingPage extends Model
{
    use HasFactory, HasUuids, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'name',
        'slug',
        'title',
        'description',
        'logo',
        'background_image',
        'primary_color',
        'secondary_color',
        'text_color',
        'theme',
        'hero_title',
        'hero_subtitle',
        'cta_text',
        'cta_button_color',
        'show_products',
        'show_testimonials',
        'show_faq',
        'show_contact_info',
        'testimonials',
        'faq',
        'contact_info',
        'form_fields',
        'blocks',
        'global_settings',
        'success_message',
        'redirect_url',
        'meta_title',
        'meta_description',
        'og_image',
        'facebook_pixel',
        'google_analytics',
        'gtm_id',
        'default_pipeline_id',
        'default_stage_id',
        'default_channel_id',
        'is_active',
        'published_at',
        'views_count',
        'leads_count',
    ];

    protected function casts(): array
    {
        return [
            'testimonials' => 'array',
            'faq' => 'array',
            'contact_info' => 'array',
            'form_fields' => 'array',
            'blocks' => 'array',
            'global_settings' => 'array',
            'show_products' => 'boolean',
            'show_testimonials' => 'boolean',
            'show_faq' => 'boolean',
            'show_contact_info' => 'boolean',
            'is_active' => 'boolean',
            'published_at' => 'datetime',
            'views_count' => 'integer',
            'leads_count' => 'integer',
        ];
    }

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($landingPage) {
            if (empty($landingPage->slug)) {
                $landingPage->slug = Str::slug($landingPage->name) . '-' . Str::random(6);
            }
        });
    }

    /**
     * Tenant
     */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * Produtos da landing page
     */
    public function products(): BelongsToMany
    {
        return $this->belongsToMany(Product::class, 'landing_page_products')
            ->using(LandingPageProduct::class)
            ->withPivot(['order', 'is_featured'])
            ->withTimestamps()
            ->orderBy('landing_page_products.order');
    }

    /**
     * Produtos em destaque
     */
    public function featuredProducts(): BelongsToMany
    {
        return $this->products()->wherePivot('is_featured', true);
    }

    /**
     * Pipeline padrão
     */
    public function defaultPipeline(): BelongsTo
    {
        return $this->belongsTo(Pipeline::class, 'default_pipeline_id');
    }

    /**
     * Estágio padrão
     */
    public function defaultStage(): BelongsTo
    {
        return $this->belongsTo(PipelineStage::class, 'default_stage_id');
    }

    /**
     * Canal padrão
     */
    public function defaultChannel(): BelongsTo
    {
        return $this->belongsTo(Channel::class, 'default_channel_id');
    }

    /**
     * Estatísticas
     */
    public function stats(): HasMany
    {
        return $this->hasMany(LandingPageStat::class);
    }

    /**
     * URL pública
     */
    public function getUrlAttribute(): string
    {
        return url("/lp/{$this->slug}");
    }

    /**
     * Taxa de conversão
     */
    public function getConversionRateAttribute(): float
    {
        if ($this->views_count === 0) return 0;
        return round(($this->leads_count / $this->views_count) * 100, 2);
    }

    /**
     * Incrementa visualizações
     */
    public function incrementViews(): void
    {
        $this->increment('views_count');
        
        // Atualiza estatísticas diárias
        $stat = $this->stats()->firstOrCreate(
            ['date' => now()->toDateString()],
            ['views' => 0, 'unique_views' => 0, 'leads' => 0]
        );
        $stat->increment('views');
    }

    /**
     * Incrementa leads
     */
    public function incrementLeads(): void
    {
        $this->increment('leads_count');
        
        // Atualiza estatísticas diárias
        $stat = $this->stats()->firstOrCreate(
            ['date' => now()->toDateString()],
            ['views' => 0, 'unique_views' => 0, 'leads' => 0]
        );
        $stat->increment('leads');
        
        // Recalcula taxa de conversão
        if ($stat->views > 0) {
            $stat->update(['conversion_rate' => ($stat->leads / $stat->views) * 100]);
        }
    }

    /**
     * Verifica se está publicada
     */
    public function isPublished(): bool
    {
        return $this->is_active && $this->published_at !== null && $this->published_at <= now();
    }

    /**
     * Scope: Ativas
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope: Publicadas
     */
    public function scopePublished($query)
    {
        return $query->where('is_active', true)
            ->whereNotNull('published_at')
            ->where('published_at', '<=', now());
    }
}

