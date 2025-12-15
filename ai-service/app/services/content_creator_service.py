import json
import structlog
import httpx
from typing import Dict, Any, List
from openai import OpenAI
from app.config import get_settings
from app.services.video_service import get_video_service

logger = structlog.get_logger()
settings = get_settings()

class ContentCreatorService:
    def __init__(self):
        self.client = OpenAI(api_key=settings.openai_api_key)
        self.model = settings.openai_model
        self.video_service = get_video_service()
        self.laravel_api_url = settings.LARAVEL_API_URL

    async def analyze_viral_video(self, video_url: str) -> Dict[str, Any]:
        """
        Analisa um vídeo viral:
        1. Baixa e transcreve.
        2. Analisa a estrutura do roteiro (Engenharia Reversa).
        """
        # 1. Obter transcrição
        transcript = self.video_service.process_video(video_url)
        
        # 2. Analisar estrutura com LLM
        prompt = f"""Analise esta transcrição de um vídeo viral (Reels/TikTok) e faça engenharia reversa da sua estrutura.
        
        TRANSCRIÇÃO:
        "{transcript}"
        
        Identifique:
        1. O Gancho (Hook) - Primeiros 3s
        2. A Retenção - Como ele manteve a atenção no meio
        3. O CTA - Chamada para ação final
        4. O Ritmo/Pacing (Rápido, Lento, Informativo, Humor)
        5. Gatilhos Mentais usados
        
        Retorne JSON:
        {{
            "hook_type": "Curiosity|Problem|Statement|Visual",
            "hook_text": "Texto exato do hook",
            "structure_analysis": "Explicação da estrutura narrativa",
            "pacing": "Fast|Medium|Slow",
            "triggers": ["gatilho1", "gatilho2"],
            "script_template": "Esqueleto do roteiro (ex: [Problema] -> [Solução Inesperada] -> [Prova])"
        }}"""

        response = self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"}
        )
        
        analysis = json.loads(response.choices[0].message.content)
        analysis['original_transcript'] = transcript
        return analysis

    async def generate_viral_script(
        self, 
        video_url: str, 
        product_id: str, 
        tenant_id: str
    ) -> Dict[str, Any]:
        """
        Gera um NOVO roteiro viciante baseado na estrutura de um vídeo viral,
        mas adaptado para o produto do tenant.
        """
        # 1. Analisa o vídeo de referência
        viral_analysis = await self.analyze_viral_video(video_url)
        
        # 2. Busca contexto do produto
        product_context = await self._get_product_context(product_id, tenant_id)
        if not product_context:
            raise Exception("Product context not found")
            
        # 3. Gera novo roteiro
        prompt = f"""Você é um estrategista de conteúdo viral.
        
        OBJETIVO:
        Criar um roteiro de vídeo curto (Reels/TikTok) para o produto abaixo, usando EXATAMENTE a mesma estrutura narrativa do vídeo viral analisado.
        
        VÍDEO VIRAL REFERÊNCIA:
        - Hook Type: {viral_analysis.get('hook_type')}
        - Template: {viral_analysis.get('script_template')}
        - Ritmo: {viral_analysis.get('pacing')}
        
        PRODUTO:
        - Nome: {product_context.get('name')}
        - Descrição: {product_context.get('description')}
        - Público: {product_context.get('marketing_context', {}).get('target_audience')}
        - Dores: {', '.join(product_context.get('marketing_context', {}).get('pain_points', []))}
        - Benefícios: {', '.join(product_context.get('marketing_context', {}).get('key_benefits', []))}
        - Tom: {product_context.get('marketing_context', {}).get('brand_tone')}
        
        Gere um roteiro completo linha a linha.
        
        Retorne JSON:
        {{
            "title": "Título chamativo",
            "hook_visual": "Descrição visual dos primeiros 3s",
            "hook_audio": "Texto falado ou áudio dos primeiros 3s",
            "script_body": [
                {{"time": "0:03-0:15", "visual": "...", "audio": "..."}},
                {{"time": "0:15-0:30", "visual": "...", "audio": "..."}}
            ],
            "cta_text": "Texto final de chamada",
            "caption_suggestion": "Legenda para o post com hashtags",
            "viral_score_prediction": 85
        }}"""
        
        response = self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"}
        )
        
        new_script = json.loads(response.choices[0].message.content)
        
        return {
            "reference_analysis": viral_analysis,
            "generated_script": new_script,
            "product_name": product_context.get('name')
        }

    async def _get_product_context(self, product_id: str, tenant_id: str) -> Dict:
        """Busca dados enriquecidos do produto no Laravel"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.laravel_api_url}/api/internal/products/{product_id}/context",
                    headers={
                        "X-Tenant-ID": tenant_id, 
                        "X-Internal-Key": "sb-internal-secret-key-123" # TODO: env var
                    }
                )
                if response.status_code == 200:
                    return response.json()
                return {}
        except Exception as e:
            logger.error("failed_fetch_product", error=str(e))
            return {}

    async def discover_and_create_script(
        self,
        topic: str,
        product_id: str,
        tenant_id: str,
        period: str = "week" # day, week, month, all
    ) -> Dict[str, Any]:
        """
        Fluxo 100% automatizado:
        1. Busca vídeos virais sobre o tópico (filtrando por período).
        2. Seleciona o melhor (mais views).
        3. Analisa e gera roteiro para o produto.
        """
        # 1. Busca vídeos
        videos = self.video_service.search_videos(topic, limit=10, time_filter=period)
        if not videos:
            raise Exception(f"No viral videos found for topic: {topic}")
            
        # 2. Ordena por views e pega o top 1
        # Filtra vídeos muito longos (> 90s) para garantir que seja short/reel
        shorts = [v for v in videos if v.get('duration', 0) < 90]
        if not shorts:
            shorts = videos # Fallback
            
        best_video = sorted(shorts, key=lambda x: x.get('view_count', 0) or 0, reverse=True)[0]
        
        # 3. Gera roteiro baseado neste vídeo
        return await self.generate_viral_script(
            video_url=best_video['url'],
            product_id=product_id,
            tenant_id=tenant_id
        )

# Singleton
content_creator = ContentCreatorService()

def get_content_creator():
    return content_creator
