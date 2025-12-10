<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Meta (Facebook) Ads Configuration
    |--------------------------------------------------------------------------
    |
    | Configurações para integração com Meta Ads (Facebook/Instagram).
    | Para obter as credenciais:
    | 1. Acesse https://developers.facebook.com
    | 2. Crie um App do tipo "Negócio"
    | 3. Adicione o produto "Marketing API"
    | 4. Configure os scopes: ads_management, ads_read, business_management
    |
    */
    'meta' => [
        'app_id' => env('META_APP_ID'),
        'app_secret' => env('META_APP_SECRET'),
        'api_version' => env('META_API_VERSION', 'v18.0'),
        
        // URL para OAuth callback
        'redirect_uri' => env('META_REDIRECT_URI', env('APP_URL') . '/api/ads/oauth/meta/callback'),
        
        // Scopes necessários
        'scopes' => [
            'ads_management',
            'ads_read',
            'business_management',
            'pages_read_engagement',
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Google Ads Configuration
    |--------------------------------------------------------------------------
    |
    | Configurações para integração com Google Ads.
    | Para obter as credenciais:
    | 1. Acesse https://console.cloud.google.com
    | 2. Crie um projeto e ative Google Ads API
    | 3. Crie credenciais OAuth 2.0
    | 4. Solicite um Developer Token: https://ads.google.com/nav/selectaccount
    |
    */
    'google' => [
        'client_id' => env('GOOGLE_ADS_CLIENT_ID'),
        'client_secret' => env('GOOGLE_ADS_CLIENT_SECRET'),
        'developer_token' => env('GOOGLE_ADS_DEVELOPER_TOKEN'),
        
        // URL para OAuth callback
        'redirect_uri' => env('GOOGLE_ADS_REDIRECT_URI', env('APP_URL') . '/api/ads/oauth/google/callback'),
        
        // Scopes necessários
        'scopes' => [
            'https://www.googleapis.com/auth/adwords',
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Sync Configuration
    |--------------------------------------------------------------------------
    */
    'sync' => [
        // Quantos dias de histórico buscar na primeira sincronização
        'initial_history_days' => env('ADS_INITIAL_HISTORY_DAYS', 30),
        
        // Máximo de entidades por request
        'batch_size' => env('ADS_SYNC_BATCH_SIZE', 500),
        
        // Intervalo mínimo entre sincronizações (em minutos)
        'min_sync_interval' => env('ADS_MIN_SYNC_INTERVAL', 60),
    ],

    /*
    |--------------------------------------------------------------------------
    | Automation Configuration
    |--------------------------------------------------------------------------
    */
    'automation' => [
        // Habilita/desabilita execução automática das regras
        'enabled' => env('ADS_AUTOMATION_ENABLED', true),
        
        // Modo padrão para novas regras: 'approval' ou 'auto'
        'default_mode' => env('ADS_AUTOMATION_DEFAULT_MODE', 'approval'),
        
        // Máximo de ações automáticas por dia por tenant
        'max_daily_actions' => env('ADS_MAX_DAILY_ACTIONS', 50),
        
        // Tempo de cooldown padrão (horas)
        'default_cooldown_hours' => env('ADS_DEFAULT_COOLDOWN_HOURS', 24),
    ],

    /*
    |--------------------------------------------------------------------------
    | Insights Configuration
    |--------------------------------------------------------------------------
    */
    'insights' => [
        // Threshold para detectar queda de performance (%)
        'performance_drop_threshold' => env('ADS_PERFORMANCE_DROP_THRESHOLD', 20),
        
        // Threshold para detectar oportunidade de escala (%)
        'scale_opportunity_threshold' => env('ADS_SCALE_OPPORTUNITY_THRESHOLD', 50),
        
        // Score mínimo para classificar como "winner"
        'winner_min_score' => env('ADS_WINNER_MIN_SCORE', 80),
        
        // Score máximo para classificar como "underperforming"
        'underperforming_max_score' => env('ADS_UNDERPERFORMING_MAX_SCORE', 30),
        
        // Dias de dados necessários para gerar insights
        'min_data_days' => env('ADS_MIN_DATA_DAYS', 3),
    ],
];

