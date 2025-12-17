"""
Storage de Criadores de Conteúdo
Gerencia criadores e suas transcrições no PostgreSQL
"""
import json
import uuid
import structlog
from typing import Optional, List, Dict, Any
from datetime import datetime
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.config import get_settings
from app.models.content_schemas import Creator, CreatorTranscription, ContentSession, ChatMessage, ContentAgentStep

logger = structlog.get_logger()
settings = get_settings()


class CreatorsStorage:
    """Storage para criadores de conteúdo e sessões de chat"""

    def __init__(self):
        self.engine = create_async_engine(settings.database_url, echo=False)
        self.async_session = sessionmaker(
            self.engine, class_=AsyncSession, expire_on_commit=False
        )

    async def _get_session(self) -> AsyncSession:
        """Retorna uma sessão do banco de dados"""
        return self.async_session()

    # ==================== CREATORS ====================

    async def list_creators(self, tenant_id: str) -> List[Dict[str, Any]]:
        """Lista todos os criadores de um tenant"""
        async with self.async_session() as session:
            result = await session.execute(
                text("""
                    SELECT id, name, video_count, style_summary, created_at
                    FROM content_creators
                    WHERE tenant_id = :tenant_id
                    ORDER BY name ASC
                """),
                {"tenant_id": tenant_id}
            )
            rows = result.fetchall()

            return [
                {
                    "id": str(row[0]),
                    "name": row[1],
                    "video_count": row[2],
                    "style_summary": row[3],
                    "created_at": row[4].isoformat() if row[4] else None,
                }
                for row in rows
            ]

    async def get_creator(self, tenant_id: str, creator_id: str) -> Optional[Dict[str, Any]]:
        """Busca um criador específico pelo ID"""
        async with self.async_session() as session:
            result = await session.execute(
                text("""
                    SELECT id, name, transcriptions, video_count, style_summary, created_at, updated_at
                    FROM content_creators
                    WHERE tenant_id = :tenant_id AND id = :creator_id
                """),
                {"tenant_id": tenant_id, "creator_id": creator_id}
            )
            row = result.fetchone()

            if not row:
                return None

            return {
                "id": str(row[0]),
                "name": row[1],
                "transcriptions": row[2] if row[2] else [],
                "video_count": row[3],
                "style_summary": row[4],
                "created_at": row[5].isoformat() if row[5] else None,
                "updated_at": row[6].isoformat() if row[6] else None,
            }

    async def get_creator_by_name(self, tenant_id: str, name: str) -> Optional[Dict[str, Any]]:
        """Busca um criador específico pelo nome"""
        async with self.async_session() as session:
            result = await session.execute(
                text("""
                    SELECT id, name, transcriptions, video_count, style_summary, created_at, updated_at
                    FROM content_creators
                    WHERE tenant_id = :tenant_id AND LOWER(name) = LOWER(:name)
                """),
                {"tenant_id": tenant_id, "name": name}
            )
            row = result.fetchone()

            if not row:
                return None

            return {
                "id": str(row[0]),
                "name": row[1],
                "transcriptions": row[2] if row[2] else [],
                "video_count": row[3],
                "style_summary": row[4],
                "created_at": row[5].isoformat() if row[5] else None,
                "updated_at": row[6].isoformat() if row[6] else None,
            }

    async def create_creator(
        self,
        tenant_id: str,
        name: str,
        transcriptions: List[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Cria um novo criador"""
        creator_id = str(uuid.uuid4())
        transcriptions = transcriptions or []

        async with self.async_session() as session:
            await session.execute(
                text("""
                    INSERT INTO content_creators (id, tenant_id, name, transcriptions, video_count, created_at, updated_at)
                    VALUES (:id, :tenant_id, :name, :transcriptions, :video_count, NOW(), NOW())
                """),
                {
                    "id": creator_id,
                    "tenant_id": tenant_id,
                    "name": name,
                    "transcriptions": json.dumps(transcriptions),
                    "video_count": len(transcriptions),
                }
            )
            await session.commit()

        logger.info("creator_created", tenant_id=tenant_id, name=name, id=creator_id)

        return {
            "id": creator_id,
            "name": name,
            "transcriptions": transcriptions,
            "video_count": len(transcriptions),
        }

    async def add_transcription(
        self,
        tenant_id: str,
        creator_id: str,
        transcription: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Adiciona uma transcrição a um criador"""
        async with self.async_session() as session:
            # Busca transcrições atuais
            result = await session.execute(
                text("""
                    SELECT transcriptions FROM content_creators
                    WHERE tenant_id = :tenant_id AND id = :creator_id
                """),
                {"tenant_id": tenant_id, "creator_id": creator_id}
            )
            row = result.fetchone()

            if not row:
                raise ValueError(f"Creator {creator_id} not found")

            current_transcriptions = row[0] if row[0] else []
            current_transcriptions.append(transcription)

            # Atualiza
            await session.execute(
                text("""
                    UPDATE content_creators
                    SET transcriptions = :transcriptions,
                        video_count = :video_count,
                        updated_at = NOW()
                    WHERE tenant_id = :tenant_id AND id = :creator_id
                """),
                {
                    "tenant_id": tenant_id,
                    "creator_id": creator_id,
                    "transcriptions": json.dumps(current_transcriptions),
                    "video_count": len(current_transcriptions),
                }
            )
            await session.commit()

        logger.info("transcription_added", tenant_id=tenant_id, creator_id=creator_id)

        return {"transcriptions": current_transcriptions, "video_count": len(current_transcriptions)}

    async def update_creator_style(self, tenant_id: str, creator_id: str, style_summary: str):
        """Atualiza o resumo de estilo de um criador"""
        async with self.async_session() as session:
            await session.execute(
                text("""
                    UPDATE content_creators
                    SET style_summary = :style_summary, updated_at = NOW()
                    WHERE tenant_id = :tenant_id AND id = :creator_id
                """),
                {
                    "tenant_id": tenant_id,
                    "creator_id": creator_id,
                    "style_summary": style_summary,
                }
            )
            await session.commit()

    async def delete_creator(self, tenant_id: str, creator_id: str) -> bool:
        """Deleta um criador"""
        async with self.async_session() as session:
            result = await session.execute(
                text("""
                    DELETE FROM content_creators
                    WHERE tenant_id = :tenant_id AND id = :creator_id
                """),
                {"tenant_id": tenant_id, "creator_id": creator_id}
            )
            await session.commit()

        deleted = result.rowcount > 0
        if deleted:
            logger.info("creator_deleted", tenant_id=tenant_id, creator_id=creator_id)

        return deleted

    async def get_creator_transcriptions(self, tenant_id: str, creator_name: str) -> List[str]:
        """Retorna todas as transcrições de um criador pelo nome"""
        creator = await self.get_creator_by_name(tenant_id, creator_name)
        if not creator:
            return []

        transcriptions = creator.get('transcriptions', [])
        return [t.get('transcription', '') for t in transcriptions if t.get('transcription')]

    # ==================== SESSIONS ====================

    async def create_session(
        self,
        tenant_id: str,
        user_id: str,
    ) -> str:
        """Cria uma nova sessão de chat"""
        session_id = str(uuid.uuid4())

        async with self.async_session() as session:
            await session.execute(
                text("""
                    INSERT INTO content_sessions (id, tenant_id, user_id, messages, current_step, created_at, updated_at)
                    VALUES (:id, :tenant_id, :user_id, :messages, :current_step, NOW(), NOW())
                """),
                {
                    "id": session_id,
                    "tenant_id": tenant_id,
                    "user_id": user_id,
                    "messages": json.dumps([]),
                    "current_step": ContentAgentStep.IDLE.value,
                }
            )
            await session.commit()

        logger.info("session_created", tenant_id=tenant_id, session_id=session_id)
        return session_id

    async def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Busca uma sessão pelo ID"""
        async with self.async_session() as session:
            result = await session.execute(
                text("""
                    SELECT id, tenant_id, user_id, messages, current_step, topic,
                           research_data, selected_creator, generated_hooks, selected_hook,
                           final_reel, created_at, updated_at
                    FROM content_sessions
                    WHERE id = :session_id
                """),
                {"session_id": session_id}
            )
            row = result.fetchone()

            if not row:
                return None

            return {
                "id": str(row[0]),
                "tenant_id": str(row[1]),
                "user_id": str(row[2]),
                "messages": row[3] if row[3] else [],
                "current_step": row[4],
                "topic": row[5],
                "research_data": row[6] if row[6] else {},
                "selected_creator": row[7],
                "generated_hooks": row[8] if row[8] else [],
                "selected_hook": row[9],
                "final_reel": row[10],
                "created_at": row[11].isoformat() if row[11] else None,
                "updated_at": row[12].isoformat() if row[12] else None,
            }

    async def update_session(
        self,
        session_id: str,
        messages: List[Dict[str, Any]] = None,
        current_step: str = None,
        topic: str = None,
        research_data: Dict[str, Any] = None,
        selected_creator: str = None,
        generated_hooks: List[str] = None,
        selected_hook: str = None,
        final_reel: str = None,
    ):
        """Atualiza uma sessão de chat"""
        updates = []
        params = {"session_id": session_id}

        if messages is not None:
            updates.append("messages = :messages")
            params["messages"] = json.dumps(messages)

        if current_step is not None:
            updates.append("current_step = :current_step")
            params["current_step"] = current_step

        if topic is not None:
            updates.append("topic = :topic")
            params["topic"] = topic

        if research_data is not None:
            updates.append("research_data = :research_data")
            params["research_data"] = json.dumps(research_data)

        if selected_creator is not None:
            updates.append("selected_creator = :selected_creator")
            params["selected_creator"] = selected_creator

        if generated_hooks is not None:
            updates.append("generated_hooks = :generated_hooks")
            params["generated_hooks"] = json.dumps(generated_hooks)

        if selected_hook is not None:
            updates.append("selected_hook = :selected_hook")
            params["selected_hook"] = selected_hook

        if final_reel is not None:
            updates.append("final_reel = :final_reel")
            params["final_reel"] = final_reel

        if not updates:
            return

        updates.append("updated_at = NOW()")

        async with self.async_session() as session:
            await session.execute(
                text(f"""
                    UPDATE content_sessions
                    SET {', '.join(updates)}
                    WHERE id = :session_id
                """),
                params
            )
            await session.commit()

    async def add_message_to_session(
        self,
        session_id: str,
        role: str,
        content: str,
        step: str = None,
        metadata: Dict[str, Any] = None,
    ):
        """Adiciona uma mensagem à sessão"""
        session_data = await self.get_session(session_id)
        if not session_data:
            raise ValueError(f"Session {session_id} not found")

        messages = session_data.get('messages', [])
        messages.append({
            "role": role,
            "content": content,
            "step": step,
            "metadata": metadata,
            "created_at": datetime.now().isoformat(),
        })

        await self.update_session(session_id, messages=messages)

    async def list_user_sessions(self, tenant_id: str, user_id: str, limit: int = 20) -> List[Dict[str, Any]]:
        """Lista sessões de um usuário"""
        async with self.async_session() as session:
            result = await session.execute(
                text("""
                    SELECT id, topic, current_step, created_at, updated_at
                    FROM content_sessions
                    WHERE tenant_id = :tenant_id AND user_id = :user_id
                    ORDER BY updated_at DESC
                    LIMIT :limit
                """),
                {"tenant_id": tenant_id, "user_id": user_id, "limit": limit}
            )
            rows = result.fetchall()

            return [
                {
                    "id": str(row[0]),
                    "topic": row[1],
                    "current_step": row[2],
                    "created_at": row[3].isoformat() if row[3] else None,
                    "updated_at": row[4].isoformat() if row[4] else None,
                }
                for row in rows
            ]


# Singleton
_creators_storage: Optional[CreatorsStorage] = None


def get_creators_storage() -> CreatorsStorage:
    """Retorna instância singleton do storage de criadores"""
    global _creators_storage
    if _creators_storage is None:
        _creators_storage = CreatorsStorage()
    return _creators_storage
