<?php

namespace App\Providers;

use App\Models\Channel;
use App\Models\Lead;
use App\Models\Pipeline;
use App\Models\Tenant;
use App\Models\Ticket;
use App\Models\User;
use App\Observers\LeadObserver;
use App\Observers\TenantObserver;
use App\Observers\TicketObserver;
use App\Policies\ChannelPolicy;
use App\Policies\LeadPolicy;
use App\Policies\PipelinePolicy;
use App\Policies\UserPolicy;
use App\Scopes\TenantScope;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureRateLimiting();
        $this->registerPolicies();

        // Registra observers para tracking de uso
        Lead::observe(LeadObserver::class);
        Tenant::observe(TenantObserver::class);
        Ticket::observe(TicketObserver::class);

        // Custom route model binding para Ticket
        // Remove o TenantScope durante o binding mas verifica o tenant manualmente
        Route::bind('ticket', function ($value) {
            // Busca sem o TenantScope para permitir o binding
            $ticket = Ticket::withoutGlobalScope(TenantScope::class)
                ->where('id', $value)
                ->firstOrFail();
            
            // Verifica se o usuário tem acesso ao tenant do ticket
            if (auth()->check() && auth()->user()->tenant_id !== $ticket->tenant_id) {
                throw new AccessDeniedHttpException('Você não tem permissão para acessar este ticket.');
            }
            
            return $ticket;
        });
    }

    protected function registerPolicies(): void
    {
        Gate::policy(Lead::class, LeadPolicy::class);
        Gate::policy(User::class, UserPolicy::class);
        Gate::policy(Pipeline::class, PipelinePolicy::class);
        Gate::policy(Channel::class, ChannelPolicy::class);

        // Super admin bypassa todas as policies
        Gate::before(function ($user) {
            if ($user->isSuperAdmin()) {
                return true;
            }
        });
    }

    protected function configureRateLimiting(): void
    {
        RateLimiter::for('api', function (Request $request) {
            return Limit::perMinute(120)->by(
                $request->user()?->id ?: $request->ip()
            );
        });

        RateLimiter::for('login', function (Request $request) {
            $key = strtolower($request->input('email', '')) . '|' . $request->ip();
            return Limit::perMinute(5)->by($key);
        });

        RateLimiter::for('webhooks', function (Request $request) {
            return Limit::perMinute(120)->by($request->ip());
        });

        RateLimiter::for('internal', function (Request $request) {
            return Limit::perMinute(300)->by($request->ip());
        });
    }
}
