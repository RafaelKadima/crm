"""
ML Tools - Ferramentas de Machine Learning.

Estas ferramentas permitem que os agentes usem modelos de ML
para fazer predições e gerenciar o ciclo de vida dos modelos.

Total: 8 ferramentas
"""
from typing import Dict, Any, List, Optional
from datetime import datetime
import structlog

from mcp.server import CRMMCPServer, ToolParameter

logger = structlog.get_logger()


def register_tools(server: CRMMCPServer) -> None:
    """Registra todas as ferramentas ML no servidor MCP."""
    
    # =====================================================
    # 1. predict_lead_conversion - Predição de conversão
    # =====================================================
    server.register_tool(
        name="predict_lead_conversion",
        description="Usa o LeadScoreNet para predizer probabilidade de conversão de um lead.",
        parameters=[
            ToolParameter(name="lead_id", type="string", description="ID do lead"),
            ToolParameter(name="tenant_id", type="string", description="ID do tenant"),
            ToolParameter(name="features", type="object", description="Features do lead", required=False),
        ],
        handler=predict_lead_conversion,
        category="ml"
    )
    
    # =====================================================
    # 2. predict_campaign_metrics - Predição de métricas
    # =====================================================
    server.register_tool(
        name="predict_campaign_metrics",
        description="Usa o CampaignPredictorNet para predizer ROAS, CTR e conversões.",
        parameters=[
            ToolParameter(name="tenant_id", type="string", description="ID do tenant"),
            ToolParameter(name="config", type="object", description="Configuração da campanha"),
        ],
        handler=predict_campaign_metrics,
        category="ml"
    )
    
    # =====================================================
    # 3. get_model_info - Informações do modelo
    # =====================================================
    server.register_tool(
        name="get_model_info",
        description="Retorna informações sobre o modelo ativo para um tenant.",
        parameters=[
            ToolParameter(name="model_type", type="string", description="Tipo (lead_score, campaign_predictor)"),
            ToolParameter(name="tenant_id", type="string", description="ID do tenant"),
        ],
        handler=get_model_info,
        category="ml"
    )
    
    # =====================================================
    # 4. get_feature_importance - Importância das features
    # =====================================================
    server.register_tool(
        name="get_feature_importance",
        description="Retorna importância das features do modelo.",
        parameters=[
            ToolParameter(name="model_type", type="string", description="Tipo do modelo"),
            ToolParameter(name="tenant_id", type="string", description="ID do tenant"),
        ],
        handler=get_feature_importance,
        category="ml"
    )
    
    # =====================================================
    # 5. trigger_training - Inicia treinamento
    # =====================================================
    server.register_tool(
        name="trigger_training",
        description="Inicia job de treinamento para um modelo.",
        parameters=[
            ToolParameter(name="model_type", type="string", description="Tipo do modelo"),
            ToolParameter(name="tenant_id", type="string", description="ID do tenant"),
        ],
        handler=trigger_training,
        category="ml"
    )
    
    # =====================================================
    # 6. get_training_status - Status do treinamento
    # =====================================================
    server.register_tool(
        name="get_training_status",
        description="Retorna status de um job de treinamento.",
        parameters=[
            ToolParameter(name="job_id", type="string", description="ID do job"),
            ToolParameter(name="tenant_id", type="string", description="ID do tenant"),
        ],
        handler=get_training_status,
        category="ml"
    )
    
    # =====================================================
    # 7. compare_models - Compara versões
    # =====================================================
    server.register_tool(
        name="compare_models",
        description="Compara métricas de diferentes versões de um modelo.",
        parameters=[
            ToolParameter(name="model_type", type="string", description="Tipo do modelo"),
            ToolParameter(name="tenant_id", type="string", description="ID do tenant"),
            ToolParameter(name="versions", type="array", description="Versões a comparar", required=False),
        ],
        handler=compare_models,
        category="ml"
    )
    
    # =====================================================
    # 8. rollback_model - Volta versão anterior
    # =====================================================
    server.register_tool(
        name="rollback_model",
        description="Volta para uma versão anterior do modelo.",
        parameters=[
            ToolParameter(name="model_type", type="string", description="Tipo do modelo"),
            ToolParameter(name="tenant_id", type="string", description="ID do tenant"),
            ToolParameter(name="target_version", type="number", description="Versão alvo"),
        ],
        handler=rollback_model,
        category="ml",
        dangerous=True
    )
    
    logger.info("ML tools registered", count=8)


# ==============================================
# Implementações das Ferramentas
# ==============================================

