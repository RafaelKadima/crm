"""
Router para endpoints do Agente de Suporte
"""
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Optional
import structlog
import asyncio
from uuid import uuid4

from app.config import get_settings
from mcp.tools.support_tools import (
    edit_file, git_commit, git_push, deploy_production,
    git_create_backup, git_rollback, verify_health
)

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


class ExecuteFixAutonomousResponse(BaseModel):
    success: bool
    error: Optional[str] = None
    backup_tag: Optional[str] = None
    rolled_back: bool = False
    steps: Optional[list] = None
    backup_result: Optional[dict] = None
    edit_result: Optional[dict] = None
    commit_result: Optional[dict] = None
    push_result: Optional[dict] = None
    deploy_result: Optional[dict] = None
    health_result: Optional[dict] = None
    rollback_result: Optional[dict] = None


@router.post("/execute-fix-autonomous", response_model=ExecuteFixAutonomousResponse)
async def execute_fix_autonomous(
    request: ExecuteFixRequest,
    internal_key: str = Header(None, alias="X-Internal-Key")
):
    """
    Executa uma correção de forma autônoma com backup/rollback.

    Fluxo:
    1. Cria tag de backup no Git
    2. Edita o arquivo
    3. Faz commit
    4. Push para repositório
    5. Deploy em produção
    6. Aguarda 30s e verifica saúde
    7. Se health check falhar, faz rollback automático
    """
    if settings.internal_api_key and internal_key != settings.internal_api_key:
        raise HTTPException(status_code=401, detail="Invalid internal key")

    steps = []
    backup_tag = f"fix-{uuid4().hex[:8]}-backup"

    try:
        # 1. BACKUP - Cria tag antes de modificar
        logger.info("Autonomous fix - step 1: git_create_backup", tag=backup_tag)
        steps.append("git_create_backup")

        backup_result = await git_create_backup(tag_name=backup_tag)

        if not backup_result.get("success"):
            return ExecuteFixAutonomousResponse(
                success=False,
                error=f"Falha ao criar backup: {backup_result.get('error')}",
                backup_tag=backup_tag,
                steps=steps,
                backup_result=backup_result
            )

        # 2. EDITAR - Aplica a correção
        logger.info("Autonomous fix - step 2: edit_file", file_path=request.file_path)
        steps.append("edit_file")

        edit_result = await edit_file(
            file_path=request.file_path,
            old_text=request.old_code,
            new_text=request.new_code
        )

        if not edit_result.get("success"):
            # Rollback em caso de falha
            rollback_result = await git_rollback(tag_name=backup_tag)
            return ExecuteFixAutonomousResponse(
                success=False,
                error=f"Falha ao editar arquivo: {edit_result.get('error')}",
                backup_tag=backup_tag,
                rolled_back=True,
                steps=steps,
                backup_result=backup_result,
                edit_result=edit_result,
                rollback_result=rollback_result
            )

        # 3. COMMIT
        logger.info("Autonomous fix - step 3: git_commit", message=request.commit_message)
        steps.append("git_commit")

        commit_result = await git_commit(
            message=request.commit_message,
            files=[request.file_path]
        )

        if not commit_result.get("success"):
            rollback_result = await git_rollback(tag_name=backup_tag)
            return ExecuteFixAutonomousResponse(
                success=False,
                error=f"Falha ao fazer commit: {commit_result.get('error')}",
                backup_tag=backup_tag,
                rolled_back=True,
                steps=steps,
                backup_result=backup_result,
                edit_result=edit_result,
                commit_result=commit_result,
                rollback_result=rollback_result
            )

        # 4. PUSH
        logger.info("Autonomous fix - step 4: git_push")
        steps.append("git_push")

        push_result = await git_push(branch="main")

        if not push_result.get("success"):
            rollback_result = await git_rollback(tag_name=backup_tag)
            return ExecuteFixAutonomousResponse(
                success=False,
                error=f"Falha ao fazer push: {push_result.get('error')}",
                backup_tag=backup_tag,
                rolled_back=True,
                steps=steps,
                backup_result=backup_result,
                edit_result=edit_result,
                commit_result=commit_result,
                push_result=push_result,
                rollback_result=rollback_result
            )

        # 5. DEPLOY
        logger.info("Autonomous fix - step 5: deploy_production")
        steps.append("deploy_production")

        deploy_result = await deploy_production(
            run_migrations=request.run_migrations,
            clear_cache=request.clear_cache,
            rebuild=False
        )

        if not deploy_result.get("success"):
            # Rollback e redeploy
            rollback_result = await git_rollback(tag_name=backup_tag)
            await deploy_production(run_migrations=False, clear_cache=True, rebuild=False)
            return ExecuteFixAutonomousResponse(
                success=False,
                error=f"Falha no deploy: {deploy_result.get('error')}",
                backup_tag=backup_tag,
                rolled_back=True,
                steps=steps,
                backup_result=backup_result,
                edit_result=edit_result,
                commit_result=commit_result,
                push_result=push_result,
                deploy_result=deploy_result,
                rollback_result=rollback_result
            )

        # 6. AGUARDA E VERIFICA SAÚDE
        logger.info("Autonomous fix - step 6: verify_health (aguardando 30s)")
        steps.append("verify_health")

        # Aguarda containers reiniciarem
        await asyncio.sleep(30)

        health_result = await verify_health()

        if not health_result.get("healthy", False):
            # ROLLBACK AUTOMÁTICO!
            logger.warning("Health check failed, initiating rollback", health=health_result)
            steps.append("rollback")

            rollback_result = await git_rollback(tag_name=backup_tag)

            # Redeploy do código anterior
            await deploy_production(run_migrations=False, clear_cache=True, rebuild=False)

            return ExecuteFixAutonomousResponse(
                success=False,
                error="Health check falhou após deploy - rollback automático executado",
                backup_tag=backup_tag,
                rolled_back=True,
                steps=steps,
                backup_result=backup_result,
                edit_result=edit_result,
                commit_result=commit_result,
                push_result=push_result,
                deploy_result=deploy_result,
                health_result=health_result,
                rollback_result=rollback_result
            )

        # 7. SUCESSO!
        logger.info("Autonomous fix completed successfully", file_path=request.file_path)

        return ExecuteFixAutonomousResponse(
            success=True,
            backup_tag=backup_tag,
            rolled_back=False,
            steps=steps,
            backup_result=backup_result,
            edit_result=edit_result,
            commit_result=commit_result,
            push_result=push_result,
            deploy_result=deploy_result,
            health_result=health_result
        )

    except Exception as e:
        logger.error("Error in autonomous fix, attempting rollback", error=str(e))

        # Tenta rollback de segurança
        try:
            rollback_result = await git_rollback(tag_name=backup_tag)
            await deploy_production(run_migrations=False, clear_cache=True, rebuild=False)
        except:
            rollback_result = {"success": False, "error": "Rollback também falhou"}

        return ExecuteFixAutonomousResponse(
            success=False,
            error=str(e),
            backup_tag=backup_tag,
            rolled_back=True,
            steps=steps,
            rollback_result=rollback_result
        )
