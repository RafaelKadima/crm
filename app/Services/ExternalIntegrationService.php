<?php

namespace App\Services;

use App\Enums\IntegrationStatusEnum;
use App\Models\ExternalIntegration;
use App\Models\ExternalIntegrationLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ExternalIntegrationService
{
    /**
     * Envia dados para todas as integrações ativas do tenant.
     */
    public function syncModel(Model $model, string $tenantId): array
    {
        $modelType = class_basename($model);
        $results = [];

        $integrations = ExternalIntegration::where('tenant_id', $tenantId)
            ->where('is_active', true)
            ->get();

        foreach ($integrations as $integration) {
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
     * Faz a requisição HTTP para a integração.
     */
    protected function makeHttpRequest(ExternalIntegration $integration, array $payload)
    {
        $http = Http::timeout(30);

        // Adiciona headers se configurados
        if ($integration->headers) {
            $http->withHeaders($integration->headers);
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


