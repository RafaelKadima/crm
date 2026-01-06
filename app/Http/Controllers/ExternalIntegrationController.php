<?php

namespace App\Http\Controllers;

use App\Enums\AuthTypeEnum;
use App\Enums\HttpMethodEnum;
use App\Enums\IntegrationTypeEnum;
use App\Models\ExternalIntegration;
use App\Models\ExternalIntegrationLog;
use App\Models\ExternalIntegrationMapping;
use App\Services\ExternalIntegrationService;
use App\Services\LinxSmartApiService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Validation\Rules\Enum;

class ExternalIntegrationController extends Controller
{
    public function __construct(
        protected ExternalIntegrationService $integrationService,
        protected LinxSmartApiService $linxService
    ) {}

    /**
     * Lista todas as integracoes do tenant.
     */
    public function index(): JsonResponse
    {
        $user = auth()->user();

        // Se não tem tenant_id (super admin sem tenant), retorna vazio
        // Super admins devem usar rotas específicas de super-admin
        if (!$user || !$user->tenant_id) {
            return response()->json([]);
        }

        // Filtro explícito por tenant_id para garantir isolamento
        $integrations = ExternalIntegration::where('tenant_id', $user->tenant_id)
            ->withCount('logs')
            ->with('mappings')
            ->orderBy('name')
            ->get()
            ->map(function ($integration) {
                $lastLog = $integration->logs()->latest('executed_at')->first();
                $integration->last_sync_at = $lastLog?->executed_at;
                $integration->last_sync_status = $lastLog?->status;
                return $integration;
            });

        return response()->json($integrations);
    }

    /**
     * Cria uma nova integracao.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'slug' => 'nullable|string|max:100|unique:external_integrations,slug,NULL,id,tenant_id,' . $request->user()->tenant_id,
            'description' => 'nullable|string|max:1000',
            'type' => ['required', new Enum(IntegrationTypeEnum::class)],
            'endpoint_url' => 'required|url|max:500',
            'http_method' => ['nullable', new Enum(HttpMethodEnum::class)],
            'headers' => 'nullable|array',
            'auth_type' => ['nullable', new Enum(AuthTypeEnum::class)],
            'auth_config' => 'nullable|array',
            'auth_config.username' => 'nullable|string|max:255',
            'auth_config.password' => 'nullable|string|max:255',
            'auth_config.token' => 'nullable|string|max:500',
            'auth_config.header_name' => 'nullable|string|max:100',
            'auth_config.key' => 'nullable|string|max:500',
            // Linx Smart API
            'auth_config.subscription_key' => 'nullable|string|max:100',
            'auth_config.ambiente' => 'nullable|string|in:HOMOLOGACAO,PRODUCAO',
            'auth_config.cnpj_empresa' => 'nullable|string|max:20',
            'trigger_on' => 'nullable|array',
            'trigger_on.*' => 'string|in:lead_created,lead_stage_changed,lead_owner_assigned',
            'trigger_stages' => 'nullable|array',
            'trigger_stages.*' => 'string|uuid',
            'is_active' => 'nullable|boolean',
            'mapping' => 'nullable|array',
        ]);

        // Defaults
        $validated['http_method'] = $validated['http_method'] ?? 'POST';
        $validated['auth_type'] = $validated['auth_type'] ?? 'none';
        $validated['is_active'] = $validated['is_active'] ?? true;
        $validated['trigger_on'] = $validated['trigger_on'] ?? ['lead_created'];

        // Gera slug se nao fornecido
        if (empty($validated['slug'])) {
            $validated['slug'] = \Str::slug($validated['name']);
        }

        $integration = ExternalIntegration::create($validated);

        // Cria mapeamento se fornecido
        if (!empty($validated['mapping'])) {
            ExternalIntegrationMapping::create([
                'tenant_id' => $request->user()->tenant_id,
                'integration_id' => $integration->id,
                'model_type' => 'Lead',
                'mapping' => $validated['mapping'],
            ]);
        }

        return response()->json([
            'message' => 'Integracao criada com sucesso.',
            'integration' => $integration->load('mappings'),
        ], 201);
    }

    /**
     * Exibe uma integracao especifica.
     */
    public function show(ExternalIntegration $integration): JsonResponse
    {
        $integration->load('mappings');
        $integration->loadCount('logs');

        $lastLog = $integration->logs()->latest('executed_at')->first();
        $integration->last_sync_at = $lastLog?->executed_at;
        $integration->last_sync_status = $lastLog?->status;

        return response()->json($integration);
    }