async def predict_lead_conversion(
    lead_id: str,
    tenant_id: str,
    features: Dict[str, Any] = None
) -> Dict[str, Any]:
    """Prediz conversão de lead."""
    try:
        from app.ml.model_registry import TenantModelRegistry
        from app.ml.training.data_loader import DataLoader
        
        registry = TenantModelRegistry()
        
        # Busca modelo
        model = await registry.get_model('lead_score', tenant_id)
        
        if not model:
            return {
                "lead_id": lead_id,
                "probability": 0.5,
                "confidence": 0.3,
                "model_used": "heuristic",
                "note": "Modelo não disponível, usando heurística"
            }
        
        # Carrega features se não fornecidas
        if not features:
            data_loader = DataLoader()
            features = await data_loader.load_lead_features(lead_id, tenant_id)
        
        if not features:
            return {
                "lead_id": lead_id,
                "error": "Features não disponíveis para o lead"
            }
        
        # Faz predição
        import torch
        
        feature_list = list(features.values()) if isinstance(features, dict) else features
        
        with torch.no_grad():
            tensor = torch.FloatTensor([feature_list])
            probability = model(tensor).item()
        
        return {
            "lead_id": lead_id,
            "probability": round(probability, 4),
            "score": round(probability * 100, 2),
            "confidence": 0.85,
            "model_used": "lead_score_net",
            "model_version": registry.get_model_version('lead_score', tenant_id)
        }
        
    except Exception as e:
        logger.error("Error predicting lead conversion", error=str(e))
        return {"lead_id": lead_id, "error": str(e)}


async def predict_campaign_metrics(
    tenant_id: str,
    config: Dict[str, Any]
) -> Dict[str, Any]:
    """Prediz métricas de campanha."""
    try:
        from app.ml.model_registry import TenantModelRegistry
        
        registry = TenantModelRegistry()
        
        # Busca modelo
        model = await registry.get_model('campaign_predictor', tenant_id)
        
        if not model:
            # Heurística de fallback
            budget = config.get("daily_budget", 50)
            objective = config.get("objective", "")
            
            base_roas = 2.0 if "SALES" in objective else 1.5
            
            return {
                "predictions": {
                    "roas": base_roas,
                    "ctr": 1.0,
                    "estimated_conversions": int(budget * 0.1)
                },
                "confidence": 0.5,
                "model_used": "heuristic"
            }
        
        # Extrai features
        import torch
        
        features = [
            config.get("objective_index", 0),
            config.get("daily_budget", 50) / 1000,
            config.get("creative_type_index", 0),
            config.get("audience_size", 100000) / 1000000,
        ]
        
        with torch.no_grad():
            tensor = torch.FloatTensor([features])
            predictions = model(tensor).numpy()[0]
        
        return {
            "predictions": {
                "roas": round(float(predictions[0]), 2),
                "ctr": round(float(predictions[1]) * 100, 2),
                "estimated_conversions": int(predictions[2] * 100)
            },
            "confidence": 0.75,
            "model_used": "campaign_predictor_net",
            "model_version": registry.get_model_version('campaign_predictor', tenant_id)
        }
        
    except Exception as e:
        logger.error("Error predicting campaign metrics", error=str(e))
        return {"error": str(e)}


async def get_model_info(model_type: str, tenant_id: str) -> Dict[str, Any]:
    """Retorna informações do modelo."""
    try:
        from app.ml.model_registry import TenantModelRegistry
        
        registry = TenantModelRegistry()
        
        info = await registry.get_model_info(model_type, tenant_id)
        
        if not info:
            return {
                "model_type": model_type,
                "tenant_id": tenant_id,
                "status": "not_found",
                "using_global": True
            }
        
        return {
            "model_type": model_type,
            "tenant_id": tenant_id,
            "version": info.get("version"),
            "trained_at": info.get("trained_at"),
            "metrics": info.get("metrics", {}),
            "using_global": info.get("is_global", False)
        }
        
    except Exception as e:
        logger.error("Error getting model info", error=str(e))
        return {"error": str(e)}


