import os
import json
import uuid
import structlog
import yt_dlp
from typing import List, Dict, Any
from openai import OpenAI
from app.config import get_settings

logger = structlog.get_logger()
settings = get_settings()

class VideoService:
    def __init__(self):
        self.client = OpenAI(api_key=settings.openai_api_key)
        self.download_dir = "/tmp/downloads"
        if not os.path.exists(self.download_dir):
            os.makedirs(self.download_dir)

    def download_audio(self, video_url: str) -> str:
        """
        Baixa o áudio de um vídeo (Instagram/TikTok/YouTube) usando yt-dlp.
        Retorna o caminho do arquivo de áudio.
        """
        file_id = str(uuid.uuid4())
        output_template = f"{self.download_dir}/{file_id}.%(ext)s"
        
        ydl_opts = {
            'format': 'bestaudio/best',
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '192',
            }],
            'outtmpl': output_template,
            'quiet': True,
            'no_warnings': True,
        }

        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                logger.info("downloading_video", url=video_url)
                ydl.download([video_url])
                
            audio_path = f"{self.download_dir}/{file_id}.mp3"
            if not os.path.exists(audio_path):
                raise Exception("Audio file not found after download")
                
            return audio_path
            
        except Exception as e:
            logger.error("download_failed", error=str(e))
            raise e

    def transcribe_audio(self, audio_path: str) -> str:
        """
        Transcreve arquivo de áudio usando OpenAI Whisper.
        """
        try:
            logger.info("transcribing_audio", path=audio_path)
            with open(audio_path, "rb") as audio_file:
                transcript = self.client.audio.transcriptions.create(
                    model="whisper-1", 
                    file=audio_file,
                    response_format="text"
                )
            
            # Limpa arquivo após uso
            os.remove(audio_path)
            
            return transcript
            
        except Exception as e:
            logger.error("transcription_failed", error=str(e))
            if os.path.exists(audio_path):
                os.remove(audio_path)
            raise e

    def process_video(self, video_url: str) -> str:
        """
        Fluxo completo: Download -> Transcribe -> Clean up
        """
        audio_path = self.download_audio(video_url)
        transcript = self.transcribe_audio(audio_path)
        return transcript

    def search_videos(self, query: str, limit: int = 5, time_filter: str = None) -> List[Dict[str, Any]]:
        """
        Busca vídeos no YouTube/Shorts relacionados ao tema.
        Args:
            query: Tópico de busca
            limit: Máximo de vídeos
            time_filter: Filtro de tempo (day, week, month) -> adiciona ao termo de busca
        """
        # Adiciona filtro de tempo ao termo de busca para "enganar" o algoritmo de busca
        search_term = f"{query} shorts"
        if time_filter:
            if time_filter in ['day', 'today']:
                search_term += " today"
            elif time_filter == 'week':
                search_term += " this week"
            elif time_filter == 'month':
                search_term += " this month"
                
        search_query = f"ytsearch{limit}:{search_term}"
        
        ydl_opts = {
            'quiet': True,
            'extract_flat': True, # Não baixa, apenas extrai metadados
            'no_warnings': True,
        }
        
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                result = ydl.extract_info(search_query, download=False)
                if 'entries' in result:
                    return [
                        {
                            'url': entry.get('url'),
                            'title': entry.get('title'),
                            'view_count': entry.get('view_count', 0),
                            'duration': entry.get('duration')
                        }
                        for entry in result['entries']
                    ]
                return []
        except Exception as e:
            logger.error("video_search_failed", error=str(e))
            return []

# Singleton
video_service = VideoService()

def get_video_service():
    return video_service
