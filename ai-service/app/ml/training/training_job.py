"""
Training Job - Job periódico para treinamento de modelos por tenant.

Executa:
1. Treino de LeadScoreNet quando há dados suficientes
2. Treino de CampaignPredictorNet quando há dados suficientes
3. Atualização de políticas de RL (opcional)
"""
import asyncio
from typing import Dict, Any, List, Optional
from datetime import datetime
import numpy as np
import structlog

from app.config import get_settings
from app.ml.model_registry import get_model_registry
from app.ml.models.lead_score_net import LeadScoreNet, LeadScoreTrainer
from app.ml.models.campaign_predictor import CampaignPredictorNet, CampaignPredictorTrainer
from app.ml.training.data_loader import get_training_data_loader

logger = structlog.get_logger()
settings = get_settings()


class TenantTrainingJob:
    """
    Job de treinamento por tenant.
    
    Executa diariamente para atualizar modelos com novos dados.
    """
    
    # Configurações de treino
    EPOCHS = {
        'lead_score': 50,
        'campaign_predictor': 30,
    }
    
    LEARNING_RATES = {
        'lead_score': 0.001,
        'campaign_predictor': 0.001,
    }
    
    BATCH_SIZES = {
        'lead_score': 32,
        'campaign_predictor': 16,
    }
    
    # Mínimos para treino
    MIN_SAMPLES = {
        'lead_score': 100,
        'campaign_predictor': 50,
    }
    
    def __init__(self):
        self.data_loader = get_training_data_loader()
        self.model_registry = get_model_registry()
        self._db_engine = None
    
    async def get_db_engine(self):
        """Lazy loading do engine do banco."""
        if self._db_engine is None:
            from sqlalchemy.ext.asyncio import create_async_engine
            db_url = settings.database_url
            if not db_url.startswith('postgresql+asyncpg://'):
                db_url = db_url.replace('postgresql://', 'postgresql+asyncpg://')
            self._db_engine = create_async_engine(db_url)
        return self._db_engine
    
    async def run(self, tenant_id: str) -> Dict[str, Any]:
        """
        Executa treinamento completo para um tenant.
        
        Returns:
            Dict com resultados do treinamento
        """
        results = {
            'tenant_id': tenant_id,
            'started_at': datetime.utcnow().isoformat(),
            'models_trained': [],
            'errors': [],
        }
        
        logger.info("training_job_started", tenant_id=tenant_id)
        
        # 1. Treina LeadScoreNet
        try:
            lead_result = await self.train_lead_score_net(tenant_id)
            if lead_result['success']:
                results['models_trained'].append({
                    'type': 'lead_score',
                    'metrics': lead_result['metrics'],
                    'samples': lead_result['samples'],
                })
        except Exception as e:
            logger.error("lead_score_training_error", error=str(e))
            results['errors'].append({'type': 'lead_score', 'error': str(e)})
        
        # 2. Treina CampaignPredictorNet
        try:
            campaign_result = await self.train_campaign_predictor(tenant_id)
            if campaign_result['success']:
                results['models_trained'].append({
                    'type': 'campaign_predictor',
                    'metrics': campaign_result['metrics'],
                    'samples': campaign_result['samples'],
                })
        except Exception as e:
            logger.error("campaign_predictor_training_error", error=str(e))
            results['errors'].append({'type': 'campaign_predictor', 'error': str(e)})
        
        results['finished_at'] = datetime.utcnow().isoformat()
        
        logger.info("training_job_completed",
            tenant_id=tenant_id,
            models_trained=len(results['models_trained']),
            errors=len(results['errors'])
        )
        
        return results
    
    async def train_lead_score_net(
        self,
        tenant_id: str,
        epochs: int = None,
        learning_rate: float = None
    ) -> Dict[str, Any]:
        """
        Treina LeadScoreNet para um tenant.
        """
        epochs = epochs or self.EPOCHS['lead_score']
        learning_rate = learning_rate or self.LEARNING_RATES['lead_score']
        batch_size = self.BATCH_SIZES['lead_score']
        
        # Carrega dados
        features, labels = await self.data_loader.load_lead_score_data(tenant_id)
        
        if len(features) < self.MIN_SAMPLES['lead_score']:
            logger.info("insufficient_data_for_lead_score",
                tenant_id=tenant_id,
                samples=len(features)
            )
            return {'success': False, 'reason': 'insufficient_data', 'samples': len(features)}
        
        # Split treino/validação (80/20)
        split_idx = int(len(features) * 0.8)
        indices = np.random.permutation(len(features))
        
        train_features = features[indices[:split_idx]]
        train_labels = labels[indices[:split_idx]]
        val_features = features[indices[split_idx:]]
        val_labels = labels[indices[split_idx:]]
        
        # Cria modelo e treinador
        model = LeadScoreNet()
        trainer = LeadScoreTrainer(model, learning_rate=learning_rate)
        
        # Treina
        best_loss = float('inf')
        best_metrics = {}
        
        for epoch in range(epochs):
            train_loss = trainer.train_epoch(train_features, train_labels, batch_size)
            
            if (epoch + 1) % 10 == 0:
                metrics = trainer.evaluate(val_features, val_labels)
                
                logger.debug("lead_score_epoch",
                    epoch=epoch+1,
                    train_loss=train_loss,
                    val_loss=metrics['loss'],
                    f1=metrics['f1']
                )
                
                if metrics['loss'] < best_loss:
                    best_loss = metrics['loss']
                    best_metrics = metrics
        
        # Avaliação final
        final_metrics = trainer.evaluate(val_features, val_labels)
        
        # Salva modelo
        model_id = await self.model_registry.save_model(
            model=model,
            model_type='lead_score',
            tenant_id=tenant_id,
            metrics=final_metrics,
            hyperparameters={
                'epochs': epochs,
                'learning_rate': learning_rate,
                'batch_size': batch_size,
                'hidden_sizes': model.hidden_sizes,
            },
            training_samples=len(features)
        )
        
        logger.info("lead_score_net_trained",
            tenant_id=tenant_id,
            model_id=model_id,
            samples=len(features),
            f1=final_metrics['f1'],
            accuracy=final_metrics['accuracy']
        )
        
        return {
            'success': True,
            'model_id': model_id,
            'metrics': final_metrics,
            'samples': len(features)
        }
    
    async def train_campaign_predictor(
        self,
        tenant_id: str,
        epochs: int = None,
        learning_rate: float = None
    ) -> Dict[str, Any]:
        """
        Treina CampaignPredictorNet para um tenant.
        """
        epochs = epochs or self.EPOCHS['campaign_predictor']
        learning_rate = learning_rate or self.LEARNING_RATES['campaign_predictor']
        batch_size = self.BATCH_SIZES['campaign_predictor']
        
        # Carrega dados
        features, targets = await self.data_loader.load_campaign_data(tenant_id)
        
        if len(features) < self.MIN_SAMPLES['campaign_predictor']:
            logger.info("insufficient_data_for_campaign_predictor",
                tenant_id=tenant_id,
                samples=len(features)
            )
            return {'success': False, 'reason': 'insufficient_data', 'samples': len(features)}
        
        # Split treino/validação
        split_idx = int(len(features) * 0.8)
        indices = np.random.permutation(len(features))
        
        train_features = features[indices[:split_idx]]
        train_targets = targets[indices[:split_idx]]
        val_features = features[indices[split_idx:]]
        val_targets = targets[indices[split_idx:]]
        
        # Cria modelo e treinador
        model = CampaignPredictorNet()
        trainer = CampaignPredictorTrainer(model, learning_rate=learning_rate)
        
        # Treina
        for epoch in range(epochs):
            train_loss = trainer.train_epoch(train_features, train_targets, batch_size)
            
            if (epoch + 1) % 10 == 0:
                metrics = trainer.evaluate(val_features, val_targets)
                
                logger.debug("campaign_predictor_epoch",
                    epoch=epoch+1,
                    train_loss=train_loss,
                    r2_roas=metrics['r2_roas']
                )
        
        # Avaliação final
        final_metrics = trainer.evaluate(val_features, val_targets)
        
        # Salva modelo
        model_id = await self.model_registry.save_model(
            model=model,
            model_type='campaign_predictor',
            tenant_id=tenant_id,
            metrics=final_metrics,
            hyperparameters={
                'epochs': epochs,
                'learning_rate': learning_rate,
                'batch_size': batch_size,
                'hidden_sizes': model.hidden_sizes,
            },
            training_samples=len(features)
        )
        
        logger.info("campaign_predictor_trained",
            tenant_id=tenant_id,
            model_id=model_id,
            samples=len(features),
            r2_roas=final_metrics['r2_roas']
        )
        
        return {
            'success': True,
            'model_id': model_id,
            'metrics': final_metrics,
            'samples': len(features)
        }
    
    async def train_global_models(self) -> Dict[str, Any]:
        """
        Treina modelos globais usando dados de todos os tenants.
        
        Executado periodicamente (ex: semanalmente).
        """
        results = {
            'started_at': datetime.utcnow().isoformat(),
            'models_trained': [],
            'errors': [],
        }
        
        logger.info("global_training_started")
        
        # 1. LeadScoreNet global
        try:
            features, labels = await self.data_loader.load_lead_score_data(
                tenant_id=None,  # Global
                days=180,        # 6 meses
                min_samples=500
            )
            
            if len(features) >= 500:
                # Treina com mais dados e mais épocas
                model = LeadScoreNet(hidden_sizes=[128, 64, 32])
                trainer = LeadScoreTrainer(model, learning_rate=0.0005)
                
                split_idx = int(len(features) * 0.9)
                indices = np.random.permutation(len(features))
                
                for epoch in range(100):
                    trainer.train_epoch(
                        features[indices[:split_idx]],
                        labels[indices[:split_idx]],
                        batch_size=64
                    )
                
                metrics = trainer.evaluate(
                    features[indices[split_idx:]],
                    labels[indices[split_idx:]]
                )
                
                model_id = await self.model_registry.save_model(
                    model=model,
                    model_type='lead_score',
                    tenant_id=None,  # Global
                    metrics=metrics,
                    hyperparameters={'hidden_sizes': [128, 64, 32]},
                    training_samples=len(features)
                )
                
                results['models_trained'].append({
                    'type': 'lead_score_global',
                    'model_id': model_id,
                    'samples': len(features),
                    'f1': metrics['f1']
                })
                
        except Exception as e:
            logger.error("global_lead_score_error", error=str(e))
            results['errors'].append({'type': 'lead_score_global', 'error': str(e)})
        
        # 2. CampaignPredictorNet global
        try:
            features, targets = await self.data_loader.load_campaign_data(
                tenant_id=None,
                days=180,
                min_samples=200
            )
            
            if len(features) >= 200:
                model = CampaignPredictorNet(hidden_sizes=[128, 64, 32])
                trainer = CampaignPredictorTrainer(model, learning_rate=0.0005)
                
                split_idx = int(len(features) * 0.9)
                indices = np.random.permutation(len(features))
                
                for epoch in range(50):
                    trainer.train_epoch(
                        features[indices[:split_idx]],
                        targets[indices[:split_idx]],
                        batch_size=32
                    )
                
                metrics = trainer.evaluate(
                    features[indices[split_idx:]],
                    targets[indices[split_idx:]]
                )
                
                model_id = await self.model_registry.save_model(
                    model=model,
                    model_type='campaign_predictor',
                    tenant_id=None,
                    metrics=metrics,
                    hyperparameters={'hidden_sizes': [128, 64, 32]},
                    training_samples=len(features)
                )
                
                results['models_trained'].append({
                    'type': 'campaign_predictor_global',
                    'model_id': model_id,
                    'samples': len(features),
                    'r2_roas': metrics['r2_roas']
                })
                
        except Exception as e:
            logger.error("global_campaign_predictor_error", error=str(e))
            results['errors'].append({'type': 'campaign_predictor_global', 'error': str(e)})
        
        results['finished_at'] = datetime.utcnow().isoformat()
        
        logger.info("global_training_completed",
            models_trained=len(results['models_trained'])
        )
        
        return results
    
    async def get_tenants_for_training(self) -> List[str]:
        """
        Retorna lista de tenants elegíveis para treinamento.
        """
        try:
            engine = await self.get_db_engine()
            
            async with engine.connect() as conn:
                from sqlalchemy import text
                
                # Busca tenants ativos com dados suficientes
                result = await conn.execute(text("""
                    SELECT DISTINCT t.id
                    FROM tenants t
                    WHERE t.status = 'active'
                    AND (
                        (SELECT COUNT(*) FROM leads WHERE tenant_id = t.id AND status IN ('won', 'lost')) > 50
                        OR
                        (SELECT COUNT(*) FROM ad_campaigns WHERE tenant_id = t.id AND impressions > 100) > 20
                    )
                """))
                
                return [str(row.id) for row in result.fetchall()]
                
        except Exception as e:
            logger.error("get_tenants_error", error=str(e))
            return []
    
    async def run_all_tenants(self) -> Dict[str, Any]:
        """
        Executa treinamento para todos os tenants elegíveis.
        """
        tenants = await self.get_tenants_for_training()
        
        results = {
            'started_at': datetime.utcnow().isoformat(),
            'tenants_processed': 0,
            'tenants_successful': 0,
            'total_models_trained': 0,
            'errors': [],
        }
        
        for tenant_id in tenants:
            try:
                tenant_result = await self.run(tenant_id)
                results['tenants_processed'] += 1
                
                if not tenant_result['errors']:
                    results['tenants_successful'] += 1
                
                results['total_models_trained'] += len(tenant_result['models_trained'])
                
            except Exception as e:
                logger.error("tenant_training_error", tenant_id=tenant_id, error=str(e))
                results['errors'].append({
                    'tenant_id': tenant_id,
                    'error': str(e)
                })
        
        results['finished_at'] = datetime.utcnow().isoformat()
        
        return results


# Singleton
training_job = TenantTrainingJob()


def get_training_job() -> TenantTrainingJob:
    """Retorna instância singleton do job."""
    return training_job

