<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | WhatsApp Business API
    |--------------------------------------------------------------------------
    */
    'whatsapp' => [
        'verify_token' => env('WHATSAPP_VERIFY_TOKEN', 'crm_whatsapp_verify_token'),
        'api_version' => env('WHATSAPP_API_VERSION', 'v22.0'),
    ],

    /*
    |--------------------------------------------------------------------------
    | Instagram Messaging API
    |--------------------------------------------------------------------------
    */
    'instagram' => [
        'verify_token' => env('INSTAGRAM_VERIFY_TOKEN', 'crm_instagram_verify_token'),
        'api_version' => env('INSTAGRAM_API_VERSION', 'v22.0'),
    ],

    /*
    |--------------------------------------------------------------------------
    | Meta OAuth & WhatsApp Cloud API
    |--------------------------------------------------------------------------
    | Configurações para integração via OAuth com a Meta.
    | Permite que tenants conectem seus próprios números WhatsApp.
    */
    'meta' => [
        // Default/regular app — usado pelo fluxo OAuth tradicional e como fallback.
        'app_id' => env('META_APP_ID'),
        'app_secret' => env('META_APP_SECRET'),

        // App de Embedded Signup (se diferente do regular). Fallback: regular.
        'embedded_app_id' => env('META_EMBEDDED_APP_ID', env('META_APP_ID')),
        'embedded_app_secret' => env('META_EMBEDDED_APP_SECRET', env('META_APP_SECRET')),

        // App específico do fluxo Coexistence. Sem fallback — se vazio, integrações
        // de coexistence não conseguem operar e o sistema deixa explícito.
        'coexistence_app_id' => env('META_COEXISTENCE_APP_ID'),
        'coexistence_app_secret' => env('META_COEXISTENCE_APP_SECRET'),

        // App "legacy" — usado por canais criados antes do Embedded Signup
        // (sistema antigo onde o token era colado direto em Channel.config).
        // Esses canais têm o app pai deles inscrito como webhook receiver
        // da WABA, e os webhooks chegam assinados pelo secret desse app.
        // Sem o secret aqui, o middleware HMAC rejeita os webhooks legítimos.
        // Ver post-mortem 2026-05-07 (canal "Oficial 0" — Empresa Demo).
        'legacy_app_id' => env('META_LEGACY_APP_ID'),
        'legacy_app_secret' => env('META_LEGACY_APP_SECRET'),

        'api_version' => env('META_API_VERSION', 'v22.0'),
        'verify_token' => env('META_VERIFY_TOKEN', 'crm_meta_verify_token'),
        'redirect_uri' => env('META_REDIRECT_URI', env('APP_URL') . '/api/meta/callback'),
        'config_id' => env('META_CONFIG_ID'),
        'scopes' => [
            'whatsapp_business_management',
            'whatsapp_business_messaging',
        ],

        // Registry de apps Meta keyed by app_id. Construído a partir das envs acima,
        // filtrado pra remover entries vazios e agrupado por app_id (se embedded ==
        // regular, vira uma entry só). Lookup em runtime: MetaIntegration
        // ->metaAppCredentials() resolve via meta_app_id da row.
        'apps' => collect([
            ['app_id' => env('META_APP_ID'), 'app_secret' => env('META_APP_SECRET'), 'label' => 'regular'],
            ['app_id' => env('META_EMBEDDED_APP_ID'), 'app_secret' => env('META_EMBEDDED_APP_SECRET'), 'label' => 'embedded'],
            ['app_id' => env('META_COEXISTENCE_APP_ID'), 'app_secret' => env('META_COEXISTENCE_APP_SECRET'), 'label' => 'coexistence'],
            ['app_id' => env('META_LEGACY_APP_ID'), 'app_secret' => env('META_LEGACY_APP_SECRET'), 'label' => 'legacy'],
        ])
            ->filter(fn ($a) => !empty($a['app_id']) && !empty($a['app_secret']))
            ->groupBy('app_id')
            ->map(fn ($group) => [
                'app_secret' => $group->first()['app_secret'],
                'labels' => $group->pluck('label')->all(),
            ])
            ->all(),
    ],

    /*
    |--------------------------------------------------------------------------
    | n8n Workflow Automation
    |--------------------------------------------------------------------------
    */
    'n8n' => [
        'base_url' => env('N8N_BASE_URL', 'http://localhost:5678'),
        'api_key' => env('N8N_API_KEY'),
    ],

    /*
    |--------------------------------------------------------------------------
    | OpenAI API (para Embeddings, IA, Vision, TTS)
    |--------------------------------------------------------------------------
    */
    'openai' => [
        'api_key' => env('OPENAI_API_KEY'),
        'base_url' => env('OPENAI_BASE_URL', 'https://api.openai.com/v1'),
        'default_model' => env('OPENAI_DEFAULT_MODEL', 'gpt-4o-mini'),
        'embedding_model' => env('OPENAI_EMBEDDING_MODEL', 'text-embedding-3-small'),
        'tts_model' => env('OPENAI_TTS_MODEL', 'tts-1'),
        'tts_voice' => env('OPENAI_TTS_VOICE', 'nova'),
        'audio_threshold' => env('OPENAI_AUDIO_THRESHOLD', 500), // caracteres para converter em áudio
        'exchange_rate' => env('USD_BRL_EXCHANGE_RATE', 6.0), // Taxa de câmbio USD para BRL
    ],

    /*
    |--------------------------------------------------------------------------
    | Internal API (comunicação entre microserviços)
    |--------------------------------------------------------------------------
    */
    'internal' => [
        'api_key' => env('INTERNAL_API_KEY', env('LARAVEL_INTERNAL_KEY')),
    ],

    /*
    |--------------------------------------------------------------------------
    | AI Agent Microservice (Python FastAPI)
    |--------------------------------------------------------------------------
    | Microserviço Python responsável por RAG, Memory, ML e decisões do agente.
    | 
    | Arquitetura consolidada:
    | - Python ai-service é o processador principal (RAG, Memory, ML, Function Calling)
    | - Se Python estiver offline, usa fallback básico (chamada direta à OpenAI)
    */
    'ai_agent' => [
        'url' => env('AI_AGENT_URL', 'http://localhost:8001'),
        'api_key' => env('AI_AGENT_API_KEY', ''),
        'timeout' => env('AI_AGENT_TIMEOUT', 30),
    ],

    /*
    |--------------------------------------------------------------------------
    | AI Service (alias para compatibilidade)
    |--------------------------------------------------------------------------
    */
    'ai' => [
        'url' => env('AI_AGENT_URL', 'http://localhost:8001'),
        'key' => env('AI_AGENT_API_KEY', ''),
        'timeout' => env('AI_AGENT_TIMEOUT', 30),
    ],

    /*
    |--------------------------------------------------------------------------
    | AI Service (Content Creator - proxy alias)
    |--------------------------------------------------------------------------
    */
    'ai_service' => [
        'url' => env('AI_AGENT_URL', 'http://localhost:8001'),
    ],

    /*
    |--------------------------------------------------------------------------
    | Supabase (Vector Store para RAG)
    |--------------------------------------------------------------------------
    */
    'supabase' => [
        'url' => env('SUPABASE_URL'),
        'key' => env('SUPABASE_KEY'),
        'service_key' => env('SUPABASE_SERVICE_KEY'),
    ],

    /*
    |--------------------------------------------------------------------------
    | Linx ERP Integration
    |--------------------------------------------------------------------------
    */
    'linx' => [
        'subscription_key' => env('LINX_SUBSCRIPTION_KEY'),
        'ambiente' => env('LINX_AMBIENTE', 'PRODUCAO'),
        'username' => env('LINX_USERNAME'),
        'password' => env('LINX_PASSWORD'),
        'cnpj_empresa' => env('LINX_CNPJ_EMPRESA'),
    ],

];
