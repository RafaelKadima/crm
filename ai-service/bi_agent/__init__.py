"""
BI Agent - Agente Autônomo de Business Intelligence
====================================================

Este módulo implementa o terceiro agente autônomo do sistema,
responsável por:
- Análise de dados
- Predições com ML
- Coordenação de SDR e Ads Agents
- Geração de conhecimento para RAG
- Preparação de dados para treinamento ML
"""

from .agent import BIAgent
from .analyzer import DataAnalyzer
from .predictor import PredictiveEngine
from .orchestrator import AgentOrchestrator
from .knowledge_writer import KnowledgeWriter
from .report_generator import ReportGenerator

__all__ = [
    'BIAgent',
    'DataAnalyzer',
    'PredictiveEngine',
    'AgentOrchestrator',
    'KnowledgeWriter',
    'ReportGenerator',
]

