<?php

namespace App\Modules\Meta;

use App\Modules\Meta\Services\MetaMessageService;
use App\Modules\Meta\Services\MetaOAuthService;
use App\Modules\Meta\Services\MetaTemplateService;
use App\Modules\Meta\Services\MetaTokenService;
use Illuminate\Support\ServiceProvider;

class MetaServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Registra os services como singletons
        $this->app->singleton(MetaOAuthService::class, function ($app) {
            return new MetaOAuthService();
        });

        $this->app->singleton(MetaTokenService::class, function ($app) {
            return new MetaTokenService();
        });

        $this->app->singleton(MetaMessageService::class, function ($app) {
            return new MetaMessageService();
        });

        $this->app->singleton(MetaTemplateService::class, function ($app) {
            return new MetaTemplateService();
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Carrega as rotas do módulo
        $this->loadRoutesFrom(base_path('routes/meta.php'));
    }

    /**
     * Get the services provided by the provider.
     *
     * @return array<int, string>
     */
    public function provides(): array
    {
        return [
            MetaOAuthService::class,
            MetaTokenService::class,
            MetaMessageService::class,
            MetaTemplateService::class,
        ];
    }
}
