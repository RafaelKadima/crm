<?php

namespace App\Services;

use App\Enums\AuthTypeEnum;
use App\Enums\IntegrationStatusEnum;
use App\Models\ExternalIntegration;
use App\Models\ExternalIntegrationLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ExternalIntegrationService
{
    protected LinxSmartApiService $linxService;

    public function __construct(LinxSmartApiService $linxService)
    {
        $this->linxService = $linxService;
    }

    /**
     * Envia dados para todas as integracoes ativas do tenant.
     *
     * @param Model $model O modelo a ser sincronizado
     * @param string $tenantId ID do tenant
     * @param string|null $triggerEvent Evento que disparou (lead_created, lead_stage_changed, etc)
     * @param string|null $stageId ID do estagio (usado quando trigger = lead_stage_changed)
     */
    public function syncModel(Model $model, string $tenantId, ?string $triggerEvent = null, ?string $stageId = null): array
    {
        $modelType = class_basename($model);
        $results = [];

        $query = ExternalIntegration::where('tenant_id', $tenantId)
            ->where('is_active', true);

        // Filtra por evento de trigger se especificado
        if ($triggerEvent) {
            $query->where(function ($q) use ($triggerEvent) {
                $q->whereJsonContains('trigger_on', $triggerEvent)
                  ->orWhereNull('trigger_on');
            });
        }

        $integrations = $query->get();

        foreach ($integrations as $integration) {
            // Se o trigger e lead_stage_changed, verifica se o estagio esta configurado
            if ($triggerEvent === 'lead_stage_changed' && $stageId) {
                if (!$integration->shouldTriggerForStage($stageId)) {
                    continue;
                }
            }

            $mapping = $integration->getMappingFor($modelType);

            if (!$mapping) {
                continue;
            }

            $result = $this->sendToIntegration($integration, $model, $mapping);
            $results[] = $result;
        }

        return $results;
    }

    /**
     * Envia dados para uma integração específica.
     */
    public function sendToIntegration(ExternalIntegration $integration, Model $model, $mapping): ExternalIntegrationLog
    {
        $modelType = class_basename($model);
        $payload = $mapping->applyMapping($model);

        try {
            $response = $this->makeHttpRequest($integration, $payload);

            $log = ExternalIntegrationLog::create([
                'tenant_id' => $integration->tenant_id,
                'integration_id' => $integration->id,
                'model_type' => $modelType,
                'model_id' => $model->id,
                'status' => $response->successful() 
                    ? IntegrationStatusEnum::SUCCESS 
                    : IntegrationStatusEnum::ERROR,
                'request_payload' => $payload,
                'response_payload' => [
                    'status_code' => $response->status(),
                    'body' => $response->json() ?? $response->body(),
                ],
                'executed_at' => now(),
            ]);

            return $log;

        } catch (\Exception $e) {
            Log::error('External integration error', [
                'integration_id' => $integration->id,
                'model_type' => $modelType,
                'model_id' => $model->id,
                'error' => $e->getMessage(),
            ]);

            return ExternalIntegrationLog::create([
                'tenant_id' => $integration->tenant_id,
                'integration_id' => $integration->id,
                'model_type' => $modelType,
                'model_id' => $model->id,
                'status' => IntegrationStatusEnum::ERROR,
                'request_payload' => $payload,
                'response_payload' => [
                    'error' => $e->getMessage(),
                ],
                'executed_at' => now(),
            ]);
        }
    }

    /**
     * Faz a requisicao HTTP para a integracao.
     */
    protected function makeHttpRequest(ExternalIntegration $integration, array $payload)
    {
        $http = Http::timeout(30);

        // Adiciona headers se configurados
        if ($integration->headers) {
            $http->withHeaders($integration->headers);
        }

        // Aplica autenticacao baseada no tipo configurado
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
                    // Obtem token valido via LinxSmartApiService
                    $token = $this->linxService->getValidToken(
                        $integration->id,
                        $authConfig
                    );

                    if ($token) {
                        $http->withHeaders([
                            'Cache-Control' => 'no-cache',
                            'Content-Type' => 'application/json',
                            'Ocp-Apim-Subscription-Key' => $authConfig['subscription_key'] ?? '',
                            'AMBIENTE' => $authConfig['ambiente'] ?? '',
                            'Authorization' => 'Bearer ' . $token,
                        ]);
                    } else {
                        throw new \Exception('Nao foi possivel obter token da Linx Smart API');
                    }
                    break;
            }
        }

        $method = strtolower($integration->http_method->value);

        return $http->$method($integration->endpoint_url, $payload);
    }

    /**
     * Retenta envio para uma integração que falhou.
     */
    public function retryLog(ExternalIntegrationLog $log): ExternalIntegrationLog
    {
        $integration = $log->integration;
        $modelClass = 'App\\Models\\' . $log->model_type;
        $model = $modelClass::find($log->model_id);

        if (!$model) {
            throw new \Exception('Model não encontrado.');
        }

        $mapping = $integration->getMappingFor($log->model_type);

        if (!$mapping) {
            throw new \Exception('Mapeamento não encontrado.');
        }

        return $this->sendToIntegration($integration, $model, $mapping);
    }
}


