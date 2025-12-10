<?php

use App\Scopes\TenantScope;
use Illuminate\Support\Facades\Broadcast;

/*
|--------------------------------------------------------------------------
| Broadcast Channels
|--------------------------------------------------------------------------
|
| Here you may register all of the event broadcasting channels that your
| application supports. The given channel authorization callbacks are
| used to check if an authenticated user can listen to the channel.
|
*/

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

/**
 * Canal privado para tickets - autoriza se o usuário pertence ao tenant do ticket
 */
Broadcast::channel('ticket.{ticketId}', function ($user, $ticketId) {
    // Busca sem TenantScope para permitir a verificação
    $ticket = \App\Models\Ticket::withoutGlobalScope(TenantScope::class)->find($ticketId);
    
    if (!$ticket) {
        return false;
    }
    
    // Usuário deve pertencer ao mesmo tenant do ticket
    return $user->tenant_id === $ticket->tenant_id;
});

/**
 * Canal privado para leads - autoriza se o usuário pertence ao tenant do lead
 */
Broadcast::channel('lead.{leadId}', function ($user, $leadId) {
    // Busca sem TenantScope para permitir a verificação
    $lead = \App\Models\Lead::withoutGlobalScope(TenantScope::class)->find($leadId);
    
    if (!$lead) {
        return false;
    }
    
    // Usuário deve pertencer ao mesmo tenant do lead
    return $user->tenant_id === $lead->tenant_id;
});

/**
 * Canal privado para tenant - autoriza se o usuário pertence ao tenant
 */
Broadcast::channel('tenant.{tenantId}', function ($user, $tenantId) {
    // Usuário deve pertencer ao tenant
    return $user->tenant_id === $tenantId;
});
