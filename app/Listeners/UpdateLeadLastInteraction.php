<?php

namespace App\Listeners;

use App\Enums\InteractionSourceEnum;
use App\Enums\SenderTypeEnum;
use App\Events\TicketMessageCreated;

class UpdateLeadLastInteraction
{
    /**
     * Handle the event.
     */
    public function handle(TicketMessageCreated $event): void
    {
        $ticket = $event->ticket;
        $message = $event->message;

        if (!$ticket->lead) {
            return;
        }

        // Determina a fonte da interação
        $source = match ($message->sender_type) {
            SenderTypeEnum::IA => InteractionSourceEnum::IA,
            default => InteractionSourceEnum::HUMAN,
        };

        $ticket->lead->updateLastInteraction($source);
    }
}


