<?php

namespace App\Enums;

enum FunnelCategoryEnum: string
{
    case ARRIVED = 'arrived';
    case QUALIFIED = 'qualified';
    case SCHEDULED = 'scheduled';
    case MEETING_DONE = 'meeting_done';
    case PROPOSAL = 'proposal';
    case NEGOTIATION = 'negotiation';
    case WON = 'won';
    case LOST = 'lost';
    case UNMAPPED = 'unmapped';

    public function label(): string
    {
        return match ($this) {
            self::ARRIVED => 'Chegou',
            self::QUALIFIED => 'Qualificado',
            self::SCHEDULED => 'Agendou',
            self::MEETING_DONE => 'Reunião Realizada',
            self::PROPOSAL => 'Proposta',
            self::NEGOTIATION => 'Negociação',
            self::WON => 'Ganhou',
            self::LOST => 'Perdeu',
            self::UNMAPPED => 'Não classificado',
        };
    }

    public function order(): int
    {
        return match ($this) {
            self::ARRIVED => 0,
            self::QUALIFIED => 1,
            self::SCHEDULED => 2,
            self::MEETING_DONE => 3,
            self::PROPOSAL => 4,
            self::NEGOTIATION => 5,
            self::WON => 6,
            self::LOST => 7,
            self::UNMAPPED => 99,
        };
    }

    public function isMapped(): bool
    {
        return $this !== self::UNMAPPED;
    }

    public function isFinal(): bool
    {
        return in_array($this, [self::WON, self::LOST]);
    }

    public static function orderedForFunnel(): array
    {
        return [
            self::ARRIVED,
            self::QUALIFIED,
            self::SCHEDULED,
            self::MEETING_DONE,
            self::PROPOSAL,
            self::NEGOTIATION,
            self::WON,
            self::LOST,
        ];
    }

    public static function guessFromStageName(string $name, string $stageType = 'open'): self
    {
        if ($stageType === 'won') {
            return self::WON;
        }
        if ($stageType === 'lost') {
            return self::LOST;
        }

        $normalized = mb_strtolower(strtr($name, [
            'á' => 'a', 'à' => 'a', 'ã' => 'a', 'â' => 'a', 'ä' => 'a',
            'é' => 'e', 'ê' => 'e', 'è' => 'e', 'ë' => 'e',
            'í' => 'i', 'î' => 'i', 'ì' => 'i', 'ï' => 'i',
            'ó' => 'o', 'õ' => 'o', 'ô' => 'o', 'ò' => 'o', 'ö' => 'o',
            'ú' => 'u', 'û' => 'u', 'ù' => 'u', 'ü' => 'u',
            'ç' => 'c',
            'Á' => 'a', 'À' => 'a', 'Ã' => 'a', 'Â' => 'a', 'Ä' => 'a',
            'É' => 'e', 'Ê' => 'e', 'È' => 'e', 'Ë' => 'e',
            'Í' => 'i', 'Î' => 'i', 'Ì' => 'i', 'Ï' => 'i',
            'Ó' => 'o', 'Õ' => 'o', 'Ô' => 'o', 'Ò' => 'o', 'Ö' => 'o',
            'Ú' => 'u', 'Û' => 'u', 'Ù' => 'u', 'Ü' => 'u',
            'Ç' => 'c',
        ]));

        $patterns = [
            self::SCHEDULED->value => ['agendad', 'agend', 'marcad', 'schedul', 'demo marcad', 'reuniao marc', 'booked'],
            self::MEETING_DONE->value => ['reuniao realiz', 'reuniao feita', 'pos-demo', 'pos demo', 'diagnostic', 'meeting done', 'reunido', 'apresentac'],
            self::PROPOSAL->value => ['propost', 'orcament', 'orca', 'proposal', 'quote'],
            self::NEGOTIATION->value => ['negoc', 'follow-up propost', 'followup propost', 'negot'],
            self::QUALIFIED->value => ['qualific', 'qualified', 'interessad', 'hot', 'quente', 'fit', 'sql', 'mql'],
            self::ARRIVED->value => ['novo', 'new', 'lead novo', 'primeiro contato', 'inboun', 'recebid', 'top of funnel', 'topo'],
        ];

        foreach ($patterns as $category => $keywords) {
            foreach ($keywords as $keyword) {
                if (str_contains($normalized, $keyword)) {
                    return self::from($category);
                }
            }
        }

        return self::UNMAPPED;
    }
}
