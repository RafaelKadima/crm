"""
Model Registry - Gerenciamento e Versionamento de Modelos ML.

Responsável por:
- Armazenar e versionar modelos por tenant
- Manter cache de modelos carregados
- Gerenciar modelo global vs específico por tenant
- Fallback automático para modelo global
"""
import os
import json
import torch
from typing import Dict, Any, Optional, List
from datetime import datetime
import structlog

from app.config import get_settings
from app.ml.models.lead_score_net import LeadScoreNet, LeadScoreTrainer
from app.ml.models.campaign_predictor import CampaignPredictorNet, CampaignPredictorTrainer

logger = structlog.get_logger()
settings = get_settings()


class ModelRegistry:
    """
    Registry central para modelos de ML.
    
    Estratégia:
    1. Modelo GLOBAL: Treinado com dados anonimizados de todos tenants
    2. Modelo TENANT: Fine-tuned quando tenant tem dados suficientes
    3. Fallback: Se tenant não tem modelo, usa global
    """
    
    # Quantidade mínima de amostras para treinar modelo do tenant
    MINIMUM_SAMPLES = {
        'lead_score': 100,
        'campaign_predictor': 50,
        'sdr_policy': 500,
        'ads_policy': 300,
    }
    
    # Diretório para armazenar modelos
    MODELS_DIR = os.environ.get('MODELS_DIR', '/var/models')
    
    def __init__(self):
        self._model_cache: Dict[str, Any] = {}
        self._db_engine = None
        
        # Garante que diretório existe
        os.makedirs(self.MODELS_DIR, exist_ok=True)
    
    async def get_db_engine(self):
        """Lazy loading do engine do banco."""
        if self._db_engine is None:
            from sqlalchemy.ext.asyncio import create_async_engine
            db_url = settings.database_url
            if not db_url.startswith('postgresql+asyncpg://'):
                db_url = db_url.replace('postgresql://', 'postgresql+asyncpg://')
            self._db_engine = create_async_engine(db_url)
        return self._db_engine
    
    async def get_model(
        self,
        model_type: str,
        tenant_id: str
    ) -> Optional[Any]:
        """
        Retorna modelo para uso.
        
        Ordem de preferência:
        1. Cache em memória
        2. Modelo do tenant no banco
        3. Modelo global
        
        Args:
            model_type: Tipo do modelo (lead_score, campaign_predictor, etc.)
            tenant_id: ID do tenant
        
        Returns:
            Modelo carregado ou None
        """
        cache_key = f"{tenant_id}_{model_type}"
        
        # 1. Verifica cache
        if cache_key in self._model_cache:
            logger.debug("model_from_cache", model_type=model_type, tenant_id=tenant_id)
            return self._model_cache[cache_key]
        
        # 2. Tenta carregar modelo do tenant
        model = await self._load_tenant_model(model_type, tenant_id)
        
        # 3. Fallback para modelo global
        if model is None:
            logger.debug("fallback_to_global", model_type=model_type, tenant_id=tenant_id)
            model = await self._load_global_model(model_type)
        
        # Adiciona ao cache se encontrou
        if model is not None:
            self._model_cache[cache_key] = model
        
        return model
    
    async def _load_tenant_model(
        self,
        model_type: str,
        tenant_id: str
    ) -> Optional[Any]:
        """Carrega modelo específico do tenant."""
        try:
            engine = await self.get_db_engine()
            
            async with engine.connect() as conn:
                from sqlalchemy import text
                
                result = await conn.execute(text("""
                    SELECT id, weights_path, metrics, hyperparameters
                    FROM ml_models
                    WHERE tenant_id = :tenant_id
                    AND model_type = :model_type
                    AND is_active = true
                    AND status = 'ready'
                    ORDER BY version DESC
                    LIMIT 1
                """), {'tenant_id': tenant_id, 'model_type': model_type})
                
                row = result.fetchone()
                
                if row and row.weights_path:
                    return self._load_model_from_file(model_type, row.weights_path)
                
                return None
                
        except Exception as e:
            logger.error("load_tenant_model_error", error=str(e))
            return None
    
    async def _load_global_model(self, model_type: str) -> Optional[Any]:
        """Carrega modelo global."""
        try:
            engine = await self.get_db_engine()
            
            async with engine.connect() as conn:
                from sqlalchemy import text
                
                result = await conn.execute(text("""
                    SELECT id, weights_path, metrics, hyperparameters
                    FROM ml_models
                    WHERE is_global = true
                    AND model_type = :model_type
                    AND is_active = true
                    AND status = 'ready'
                    ORDER BY version DESC
                    LIMIT 1
                """), {'model_type': model_type})
                
                row = result.fetchone()
                
                if row and row.weights_path:
                    return self._load_model_from_file(model_type, row.weights_path)
                
                return None
                
        except Exception as e:
            logger.error("load_global_model_error", error=str(e))
            return None
    
    def _load_model_from_file(
        self,
        model_type: str,
        weights_path: str
    ) -> Optional[Any]:
        """Carrega modelo do arquivo."""
        try:
            full_path = os.path.join(self.MODELS_DIR, weights_path)
            
            if not os.path.exists(full_path):
                logger.warning("model_file_not_found", path=full_path)
                return None
            
            checkpoint = torch.load(full_path, map_location='cpu')
            
            # Instancia modelo correto baseado no tipo
            if model_type == 'lead_score':
                model = LeadScoreNet(
                    input_size=checkpoint.get('input_size', 15),
                    hidden_sizes=checkpoint.get('hidden_sizes', [64, 32])
                )
            elif model_type == 'campaign_predictor':
                model = CampaignPredictorNet(
                    input_size=checkpoint.get('input_size', 12),
                    hidden_sizes=checkpoint.get('hidden_sizes', [64, 32]),
                    output_size=checkpoint.get('output_size', 3)
                )
            else:
                logger.warning("unknown_model_type", model_type=model_type)
                return None
            
            model.load_state_dict(checkpoint['model_state_dict'])
            model.eval()
            
            logger.info("model_loaded", model_type=model_type, path=weights_path)
            
            return model
            
        except Exception as e:
            logger.error("load_model_file_error", error=str(e), path=weights_path)
            return None
    
    async def save_model(
        self,
        model: Any,
        model_type: str,
        tenant_id: Optional[str],
        metrics: Dict[str, float],
        hyperparameters: Dict[str, Any],
        training_samples: int
    ) -> Optional[str]:
        """
        Salva um novo modelo.
        
        Args:
            model: Modelo treinado (PyTorch)
            model_type: Tipo do modelo
            tenant_id: ID do tenant (None para global)
            metrics: Métricas de avaliação
            hyperparameters: Hiperparâmetros usados
            training_samples: Quantidade de amostras de treino
        
        Returns:
            ID do modelo salvo
        """
        try:
            import uuid
            
            # Gera path único
            model_id = str(uuid.uuid4())
            if tenant_id:
                filename = f"{tenant_id}/{model_type}_{model_id}.pt"
            else:
                filename = f"global/{model_type}_{model_id}.pt"
            
            # Cria diretório se necessário
            full_path = os.path.join(self.MODELS_DIR, filename)
            os.makedirs(os.path.dirname(full_path), exist_ok=True)
            
            # Salva checkpoint
            checkpoint = {
                'model_state_dict': model.state_dict(),
                'input_size': getattr(model, 'input_size', None),
                'hidden_sizes': getattr(model, 'hidden_sizes', None),
                'output_size': getattr(model, 'output_size', None),
            }
            torch.save(checkpoint, full_path)
            
            # Salva no banco
            engine = await self.get_db_engine()
            
            async with engine.begin() as conn:
                from sqlalchemy import text
                
                # Desativa versões anteriores
                if tenant_id:
                    await conn.execute(text("""
                        UPDATE ml_models SET is_active = false
                        WHERE tenant_id = :tenant_id AND model_type = :model_type
                    """), {'tenant_id': tenant_id, 'model_type': model_type})
                else:
                    await conn.execute(text("""
                        UPDATE ml_models SET is_active = false
                        WHERE is_global = true AND model_type = :model_type
                    """), {'model_type': model_type})
                
                # Busca última versão
                if tenant_id:
                    version_result = await conn.execute(text("""
                        SELECT COALESCE(MAX(version), 0) + 1 as next_version
                        FROM ml_models WHERE tenant_id = :tenant_id AND model_type = :model_type
                    """), {'tenant_id': tenant_id, 'model_type': model_type})
                else:
                    version_result = await conn.execute(text("""
                        SELECT COALESCE(MAX(version), 0) + 1 as next_version
                        FROM ml_models WHERE is_global = true AND model_type = :model_type
                    """), {'model_type': model_type})
                
                version = version_result.fetchone().next_version
                
                # Insere novo modelo
                await conn.execute(text("""
                    INSERT INTO ml_models 
                    (id, tenant_id, model_type, version, weights_path, metrics, 
                     hyperparameters, training_samples, status, is_active, is_global, trained_at, created_at, updated_at)
                    VALUES 
                    (:id, :tenant_id, :model_type, :version, :weights_path, :metrics,
                     :hyperparameters, :training_samples, 'ready', true, :is_global, NOW(), NOW(), NOW())
                """), {
                    'id': model_id,
                    'tenant_id': tenant_id,
                    'model_type': model_type,
                    'version': version,
                    'weights_path': filename,
                    'metrics': json.dumps(metrics),
                    'hyperparameters': json.dumps(hyperparameters),
                    'training_samples': training_samples,
                    'is_global': tenant_id is None,
                })
            
            # Invalida cache
            if tenant_id:
                cache_key = f"{tenant_id}_{model_type}"
                self._model_cache.pop(cache_key, None)
            else:
                # Invalida cache de todos os tenants para este tipo
                keys_to_remove = [k for k in self._model_cache if k.endswith(f"_{model_type}")]
                for key in keys_to_remove:
                    self._model_cache.pop(key, None)
            
            logger.info("model_saved",
                model_id=model_id,
                model_type=model_type,
                tenant_id=tenant_id,
                version=version,
                training_samples=training_samples
            )
            
            return model_id
            
        except Exception as e:
            logger.error("save_model_error", error=str(e))
            return None
    
    async def should_train_tenant_model(
        self,
        model_type: str,
        tenant_id: str
    ) -> bool:
        """
        Verifica se tenant tem dados suficientes para treinar modelo próprio.
        """
        min_samples = self.MINIMUM_SAMPLES.get(model_type, 100)
        
        # Conta amostras de treino disponíveis
        sample_count = await self._count_training_samples(model_type, tenant_id)
        
        return sample_count >= min_samples
    
    async def _count_training_samples(
        self,
        model_type: str,
        tenant_id: str
    ) -> int:
        """Conta amostras de treino disponíveis para um tenant."""
        try:
            engine = await self.get_db_engine()
            
            async with engine.connect() as conn:
                from sqlalchemy import text
                
                # Conta baseado no tipo de modelo
                if model_type == 'lead_score':
                    # Conta leads com outcome conhecido
                    result = await conn.execute(text("""
                        SELECT COUNT(*) FROM leads
                        WHERE tenant_id = :tenant_id
                        AND (status = 'won' OR status = 'lost')
                    """), {'tenant_id': tenant_id})
                    
                elif model_type == 'campaign_predictor':
                    # Conta campanhas com dados de performance
                    result = await conn.execute(text("""
                        SELECT COUNT(*) FROM ad_campaigns
                        WHERE tenant_id = :tenant_id
                        AND metadata->>'has_metrics' = 'true'
                    """), {'tenant_id': tenant_id})
                    
                elif model_type in ['sdr_policy', 'ads_policy']:
                    # Conta experiências de RL
                    agent_type = 'sdr' if model_type == 'sdr_policy' else 'ads'
                    result = await conn.execute(text("""
                        SELECT COUNT(*) FROM rl_experiences
                        WHERE tenant_id = :tenant_id
                        AND agent_type = :agent_type
                        AND reward_received = true
                    """), {'tenant_id': tenant_id, 'agent_type': agent_type})
                else:
                    return 0
                
                return result.scalar() or 0
                
        except Exception as e:
            logger.error("count_samples_error", error=str(e))
            return 0
    
    async def get_model_info(
        self,
        model_type: str,
        tenant_id: str
    ) -> Optional[Dict[str, Any]]:
        """Retorna informações sobre o modelo ativo."""
        try:
            engine = await self.get_db_engine()
            
            async with engine.connect() as conn:
                from sqlalchemy import text
                
                # Tenta modelo do tenant
                result = await conn.execute(text("""
                    SELECT id, version, metrics, hyperparameters, training_samples, trained_at, is_global
                    FROM ml_models
                    WHERE tenant_id = :tenant_id
                    AND model_type = :model_type
                    AND is_active = true
                    ORDER BY version DESC
                    LIMIT 1
                """), {'tenant_id': tenant_id, 'model_type': model_type})
                
                row = result.fetchone()
                
                # Se não encontrou, busca global
                if not row:
                    result = await conn.execute(text("""
                        SELECT id, version, metrics, hyperparameters, training_samples, trained_at, is_global
                        FROM ml_models
                        WHERE is_global = true
                        AND model_type = :model_type
                        AND is_active = true
                        ORDER BY version DESC
                        LIMIT 1
                    """), {'model_type': model_type})
                    
                    row = result.fetchone()
                
                if row:
                    return {
                        'id': str(row.id),
                        'version': row.version,
                        'metrics': json.loads(row.metrics) if isinstance(row.metrics, str) else row.metrics,
                        'hyperparameters': json.loads(row.hyperparameters) if isinstance(row.hyperparameters, str) else row.hyperparameters,
                        'training_samples': row.training_samples,
                        'trained_at': row.trained_at.isoformat() if row.trained_at else None,
                        'is_global': row.is_global,
                    }
                
                return None
                
        except Exception as e:
            logger.error("get_model_info_error", error=str(e))
            return None
    
    def clear_cache(self, tenant_id: str = None, model_type: str = None):
        """Limpa cache de modelos."""
        if tenant_id and model_type:
            key = f"{tenant_id}_{model_type}"
            self._model_cache.pop(key, None)
        elif tenant_id:
            keys = [k for k in self._model_cache if k.startswith(f"{tenant_id}_")]
            for key in keys:
                self._model_cache.pop(key, None)
        elif model_type:
            keys = [k for k in self._model_cache if k.endswith(f"_{model_type}")]
            for key in keys:
                self._model_cache.pop(key, None)
        else:
            self._model_cache.clear()
    
    def get_model_version(self, model_type: str, tenant_id: str) -> str:
        """
        Retorna versão do modelo ativo para um tenant.
        
        Usado para identificar qual modelo está sendo usado nas predições.
        """
        cache_key = f"{tenant_id}_{model_type}_version"
        
        if cache_key in self._model_cache:
            return self._model_cache[cache_key]
        
        # Se não está no cache, retorna "unknown" 
        # (a versão real seria buscada do banco na próxima chamada get_model_info)
        return "unknown"


# Singleton
model_registry = ModelRegistry()


def get_model_registry() -> ModelRegistry:
    """Retorna instância singleton do registry."""
    return model_registry


# Alias para compatibilidade com MCP tools
TenantModelRegistry = ModelRegistry
