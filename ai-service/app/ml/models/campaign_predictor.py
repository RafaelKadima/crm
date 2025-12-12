"""
CampaignPredictorNet - Rede Neural para Predição de Performance de Campanhas.

Prediz métricas de campanhas de Ads (ROAS, conversões, CTR)
baseado em configurações e contexto histórico.
"""
import torch
import torch.nn as nn
import numpy as np
from typing import Dict, Any, List, Tuple, Optional
import structlog

logger = structlog.get_logger()


class CampaignPredictorNet(nn.Module):
    """
    Rede neural para predição de performance de campanhas de Ads.
    
    Arquitetura:
    - Input: Features da campanha (objetivo, budget, criativo, histórico)
    - Hidden: 2-3 camadas densas com ReLU e Dropout
    - Output: Múltiplas métricas (ROAS, CTR, conversões estimadas)
    
    Features de entrada (12 dimensões):
    1. objective_encoded (0-1)
    2. daily_budget_normalized (0-1)
    3. creative_type_encoded (0-1)
    4. audience_size_normalized (0-1)
    5. historical_ctr_avg (0-1)
    6. historical_roas_avg (0-1)
    7. historical_cpa_normalized (0-1)
    8. days_of_week_encoded (0-1, média de 7 bits)
    9. is_retargeting (0/1)
    10. has_video (0/1)
    11. audience_lookalike_score (0-1)
    12. seasonal_factor (0-1)
    
    Saídas (3 dimensões):
    1. predicted_roas (0-10)
    2. predicted_ctr (0-10%)
    3. predicted_conversions (0-1, normalizado por budget)
    """
    
    def __init__(
        self,
        input_size: int = 12,
        hidden_sizes: List[int] = None,
        output_size: int = 3,
        dropout_rate: float = 0.2
    ):
        """
        Args:
            input_size: Número de features de entrada
            hidden_sizes: Tamanhos das camadas ocultas (default: [64, 32])
            output_size: Número de métricas de saída
            dropout_rate: Taxa de dropout
        """
        super().__init__()
        
        if hidden_sizes is None:
            hidden_sizes = [64, 32]
        
        self.input_size = input_size
        self.hidden_sizes = hidden_sizes
        self.output_size = output_size
        
        # Constrói camadas
        layers = []
        prev_size = input_size
        
        for hidden_size in hidden_sizes:
            layers.extend([
                nn.Linear(prev_size, hidden_size),
                nn.ReLU(),
                nn.Dropout(dropout_rate),
            ])
            prev_size = hidden_size
        
        # Camada de saída com ReLU (métricas são não-negativas)
        layers.extend([
            nn.Linear(prev_size, output_size),
            nn.ReLU()
        ])
        
        self.model = nn.Sequential(*layers)
        
        # Scaler para desnormalizar saídas
        self.output_scales = torch.tensor([5.0, 5.0, 1.0])  # ROAS, CTR, conversions
    
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """Forward pass."""
        raw_output = self.model(x)
        # Escala saídas para ranges realistas
        return raw_output * self.output_scales
    
    def predict(self, features: np.ndarray) -> Dict[str, float]:
        """
        Prediz métricas de performance.
        
        Args:
            features: Array numpy com features normalizadas
        
        Returns:
            Dict com roas, ctr, conversions estimados
        """
        self.eval()
        with torch.no_grad():
            x = torch.FloatTensor(features)
            if x.dim() == 1:
                x = x.unsqueeze(0)
            
            outputs = self.forward(x)
            outputs = outputs.squeeze().numpy()
            
            return {
                'predicted_roas': float(outputs[0]),
                'predicted_ctr': float(outputs[1]),
                'predicted_conversion_rate': float(outputs[2])
            }
    
    def predict_batch(self, features_batch: np.ndarray) -> List[Dict[str, float]]:
        """Prediz para um batch de campanhas."""
        self.eval()
        with torch.no_grad():
            x = torch.FloatTensor(features_batch)
            outputs = self.forward(x).numpy()
            
            return [
                {
                    'predicted_roas': float(row[0]),
                    'predicted_ctr': float(row[1]),
                    'predicted_conversion_rate': float(row[2])
                }
                for row in outputs
            ]
    
    @staticmethod
    def extract_features(
        campaign_data: Dict[str, Any],
        historical_data: Dict[str, Any] = None
    ) -> np.ndarray:
        """
        Extrai features de uma campanha para o modelo.
        
        Args:
            campaign_data: Dados da campanha
            historical_data: Dados históricos do tenant
        
        Returns:
            Array numpy com 12 features normalizadas
        """
        historical_data = historical_data or {}
        
        # Encodings
        objective_map = {
            'OUTCOME_SALES': 1.0,
            'OUTCOME_LEADS': 0.8,
            'OUTCOME_AWARENESS': 0.3,
            'OUTCOME_TRAFFIC': 0.5,
            'OUTCOME_ENGAGEMENT': 0.4
        }
        
        creative_map = {
            'video': 1.0,
            'carousel': 0.7,
            'image': 0.5,
            'text': 0.3
        }
        
        features = np.zeros(12, dtype=np.float32)
        
        # 1. Objective encoded
        features[0] = objective_map.get(campaign_data.get('objective', ''), 0.5)
        
        # 2. Daily budget normalizado (assume max R$ 5000)
        features[1] = min(campaign_data.get('daily_budget', 0) / 5000, 1.0)
        
        # 3. Creative type encoded
        features[2] = creative_map.get(campaign_data.get('creative_type', 'image'), 0.5)
        
        # 4. Audience size normalizado (assume max 10M)
        audience_size = campaign_data.get('audience_size', 1000000)
        features[3] = min(np.log10(audience_size + 1) / 7, 1.0)  # log scale
        
        # 5. Historical CTR avg
        features[4] = min(historical_data.get('avg_ctr', 1.0) / 5, 1.0)
        
        # 6. Historical ROAS avg
        features[5] = min(historical_data.get('avg_roas', 1.0) / 5, 1.0)
        
        # 7. Historical CPA normalizado (assume max R$ 200)
        features[6] = min(historical_data.get('avg_cpa', 50) / 200, 1.0)
        
        # 8. Days of week (média, assume veiculação full week)
        features[7] = 0.7  # Default: maioria dos dias
        
        # 9. Is retargeting
        features[8] = 1.0 if campaign_data.get('is_retargeting', False) else 0.0
        
        # 10. Has video
        features[9] = 1.0 if campaign_data.get('creative_type', '') == 'video' else 0.0
        
        # 11. Audience lookalike score
        features[10] = campaign_data.get('lookalike_score', 0.5)
        
        # 12. Seasonal factor (pode ser ajustado por mês/evento)
        features[11] = campaign_data.get('seasonal_factor', 0.5)
        
        return features
    
    def get_optimal_configuration(
        self,
        base_config: Dict[str, Any],
        historical_data: Dict[str, Any]
    ) -> Tuple[Dict[str, Any], Dict[str, float]]:
        """
        Sugere configuração ótima variando parâmetros.
        
        Simula diferentes configurações e retorna a melhor.
        """
        best_config = base_config.copy()
        best_prediction = {'predicted_roas': 0}
        
        # Variações a testar
        objectives = ['OUTCOME_SALES', 'OUTCOME_LEADS', 'OUTCOME_TRAFFIC']
        creative_types = ['video', 'image', 'carousel']
        budget_multipliers = [0.5, 1.0, 1.5, 2.0]
        
        for objective in objectives:
            for creative_type in creative_types:
                for budget_mult in budget_multipliers:
                    config = base_config.copy()
                    config['objective'] = objective
                    config['creative_type'] = creative_type
                    config['daily_budget'] = base_config.get('daily_budget', 100) * budget_mult
                    
                    features = self.extract_features(config, historical_data)
                    prediction = self.predict(features)
                    
                    if prediction['predicted_roas'] > best_prediction['predicted_roas']:
                        best_prediction = prediction
                        best_config = config
        
        return best_config, best_prediction


