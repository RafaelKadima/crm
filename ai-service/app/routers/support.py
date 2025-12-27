"""
Router para endpoints do Agente de Suporte
"""
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Optional
import structlog

from app.config import get_settings
from mcp.tools.support_tools import edit_file, git_commit, git_push, deploy_production

logger = structlog.get_logger()
router = APIRouter(prefix="/support", tags=["Support"])
settings = get_settings()


async def verify_internal_key(x_internal_key: str = Header(...)):
    """Verifica chave interna do Laravel"""
    expected_key = settings.internal_api_key
    if expected_key and x_internal_key != expected_key:
        raise HTTPException(status_code=401, detail="Invalid internal key")
    return x_internal_key


class ExecuteFixRequest(BaseModel):
    file_path: str
    old_code: str
    new_code: str
    commit_message: str
    run_migrations: bool = False
    clear_cache: bool = True


class ExecuteFixResponse(BaseModel):
    success: bool
    error: Optional[str] = None
    steps: Optional[list] = None
    edit_result: Optional[dict] = None
    commit_result: Optional[dict] = None
    push_result: Optional[dict] = None
    deploy_result: Optional[dict] = None


@router.post("/execute-fix", response_model=ExecuteFixResponse)
async def execute_fix(
    request: ExecuteFixRequest,
    internal_key: str = Header(None, alias="X-Internal-Key")
):
    """
    Executa uma correção aprovada.

    Passos:
    1. Edita o arquivo (substitui old_code por new_code)
    2. Faz commit com a mensagem
    3. Push para o repositório
    4. Deploy em produção
    """
    # Verifica chave se configurada
    if settings.internal_api_key and internal_key != settings.internal_api_key:
        raise HTTPException(status_code=401, detail="Invalid internal key")

    steps = []

    try:
        # 1. Editar arquivo
        logger.info("Executing fix - step 1: edit_file", file_path=request.file_path)
        steps.append("edit_file")

        edit_result = await edit_file(
            file_path=request.file_path,
            old_text=request.old_code,
            new_text=request.new_code
        )

        if not edit_result.get("success"):
            return ExecuteFixResponse(
                success=False,
                error=f"Falha ao editar arquivo: {edit_result.get('error')}",
                steps=steps,
                edit_result=edit_result
            )

        # 2. Commit
        logger.info("Executing fix - step 2: git_commit", message=request.commit_message)
        steps.append("git_commit")

        commit_result = await git_commit(
            message=request.commit_message,
            files=[request.file_path]
        )

        if not commit_result.get("success"):
            return ExecuteFixResponse(
                success=False,
                error=f"Falha ao fazer commit: {commit_result.get('error')}",
                steps=steps,
                edit_result=edit_result,
                commit_result=commit_result
            )

        # 3. Push
        logger.info("Executing fix - step 3: git_push")
        steps.append("git_push")

        push_result = await git_push(branch="main")

        if not push_result.get("success"):
            return ExecuteFixResponse(
                success=False,
                error=f"Falha ao fazer push: {push_result.get('error')}",
                steps=steps,
                edit_result=edit_result,
                commit_result=commit_result,
                push_result=push_result
            )

        # 4. Deploy
        logger.info("Executing fix - step 4: deploy_production")
        steps.append("deploy_production")

        deploy_result = await deploy_production(
            run_migrations=request.run_migrations,
            clear_cache=request.clear_cache,
            rebuild=False
        )

        if not deploy_result.get("success"):
            return ExecuteFixResponse(
                success=False,
                error=f"Falha ao fazer deploy: {deploy_result.get('error')}",
                steps=steps,
                edit_result=edit_result,
                commit_result=commit_result,
                push_result=push_result,
                deploy_result=deploy_result
            )

        logger.info("Fix executed successfully", file_path=request.file_path)

        return ExecuteFixResponse(
            success=True,
            steps=steps,
            edit_result=edit_result,
            commit_result=commit_result,
            push_result=push_result,
            deploy_result=deploy_result
        )

    except Exception as e:
        logger.error("Error executing fix", error=str(e))
        return ExecuteFixResponse(
            success=False,
            error=str(e),
            steps=steps
        )
