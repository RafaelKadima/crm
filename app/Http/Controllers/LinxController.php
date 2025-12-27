<?php

namespace App\Http\Controllers;

use App\Models\Lead;
use App\Models\Tenant;
use App\Services\LinxSmartApiService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class LinxController extends Controller
{
    // Endpoint para cadastro de cliente simplificado
    private const LINX_CADASTRO_ENDPOINT = 'https://auto-gwsmartapi.linx.com.br/api-cliente/CadastrarClienteSimplificado';

    public function __construct(
        protected LinxSmartApiService $linxService
    ) {}

    /**
     * Envia lead para o Linx Smart API.
     */
    public function sendLeadToLinx(Request $request, string $leadId): JsonResponse
    {
        $user = $request->user();
        $tenant = Tenant::find($user->tenant_id);

        // Verifica se tenant tem integração Linx habilitada
        if (!$tenant || !$tenant->linx_enabled) {
            return response()->json([
                'success' => false,
                'message' => 'Integração Linx não está habilitada para este tenant.',
            ], 422);
        }

        // Verifica se tenant tem configuração Linx completa
        if (empty($tenant->linx_empresa_id) || empty($tenant->linx_revenda_id)) {
            return response()->json([
                'success' => false,
                'message' => 'Configuração Linx do tenant incompleta. Configure Empresa e Revenda nas configurações.',
            ], 422);
        }

        // Busca o lead com contato e owner
        $lead = Lead::with(['contact', 'owner'])
            ->where('tenant_id', $user->tenant_id)
            ->find($leadId);

        if (!$lead) {
            return response()->json([
                'success' => false,
                'message' => 'Lead não encontrado.',
            ], 404);
        }

        // Verifica se lead tem contato com dados mínimos
        if (!$lead->contact || empty($lead->contact->name)) {
            return response()->json([
                'success' => false,
                'message' => 'Lead precisa ter pelo menos o nome do contato.',
            ], 422);
        }

        // Verifica se owner tem código Linx configurado
        $vendedorId = $lead->owner?->linx_vendedor_id;
        if (empty($vendedorId)) {
            return response()->json([
                'success' => false,
                'message' => 'Vendedor responsável não tem código Linx configurado.',
            ], 422);
        }

        // Monta payload para Linx
        $payload = $this->buildLinxPayload($lead, $tenant, $vendedorId);

        // Envia para Linx
        try {
            $result = $this->sendToLinx($payload, $tenant);

            if ($result['success']) {
                // Salva código do cliente no lead
                $codigoCliente = $result['data']['CodigoCliente'] ?? null;

                if ($codigoCliente) {
                    $customerData = $lead->customer_data ?? [];
                    $customerData['linx_codigo_cliente'] = $codigoCliente;
                    $lead->customer_data = $customerData;
                    $lead->save();
                }

                return response()->json([
                    'success' => true,
                    'message' => 'Lead enviado para o Linx com sucesso!',
                    'linx_codigo_cliente' => $codigoCliente,
                    'data' => $result['data'],
                ]);
            }

            return response()->json([
                'success' => false,
                'message' => 'Erro ao enviar para o Linx: ' . ($result['error'] ?? 'Erro desconhecido'),
                'details' => $result['data'] ?? null,
            ], 422);

        } catch (\Exception $e) {
            Log::error('LinxController - Erro ao enviar lead para Linx', [
                'lead_id' => $leadId,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erro interno ao enviar para o Linx: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Monta o payload para a API do Linx.
     */
    private function buildLinxPayload(Lead $lead, Tenant $tenant, string $vendedorId): array
    {
        $contact = $lead->contact;
        $customerData = $lead->customer_data ?? [];

        return [
            // Campos obrigatórios
            'Nome' => $contact->name,
            'Empresa' => (int) $tenant->linx_empresa_id,
            'Revenda' => (int) $tenant->linx_revenda_id,
            'UsuarioVendedor' => (int) $vendedorId,

            // Campos opcionais mas importantes
            'Telefone' => $this->formatPhone($contact->phone),
            'Email' => $contact->email ?? null,

            // Campos opcionais para fechamento
            'CPF' => $this->formatCpf($contact->cpf ?? $customerData['cpf'] ?? null),
            'DataNascimento' => $this->formatDate($customerData['birth_date'] ?? null),
            'CEP' => $this->formatCep($customerData['cep'] ?? null),
            'Endereco' => $customerData['address'] ?? null,
            'Bairro' => $customerData['neighborhood'] ?? null,
            'Cidade' => $customerData['city'] ?? null,
            'Estado' => $customerData['state'] ?? null,
            'Numero' => $customerData['number'] ?? null,
            'Complemento' => $customerData['complement'] ?? null,
        ];
    }

    /**
     * Envia os dados para a API do Linx.
     */
    private function sendToLinx(array $payload, Tenant $tenant): array
    {
        // Remove campos nulos do payload
        $payload = array_filter($payload, fn($value) => $value !== null && $value !== '');

        // Configuração de autenticação
        // Por enquanto, usa configuração fixa ou do tenant
        $config = [
            'subscription_key' => config('services.linx.subscription_key', env('LINX_SUBSCRIPTION_KEY')),
            'ambiente' => config('services.linx.ambiente', env('LINX_AMBIENTE', 'PRODUCAO')),
            'username' => config('services.linx.username', env('LINX_USERNAME')),
            'password' => config('services.linx.password', env('LINX_PASSWORD')),
            'cnpj_empresa' => config('services.linx.cnpj_empresa', env('LINX_CNPJ_EMPRESA')),
        ];

        // Se tenant tem URL customizada, usa ela
        $url = $tenant->linx_api_url ?: self::LINX_CADASTRO_ENDPOINT;

        // Faz a requisição autenticada
        return $this->linxService->makeAuthenticatedRequest(
            'POST',
            $url,
            'tenant_' . $tenant->id,
            $config,
            $payload
        );
    }

    /**
     * Formata telefone para o padrão Linx.
     */
    private function formatPhone(?string $phone): ?string
    {
        if (!$phone) return null;

        // Remove tudo que não é número
        $numbers = preg_replace('/\D/', '', $phone);

        // Remove 55 do início se tiver
        if (str_starts_with($numbers, '55') && strlen($numbers) > 11) {
            $numbers = substr($numbers, 2);
        }

        return $numbers ?: null;
    }

    /**
     * Formata CPF para o padrão Linx (apenas números).
     */
    private function formatCpf(?string $cpf): ?string
    {
        if (!$cpf) return null;

        $numbers = preg_replace('/\D/', '', $cpf);

        return strlen($numbers) === 11 ? $numbers : null;
    }

    /**
     * Formata CEP para o padrão Linx.
     */
    private function formatCep(?string $cep): ?string
    {
        if (!$cep) return null;

        $numbers = preg_replace('/\D/', '', $cep);

        return strlen($numbers) === 8 ? $numbers : null;
    }

    /**
     * Formata data para o padrão Linx (YYYY-MM-DD).
     */
    private function formatDate(?string $date): ?string
    {
        if (!$date) return null;

        // Se já está no formato ISO
        if (preg_match('/^\d{4}-\d{2}-\d{2}/', $date)) {
            return substr($date, 0, 10);
        }

        // Se está no formato BR (DD/MM/YYYY)
        if (preg_match('/^(\d{2})\/(\d{2})\/(\d{4})$/', $date, $matches)) {
            return "{$matches[3]}-{$matches[2]}-{$matches[1]}";
        }

        return null;
    }

    /**
     * Verifica se tenant/user tem configuração Linx válida.
     */
    public function checkLinxConfig(Request $request): JsonResponse
    {
        $user = $request->user();
        $tenant = Tenant::find($user->tenant_id);

        $tenantConfig = [
            'enabled' => $tenant->linx_enabled ?? false,
            'empresa_id' => $tenant->linx_empresa_id ?? null,
            'revenda_id' => $tenant->linx_revenda_id ?? null,
            'has_config' => !empty($tenant->linx_empresa_id) && !empty($tenant->linx_revenda_id),
        ];

        $userConfig = [
            'vendedor_id' => $user->linx_vendedor_id ?? null,
            'has_config' => !empty($user->linx_vendedor_id),
        ];

        return response()->json([
            'tenant' => $tenantConfig,
            'user' => $userConfig,
            'can_send' => $tenantConfig['enabled'] && $tenantConfig['has_config'] && $userConfig['has_config'],
        ]);
    }
}
