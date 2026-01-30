<?php

namespace App\Console\Commands;

use App\Models\Channel;
use App\Models\Contact;
use App\Models\Lead;
use App\Models\Pipeline;
use App\Models\PipelineStage;
use App\Models\Tenant;
use App\Models\Ticket;
use App\Models\TicketMessage;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class ImportZproData extends Command
{
    protected $signature = 'import:zpro {--dry-run : Simula sem inserir}';
    protected $description = 'Importa dados do Z-PRO (Shineray Itaboraí) para o CRM';

    private $zproConnection;
    private $tenantId;
    private $userMapping = []; // zpro_user_id => crm_user_id
    private $contactMapping = []; // zpro_contact_id => crm_contact_id
    private $ticketMapping = []; // zpro_ticket_id => crm_lead_id
    private $pipelineId;
    private $stageId;
    private $channelId;
    private $dryRun = false;

    public function handle()
    {
        $this->dryRun = $this->option('dry-run');

        if ($this->dryRun) {
            $this->warn('=== MODO DRY-RUN: Nenhum dado será inserido ===');
        }

        $this->info('Conectando ao banco Z-PRO...');

        try {
            $this->zproConnection = new \PDO(
                'pgsql:host=93.127.211.241;port=5432;dbname=postgres',
                'zpro',
                'BuY4iPX9CIkMuTiGEFdZMSzf24GOSk5dGzN9NaSW1DM='
            );
            $this->zproConnection->setAttribute(\PDO::ATTR_ERRMODE, \PDO::ERRMODE_EXCEPTION);
            $this->info('Conectado!');
        } catch (\Exception $e) {
            $this->error('Erro ao conectar: ' . $e->getMessage());
            return 1;
        }

        // 1. Criar Tenant
        $this->createTenant();

        // 2. Criar Pipeline e Estágios
        $this->createPipeline();

        // 2.1 Criar Canal padrão
        $this->createChannel();

        // 3. Importar Usuários
        $this->importUsers();

        // 4. Importar Contatos
        $this->importContacts();

        // 5. Importar Tickets como Leads
        $this->importTickets();

        // 6. Importar Mensagens
        $this->importMessages();

        $this->newLine();
        $this->info('=== IMPORTAÇÃO CONCLUÍDA ===');
        $this->table(
            ['Item', 'Quantidade'],
            [
                ['Tenant', 1],
                ['Usuários', count($this->userMapping)],
                ['Contatos', count($this->contactMapping)],
                ['Leads/Tickets', count($this->ticketMapping)],
            ]
        );

        return 0;
    }

    private function createTenant()
    {
        $this->info('Criando tenant Shineray Itaboraí...');

        if ($this->dryRun) {
            $this->tenantId = Str::uuid()->toString();
            $this->info("  [DRY-RUN] Tenant ID: {$this->tenantId}");
            return;
        }

        // Verifica se já existe
        $existing = Tenant::where('name', 'Shineray Itaboraí')->first();
        if ($existing) {
            $this->tenantId = $existing->id;
            $this->warn("  Tenant já existe: {$this->tenantId}");
            return;
        }

        $tenant = Tenant::create([
            'name' => 'Shineray Itaboraí',
            'slug' => 'shineray-itaborai',
            'plan' => 'enterprise',
            'ia_enabled' => true,
            'is_active' => true,
            'settings' => [
                'imported_from' => 'zpro',
                'imported_at' => now()->toISOString(),
            ],
        ]);

        $this->tenantId = $tenant->id;
        $this->info("  Tenant criado: {$this->tenantId}");
    }

    private function createPipeline()
    {
        $this->info('Criando pipeline e estágios...');

        if ($this->dryRun) {
            $this->pipelineId = Str::uuid()->toString();
            $this->stageId = Str::uuid()->toString();
            $this->info("  [DRY-RUN] Pipeline: {$this->pipelineId}");
            return;
        }

        // Verifica se já existe
        $existing = Pipeline::where('tenant_id', $this->tenantId)->first();
        if ($existing) {
            $this->pipelineId = $existing->id;
            $this->stageId = PipelineStage::where('pipeline_id', $existing->id)->first()?->id;
            $this->warn("  Pipeline já existe: {$this->pipelineId}");
            return;
        }

        $pipeline = Pipeline::create([
            'tenant_id' => $this->tenantId,
            'name' => 'Principal',
            'is_default' => true,
        ]);
        $this->pipelineId = $pipeline->id;

        $stages = [
            ['name' => 'Novo', 'order' => 1, 'color' => '#3b82f6'],
            ['name' => 'Em Atendimento', 'order' => 2, 'color' => '#f59e0b'],
            ['name' => 'Aguardando', 'order' => 3, 'color' => '#8b5cf6'],
            ['name' => 'Negociação', 'order' => 4, 'color' => '#10b981'],
            ['name' => 'Fechado', 'order' => 5, 'color' => '#22c55e'],
            ['name' => 'Perdido', 'order' => 6, 'color' => '#ef4444'],
        ];

        foreach ($stages as $stage) {
            $stageType = match($stage['name']) {
                'Fechado' => PipelineStage::TYPE_WON,
                'Perdido' => PipelineStage::TYPE_LOST,
                default => PipelineStage::TYPE_OPEN,
            };

            $s = PipelineStage::create([
                'tenant_id' => $this->tenantId,
                'pipeline_id' => $this->pipelineId,
                'name' => $stage['name'],
                'order' => $stage['order'],
                'color' => $stage['color'],
                'stage_type' => $stageType,
            ]);
            if ($stage['order'] === 1) {
                $this->stageId = $s->id;
            }
        }

        $this->info("  Pipeline criado: {$this->pipelineId}");
    }

    private function createChannel()
    {
        $this->info('Criando canal WhatsApp...');

        if ($this->dryRun) {
            $this->channelId = Str::uuid()->toString();
            $this->info("  [DRY-RUN] Channel ID: {$this->channelId}");
            return;
        }

        // Verifica se já existe
        $existing = Channel::where('tenant_id', $this->tenantId)->first();
        if ($existing) {
            $this->channelId = $existing->id;
            $this->warn("  Canal já existe: {$this->channelId}");
            return;
        }

        $channel = Channel::create([
            'tenant_id' => $this->tenantId,
            'name' => 'WhatsApp Z-PRO',
            'type' => 'whatsapp',
            'identifier' => 'zpro_import',
            'ia_mode' => 'none',
            'is_active' => true,
            'config' => ['imported_from' => 'zpro'],
        ]);

        $this->channelId = $channel->id;
        $this->info("  Canal criado: {$this->channelId}");
    }

    private function importUsers()
    {
        $this->info('Importando usuários...');

        $stmt = $this->zproConnection->query('SELECT * FROM "Users" WHERE "tenantId" = 2');
        $zproUsers = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        $bar = $this->output->createProgressBar(count($zproUsers));

        foreach ($zproUsers as $zproUser) {
            $email = strtolower(trim($zproUser['email']));

            // Verifica se já existe
            $existing = User::where('email', $email)->first();

            if ($existing) {
                $this->userMapping[$zproUser['id']] = $existing->id;
                $bar->advance();
                continue;
            }

            if ($this->dryRun) {
                $this->userMapping[$zproUser['id']] = Str::uuid()->toString();
                $bar->advance();
                continue;
            }

            // Mapeia perfil Z-PRO para role CRM
            $role = match($zproUser['profile']) {
                'admin' => 'admin',
                'supervisor' => 'gestor',
                default => 'vendedor',
            };

            $user = User::create([
                'tenant_id' => $this->tenantId,
                'name' => $zproUser['name'] ?? 'Usuário',
                'email' => $email,
                'password' => Hash::make('Shineray@2025'),
                'role' => $role,
                'is_active' => true,
            ]);

            $this->userMapping[$zproUser['id']] = $user->id;
            $bar->advance();
        }

        $bar->finish();
        $this->newLine();
        $this->info("  Usuários importados: " . count($this->userMapping));
    }

    private function importContacts()
    {
        $this->info('Importando contatos...');

        // Busca total
        $countStmt = $this->zproConnection->query('SELECT COUNT(*) as total FROM "Contacts" WHERE "tenantId" = 2');
        $total = $countStmt->fetch(\PDO::FETCH_ASSOC)['total'];

        $bar = $this->output->createProgressBar($total);

        // Processa em lotes de 500
        $offset = 0;
        $batchSize = 500;

        while ($offset < $total) {
            $stmt = $this->zproConnection->prepare(
                'SELECT * FROM "Contacts" WHERE "tenantId" = 2 ORDER BY id LIMIT :limit OFFSET :offset'
            );
            $stmt->bindValue(':limit', $batchSize, \PDO::PARAM_INT);
            $stmt->bindValue(':offset', $offset, \PDO::PARAM_INT);
            $stmt->execute();
            $contacts = $stmt->fetchAll(\PDO::FETCH_ASSOC);

            foreach ($contacts as $zproContact) {
                // Formata telefone
                $phone = preg_replace('/[^0-9]/', '', $zproContact['number'] ?? '');
                if (strlen($phone) > 11) {
                    $phone = substr($phone, -11); // Últimos 11 dígitos
                }

                // Verifica se já existe pelo telefone
                $existing = Contact::where('tenant_id', $this->tenantId)
                    ->where('phone', $phone)
                    ->first();

                if ($existing) {
                    $this->contactMapping[$zproContact['id']] = $existing->id;
                    $bar->advance();
                    continue;
                }

                if ($this->dryRun) {
                    $this->contactMapping[$zproContact['id']] = Str::uuid()->toString();
                    $bar->advance();
                    continue;
                }

                // Determina owner_id baseado no último ticket do contato
                $ownerId = $this->getContactOwner($zproContact['id']);

                $contact = Contact::create([
                    'tenant_id' => $this->tenantId,
                    'name' => $zproContact['name'] ?? $zproContact['pushname'] ?? 'Sem nome',
                    'phone' => $phone,
                    'email' => $zproContact['email'] ?: null,
                    'cpf' => $zproContact['cpf'] ?: null,
                    'profile_picture_url' => $zproContact['profilePicUrl'] ?: null,
                    'source' => 'zpro_import',
                    'owner_id' => $ownerId,
                    'extra_data' => [
                        'zpro_id' => $zproContact['id'],
                        'is_group' => $zproContact['isGroup'],
                        'pushname' => $zproContact['pushname'],
                    ],
                    'created_at' => $zproContact['createdAt'],
                    'updated_at' => $zproContact['updatedAt'],
                ]);

                $this->contactMapping[$zproContact['id']] = $contact->id;
                $bar->advance();
            }

            $offset += $batchSize;
        }

        $bar->finish();
        $this->newLine();
        $this->info("  Contatos importados: " . count($this->contactMapping));
    }

    private function getContactOwner($zproContactId)
    {
        // Busca o último ticket do contato para determinar o responsável
        $stmt = $this->zproConnection->prepare(
            'SELECT "userId" FROM "Tickets" WHERE "contactId" = :contactId AND "tenantId" = 2 ORDER BY "updatedAt" DESC LIMIT 1'
        );
        $stmt->execute([':contactId' => $zproContactId]);
        $ticket = $stmt->fetch(\PDO::FETCH_ASSOC);

        if ($ticket && isset($this->userMapping[$ticket['userId']])) {
            return $this->userMapping[$ticket['userId']];
        }

        // Retorna primeiro admin como fallback
        return array_values($this->userMapping)[0] ?? null;
    }

    private function importTickets()
    {
        $this->info('Importando tickets como leads...');

        $countStmt = $this->zproConnection->query('SELECT COUNT(*) as total FROM "Tickets" WHERE "tenantId" = 2');
        $total = $countStmt->fetch(\PDO::FETCH_ASSOC)['total'];

        $bar = $this->output->createProgressBar($total);

        $offset = 0;
        $batchSize = 500;

        while ($offset < $total) {
            $stmt = $this->zproConnection->prepare(
                'SELECT * FROM "Tickets" WHERE "tenantId" = 2 ORDER BY id LIMIT :limit OFFSET :offset'
            );
            $stmt->bindValue(':limit', $batchSize, \PDO::PARAM_INT);
            $stmt->bindValue(':offset', $offset, \PDO::PARAM_INT);
            $stmt->execute();
            $tickets = $stmt->fetchAll(\PDO::FETCH_ASSOC);

            foreach ($tickets as $zproTicket) {
                $contactId = $this->contactMapping[$zproTicket['contactId']] ?? null;

                if (!$contactId) {
                    $bar->advance();
                    continue;
                }

                // Mapeia status (LeadStatusEnum: open, won, lost, disqualified)
                $status = match($zproTicket['status']) {
                    'open' => 'open',
                    'pending' => 'open',
                    'closed' => 'won',
                    default => 'open',
                };

                $ownerId = $this->userMapping[$zproTicket['userId']] ?? null;

                if ($this->dryRun) {
                    $this->ticketMapping[$zproTicket['id']] = Str::uuid()->toString();
                    $bar->advance();
                    continue;
                }

                // Cria Lead
                $lead = Lead::create([
                    'tenant_id' => $this->tenantId,
                    'contact_id' => $contactId,
                    'pipeline_id' => $this->pipelineId,
                    'stage_id' => $this->stageId,
                    'channel_id' => $this->channelId,
                    'owner_id' => $ownerId,
                    'status' => $status,
                    'last_message_at' => $zproTicket['lastMessageAt'],
                    'custom_fields' => [
                        'zpro_ticket_id' => $zproTicket['id'],
                        'zpro_status' => $zproTicket['status'],
                        'zpro_channel' => $zproTicket['channel'],
                    ],
                    'created_at' => $zproTicket['createdAt'],
                    'updated_at' => $zproTicket['updatedAt'],
                ]);

                // Cria Ticket no CRM
                $ticket = Ticket::create([
                    'tenant_id' => $this->tenantId,
                    'lead_id' => $lead->id,
                    'contact_id' => $contactId,
                    'channel_id' => $this->channelId,
                    'assigned_user_id' => $ownerId,
                    'status' => $zproTicket['status'] === 'closed' ? 'closed' : 'open',
                    'closed_at' => $zproTicket['closedAt'],
                    'ia_enabled' => false,
                    'created_at' => $zproTicket['createdAt'],
                    'updated_at' => $zproTicket['updatedAt'],
                ]);

                $this->ticketMapping[$zproTicket['id']] = [
                    'lead_id' => $lead->id,
                    'ticket_id' => $ticket->id,
                ];

                $bar->advance();
            }

            $offset += $batchSize;
        }

        $bar->finish();
        $this->newLine();
        $this->info("  Leads/Tickets importados: " . count($this->ticketMapping));
    }

    private function importMessages()
    {
        $this->info('Importando mensagens...');

        $countStmt = $this->zproConnection->query('SELECT COUNT(*) as total FROM "Messages" WHERE "tenantId" = 2');
        $total = $countStmt->fetch(\PDO::FETCH_ASSOC)['total'];

        $bar = $this->output->createProgressBar($total);

        $offset = 0;
        $batchSize = 1000;
        $imported = 0;

        while ($offset < $total) {
            $stmt = $this->zproConnection->prepare(
                'SELECT * FROM "Messages" WHERE "tenantId" = 2 ORDER BY id LIMIT :limit OFFSET :offset'
            );
            $stmt->bindValue(':limit', $batchSize, \PDO::PARAM_INT);
            $stmt->bindValue(':offset', $offset, \PDO::PARAM_INT);
            $stmt->execute();
            $messages = $stmt->fetchAll(\PDO::FETCH_ASSOC);

            $batch = [];

            foreach ($messages as $zproMessage) {
                $ticketData = $this->ticketMapping[$zproMessage['ticketId']] ?? null;

                if (!$ticketData) {
                    $bar->advance();
                    continue;
                }

                if ($this->dryRun) {
                    $bar->advance();
                    $imported++;
                    continue;
                }

                $batch[] = [
                    'id' => Str::uuid()->toString(),
                    'tenant_id' => $this->tenantId,
                    'ticket_id' => $ticketData['ticket_id'],
                    'message' => $zproMessage['body'] ?? '',
                    'direction' => $zproMessage['fromMe'] ? 'outbound' : 'inbound',
                    'sender_type' => $zproMessage['fromMe'] ? 'user' : 'contact',
                    'sender_id' => null,
                    'sent_at' => $zproMessage['createdAt'],
                    'metadata' => json_encode([
                        'zpro_id' => $zproMessage['id'],
                        'media_url' => $zproMessage['mediaUrl'],
                        'media_type' => $zproMessage['mediaType'],
                    ]),
                    'created_at' => $zproMessage['createdAt'],
                    'updated_at' => $zproMessage['updatedAt'],
                ];

                $imported++;
                $bar->advance();

                // Insere em lotes de 100
                if (count($batch) >= 100) {
                    DB::table('ticket_messages')->insert($batch);
                    $batch = [];
                }
            }

            // Insere restante
            if (!empty($batch)) {
                DB::table('ticket_messages')->insert($batch);
            }

            $offset += $batchSize;
        }

        $bar->finish();
        $this->newLine();
        $this->info("  Mensagens importadas: {$imported}");
    }

    private function mapMessageType($mediaType)
    {
        return match($mediaType) {
            'image' => 'image',
            'video' => 'video',
            'audio', 'ptt' => 'audio',
            'document' => 'document',
            'sticker' => 'sticker',
            default => 'text',
        };
    }
}
