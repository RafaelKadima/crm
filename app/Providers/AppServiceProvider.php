<?php

namespace App\Providers;

use App\Models\Lead;
use App\Models\Tenant;
use App\Models\Ticket;
use App\Observers\LeadObserver;
use App\Observers\TenantObserver;
use App\Observers\TicketObserver;
use App\Scopes\TenantScope;
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
}
