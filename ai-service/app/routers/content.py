from fastapi import APIRouter, HTTPException, Header, Body
from typing import Dict, Any, Optional
from app.services.content_creator_service import get_content_creator

router = APIRouter(prefix="/content", tags=["content"])

@router.post("/analyze-viral")
async def analyze_viral(
    payload: Dict[str, Any] = Body(...),
    x_tenant_id: Optional[str] = Header(None, alias="X-Tenant-ID")
):
    """
    Analisa um vídeo viral (URL) e retorna sua estrutura.
    """
    video_url = payload.get("video_url")
    if not video_url:
        raise HTTPException(status_code=400, detail="video_url is required")
        
    try:
        service = get_content_creator()
        result = await service.analyze_viral_video(video_url)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate-viral-script")
async def generate_viral_script(
    payload: Dict[str, Any] = Body(...),
    x_tenant_id: Optional[str] = Header(None, alias="X-Tenant-ID")
):
    """
    Gera novo roteiro viciante baseado em um vídeo referência e um produto.
    """
    video_url = payload.get("video_url")
    product_id = payload.get("product_id")
    
    if not video_url or not product_id:
        raise HTTPException(status_code=400, detail="video_url and product_id are required")
        
    if not x_tenant_id:
        raise HTTPException(status_code=400, detail="X-Tenant-ID header is required")
        
    try:
        service = get_content_creator()
        result = await service.generate_viral_script(
            video_url=video_url, 
            product_id=product_id, 
            tenant_id=x_tenant_id
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/auto-discover-script")
async def auto_discover_script(
    payload: Dict[str, Any] = Body(...),
    x_tenant_id: Optional[str] = Header(None, alias="X-Tenant-ID")
):
    """
    Busca AUTOMATICAMENTE um vídeo viral sobre o tema e gera roteiro.
    """
    topic = payload.get("topic")
    product_id = payload.get("product_id")
    period = payload.get("period", "week") # day, week, month
    
    if not topic or not product_id:
        raise HTTPException(status_code=400, detail="topic and product_id are required")
        
    if not x_tenant_id:
        raise HTTPException(status_code=400, detail="X-Tenant-ID header is required")
        
    try:
        service = get_content_creator()
        result = await service.discover_and_create_script(
            topic=topic, 
            product_id=product_id, 
            tenant_id=x_tenant_id,
            period=period
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