    /**
     * Atualiza uma integracao.
     */
    public function update(Request $request, ExternalIntegration $integration): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'nullable|string|max:255',
            'slug' => 'nullable|string|max:100|unique:external_integrations,slug,' . $integration->id . ',id,tenant_id,' . $request->user()->tenant_id,
            'description' => 'nullable|string|max:1000',
            'type' => ['nullable', new Enum(IntegrationTypeEnum::class)],
            'endpoint_url' => 'nullable|url|max:500',
            'http_method' => ['nullable', new Enum(HttpMethodEnum::class)],
            'headers' => 'nullable|array',
            'auth_type' => ['nullable', new Enum(AuthTypeEnum::class)],
            'auth_config' => 'nullable|array',
            'auth_config.username' => 'nullable|string|max:255',
            'auth_config.password' => 'nullable|string|max:255',
            'auth_config.token' => 'nullable|string|max:500',
            'auth_config.header_name' => 'nullable|string|max:100',
            'auth_config.key' => 'nullable|string|max:500',
            // Linx Smart API
            'auth_config.subscription_key' => 'nullable|string|max:100',
            'auth_config.ambiente' => 'nullable|string|in:HOMOLOGACAO,PRODUCAO',
            'auth_config.cnpj_empresa' => 'nullable|string|max:20',
            'trigger_on' => 'nullable|array',
            'trigger_on.*' => 'string|in:lead_created,lead_stage_changed,lead_owner_assigned',
            'trigger_stages' => 'nullable|array',
            'trigger_stages.*' => 'string|uuid',
            'is_active' => 'nullable|boolean',
        ]);

        $integration->update($validated);

        return response()->json([
            'message' => 'Integracao atualizada com sucesso.',
            'integration' => $integration->fresh()->load('mappings'),
        ]);
    }

    /**
     * Remove uma integracao.
     */
    public function destroy(ExternalIntegration $integration): JsonResponse
    {
        // Remove logs e mapeamentos primeiro
        $integration->logs()->delete();
        $integration->mappings()->delete();
        $integration->delete();

        return response()->json([
            'message' => 'Integracao removida com sucesso.',
        ]);
    }

    /**
     * Toggle ativo/inativo.
     */
    public function toggleActive(ExternalIntegration $integration): JsonResponse
    {
        $integration->update(['is_active' => !$integration->is_active]);

        return response()->json([
            'message' => $integration->is_active ? 'Integracao ativada.' : 'Integracao desativada.',
            'integration' => $integration->fresh(),
        ]);
    }

    /**
     * Testa a conexao com a integracao.
     */
    public function testConnection(ExternalIntegration $integration): JsonResponse
    {
        try {
            $http = Http::timeout(10);

            // Aplica headers
            if ($integration->headers) {
                $http->withHeaders($integration->headers);
            }

            // Aplica autenticacao
            $authConfig = $integration->auth_config ?? [];
            if ($integration->auth_type) {
                switch ($integration->auth_type) {
                    case AuthTypeEnum::BASIC:
                        if (!empty($authConfig['username']) && !empty($authConfig['password'])) {
                            $http->withBasicAuth($authConfig['username'], $authConfig['password']);
                        }
                        break;
                    case AuthTypeEnum::BEARER:
                        if (!empty($authConfig['token'])) {
                            $http->withToken($authConfig['token']);
                        }
                        break;
                    case AuthTypeEnum::API_KEY:
                        $headerName = $authConfig['header_name'] ?? 'X-API-Key';
                        if (!empty($authConfig['key'])) {
                            $http->withHeaders([$headerName => $authConfig['key']]);
                        }
                        break;

                    case AuthTypeEnum::LINX_SMART:
                        // Testa geracao de token Linx Smart
                        $result = $this->linxService->testConnection($authConfig);
                        return response()->json([
                            'success' => $result['success'],
                            'message' => $result['message'],
                            'token_expires_in' => $result['token_expires_in'] ?? null,
                        ]);
                }
            }

            // Payload de teste
            $testPayload = [
                'test' => true,
                'timestamp' => now()->toIso8601String(),
                'source' => 'crm_connection_test',
            ];

            $method = strtolower($integration->http_method->value);
            $response = $http->$method($integration->endpoint_url, $testPayload);

            return response()->json([
                'success' => $response->successful(),
                'message' => $response->successful()
                    ? 'Conexao testada com sucesso! Status: ' . $response->status()
                    : 'Falha na conexao. Status: ' . $response->status(),
                'status_code' => $response->status(),
                'response' => $response->json() ?? $response->body(),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao testar conexao: ' . $e->getMessage(),
            ]);
        }
    }

    /**
     * Lista logs de sincronizacao.
     */
    public function getLogs(Request $request, ExternalIntegration $integration): JsonResponse
    {
        $query = $integration->logs()
            ->orderBy('executed_at', 'desc');

        // Filtro por status
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        $logs = $query->paginate(20);

        return response()->json($logs);
    }

    /**
     * Retenta envio de um log que falhou.
     */
    public function retryLog(ExternalIntegration $integration, ExternalIntegrationLog $log): JsonResponse
    {
        if ($log->integration_id !== $integration->id) {
            return response()->json([
                'message' => 'Log nao pertence a esta integracao.',
            ], 422);
        }

        try {
            $newLog = $this->integrationService->retryLog($log);

            return response()->json([
                'message' => $newLog->status->value === 'success'
                    ? 'Reenvio realizado com sucesso.'
                    : 'Reenvio falhou novamente.',
                'log' => $newLog,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Erro ao reenviar: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Lista campos disponiveis para mapeamento.
     */
    public function getAvailableFields(): JsonResponse
    {
        return response()->json([
            'lead' => [
                'id' => 'ID do Lead',
                'status' => 'Status',
                'value' => 'Valor',
                'expected_close_date' => 'Data prevista de fechamento',
                'temperature' => 'Temperatura',
                'score' => 'Score',
                'created_at' => 'Data de criacao',
            ],
            'contact' => [
                'contact.name' => 'Nome do contato',
                'contact.phone' => 'Telefone',
                'contact.email' => 'Email',
                'contact.cpf' => 'CPF',
                'contact.source' => 'Origem do contato',
                'contact.extra_data.city' => 'Cidade',
                'contact.extra_data.state' => 'Estado',
                'contact.extra_data.address' => 'Endereco',
            ],
            'owner' => [
                'owner.name' => 'Nome do vendedor',
                'owner.email' => 'Email do vendedor',
                'owner.phone' => 'Telefone do vendedor',
                'owner.linx_empresa_id' => 'ID Empresa (Linx)',
                'owner.linx_vendedor_id' => 'ID Vendedor (Linx)',
                'owner.linx_loja_id' => 'ID Loja (Linx)',
                'owner.linx_showroom_id' => 'ID Showroom (Linx)',
            ],
            'pipeline' => [
                'pipeline.name' => 'Nome do pipeline',
                'stage.name' => 'Nome do estagio',
            ],
            'channel' => [
                'channel.name' => 'Nome do canal',
                'channel.type' => 'Tipo do canal',
            ],
            'tenant' => [
                'tenant.name' => 'Nome da empresa',
            ],
        ]);
    }

    /**
     * Lista mapeamentos de uma integracao.
     */
    public function getMappings(ExternalIntegration $integration): JsonResponse
    {
        return response()->json($integration->mappings);
    }

    /**
     * Salva ou atualiza mapeamento de campos.
     */
    public function saveMapping(Request $request, ExternalIntegration $integration): JsonResponse
    {
        $validated = $request->validate([
            'model_type' => 'required|string|in:Lead,Contact',
            'mapping' => 'required|array',
        ]);

        $mapping = $integration->mappings()
            ->where('model_type', $validated['model_type'])
            ->first();

        if ($mapping) {
            $mapping->update(['mapping' => $validated['mapping']]);
        } else {
            $mapping = ExternalIntegrationMapping::create([
                'tenant_id' => $request->user()->tenant_id,
                'integration_id' => $integration->id,
                'model_type' => $validated['model_type'],
                'mapping' => $validated['mapping'],
            ]);
        }

        return response()->json([
            'message' => 'Mapeamento salvo com sucesso.',
            'mapping' => $mapping,
        ]);
    }

    /**
     * Preview do payload com dados de exemplo.
     */
    public function previewPayload(ExternalIntegration $integration): JsonResponse
    {
        $mapping = $integration->getMappingFor('Lead');

        if (!$mapping) {
            return response()->json([
                'message' => 'Nenhum mapeamento configurado.',
                'payload' => null,
            ]);
        }

        // Dados de exemplo
        $sampleData = [
            'id' => 'uuid-exemplo',
            'status' => 'open',
            'value' => 1500.00,
            'expected_close_date' => '2025-01-15',
            'temperature' => 80,
            'score' => 75,
            'created_at' => now()->toIso8601String(),
            'contact' => [
                'name' => 'Joao da Silva',
                'phone' => '5521999999999',
                'email' => 'joao@example.com',
                'cpf' => '12345678900',
                'source' => 'landing_page',
                'extra_data' => [
                    'city' => 'Niteroi',
                    'state' => 'RJ',
                    'address' => 'Rua Exemplo, 123',
                ],
            ],
            'owner' => [
                'name' => 'Maria Vendedora',
                'email' => 'maria@empresa.com',
                'phone' => '5521988888888',
                'linx_empresa_id' => 'EMP001',
                'linx_vendedor_id' => 'VND001',
                'linx_loja_id' => 'LJ001',
                'linx_showroom_id' => 'SH001',
            ],
            'pipeline' => [
                'name' => 'Pipeline Principal',
            ],
            'stage' => [
                'name' => 'Qualificacao',
            ],
            'channel' => [
                'name' => 'WhatsApp Principal',
                'type' => 'whatsapp',
            ],
            'tenant' => [
                'name' => 'Minha Empresa',
            ],
        ];

        // Aplica mapeamento
        $payload = [];
        foreach ($mapping->mapping as $externalField => $crmField) {
            $payload[$externalField] = data_get($sampleData, $crmField);
        }

        return response()->json([
            'mapping' => $mapping->mapping,
            'payload' => $payload,
        ]);
    }

    /**
     * Retorna templates pre-configurados.
     */
    public function getTemplates(): JsonResponse
    {
        $templates = [
            [
                'id' => 'linx-smart',
                'name' => 'Linx Smart API',
                'description' => 'Envia leads para o sistema Linx Smart com autenticacao automatica',
                'type' => 'erp',
                'trigger_on' => ['lead_created'],
                'auth_type' => 'linx_smart',
                'mapping' => [
                    'nome' => 'contact.name',
                    'telefone' => 'contact.phone',
                    'email' => 'contact.email',
                    'empresa_id' => 'owner.linx_empresa_id',
                    'vendedor_id' => 'owner.linx_vendedor_id',
                    'loja_id' => 'owner.linx_loja_id',
                    'showroom_id' => 'owner.linx_showroom_id',
                    'origem' => 'channel.name',
                ],
            ],
            [
                'id' => 'webhook-crm',
                'name' => 'Webhook CRM Externo',
                'description' => 'Envia leads para CRM externo via webhook',
                'type' => 'crm',
                'trigger_on' => ['lead_created'],
                'auth_type' => 'basic',
                'mapping' => [
                    'nome' => 'contact.name',
                    'telefone' => 'contact.phone',
                    'email' => 'contact.email',
                    'cidade' => 'contact.extra_data.city',
                    'estado' => 'contact.extra_data.state',
                    'origem' => 'channel.name',
                    'loja' => 'tenant.name',
                ],
            ],
            [
                'id' => 'generic-api',
                'name' => 'API Generica',
                'description' => 'Template basico para integracao com qualquer API REST',
                'type' => 'other',
                'trigger_on' => ['lead_created'],
                'auth_type' => 'bearer',
                'mapping' => [
                    'name' => 'contact.name',
                    'phone' => 'contact.phone',
                    'email' => 'contact.email',
                    'source' => 'channel.name',
                ],
            ],
        ];

        return response()->json($templates);
    }
}
