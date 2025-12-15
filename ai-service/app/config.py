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
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


@lru_cache()
def get_settings() -> Settings:
    return Settings()
