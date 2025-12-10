<?php

namespace App\Services;

use App\Models\SdrAgent;
use App\Models\SdrContextCache;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class ContextCacheService
{
    /**
     * Gera o contexto estático do agente (para cache).
     */
    public function getStaticContext(SdrAgent $agent): array
    {
        $cacheKey = "sdr_static_context_{$agent->id}";
        
        // Verifica cache local primeiro
        $cached = Cache::get($cacheKey);
        if ($cached) {
            return $cached;
        }

        // Monta contexto estático
        $context = [
            'system_prompt' => $agent->buildFullPrompt(),
            'agent_config' => [
                'name' => $agent->name,
                'tone' => $agent->tone,
                'language' => $agent->language,
            ],
        ];

        // Cache por 1 hora
        Cache::put($cacheKey, $context, 3600);

        return $context;
    }

    /**
     * Gera hash do contexto para identificar mudanças.
     */
    public function generateContextHash(SdrAgent $agent): string
    {
        $content = $agent->system_prompt
            . $agent->personality
            . $agent->objectives
            . $agent->restrictions
            . $agent->knowledge_instructions;
        
        return md5($content);
    }

    /**
     * Verifica se o cache é válido.
     */
    public function isCacheValid(SdrAgent $agent): bool
    {
        $cache = SdrContextCache::where('sdr_agent_id', $agent->id)
            ->where('provider', $this->getProvider($agent))
            ->first();

        if (!$cache) {
            return false;
        }

        // Verifica se expirou
        if ($cache->expires_at && $cache->expires_at->isPast()) {
            return false;
        }

        // Verifica se o conteúdo mudou
        $currentHash = $this->generateContextHash($agent);
        return $cache->content_hash === $currentHash;
    }

    /**
     * Atualiza o registro de cache.
     */
    public function updateCache(SdrAgent $agent, ?string $externalCacheId = null): SdrContextCache
    {
        $provider = $this->getProvider($agent);
        $hash = $this->generateContextHash($agent);
        
        $cache = SdrContextCache::updateOrCreate(
            [
                'sdr_agent_id' => $agent->id,
                'provider' => $provider,
            ],
            [
                'cache_key' => "sdr_{$agent->id}_{$provider}",
                'cache_id' => $externalCacheId,
                'content_hash' => $hash,
                'token_count' => $this->estimatePromptTokens($agent),
                'expires_at' => now()->addHours(24), // Cache válido por 24h
                'last_used_at' => now(),
            ]
        );

        // Invalida cache local
        Cache::forget("sdr_static_context_{$agent->id}");

        return $cache;
    }

    /**
     * Marca cache como usado.
     */
    public function markCacheUsed(SdrAgent $agent): void
    {
        SdrContextCache::where('sdr_agent_id', $agent->id)
            ->update(['last_used_at' => now()]);
    }

    /**
     * Invalida cache do agente.
     */
    public function invalidateCache(SdrAgent $agent): void
    {
        SdrContextCache::where('sdr_agent_id', $agent->id)->delete();
        Cache::forget("sdr_static_context_{$agent->id}");
    }

    /**
     * Estima tokens do prompt.
     */
    protected function estimatePromptTokens(SdrAgent $agent): int
    {
        $text = $agent->buildFullPrompt();
        return (int) ceil(strlen($text) / 3.5);
    }

    /**
     * Retorna o provider baseado no modelo.
     */
    protected function getProvider(SdrAgent $agent): string
    {
        $model = strtolower($agent->ai_model);
        
        if (str_contains($model, 'gpt') || str_contains($model, 'openai')) {
            return 'openai';
        }
        
        if (str_contains($model, 'claude') || str_contains($model, 'anthropic')) {
            return 'anthropic';
        }
        
        return 'other';
    }

    /**
     * Monta payload otimizado para envio.
     */
    public function buildOptimizedPayload(SdrAgent $agent, array $ragContext): array
    {
        $staticContext = $this->getStaticContext($agent);
        $cacheValid = $this->isCacheValid($agent);

        $payload = [
            'cache' => [
                'enabled' => true,
                'valid' => $cacheValid,
                'hash' => $this->generateContextHash($agent),
            ],
        ];

        if ($cacheValid) {
            // Se cache válido, envia apenas referência
            $payload['static_context'] = [
                'cached' => true,
                'agent_id' => $agent->id,
            ];
        } else {
            // Se cache inválido, envia contexto completo
            $payload['static_context'] = $staticContext;
        }

        // Contexto dinâmico (RAG) sempre é enviado
        $payload['dynamic_context'] = $ragContext;

        return $payload;
    }
}

