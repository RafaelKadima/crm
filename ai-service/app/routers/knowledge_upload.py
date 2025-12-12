"""
Router para upload e processamento de documentos para Knowledge Base.
Suporta PDF, DOCX, TXT e outros formatos.
"""
import os
import uuid
import tempfile
from typing import Optional, List
from datetime import datetime

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, status
import structlog

from app.config import get_settings
from app.rag.document_processor import DocumentProcessor, ProcessedDocument
from app.rag.ads_knowledge import get_ads_knowledge_service

logger = structlog.get_logger()
settings = get_settings()
router = APIRouter()


@router.post("/knowledge/upload")
async def upload_document(
    file: UploadFile = File(...),
    tenant_id: str = Form(...),
    category: str = Form(...),  # rules, best_practices, brand_guidelines, documents
    title: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),  # comma-separated
    priority: int = Form(0),
):
    """
    Upload e processa um documento para a Knowledge Base.
    
    Suporta:
    - PDF (.pdf)
    - Word (.docx, .doc)
    - Texto (.txt, .md)
    
    O documento é:
    1. Extraído (texto)
    2. Dividido em chunks
    3. Embeddings gerados
    4. Salvo na knowledge_base
    """
    # Valida categoria
    valid_categories = ['rules', 'best_practices', 'brand_guidelines', 'documents', 'patterns']
    if category not in valid_categories:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Categoria inválida. Use: {', '.join(valid_categories)}"
        )
    
    # Valida extensão
    filename = file.filename or "unknown"
    ext = os.path.splitext(filename)[1].lower()
    allowed_extensions = ['.pdf', '.docx', '.doc', '.txt', '.md']
    
    if ext not in allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Formato não suportado. Use: {', '.join(allowed_extensions)}"
        )
    
    try:
        # Lê conteúdo do arquivo
        content = await file.read()
        
        # Processa documento
        processor = DocumentProcessor()
        processed = await processor.process_file(content, filename, ext)
        
        if not processed.chunks:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Não foi possível extrair texto do documento"
            )
        
        # Parse tags
        tag_list = [t.strip() for t in tags.split(',')] if tags else []
        tag_list.append(f"file:{filename}")
        
        # Usa título do form ou gera do filename
        doc_title = title or os.path.splitext(filename)[0]
        
        # Salva na knowledge base
        knowledge_service = get_ads_knowledge_service()
        saved_ids = []
        
        for i, chunk in enumerate(processed.chunks):
            chunk_title = f"{doc_title} - Parte {i+1}" if len(processed.chunks) > 1 else doc_title
            
            result = await knowledge_service.add_knowledge(
                tenant_id=tenant_id,
                title=chunk_title,
                content=chunk.text,
                category=category,
                priority=priority,
                tags=tag_list,
                source='upload',
                source_reference=filename,
                metadata={
                    'original_filename': filename,
                    'chunk_index': i,
                    'total_chunks': len(processed.chunks),
                    'file_type': ext,
                    'char_count': len(chunk.text),
                    'uploaded_at': datetime.now().isoformat(),
                }
            )
            
            if result:
                saved_ids.append(result)
        
        logger.info("document_uploaded",
            tenant_id=tenant_id,
            filename=filename,
            category=category,
            chunks=len(processed.chunks),
            saved_count=len(saved_ids)
        )
        
        return {
            "success": True,
            "filename": filename,
            "category": category,
            "chunks_created": len(saved_ids),
            "total_chars": sum(len(c.text) for c in processed.chunks),
            "knowledge_ids": saved_ids
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("upload_error", error=str(e), filename=filename)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao processar documento: {str(e)}"
        )


@router.post("/knowledge/upload-text")
async def upload_text_directly(
    tenant_id: str = Form(...),
    title: str = Form(...),
    content: str = Form(...),
    category: str = Form(...),
    tags: Optional[str] = Form(None),
    priority: int = Form(0),
):
    """
    Adiciona texto diretamente à Knowledge Base sem upload de arquivo.
    """
    valid_categories = ['rules', 'best_practices', 'brand_guidelines', 'documents', 'patterns']
    if category not in valid_categories:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Categoria inválida. Use: {', '.join(valid_categories)}"
        )
    
    if not content.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Conteúdo não pode estar vazio"
        )
    
    try:
        # Parse tags
        tag_list = [t.strip() for t in tags.split(',')] if tags else []
        
        # Salva na knowledge base
        knowledge_service = get_ads_knowledge_service()
        
        result = await knowledge_service.add_knowledge(
            tenant_id=tenant_id,
            title=title,
            content=content.strip(),
            category=category,
            priority=priority,
            tags=tag_list,
            source='manual',
            metadata={
                'char_count': len(content),
                'created_at': datetime.now().isoformat(),
            }
        )
        
        logger.info("text_knowledge_added",
            tenant_id=tenant_id,
            title=title,
            category=category
        )
        
        return {
            "success": True,
            "knowledge_id": result,
            "title": title,
            "category": category
        }
        
    except Exception as e:
        logger.error("add_text_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao adicionar conhecimento: {str(e)}"
        )


@router.get("/knowledge/categories")
async def get_categories():
    """Retorna categorias disponíveis para conhecimento."""
    return {
        "categories": [
            {
                "id": "rules",
                "name": "Regras de Negócio",
                "description": "Regras e restrições que devem ser seguidas",
                "icon": "shield"
            },
            {
                "id": "best_practices",
                "name": "Melhores Práticas",
                "description": "Práticas recomendadas para campanhas",
                "icon": "star"
            },
            {
                "id": "brand_guidelines",
                "name": "Diretrizes de Marca",
                "description": "Tom de voz, cores, padrões visuais",
                "icon": "palette"
            },
            {
                "id": "patterns",
                "name": "Padrões de Performance",
                "description": "Padrões aprendidos de campanhas bem-sucedidas",
                "icon": "trending-up"
            },
            {
                "id": "documents",
                "name": "Documentos",
                "description": "Manuais, guias e documentação",
                "icon": "file-text"
            }
        ]
    }


@router.get("/knowledge/stats/{tenant_id}")
async def get_knowledge_stats(tenant_id: str):
    """Retorna estatísticas do conhecimento por tenant."""
    try:
        knowledge_service = get_ads_knowledge_service()
        stats = await knowledge_service.get_stats(tenant_id)
        
        return {
            "success": True,
            "stats": stats
        }
    except Exception as e:
        logger.error("get_stats_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao obter estatísticas: {str(e)}"
        )