class CampaignPredictorTrainer:
    """
    Treinador para CampaignPredictorNet.
    """
    
    def __init__(
        self,
        model: CampaignPredictorNet = None,
        learning_rate: float = 0.001,
        weight_decay: float = 1e-5
    ):
        self.model = model or CampaignPredictorNet()
        self.learning_rate = learning_rate
        self.criterion = nn.MSELoss()
        self.optimizer = torch.optim.Adam(
            self.model.parameters(),
            lr=learning_rate,
            weight_decay=weight_decay
        )
    
    def train_epoch(
        self,
        features: np.ndarray,
        targets: np.ndarray,  # [roas, ctr, conversion_rate]
        batch_size: int = 32
    ) -> float:
        """
        Treina uma época.
        
        Args:
            features: Features das campanhas (N x 12)
            targets: Targets reais [N x 3] (roas, ctr, conversion_rate)
            batch_size: Tamanho do batch
        
        Returns:
            Loss média da época
        """
        self.model.train()
        
        X = torch.FloatTensor(features)
        y = torch.FloatTensor(targets)
        
        # Normaliza targets para range do modelo
        y_scaled = y / self.model.output_scales
        
        # Shuffle
        indices = torch.randperm(len(X))
        X = X[indices]
        y_scaled = y_scaled[indices]
        
        total_loss = 0
        num_batches = 0
        
        for i in range(0, len(X), batch_size):
            batch_X = X[i:i+batch_size]
            batch_y = y_scaled[i:i+batch_size]
            
            self.optimizer.zero_grad()
            
            outputs = self.model.model(batch_X)  # Raw outputs
            loss = self.criterion(outputs, batch_y)
            
            loss.backward()
            self.optimizer.step()
            
            total_loss += loss.item()
            num_batches += 1
        
        return total_loss / num_batches
    
    def evaluate(
        self,
        features: np.ndarray,
        targets: np.ndarray
    ) -> Dict[str, float]:
        """
        Avalia o modelo.
        
        Returns:
            Dict com métricas (mse, mae, r2 para cada saída)
        """
        self.model.eval()
        
        X = torch.FloatTensor(features)
        y = torch.FloatTensor(targets)
        
        with torch.no_grad():
            predictions = self.model(X)
            
            # MSE e MAE por saída
            mse = ((predictions - y) ** 2).mean(dim=0)
            mae = (predictions - y).abs().mean(dim=0)
            
            # R² por saída
            ss_res = ((y - predictions) ** 2).sum(dim=0)
            ss_tot = ((y - y.mean(dim=0)) ** 2).sum(dim=0)
            r2 = 1 - ss_res / (ss_tot + 1e-8)
        
        return {
            'mse_roas': mse[0].item(),
            'mse_ctr': mse[1].item(),
            'mse_conv': mse[2].item(),
            'mae_roas': mae[0].item(),
            'mae_ctr': mae[1].item(),
            'mae_conv': mae[2].item(),
            'r2_roas': r2[0].item(),
            'r2_ctr': r2[1].item(),
            'r2_conv': r2[2].item(),
        }
    
    def save(self, path: str):
        """Salva o modelo."""
        torch.save({
            'model_state_dict': self.model.state_dict(),
            'optimizer_state_dict': self.optimizer.state_dict(),
            'input_size': self.model.input_size,
            'hidden_sizes': self.model.hidden_sizes,
            'output_size': self.model.output_size,
        }, path)
    
    def load(self, path: str):
        """Carrega o modelo."""
        checkpoint = torch.load(path)
        
        self.model = CampaignPredictorNet(
            input_size=checkpoint['input_size'],
            hidden_sizes=checkpoint['hidden_sizes'],
            output_size=checkpoint['output_size']
        )
        self.model.load_state_dict(checkpoint['model_state_dict'])
        self.optimizer = torch.optim.Adam(self.model.parameters(), lr=self.learning_rate)
        self.optimizer.load_state_dict(checkpoint['optimizer_state_dict'])