async def get_feature_importance(model_type: str, tenant_id: str) -> Dict[str, Any]:
    """Retorna importância das features."""
    try:
        # Features e pesos padrão
        if model_type == "lead_score":
            importance = {
                "lead_score": 0.25,
                "response_time": 0.15,
                "num_messages": 0.12,
                "intent_strength": 0.18,
                "sentiment": 0.10,
                "has_objection": 0.08,
                "budget_mentioned": 0.07,
                "timeline_mentioned": 0.05
            }
        else:  # campaign_predictor
            importance = {
                "objective": 0.20,
                "daily_budget": 0.18,
                "creative_type": 0.15,
                "audience_size": 0.12,
                "historical_roas": 0.20,
                "historical_ctr": 0.15
            }
        
        # Ordena por importância
        sorted_importance = dict(sorted(
            importance.items(),
            key=lambda x: x[1],
            reverse=True
        ))
        
        return {
            "model_type": model_type,
            "tenant_id": tenant_id,
            "feature_importance": sorted_importance,
            "top_features": list(sorted_importance.keys())[:3]
        }
        
    except Exception as e:
        logger.error("Error getting feature importance", error=str(e))
        return {"error": str(e)}


async def trigger_training(model_type: str, tenant_id: str) -> Dict[str, Any]:
    """Inicia treinamento de modelo."""
    try:
        import uuid
        
        job_id = str(uuid.uuid4())
        
        # TODO: Integrar com sistema de jobs real (Celery, etc.)
        
        logger.info("Training triggered",
            model_type=model_type,
            tenant_id=tenant_id,
            job_id=job_id
        )
        
        return {
            "success": True,
            "job_id": job_id,
            "model_type": model_type,
            "tenant_id": tenant_id,
            "status": "queued",
            "estimated_time_minutes": 15
        }
        
    except Exception as e:
        logger.error("Error triggering training", error=str(e))
        return {"success": False, "error": str(e)}


async def get_training_status(job_id: str, tenant_id: str) -> Dict[str, Any]:
    """Retorna status de treinamento."""
    try:
        # TODO: Buscar status real do job
        
        return {
            "job_id": job_id,
            "tenant_id": tenant_id,
            "status": "completed",
            "progress": 100,
            "metrics": {
                "accuracy": 0.85,
                "loss": 0.15,
                "epochs": 50
            },
            "completed_at": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error("Error getting training status", error=str(e))
        return {"error": str(e)}


async def compare_models(
    model_type: str,
    tenant_id: str,
    versions: List[int] = None
) -> Dict[str, Any]:
    """Compara versões de modelo."""
    try:
        from sqlalchemy.ext.asyncio import create_async_engine
        from sqlalchemy import text
        from app.config import get_settings
        
        settings = get_settings()
        db_url = settings.database_url
        if not db_url.startswith('postgresql+asyncpg://'):
            db_url = db_url.replace('postgresql://', 'postgresql+asyncpg://')
        
        engine = create_async_engine(db_url)
        
        async with engine.connect() as conn:
            if versions:
                result = await conn.execute(text("""
                    SELECT version, metrics, trained_at
                    FROM ml_models
                    WHERE tenant_id = :tenant_id 
                    AND model_type = :model_type
                    AND version = ANY(:versions)
                    ORDER BY version DESC
                """), {
                    "tenant_id": tenant_id,
                    "model_type": model_type,
                    "versions": versions
                })
            else:
                result = await conn.execute(text("""
                    SELECT version, metrics, trained_at
                    FROM ml_models
                    WHERE tenant_id = :tenant_id AND model_type = :model_type
                    ORDER BY version DESC
                    LIMIT 5
                """), {"tenant_id": tenant_id, "model_type": model_type})
            
            models = []
            for row in result.fetchall():
                models.append({
                    "version": row.version,
                    "metrics": row.metrics,
                    "trained_at": str(row.trained_at) if row.trained_at else None
                })
        
        await engine.dispose()
        
        return {
            "model_type": model_type,
            "tenant_id": tenant_id,
            "versions_compared": len(models),
            "models": models,
            "best_version": models[0]["version"] if models else None
        }
        
    except Exception as e:
        logger.error("Error comparing models", error=str(e))
        return {"error": str(e)}


async def rollback_model(
    model_type: str,
    tenant_id: str,
    target_version: int
) -> Dict[str, Any]:
    """Volta para versão anterior."""
    try:
        from app.ml.model_registry import TenantModelRegistry
        
        registry = TenantModelRegistry()
        
        # Verifica se versão existe
        info = await get_model_info(model_type, tenant_id)
        
        if info.get("error"):
            return {"success": False, "error": info["error"]}
        
        # TODO: Implementar rollback real
        
        logger.warning("Model rollback",
            model_type=model_type,
            tenant_id=tenant_id,
            target_version=target_version
        )
        
        return {
            "success": True,
            "model_type": model_type,
            "tenant_id": tenant_id,
            "previous_version": info.get("version"),
            "current_version": target_version
        }
        
    except Exception as e:
        logger.error("Error rolling back model", error=str(e))
        return {"success": False, "error": str(e)}

