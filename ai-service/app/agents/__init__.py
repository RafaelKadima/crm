"""
Ads Orchestrator Agent Package

Este pacote contém o agente orquestrador para criação automatizada
de campanhas no Meta Ads e Google Ads.
"""

from .orchestrator import AdsOrchestratorAgent, get_orchestrator_agent

__all__ = ['AdsOrchestratorAgent', 'get_orchestrator_agent']

