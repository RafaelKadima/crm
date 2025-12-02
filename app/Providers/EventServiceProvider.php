<?php

namespace App\Providers;

use App\Events\LeadOwnerAssigned;
use App\Events\LeadStageChanged;
use App\Events\TicketMessageCreated;
use App\Listeners\RegisterLeadActivity;
use App\Listeners\SyncLeadWithExternalSystems;
use App\Listeners\TriggerGtmEvent;
use App\Listeners\UpdateLeadLastInteraction;
use Illuminate\Foundation\Support\Providers\EventServiceProvider as ServiceProvider;

class EventServiceProvider extends ServiceProvider
{
    /**
     * The event to listener mappings for the application.
     *
     * @var array<class-string, array<int, class-string>>
     */
    protected $listen = [
        LeadStageChanged::class => [
            TriggerGtmEvent::class,
        ],
        TicketMessageCreated::class => [
            UpdateLeadLastInteraction::class,
        ],
    ];

    /**
     * The subscriber classes to register.
     *
     * @var array
     */
    protected $subscribe = [
        RegisterLeadActivity::class,
        SyncLeadWithExternalSystems::class,
    ];

    /**
     * Register any events for your application.
     */
    public function boot(): void
    {
        //
    }
}


