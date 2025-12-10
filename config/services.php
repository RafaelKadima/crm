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
        'api_version' => env('WHATSAPP_API_VERSION', 'v18.0'),
    ],

    /*
    |--------------------------------------------------------------------------
    | Instagram Messaging API
    |--------------------------------------------------------------------------
    */
    'instagram' => [
        'verify_token' => env('INSTAGRAM_VERIFY_TOKEN', 'crm_instagram_verify_token'),
        'api_version' => env('INSTAGRAM_API_VERSION', 'v18.0'),
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
        'api_key' => env('INTERNAL_API_KEY'),
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
    | Supabase (Vector Store para RAG)
    |--------------------------------------------------------------------------
    */
    'supabase' => [
        'url' => env('SUPABASE_URL'),
        'key' => env('SUPABASE_KEY'),
        'service_key' => env('SUPABASE_SERVICE_KEY'),
    ],

];
