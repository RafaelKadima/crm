<?php

namespace App\Services;

use App\Enums\WhatsAppTemplateCategoryEnum;
use App\Enums\WhatsAppTemplateStatusEnum;
use App\Models\Channel;
use App\Models\WhatsAppTemplate;
use Illuminate\Http\Client\RequestException;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * Service para gerenciar templates do WhatsApp Business API.
 * 
 * Integra com a Graph API do Meta para:
 * - Criar templates
 * - Listar templates
 * - Deletar templates
 * - Consultar status de aprovação
 */
class WhatsAppTemplateService
{
    protected string $apiVersion = 'v18.0';
    protected string $baseUrl;

    public function __construct()
    {
        $this->baseUrl = "https://graph.facebook.com/{$this->apiVersion}";
    }

    // ==========================================
    // OPERAÇÕES LOCAIS (BANCO DE DADOS)
    // ==========================================

    /**
     * Lista templates do banco de dados com filtros.
     */
    public function list(
        string $tenantId,
        ?string $channelId = null,
        ?string $category = null,
        ?string $status = null,
        ?string $search = null,
        int $perPage = 20
    ): LengthAwarePaginator {
        $query = WhatsAppTemplate::where('tenant_id', $tenantId);

        if ($channelId) {
            $query->where('channel_id', $channelId);
        }

        if ($category) {
            $query->where('category', $category);
        }

        if ($status) {
            $query->where('status', $status);
        }

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'LIKE', "%{$search}%")
                  ->orWhere('body_text', 'LIKE', "%{$search}%");
            });
        }

        return $query->with('channel:id,name')
            ->orderByDesc('created_at')
            ->paginate($perPage);
    }

    /**
     * Busca um template pelo ID.
     */
    public function find(string $id): ?WhatsAppTemplate
    {
        return WhatsAppTemplate::with('channel')->find($id);
    }

    /**
     * Busca templates aprovados de um canal (para uso em envios).
     */
    public function getApprovedTemplates(string $channelId): Collection
    {
        return WhatsAppTemplate::where('channel_id', $channelId)
            ->approved()
            ->active()
            ->orderBy('name')
            ->get();
    }

    // ==========================================
    // INTEGRAÇÃO COM META API
    // ==========================================

    /**
     * Cria um template no Meta e salva no banco.
     */
    public function create(array $data, Channel $channel): WhatsAppTemplate
    {
        // Valida e prepara os dados
        $templateData = $this->prepareTemplateData($data, $channel);

        // Cria registro local primeiro
        $template = WhatsAppTemplate::create([
            'tenant_id' => $channel->tenant_id,
            'channel_id' => $channel->id,
            'name' => $templateData['name'],
            'category' => $templateData['category'],
            'language' => $templateData['language'],
            'header_type' => $templateData['header_type'] ?? null,
            'header_text' => $templateData['header_text'] ?? null,
            'header_handle' => $templateData['header_handle'] ?? null,
            'body_text' => $templateData['body_text'],
            'footer_text' => $templateData['footer_text'] ?? null,
            'buttons' => $templateData['buttons'] ?? null,
            'status' => WhatsAppTemplateStatusEnum::PENDING,
        ]);

        // Envia para o Meta
        try {
            $metaPayload = $template->toMetaPayload();
            $response = $this->submitToMeta($channel, $metaPayload);

            // Atualiza com a resposta do Meta
            $template->meta_template_id = $response['id'] ?? null;
            $template->status = WhatsAppTemplateStatusEnum::tryFrom($response['status'] ?? 'PENDING') 
                ?? WhatsAppTemplateStatusEnum::PENDING;
            $template->request_payload = $metaPayload;
            $template->response_payload = $response;
            $template->submitted_at = now();
            $template->save();

            Log::info('WhatsApp template created successfully', [
                'template_id' => $template->id,
                'meta_template_id' => $template->meta_template_id,
                'status' => $template->status->value,
            ]);

        } catch (\Exception $e) {
            // Marca como erro mas mantém no banco para retry
            $template->status = WhatsAppTemplateStatusEnum::REJECTED;
            $template->rejection_reason = $e->getMessage();
            $template->save();

            Log::error('Failed to create WhatsApp template on Meta', [
                'template_id' => $template->id,
                'error' => $e->getMessage(),
            ]);

            throw $e;
        }

        return $template;
    }

    /**
     * Submete template para a API do Meta.
     */
    protected function submitToMeta(Channel $channel, array $payload): array
    {
        $config = $channel->config ?? [];
        $wabaId = $config['business_account_id'] ?? null;
        $accessToken = $config['access_token'] ?? null;

        if (!$wabaId || !$accessToken) {
            throw new \Exception('Canal não possui WABA ID ou Access Token configurado.');
        }

        $response = Http::withToken($accessToken)
            ->timeout(30)
            ->post("{$this->baseUrl}/{$wabaId}/message_templates", $payload);

        if (!$response->successful()) {
            $error = $response->json();
            $errorMessage = $error['error']['message'] ?? 'Erro desconhecido ao criar template';
            
            Log::error('Meta API error creating template', [
                'status' => $response->status(),
                'error' => $error,
                'payload' => $payload,
            ]);

            throw new \Exception($errorMessage);
        }

        return $response->json();
    }

    /**
     * Lista templates diretamente da API do Meta.
     */
    public function listFromMeta(Channel $channel, ?string $category = null): array
    {
        $config = $channel->config ?? [];
        $wabaId = $config['business_account_id'] ?? null;
        $accessToken = $config['access_token'] ?? null;

        if (!$wabaId || !$accessToken) {
            throw new \Exception('Canal não possui WABA ID ou Access Token configurado.');
        }

        $url = "{$this->baseUrl}/{$wabaId}/message_templates";
        $params = [
            'fields' => 'id,name,status,category,language,components,rejected_reason,quality_score',
            'limit' => 100,
        ];

        if ($category) {
            $params['category'] = $category;
        }

        $response = Http::withToken($accessToken)
            ->timeout(30)
            ->get($url, $params);

        if (!$response->successful()) {
            $error = $response->json();
            throw new \Exception($error['error']['message'] ?? 'Erro ao listar templates do Meta');
        }

        return $response->json()['data'] ?? [];
    }

    /**
     * Sincroniza templates do Meta com o banco local.
     */
    public function syncFromMeta(Channel $channel): array
    {
        $metaTemplates = $this->listFromMeta($channel);
        $synced = ['created' => 0, 'updated' => 0, 'total' => count($metaTemplates)];

        foreach ($metaTemplates as $metaTemplate) {
            $existing = WhatsAppTemplate::where('channel_id', $channel->id)
                ->where('meta_template_id', $metaTemplate['id'])
                ->first();

            if ($existing) {
                // Atualiza status
                $existing->status = WhatsAppTemplateStatusEnum::tryFrom($metaTemplate['status']) 
                    ?? $existing->status;
                $existing->rejection_reason = $metaTemplate['rejected_reason'] ?? null;
                $existing->response_payload = $metaTemplate;
                $existing->save();
                $synced['updated']++;
            } else {
                // Cria registro local para template existente no Meta
                $templateData = $this->parseMetaTemplate($metaTemplate);
                
                WhatsAppTemplate::create([
                    'tenant_id' => $channel->tenant_id,
                    'channel_id' => $channel->id,
                    'meta_template_id' => $metaTemplate['id'],
                    'name' => $metaTemplate['name'],
                    'category' => WhatsAppTemplateCategoryEnum::tryFrom($metaTemplate['category']) 
                        ?? WhatsAppTemplateCategoryEnum::UTILITY,
                    'language' => $metaTemplate['language'] ?? 'pt_BR',
                    'status' => WhatsAppTemplateStatusEnum::tryFrom($metaTemplate['status']) 
                        ?? WhatsAppTemplateStatusEnum::PENDING,
                    'body_text' => $templateData['body_text'],
                    'header_type' => $templateData['header_type'],
                    'header_text' => $templateData['header_text'],
                    'footer_text' => $templateData['footer_text'],
                    'buttons' => $templateData['buttons'],
                    'response_payload' => $metaTemplate,
                    'submitted_at' => now(),
                ]);
                $synced['created']++;
            }
        }

        Log::info('WhatsApp templates synced from Meta', [
            'channel_id' => $channel->id,
            'synced' => $synced,
        ]);

        return $synced;
    }

    /**
     * Parseia um template do Meta para o formato local.
     */
    protected function parseMetaTemplate(array $metaTemplate): array
    {
        $data = [
            'body_text' => '',
            'header_type' => null,
            'header_text' => null,
            'footer_text' => null,
            'buttons' => null,
        ];

        foreach ($metaTemplate['components'] ?? [] as $component) {
            switch ($component['type']) {
                case 'HEADER':
                    $data['header_type'] = $component['format'] ?? 'TEXT';
                    if ($data['header_type'] === 'TEXT') {
                        $data['header_text'] = $component['text'] ?? null;
                    }
                    break;

                case 'BODY':
                    $data['body_text'] = $component['text'] ?? '';
                    break;

                case 'FOOTER':
                    $data['footer_text'] = $component['text'] ?? null;
                    break;

                case 'BUTTONS':
                    $data['buttons'] = $component['buttons'] ?? null;
                    break;
            }
        }

        return $data;
    }

    /**
     * Consulta o status de um template específico no Meta.
     */
    public function checkStatus(WhatsAppTemplate $template): WhatsAppTemplate
    {
        $channel = $template->channel;
        $config = $channel->config ?? [];
        $accessToken = $config['access_token'] ?? null;

        if (!$template->meta_template_id || !$accessToken) {
            return $template;
        }

        try {
            $response = Http::withToken($accessToken)
                ->timeout(15)
                ->get("{$this->baseUrl}/{$template->meta_template_id}", [
                    'fields' => 'id,name,status,category,language,rejected_reason,quality_score',
                ]);

            if ($response->successful()) {
                $data = $response->json();
                $template->updateFromMetaResponse($data);
            }

        } catch (\Exception $e) {
            Log::warning('Failed to check template status', [
                'template_id' => $template->id,
                'error' => $e->getMessage(),
            ]);
        }

        return $template;
    }

    /**
     * Deleta um template do Meta e do banco local.
     */
    public function delete(WhatsAppTemplate $template): bool
    {
        $channel = $template->channel;
        $config = $channel->config ?? [];
        $accessToken = $config['access_token'] ?? null;
        $wabaId = $config['business_account_id'] ?? null;

        // Tenta deletar do Meta se existir
        if ($template->meta_template_id && $accessToken && $wabaId) {
            try {
                $response = Http::withToken($accessToken)
                    ->timeout(15)
                    ->delete("{$this->baseUrl}/{$wabaId}/message_templates", [
                        'name' => $template->name,
                    ]);

                if (!$response->successful()) {
                    $error = $response->json();
                    Log::warning('Failed to delete template from Meta', [
                        'template_id' => $template->id,
                        'error' => $error,
                    ]);
                    // Continua para deletar localmente mesmo se falhar no Meta
                }

            } catch (\Exception $e) {
                Log::warning('Exception deleting template from Meta', [
                    'template_id' => $template->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        // Soft delete local
        $template->status = WhatsAppTemplateStatusEnum::DELETED;
        $template->is_active = false;
        $template->save();
        $template->delete();

        Log::info('WhatsApp template deleted', [
            'template_id' => $template->id,
            'name' => $template->name,
        ]);

        return true;
    }

    // ==========================================
    // HELPERS
    // ==========================================

    /**
     * Prepara os dados do template para criação.
     */
    protected function prepareTemplateData(array $data, Channel $channel): array
    {
        // Sanitiza o nome (snake_case, sem espaços, lowercase)
        $name = Str::snake(Str::lower(trim($data['name'])));
        $name = preg_replace('/[^a-z0-9_]/', '', $name);

        // Valida categoria
        $category = WhatsAppTemplateCategoryEnum::tryFrom($data['category'] ?? 'UTILITY')
            ?? WhatsAppTemplateCategoryEnum::UTILITY;

        // Prepara botões se existirem
        $buttons = null;
        if (!empty($data['buttons'])) {
            $buttons = $this->prepareButtons($data['buttons']);
        }

        return [
            'name' => $name,
            'category' => $category,
            'language' => $data['language'] ?? 'pt_BR',
            'header_type' => $data['header_type'] ?? null,
            'header_text' => $data['header_text'] ?? null,
            'header_handle' => $data['header_handle'] ?? null,
            'body_text' => trim($data['body_text']),
            'footer_text' => $data['footer_text'] ?? null,
            'buttons' => $buttons,
        ];
    }

    /**
     * Prepara os botões para o formato do Meta.
     */
    protected function prepareButtons(array $buttons): array
    {
        $prepared = [];

        foreach ($buttons as $button) {
            $type = $button['type'] ?? 'QUICK_REPLY';

            switch ($type) {
                case 'QUICK_REPLY':
                    $prepared[] = [
                        'type' => 'QUICK_REPLY',
                        'text' => $button['text'] ?? 'Responder',
                    ];
                    break;

                case 'URL':
                    $prepared[] = [
                        'type' => 'URL',
                        'text' => $button['text'] ?? 'Acessar',
                        'url' => $button['url'] ?? '',
                    ];
                    break;

                case 'PHONE_NUMBER':
                    $prepared[] = [
                        'type' => 'PHONE_NUMBER',
                        'text' => $button['text'] ?? 'Ligar',
                        'phone_number' => $button['phone_number'] ?? '',
                    ];
                    break;

                case 'COPY_CODE':
                    $prepared[] = [
                        'type' => 'COPY_CODE',
                        'example' => $button['example'] ?? 'CODIGO123',
                    ];
                    break;
            }
        }

        return $prepared;
    }

    /**
     * Valida se um nome de template está disponível.
     */
    public function isNameAvailable(string $name, string $channelId, string $language = 'pt_BR', ?string $excludeId = null): bool
    {
        $sanitizedName = Str::snake(Str::lower(trim($name)));
        
        $query = WhatsAppTemplate::where('channel_id', $channelId)
            ->where('name', $sanitizedName)
            ->where('language', $language);

        if ($excludeId) {
            $query->where('id', '!=', $excludeId);
        }

        return !$query->exists();
    }

    /**
     * Retorna estatísticas de templates de um canal.
     */
    public function getStats(string $channelId): array
    {
        $templates = WhatsAppTemplate::where('channel_id', $channelId)->get();

        return [
            'total' => $templates->count(),
            'approved' => $templates->where('status', WhatsAppTemplateStatusEnum::APPROVED)->count(),
            'pending' => $templates->where('status', WhatsAppTemplateStatusEnum::PENDING)->count(),
            'rejected' => $templates->where('status', WhatsAppTemplateStatusEnum::REJECTED)->count(),
            'by_category' => [
                'MARKETING' => $templates->where('category', WhatsAppTemplateCategoryEnum::MARKETING)->count(),
                'UTILITY' => $templates->where('category', WhatsAppTemplateCategoryEnum::UTILITY)->count(),
                'AUTHENTICATION' => $templates->where('category', WhatsAppTemplateCategoryEnum::AUTHENTICATION)->count(),
            ],
        ];
    }
}

