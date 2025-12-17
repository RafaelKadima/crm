"""
Serviço de Transcrição de Vídeo usando Groq Whisper v3
Suporte a YouTube, TikTok, Instagram
"""
import os
import uuid
import structlog
import yt_dlp
from typing import Optional, Dict, Any, Tuple
from groq import Groq
from app.config import get_settings

logger = structlog.get_logger()
settings = get_settings()


class TranscriptionService:
    """Serviço para transcrição de vídeos usando Groq Whisper"""

    def __init__(self):
        self.groq_client = Groq(api_key=settings.groq_api_key)
        self.whisper_model = settings.groq_whisper_model
        self.download_dir = "/tmp/content_downloads"

        if not os.path.exists(self.download_dir):
            os.makedirs(self.download_dir)

    def _detect_platform(self, url: str) -> str:
        """Detecta a plataforma do vídeo"""
        url_lower = url.lower()
        if "youtube.com" in url_lower or "youtu.be" in url_lower:
            return "youtube"
        elif "tiktok.com" in url_lower:
            return "tiktok"
        elif "instagram.com" in url_lower:
            return "instagram"
        else:
            return "unknown"

    def _get_video_info(self, video_url: str) -> Dict[str, Any]:
        """Obtém informações do vídeo sem baixar"""
        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'extract_flat': False,
        }

        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(video_url, download=False)
                return {
                    'title': info.get('title', ''),
                    'duration': info.get('duration', 0),
                    'view_count': info.get('view_count', 0),
                    'channel': info.get('uploader', ''),
                    'platform': self._detect_platform(video_url),
                }
        except Exception as e:
            logger.warning("video_info_failed", error=str(e), url=video_url)
            return {
                'title': '',
                'duration': 0,
                'view_count': 0,
                'channel': '',
                'platform': self._detect_platform(video_url),
            }

    def download_audio(self, video_url: str) -> Tuple[str, Dict[str, Any]]:
        """
        Baixa o áudio de um vídeo usando yt-dlp.
        Retorna o caminho do arquivo e metadados do vídeo.
        """
        file_id = str(uuid.uuid4())
        output_template = f"{self.download_dir}/{file_id}.%(ext)s"

        ydl_opts = {
            'format': 'bestaudio/best',
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '128',
            }],
            'outtmpl': output_template,
            'quiet': True,
            'no_warnings': True,
        }

        try:
            logger.info("downloading_audio", url=video_url)

            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(video_url, download=True)

            audio_path = f"{self.download_dir}/{file_id}.mp3"

            if not os.path.exists(audio_path):
                # Tenta encontrar o arquivo com outra extensão
                for ext in ['mp3', 'm4a', 'webm', 'opus']:
                    alt_path = f"{self.download_dir}/{file_id}.{ext}"
                    if os.path.exists(alt_path):
                        audio_path = alt_path
                        break
                else:
                    raise Exception("Audio file not found after download")

            metadata = {
                'title': info.get('title', ''),
                'duration': info.get('duration', 0),
                'view_count': info.get('view_count', 0),
                'channel': info.get('uploader', ''),
                'platform': self._detect_platform(video_url),
            }

            logger.info("audio_downloaded", path=audio_path, duration=metadata['duration'])
            return audio_path, metadata

        except Exception as e:
            logger.error("audio_download_failed", error=str(e), url=video_url)
            raise Exception(f"Falha ao baixar áudio: {str(e)}")

    def transcribe_audio(self, audio_path: str, language: str = "pt") -> str:
        """
        Transcreve arquivo de áudio usando Groq Whisper v3.
        Mais rápido e gratuito que OpenAI Whisper.
        """
        try:
            logger.info("transcribing_audio", path=audio_path, model=self.whisper_model)

            # Verifica tamanho do arquivo (limite de 25MB para Groq)
            file_size = os.path.getsize(audio_path)
            if file_size > 25 * 1024 * 1024:
                logger.warning("file_too_large", size=file_size)
                # TODO: Implementar split de áudio se necessário

            with open(audio_path, "rb") as audio_file:
                transcription = self.groq_client.audio.transcriptions.create(
                    file=(os.path.basename(audio_path), audio_file.read()),
                    model=self.whisper_model,
                    language=language,
                    response_format="text"
                )

            logger.info("transcription_completed", length=len(transcription))
            return transcription

        except Exception as e:
            logger.error("transcription_failed", error=str(e))
            raise Exception(f"Falha na transcrição: {str(e)}")
        finally:
            # Limpa arquivo após uso
            if os.path.exists(audio_path):
                try:
                    os.remove(audio_path)
                except:
                    pass

    def process_video(self, video_url: str, language: str = "pt") -> Dict[str, Any]:
        """
        Fluxo completo: Download -> Transcribe -> Metadados
        Retorna dicionário com transcrição e metadados.
        """
        logger.info("processing_video", url=video_url)

        # Baixa o áudio
        audio_path, metadata = self.download_audio(video_url)

        # Transcreve
        transcription = self.transcribe_audio(audio_path, language)

        return {
            'video_url': video_url,
            'video_title': metadata.get('title', ''),
            'transcription': transcription,
            'duration_seconds': metadata.get('duration', 0),
            'view_count': metadata.get('view_count', 0),
            'channel': metadata.get('channel', ''),
            'platform': metadata.get('platform', ''),
            'language': language,
        }

    def search_viral_videos(
        self,
        topic: str,
        platform: str = "youtube",
        period: str = "week",
        limit: int = 10
    ) -> list:
        """
        Busca vídeos virais sobre um tema.

        Args:
            topic: Tema da busca
            platform: Plataforma (youtube, tiktok, instagram)
            period: Período (day, week, month, year)
            limit: Número máximo de resultados
        """
        # Constrói o termo de busca
        search_term = f"{topic}"

        # Adiciona modificadores baseados na plataforma
        if platform == "youtube":
            search_term += " shorts viral"
        elif platform == "tiktok":
            search_term += " viral tiktok"
        elif platform == "instagram":
            search_term += " reels viral"

        # Adiciona filtro de tempo ao termo
        period_terms = {
            "day": "today",
            "week": "this week",
            "month": "this month",
            "year": "2024"
        }
        if period in period_terms:
            search_term += f" {period_terms[period]}"

        search_query = f"ytsearch{limit}:{search_term}"

        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'extract_flat': True,
        }

        try:
            logger.info("searching_viral_videos", topic=topic, platform=platform, period=period)

            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                result = ydl.extract_info(search_query, download=False)

                if 'entries' not in result:
                    return []

                videos = []
                for entry in result['entries']:
                    if entry:
                        videos.append({
                            'title': entry.get('title', ''),
                            'url': f"https://www.youtube.com/watch?v={entry.get('id', '')}" if entry.get('id') else entry.get('url', ''),
                            'platform': 'youtube',
                            'views': entry.get('view_count'),
                            'duration': entry.get('duration'),
                            'channel': entry.get('uploader', entry.get('channel', '')),
                            'thumbnail': entry.get('thumbnail', ''),
                        })

                logger.info("viral_search_completed", count=len(videos))
                return videos

        except Exception as e:
            logger.error("viral_search_failed", error=str(e))
            return []


# Singleton
_transcription_service: Optional[TranscriptionService] = None


def get_transcription_service() -> TranscriptionService:
    """Retorna instância singleton do serviço de transcrição"""
    global _transcription_service
    if _transcription_service is None:
        _transcription_service = TranscriptionService()
    return _transcription_service
