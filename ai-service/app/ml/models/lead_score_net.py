"""
LeadScoreNet - Rede Neural para Scoring de Leads.

Prediz a probabilidade de um lead converter (agendar, comprar, etc.)
baseado em features extraídas do comportamento e perfil do lead.
"""
import torch
import torch.nn as nn
import numpy as np
from typing import Dict, Any, List, Tuple, Optional
import structlog

logger = structlog.get_logger()


class LeadScoreNet(nn.Module):
    """
    Rede neural para predição de probabilidade de conversão de leads.
    
    Arquitetura:
    - Input: Features do lead (score atual, intenção, sentimento, etc.)
    - Hidden: 2-3 camadas densas com ReLU e Dropout
    - Output: Probabilidade de conversão (sigmoid)
    
    Features de entrada (15 dimensões):
    1. lead_score_normalized (0-1)
    2. temperature_encoded (0-1)
    3. stage_index_normalized (0-1)
    4. intent_encoded (0-1)
    5. intent_confidence (0-1)
    6. num_messages_normalized (0-1)
    7. time_since_last_normalized (0-1)
    8. avg_response_time_normalized (0-1)
    9. sentiment_normalized (0-1)
    10. has_objection (0/1)
    11. objection_count_normalized (0-1)
    12. budget_mentioned (0/1)
    13. timeline_mentioned (0/1)
    14. decision_maker (0/1)
    15. rag_context_relevance (0-1)
    """
    
    def __init__(
        self,
        input_size: int = 15,
        hidden_sizes: List[int] = None,
        dropout_rate: float = 0.3
    ):
        """
        Args:
            input_size: Número de features de entrada
            hidden_sizes: Tamanhos das camadas ocultas (default: [64, 32])
            dropout_rate: Taxa de dropout
        """
        super().__init__()
        
        if hidden_sizes is None:
            hidden_sizes = [64, 32]
        
        self.input_size = input_size
        self.hidden_sizes = hidden_sizes
        
        # Constrói camadas dinamicamente
        layers = []
        prev_size = input_size
        
        for hidden_size in hidden_sizes:
            layers.extend([
                nn.Linear(prev_size, hidden_size),
                nn.ReLU(),
                nn.Dropout(dropout_rate),
            ])
            prev_size = hidden_size
        
        # Camada de saída
        layers.extend([
            nn.Linear(prev_size, 1),
            nn.Sigmoid()
        ])
        
        self.model = nn.Sequential(*layers)
    
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """Forward pass."""
        return self.model(x)
    
    def predict(self, features: np.ndarray) -> float:
        """
        Prediz probabilidade de conversão.
        
        Args:
            features: Array numpy com features normalizadas
        
        Returns:
            Probabilidade de conversão (0-1)
        """
        self.eval()
        with torch.no_grad():
            x = torch.FloatTensor(features)
            if x.dim() == 1:
                x = x.unsqueeze(0)
            
            prob = self.forward(x)
            return float(prob.squeeze().item())
    
    def predict_batch(self, features_batch: np.ndarray) -> np.ndarray:
        """Prediz para um batch de leads."""
        self.eval()
        with torch.no_grad():
            x = torch.FloatTensor(features_batch)
            probs = self.forward(x)
            return probs.squeeze().numpy()
    
    @staticmethod
    def extract_features(
        lead_data: Dict[str, Any],
        messages: List[Dict[str, Any]] = None
    ) -> np.ndarray:
        """
        Extrai features de um lead para o modelo.
        
        Args:
            lead_data: Dados do lead (score, stage, etc.)
            messages: Histórico de mensagens (opcional)
        
        Returns:
            Array numpy com 15 features normalizadas
        """
        # Encodings
        temperature_map = {'hot': 1.0, 'warm': 0.66, 'cold': 0.33, 'unknown': 0.0}
        intent_map = {
            'greeting': 0.0, 'question_product': 0.2, 'question_price': 0.3,
            'objection': 0.4, 'interest': 0.6, 'scheduling': 0.9,
            'complaint': 0.1, 'support': 0.2, 'goodbye': 0.1, 'unclear': 0.0
        }
        
        # Extrai e normaliza features
        features = np.zeros(15, dtype=np.float32)
        
        # 1. Lead score normalizado
        features[0] = min(lead_data.get('lead_score', 0) / 100, 1.0)
        
        # 2. Temperature encoded
        features[1] = temperature_map.get(lead_data.get('temperature', 'unknown'), 0.0)
        
        # 3. Stage index normalizado (assume max 10 estágios)
        features[2] = min(lead_data.get('stage_index', 0) / 10, 1.0)
        
        # 4. Intent encoded
        features[3] = intent_map.get(lead_data.get('intent', 'unclear'), 0.0)
        
        # 5. Intent confidence
        features[4] = lead_data.get('intent_confidence', 0.0)
        
        # 6. Num messages normalizado (assume max 50)
        features[5] = min(lead_data.get('num_messages', 0) / 50, 1.0)
        
        # 7. Time since last normalizado (assume max 1 dia)
        features[6] = min(lead_data.get('time_since_last_msg', 0) / 86400, 1.0)
        
        # 8. Avg response time normalizado (assume max 1 hora)
        features[7] = min(lead_data.get('avg_response_time', 0) / 3600, 1.0)
        
        # 9. Sentiment normalizado (-1 a 1 para 0 a 1)
        features[8] = (lead_data.get('sentiment', 0) + 1) / 2
        
        # 10. Has objection
        features[9] = 1.0 if lead_data.get('has_objection', False) else 0.0
        
        # 11. Objection count normalizado (assume max 5)
        features[10] = min(lead_data.get('objection_count', 0) / 5, 1.0)
        
        # 12-14. BANT flags
        features[11] = 1.0 if lead_data.get('budget_mentioned', False) else 0.0
        features[12] = 1.0 if lead_data.get('timeline_mentioned', False) else 0.0
        features[13] = 1.0 if lead_data.get('decision_maker', False) else 0.0
        
        # 15. RAG context relevance
        features[14] = lead_data.get('rag_context_relevance', 0.0)
        
        return features
    
    def get_feature_importance(
        self,
        sample_input: Optional[torch.Tensor] = None
    ) -> Dict[str, float]:
        """
        Retorna importância aproximada de cada feature.
        
        Usa os pesos da primeira camada como proxy.
        """
        feature_names = [
            'lead_score', 'temperature', 'stage_index', 'intent',
            'intent_confidence', 'num_messages', 'time_since_last',
            'avg_response_time', 'sentiment', 'has_objection',
            'objection_count', 'budget_mentioned', 'timeline_mentioned',
            'decision_maker', 'rag_context_relevance'
        ]
        
        # Pega pesos da primeira camada
        first_layer = self.model[0]
        weights = first_layer.weight.abs().mean(dim=0).detach().numpy()
        
        # Normaliza
        weights = weights / weights.sum()
        
        return dict(zip(feature_names, weights.tolist()))


