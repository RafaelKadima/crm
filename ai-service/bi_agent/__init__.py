"""
BI Agent - Agente de Business Intelligence
==========================================

Módulo completo de análise de dados e inteligência de negócios.

Componentes:
- DataAnalyzer: Coleta e análise de métricas
- PredictiveEngine: Predições com dados reais
- AgentOrchestrator: Coordenação de ações
- KnowledgeWriter: Gestão de conhecimento e RAG
- ReportGenerator: Geração de relatórios PDF/Excel
- BICache: Cache Redis para performance
- BIAgentMetrics: Dashboard de métricas do BI Agent
- PeriodComparison: Análise comparativa de períodos
"""

from .analyzer import DataAnalyzer
from .predictor import PredictiveEngine
from .orchestrator import AgentOrchestrator
from .knowledge import KnowledgeWriter
from .reports import ReportGenerator
from .cache import BICache, CachedDataAnalyzer
from .metrics import BIAgentMetrics, PeriodComparison
from .agent import BIAgent

__all__ = [
    "BIAgent",
    "DataAnalyzer",
    "PredictiveEngine",
    "AgentOrchestrator",
    "KnowledgeWriter",
    "ReportGenerator",
    "BICache",
    "CachedDataAnalyzer",
    "BIAgentMetrics",
    "PeriodComparison",
]

__version__ = "2.0.0"
