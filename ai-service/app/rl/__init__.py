"""
Reinforcement Learning Framework para Agentes SDR e Ads.

Este módulo implementa:
- States: Estados que os agentes observam
- Actions: Ações que os agentes podem tomar
- Rewards: Sistema de recompensas
- ExperienceBuffer: Armazenamento de experiências
- PolicyEngine: Motor de decisão de políticas
- SafetyGuard: Validação de segurança para ações
- Explainability: Explicações das decisões

Modos de operação:
1. RULE_BASED: Regras fixas (< 50 experiências)
2. BANDIT: Thompson Sampling (50-500 experiências)
3. DQN: Deep Q-Network (> 500 experiências)
"""

from app.rl.states import SDRState, AdsState
from app.rl.actions import SDRAction, AdsAction
from app.rl.rewards import SDRRewardCalculator, AdsRewardCalculator
from app.rl.experience_buffer import ExperienceBuffer, Experience
from app.rl.policy_engine import PolicyEngine, PolicyMode
from app.rl.safety_guard import AdsSafetyGuard, SafetyResult
from app.rl.explainability import ActionExplainer
from app.rl.mode_manager import RLModeManager

__all__ = [
    'SDRState',
    'AdsState',
    'SDRAction',
    'AdsAction',
    'SDRRewardCalculator',
    'AdsRewardCalculator',
    'ExperienceBuffer',
    'Experience',
    'PolicyEngine',
    'PolicyMode',
    'AdsSafetyGuard',
    'SafetyResult',
    'ActionExplainer',
    'RLModeManager',
]
