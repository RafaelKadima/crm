<?php

namespace App\Modules\Meta\Services;

use App\Models\MetaIntegration;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class MetaTemplateService
{
    protected string $apiVersion;
    protected string $baseUrl;

    public function __construct()
    {
        $this->apiVersion = config('services.meta.api_version', 'v19.0');
        $this->baseUrl = "https://graph.facebook.com/{$this->apiVersion}";
    }

    /**
     * Lista todos os templates da WABA.
     */
    public function list(MetaIntegration $integration, ?string $status = null): array
    {
        $this->validateIntegration($integration);

        $params = ['limit' => 100];
        if ($status) {
            $params['status'] = $status;
        }

        $response = Http::withToken($integration->access_token)
            ->get("{$this->baseUrl}/{$integration->waba_id}/message_templates", $params);

        if (!$response->successful()) {
            $error = $response->json()['error'] ?? [];
            throw new \Exception('Failed to list templates: ' . ($error['message'] ?? 'Unknown error'));
        }

        return $response->json()['data'] ?? [];
    }

    /**
     * Lista apenas templates aprovados.
     */
    public function listApproved(MetaIntegration $integration): array
    {
        return $this->list($integration, 'APPROVED');
    }

    /**
     * Obtém um template específico pelo nome.
     */
    public function get(MetaIntegration $integration, string $templateName): ?array
    {
        $templates = $this->list($integration);

        foreach ($templates as $template) {
            if ($template['name'] === $templateName) {
                return $template;
            }
        }

        return null;
    }

    /**
     * Cria um novo template na Meta.
     */
    public function create(MetaIntegration $integration, array $data): array
    {
        $this->validateIntegration($integration);

        $payload = $this->buildTemplatePayload($data);

        $response = Http::withToken($integration->access_token)
            ->post("{$this->baseUrl}/{$integration->waba_id}/message_templates", $payload);

        if (!$response->successful()) {
            $error = $response->json()['error'] ?? [];
            Log::error('Meta template creation failed', [
                'integration_id' => $integration->id,
                'error' => $error,
            ]);
            throw new \Exception('Failed to create template: ' . ($error['message'] ?? 'Unknown error'));
        }

        $result = $response->json();

        Log::info('Meta template created', [
            'integration_id' => $integration->id,
            'template_id' => $result['id'] ?? null,
            'template_name' => $data['name'] ?? null,
        ]);

        return $result;
    }

    /**
     * Atualiza um template existente.
     */
    public function update(MetaIntegration $integration, string $templateId, array $data): array
    {
        $this->validateIntegration($integration);

        $payload = $this->buildTemplatePayload($data, true);

        $response = Http::withToken($integration->access_token)
            ->post("{$this->baseUrl}/{$templateId}", $payload);

        if (!$response->successful()) {
            $error = $response->json()['error'] ?? [];
            throw new \Exception('Failed to update template: ' . ($error['message'] ?? 'Unknown error'));
        }

        return $response->json();
    }

    /**
     * Deleta um template.
     */
    public function delete(MetaIntegration $integration, string $templateName): bool
    {
        $this->validateIntegration($integration);

        $response = Http::withToken($integration->access_token)
            ->delete("{$this->baseUrl}/{$integration->waba_id}/message_templates", [
                'name' => $templateName,
            ]);

        if (!$response->successful()) {
            $error = $response->json()['error'] ?? [];
            Log::error('Meta template deletion failed', [
                'integration_id' => $integration->id,
                'template_name' => $templateName,
                'error' => $error,
            ]);
            return false;
        }

        Log::info('Meta template deleted', [
            'integration_id' => $integration->id,
            'template_name' => $templateName,
        ]);

        return true;
    }

    /**
     * Obtém categorias de template disponíveis.
     */
    public function getCategories(): array
    {
        return [
            'AUTHENTICATION' => 'Autenticação',
            'MARKETING' => 'Marketing',
            'UTILITY' => 'Utilitário',
        ];
    }

    /**
     * Obtém idiomas suportados.
     */
    public function getLanguages(): array
    {
        return [
            'pt_BR' => 'Português (Brasil)',
            'en_US' => 'English (US)',
            'es' => 'Español',
            'es_AR' => 'Español (Argentina)',
            'es_MX' => 'Español (México)',
        ];
    }

    /**
     * Valida nome do template (snake_case, sem espaços).
     */
    public function validateTemplateName(string $name): bool
    {
        return preg_match('/^[a-z][a-z0-9_]{0,511}$/', $name) === 1;
    }

    /**
     * Conta variáveis no texto do template.
     */
    public function countVariables(string $text): int
    {
        preg_match_all('/\{\{(\d+)\}\}/', $text, $matches);
        return count(array_unique($matches[1] ?? []));
    }

    /**
     * Substitui variáveis no texto do template.
     */
    public function replaceVariables(string $text, array $variables): string
    {
        foreach ($variables as $index => $value) {
            $text = str_replace("{{" . ($index + 1) . "}}", $value, $text);
        }
        return $text;
    }

    /**
     * Constrói o payload para criação/atualização de template.
     */
    protected function buildTemplatePayload(array $data, bool $isUpdate = false): array
    {
        $payload = [];

        if (!$isUpdate) {
            $payload['name'] = $data['name'];
            $payload['language'] = $data['language'] ?? 'pt_BR';
            $payload['category'] = $data['category'] ?? 'UTILITY';
        }

        $components = [];

        // Header
        if (!empty($data['header_type']) && $data['header_type'] !== 'NONE') {
            $header = ['type' => 'HEADER', 'format' => $data['header_type']];

            if ($data['header_type'] === 'TEXT' && !empty($data['header_text'])) {
                $header['text'] = $data['header_text'];
            }

            $components[] = $header;
        }

        // Body (obrigatório)
        if (!empty($data['body_text'])) {
            $components[] = [
                'type' => 'BODY',
                'text' => $data['body_text'],
            ];
        }

        // Footer
        if (!empty($data['footer_text'])) {
            $components[] = [
                'type' => 'FOOTER',
                'text' => $data['footer_text'],
            ];
        }

        // Buttons
        if (!empty($data['buttons'])) {
            $buttons = [];
            foreach ($data['buttons'] as $button) {
                $buttonData = ['type' => $button['type']];

                switch ($button['type']) {
                    case 'PHONE_NUMBER':
                        $buttonData['text'] = $button['text'];
                        $buttonData['phone_number'] = $button['phone_number'];
                        break;

                    case 'URL':
                        $buttonData['text'] = $button['text'];
                        $buttonData['url'] = $button['url'];
                        break;

                    case 'QUICK_REPLY':
                        $buttonData['text'] = $button['text'];
                        break;

                    case 'COPY_CODE':
                        $buttonData['example'] = [$button['example'] ?? 'CODE123'];
                        break;
                }

                $buttons[] = $buttonData;
            }

            $components[] = [
                'type' => 'BUTTONS',
                'buttons' => $buttons,
            ];
        }

        $payload['components'] = $components;

        return $payload;
    }

    /**
     * Valida se a integração está ativa.
     */
    protected function validateIntegration(MetaIntegration $integration): void
    {
        if (!$integration->isActive()) {
            throw new \Exception('Integration is not active');
        }

        if (!$integration->waba_id) {
            throw new \Exception('Integration has no WABA ID');
        }
    }

    /**
     * Sincroniza templates da Meta com o banco local.
     * Retorna quantidade de templates sincronizados.
     */
    public function sync(MetaIntegration $integration): int
    {
        $templates = $this->list($integration);

        Log::info('Meta templates synced', [
            'integration_id' => $integration->id,
            'count' => count($templates),
        ]);

        return count($templates);
    }
}