class LeadScoreTrainer:
    """
    Treinador para LeadScoreNet.
    """
    
    def __init__(
        self,
        model: LeadScoreNet = None,
        learning_rate: float = 0.001,
        weight_decay: float = 1e-5
    ):
        self.model = model or LeadScoreNet()
        self.learning_rate = learning_rate
        self.criterion = nn.BCELoss()
        self.optimizer = torch.optim.Adam(
            self.model.parameters(),
            lr=learning_rate,
            weight_decay=weight_decay
        )
    
    def train_epoch(
        self,
        features: np.ndarray,
        labels: np.ndarray,
        batch_size: int = 32
    ) -> float:
        """
        Treina uma época.
        
        Args:
            features: Features dos leads (N x 15)
            labels: Labels (1 = converteu, 0 = não converteu)
            batch_size: Tamanho do batch
        
        Returns:
            Loss média da época
        """
        self.model.train()
        
        # Converte para tensores
        X = torch.FloatTensor(features)
        y = torch.FloatTensor(labels).unsqueeze(1)
        
        # Shuffle
        indices = torch.randperm(len(X))
        X = X[indices]
        y = y[indices]
        
        total_loss = 0
        num_batches = 0
        
        for i in range(0, len(X), batch_size):
            batch_X = X[i:i+batch_size]
            batch_y = y[i:i+batch_size]
            
            self.optimizer.zero_grad()
            
            outputs = self.model(batch_X)
            loss = self.criterion(outputs, batch_y)
            
            loss.backward()
            self.optimizer.step()
            
            total_loss += loss.item()
            num_batches += 1
        
        return total_loss / num_batches
    
    def evaluate(
        self,
        features: np.ndarray,
        labels: np.ndarray
    ) -> Dict[str, float]:
        """
        Avalia o modelo.
        
        Returns:
            Dict com métricas (loss, accuracy, precision, recall, f1)
        """
        self.model.eval()
        
        X = torch.FloatTensor(features)
        y = torch.FloatTensor(labels).unsqueeze(1)
        
        with torch.no_grad():
            outputs = self.model(X)
            loss = self.criterion(outputs, y).item()
            
            predictions = (outputs > 0.5).float()
            
            # Métricas
            tp = ((predictions == 1) & (y == 1)).sum().item()
            fp = ((predictions == 1) & (y == 0)).sum().item()
            fn = ((predictions == 0) & (y == 1)).sum().item()
            tn = ((predictions == 0) & (y == 0)).sum().item()
            
            accuracy = (tp + tn) / (tp + tn + fp + fn) if (tp + tn + fp + fn) > 0 else 0
            precision = tp / (tp + fp) if (tp + fp) > 0 else 0
            recall = tp / (tp + fn) if (tp + fn) > 0 else 0
            f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0
        
        return {
            'loss': loss,
            'accuracy': accuracy,
            'precision': precision,
            'recall': recall,
            'f1': f1
        }
    
    def save(self, path: str):
        """Salva o modelo."""
        torch.save({
            'model_state_dict': self.model.state_dict(),
            'optimizer_state_dict': self.optimizer.state_dict(),
            'input_size': self.model.input_size,
            'hidden_sizes': self.model.hidden_sizes,
        }, path)
    
    def load(self, path: str):
        """Carrega o modelo."""
        checkpoint = torch.load(path)
        
        self.model = LeadScoreNet(
            input_size=checkpoint['input_size'],
            hidden_sizes=checkpoint['hidden_sizes']
        )
        self.model.load_state_dict(checkpoint['model_state_dict'])
        self.optimizer = torch.optim.Adam(self.model.parameters(), lr=self.learning_rate)
        self.optimizer.load_state_dict(checkpoint['optimizer_state_dict'])
