"""
Configurações do Microserviço de IA
"""
from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    """Configurações da aplicação"""
    
    # App
    app_name: str = "CRM AI Agent Service"
    debug: bool = False
    api_key: str = ""  # Chave para autenticar requisições do Laravel
    
    # OpenAI
    openai_api_key: str = ""
    openai_project_id: str = ""  # Project ID obrigatório para novas APIs
    openai_model: str = "gpt-4o-mini"
    openai_embedding_model: str = "text-embedding-3-small"
    
    # Anthropic (Claude)
    anthropic_api_key: str = ""
    anthropic_model: str = "claude-sonnet-4-20250514"

    # Tavily (Web Search)
    tavily_api_key: str = ""

    # Groq (Whisper Transcription)
    groq_api_key: str = ""
    groq_whisper_model: str = "whisper-large-v3"

    # PostgreSQL (mesmo banco do Laravel)
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/crm"
    
    # Supabase (Vector Store)
    supabase_url: str = ""
    supabase_key: str = ""
    
    # Redis (para fila de mensagens e cache)
    redis_url: str = "redis://localhost:6379/0"
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_PASSWORD: str = ""
    REDIS_DB: int = 0
    
    # Laravel API (para callbacks)
    LARAVEL_API_URL: str = "http://localhost:8000"
    LARAVEL_API_KEY: str = ""
    LARAVEL_INTERNAL_KEY: str = ""  # Chave para API interna (registrar uso)
    
    # Queue Settings
    QUEUE_MAX_WAIT_TIME: int = 5  # segundos
    QUEUE_MIN_GAP_TIME: int = 3   # segundos
    QUEUE_CHECK_INTERVAL: int = 1 # segundos
    
    # RAG Settings
    rag_top_k: int = 10
    rag_similarity_threshold: float = 0.7
    
    # Memory Settings
    short_term_memory_limit: int = 20  # últimas N mensagens
    long_term_memory_limit: int = 50   # contextos relevantes
    
    # ML Settings
    lead_classification_threshold: float = 0.7

    # =============================================================================
    # Support Agent Settings (SSH, Git, Deploy)
    # =============================================================================

    # VPS SSH Config
    vps_ssh_host: str = ""           # IP ou hostname da VPS (ex: 212.85.20.129)
    vps_ssh_port: int = 22
    vps_ssh_user: str = "root"       # Usuario SSH
    vps_ssh_password: str = ""       # Senha SSH (alternativa a chave)
    vps_ssh_key_path: str = ""       # Caminho para chave privada SSH
    vps_project_path: str = "/var/www/crm"  # Caminho do projeto na VPS

    # Git Config
    git_repo_path: str = ""          # Caminho local do repositorio
    git_remote_name: str = "origin"  # Nome do remote
    git_main_branch: str = "main"    # Branch principal

    # Deploy Config
    deploy_command: str = "git pull && npm run build"  # Comando de deploy
    deploy_pm2_name: str = "crm"     # Nome do processo PM2

    # Support Agent Security
    support_max_ssh_commands_per_hour: int = 50
    support_max_git_pushes_per_hour: int = 10
    support_max_deploys_per_day: int = 5
    support_allowed_ssh_commands: str = "ls,cat,tail,head,grep,npm,git,php,composer,docker,docker-compose"

    # Support RAG (Manual de Usabilidade)
    support_manual_path: str = "docs/MANUAL_USABILIDADE.md"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


@lru_cache()
def get_settings() -> Settings:
    return Settings()
