import os
import asyncio
from celery import Celery
from asgiref.sync import async_to_sync

# Configurações do Redis
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = os.getenv("REDIS_PORT", "6379")
REDIS_URL = f"redis://{REDIS_HOST}:{REDIS_PORT}/0"

# Inicializa Celery app
celery_app = Celery(
    "bi_worker",
    broker=REDIS_URL,
    backend=REDIS_URL
)

# Configurações do Celery
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
)

@celery_app.task(name="tasks.run_daily_analysis")
def run_daily_analysis(tenant_id: str):
    """
    Worker task para rodar análise diária.
    Como o código do agente é async, usamos async_to_sync wrapper.
    """
    from bi_agent.agent import BIAgent
    
    print(f"[Worker] Iniciando análise diária para {tenant_id}")
    
    async def _run():
        agent = BIAgent(tenant_id=tenant_id)
        return await agent.run_daily_cycle()
    
    try:
        result = async_to_sync(_run)()
        print(f"[Worker] Análise concluída para {tenant_id}")
        return result
    except Exception as e:
        print(f"[Worker] Erro na análise: {e}")
        raise e
