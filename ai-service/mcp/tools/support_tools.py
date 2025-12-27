"""
Support Tools - Ferramentas para o Agente de Suporte IA.

Estas ferramentas permitem que o agente de suporte:
- Consulte o manual de usabilidade
- Busque e edite codigo
- Execute comandos SSH na VPS
- Faca operacoes Git
- Execute deploy em producao

Total: 14 ferramentas

IMPORTANTE: Varias ferramentas sao perigosas e requerem aprovacao do usuario.
"""
from typing import Dict, Any, List, Optional
from datetime import datetime
import os
import subprocess
import asyncio
import structlog

from mcp.server import CRMMCPServer, ToolParameter
from app.config import get_settings

logger = structlog.get_logger()
settings = get_settings()


def register_tools(server: CRMMCPServer) -> None:
    """Registra todas as ferramentas de Suporte no servidor MCP."""

    # =====================================================
    # 1. search_manual - Busca semantica no manual
    # =====================================================
    server.register_tool(
        name="search_manual",
        description="Busca semantica no manual de usabilidade do sistema. Use para responder duvidas sobre funcionalidades.",
        parameters=[
            ToolParameter(name="query", type="string", description="Pergunta ou termo a buscar no manual"),
            ToolParameter(name="section", type="string", description="Secao especifica (ex: leads, tickets, dashboard)", required=False),
        ],
        handler=search_manual,
        category="support"
    )

    # =====================================================
    # 2. search_codebase - Busca no codigo fonte
    # =====================================================
    server.register_tool(
        name="search_codebase",
        description="Busca arquivos e codigo no projeto. Use glob patterns e regex.",
        parameters=[
            ToolParameter(name="query", type="string", description="Termo a buscar ou regex pattern"),
            ToolParameter(name="file_pattern", type="string", description="Glob pattern (ex: **/*.php, frontend/**/*.tsx)", required=False, default="**/*"),
            ToolParameter(name="max_results", type="number", description="Maximo de resultados", required=False, default=20),
        ],
        handler=search_codebase,
        category="support"
    )

    # =====================================================
    # 3. read_file - Le arquivo especifico
    # =====================================================
    server.register_tool(
        name="read_file",
        description="Le o conteudo de um arquivo especifico do projeto.",
        parameters=[
            ToolParameter(name="file_path", type="string", description="Caminho relativo do arquivo (ex: app/Http/Controllers/LeadController.php)"),
            ToolParameter(name="line_start", type="number", description="Linha inicial (1-indexed)", required=False),
            ToolParameter(name="line_end", type="number", description="Linha final", required=False),
        ],
        handler=read_file,
        category="support"
    )

    # =====================================================
    # 4. edit_file - Edita arquivo (REQUER APROVACAO)
    # =====================================================
    server.register_tool(
        name="edit_file",
        description="Edita um arquivo do projeto. Substitui texto antigo por novo. REQUER APROVACAO.",
        parameters=[
            ToolParameter(name="file_path", type="string", description="Caminho relativo do arquivo"),
            ToolParameter(name="old_text", type="string", description="Texto a ser substituido (deve ser unico no arquivo)"),
            ToolParameter(name="new_text", type="string", description="Novo texto"),
        ],
        handler=edit_file,
        category="support",
        requires_approval=True,
        dangerous=True
    )

    # =====================================================
    # 5. create_file - Cria arquivo (REQUER APROVACAO)
    # =====================================================
    server.register_tool(
        name="create_file",
        description="Cria um novo arquivo no projeto. REQUER APROVACAO.",
        parameters=[
            ToolParameter(name="file_path", type="string", description="Caminho relativo do novo arquivo"),
            ToolParameter(name="content", type="string", description="Conteudo do arquivo"),
        ],
        handler=create_file,
        category="support",
        requires_approval=True,
        dangerous=True
    )

    # =====================================================
    # 6. ssh_execute - Executa comando SSH (REQUER APROVACAO)
    # =====================================================
    server.register_tool(
        name="ssh_execute",
        description="Executa um comando via SSH na VPS de producao. REQUER APROVACAO.",
        parameters=[
            ToolParameter(name="command", type="string", description="Comando a executar (ex: pm2 restart all, tail -100 /var/log/nginx/error.log)"),
            ToolParameter(name="timeout", type="number", description="Timeout em segundos", required=False, default=30),
        ],
        handler=ssh_execute,
        category="support",
        requires_approval=True,
        dangerous=True
    )

    # =====================================================
    # 7. get_error_logs - Busca logs de erro
    # =====================================================
    server.register_tool(
        name="get_error_logs",
        description="Busca logs de erro dos containers Docker na VPS. Nao requer aprovacao por ser leitura.",
        parameters=[
            ToolParameter(name="log_type", type="string", description="Tipo de log: laravel, nginx, queue, ai-service, reverb, redis"),
            ToolParameter(name="lines", type="number", description="Numero de linhas", required=False, default=100),
            ToolParameter(name="filter", type="string", description="Filtro grep opcional", required=False),
        ],
        handler=get_error_logs,
        category="support"
    )

    # =====================================================
    # 8. git_status - Status do repositorio
    # =====================================================
    server.register_tool(
        name="git_status",
        description="Mostra status do repositorio Git (arquivos modificados, branch, etc).",
        parameters=[],
        handler=git_status,
        category="support"
    )

    # =====================================================
    # 9. git_diff - Diferencias em arquivos
    # =====================================================
    server.register_tool(
        name="git_diff",
        description="Mostra diferencas (diff) em arquivos modificados.",
        parameters=[
            ToolParameter(name="file_path", type="string", description="Arquivo especifico (opcional)", required=False),
            ToolParameter(name="staged", type="boolean", description="Mostrar apenas staged", required=False, default=False),
        ],
        handler=git_diff,
        category="support"
    )

    # =====================================================
    # 10. git_commit - Commit (REQUER APROVACAO)
    # =====================================================
    server.register_tool(
        name="git_commit",
        description="Faz commit das alteracoes. REQUER APROVACAO.",
        parameters=[
            ToolParameter(name="message", type="string", description="Mensagem do commit"),
            ToolParameter(name="files", type="array", description="Lista de arquivos (ou vazio para todos)", required=False),
        ],
        handler=git_commit,
        category="support",
        requires_approval=True,
        dangerous=True
    )

    # =====================================================
    # 11. git_push - Push para remoto (REQUER APROVACAO)
    # =====================================================
    server.register_tool(
        name="git_push",
        description="Envia commits para o repositorio remoto. REQUER APROVACAO.",
        parameters=[
            ToolParameter(name="branch", type="string", description="Branch", required=False, default="main"),
        ],
        handler=git_push,
        category="support",
        requires_approval=True,
        dangerous=True
    )

    # =====================================================
    # 12. deploy_production - Deploy na VPS (REQUER APROVACAO)
    # =====================================================
    server.register_tool(
        name="deploy_production",
        description="Executa deploy completo na VPS de producao usando Docker. REQUER APROVACAO.",
        parameters=[
            ToolParameter(name="run_migrations", type="boolean", description="Executar migrations", required=False, default=False),
            ToolParameter(name="clear_cache", type="boolean", description="Limpar cache Laravel", required=False, default=True),
            ToolParameter(name="rebuild", type="boolean", description="Rebuild containers Docker", required=False, default=False),
        ],
        handler=deploy_production,
        category="support",
        requires_approval=True,
        dangerous=True
    )

    # =====================================================
    # 13. run_tests - Executa testes
    # =====================================================
    server.register_tool(
        name="run_tests",
        description="Executa testes automatizados do projeto.",
        parameters=[
            ToolParameter(name="test_type", type="string", description="Tipo: unit, feature, all", required=False, default="all"),
            ToolParameter(name="filter", type="string", description="Filtro de teste especifico", required=False),
        ],
        handler=run_tests,
        category="support"
    )

    # =====================================================
    # 14. move_lead_stage - Move lead no Kanban
    # =====================================================
    server.register_tool(
        name="support_move_lead_stage",
        description="Move um lead para outro estagio do Kanban.",
        parameters=[
            ToolParameter(name="lead_id", type="string", description="ID do lead"),
            ToolParameter(name="stage_id", type="string", description="ID do novo estagio"),
            ToolParameter(name="reason", type="string", description="Motivo da movimentacao", required=False),
        ],
        handler=support_move_lead_stage,
        category="support"
    )

    logger.info("Support tools registered", count=14)


# =============================================================================
# HANDLERS
# =============================================================================

async def search_manual(query: str, section: Optional[str] = None, **kwargs) -> Dict[str, Any]:
    """Busca semantica no manual de usabilidade."""
    try:
        manual_path = settings.support_manual_path

        # Le o manual
        if settings.git_repo_path:
            full_path = os.path.join(settings.git_repo_path, manual_path)
        else:
            full_path = manual_path

        if not os.path.exists(full_path):
            return {
                "success": False,
                "error": f"Manual nao encontrado em {full_path}",
                "suggestion": "Verifique se o caminho support_manual_path esta correto no .env"
            }

        with open(full_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # Busca simples por enquanto (pode ser melhorado com RAG/embeddings)
        query_lower = query.lower()
        lines = content.split('\n')
        results = []
        current_section = ""

        for i, line in enumerate(lines):
            # Detecta secoes
            if line.startswith('# '):
                current_section = line[2:].strip()
            elif line.startswith('## '):
                current_section = line[3:].strip()

            # Filtra por secao se especificada
            if section and section.lower() not in current_section.lower():
                continue

            # Busca o termo
            if query_lower in line.lower():
                # Pega contexto (5 linhas antes e depois)
                start = max(0, i - 5)
                end = min(len(lines), i + 6)
                context = '\n'.join(lines[start:end])

                results.append({
                    "line": i + 1,
                    "section": current_section,
                    "context": context,
                    "match": line.strip()
                })

        return {
            "success": True,
            "query": query,
            "section_filter": section,
            "results_count": len(results),
            "results": results[:10],  # Limita a 10 resultados
            "suggestion": f"Encontrados {len(results)} resultados para '{query}'" if results else f"Nenhum resultado para '{query}'. Tente termos diferentes."
        }

    except Exception as e:
        logger.error("Error searching manual", error=str(e))
        return {"success": False, "error": str(e)}


async def search_codebase(query: str, file_pattern: str = "**/*", max_results: int = 20, **kwargs) -> Dict[str, Any]:
    """Busca no codigo fonte usando grep."""
    try:
        repo_path = settings.git_repo_path or os.getcwd()

        # Usa ripgrep se disponivel, senao grep
        try:
            cmd = f'rg -n -l --glob "{file_pattern}" "{query}" "{repo_path}"'
            result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=30)
            files = result.stdout.strip().split('\n') if result.stdout.strip() else []
        except:
            cmd = f'grep -rn --include="{file_pattern}" "{query}" "{repo_path}"'
            result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=30)
            files = [line.split(':')[0] for line in result.stdout.strip().split('\n') if line]

        # Remove duplicatas e limita resultados
        files = list(set(files))[:max_results]

        # Busca contexto em cada arquivo
        matches = []
        for file_path in files:
            if not file_path:
                continue
            try:
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                    lines = content.split('\n')
                    for i, line in enumerate(lines):
                        if query.lower() in line.lower():
                            matches.append({
                                "file": file_path.replace(repo_path, '').lstrip('/\\'),
                                "line": i + 1,
                                "content": line.strip()[:200]
                            })
            except:
                pass

        return {
            "success": True,
            "query": query,
            "pattern": file_pattern,
            "files_count": len(files),
            "matches_count": len(matches),
            "matches": matches[:max_results]
        }

    except Exception as e:
        logger.error("Error searching codebase", error=str(e))
        return {"success": False, "error": str(e)}


async def read_file(file_path: str, line_start: Optional[int] = None, line_end: Optional[int] = None, **kwargs) -> Dict[str, Any]:
    """Le conteudo de um arquivo."""
    try:
        repo_path = settings.git_repo_path or os.getcwd()
        full_path = os.path.join(repo_path, file_path)

        if not os.path.exists(full_path):
            return {"success": False, "error": f"Arquivo nao encontrado: {file_path}"}

        with open(full_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()

        total_lines = len(lines)

        # Aplica filtro de linhas
        if line_start or line_end:
            start = (line_start or 1) - 1
            end = line_end or total_lines
            lines = lines[start:end]
            content = ''.join(lines)
            line_info = f"Linhas {start + 1}-{min(end, total_lines)} de {total_lines}"
        else:
            content = ''.join(lines)
            line_info = f"Total: {total_lines} linhas"

        return {
            "success": True,
            "file_path": file_path,
            "line_info": line_info,
            "content": content
        }

    except Exception as e:
        logger.error("Error reading file", error=str(e))
        return {"success": False, "error": str(e)}


async def edit_file(file_path: str, old_text: str, new_text: str, **kwargs) -> Dict[str, Any]:
    """Edita arquivo substituindo texto."""
    try:
        repo_path = settings.git_repo_path or os.getcwd()
        full_path = os.path.join(repo_path, file_path)

        if not os.path.exists(full_path):
            return {"success": False, "error": f"Arquivo nao encontrado: {file_path}"}

        with open(full_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # Verifica se o texto existe e e unico
        count = content.count(old_text)
        if count == 0:
            return {"success": False, "error": "Texto a substituir nao encontrado no arquivo"}
        if count > 1:
            return {"success": False, "error": f"Texto encontrado {count} vezes. Deve ser unico para evitar erros."}

        # Substitui
        new_content = content.replace(old_text, new_text, 1)

        with open(full_path, 'w', encoding='utf-8') as f:
            f.write(new_content)

        return {
            "success": True,
            "file_path": file_path,
            "message": "Arquivo editado com sucesso",
            "old_text_preview": old_text[:100] + "..." if len(old_text) > 100 else old_text,
            "new_text_preview": new_text[:100] + "..." if len(new_text) > 100 else new_text
        }

    except Exception as e:
        logger.error("Error editing file", error=str(e))
        return {"success": False, "error": str(e)}


async def create_file(file_path: str, content: str, **kwargs) -> Dict[str, Any]:
    """Cria novo arquivo."""
    try:
        repo_path = settings.git_repo_path or os.getcwd()
        full_path = os.path.join(repo_path, file_path)

        if os.path.exists(full_path):
            return {"success": False, "error": f"Arquivo ja existe: {file_path}"}

        # Cria diretorios se necessario
        os.makedirs(os.path.dirname(full_path), exist_ok=True)

        with open(full_path, 'w', encoding='utf-8') as f:
            f.write(content)

        return {
            "success": True,
            "file_path": file_path,
            "message": "Arquivo criado com sucesso",
            "size": len(content)
        }

    except Exception as e:
        logger.error("Error creating file", error=str(e))
        return {"success": False, "error": str(e)}


async def ssh_execute(command: str, timeout: int = 30, **kwargs) -> Dict[str, Any]:
    """Executa comando via SSH na VPS."""
    try:
        # Valida se comando e permitido
        allowed = settings.support_allowed_ssh_commands.split(',')
        cmd_base = command.split()[0]

        if cmd_base not in allowed:
            return {
                "success": False,
                "error": f"Comando '{cmd_base}' nao permitido. Permitidos: {', '.join(allowed)}"
            }

        # Monta comando SSH
        host = settings.vps_ssh_host
        port = settings.vps_ssh_port
        user = settings.vps_ssh_user
        password = settings.vps_ssh_password

        if not host:
            return {"success": False, "error": "VPS_SSH_HOST nao configurado"}

        # Usa sshpass se tiver senha, senao assume chave SSH
        if password:
            ssh_cmd = f"sshpass -p '{password}' ssh -o StrictHostKeyChecking=no -p {port} {user}@{host} \"{command}\""
        else:
            ssh_cmd = f"ssh -o StrictHostKeyChecking=no -p {port} {user}@{host} \"{command}\""

        result = subprocess.run(
            ssh_cmd,
            shell=True,
            capture_output=True,
            text=True,
            timeout=timeout
        )

        return {
            "success": result.returncode == 0,
            "command": command,
            "output": result.stdout,
            "error": result.stderr if result.returncode != 0 else None,
            "exit_code": result.returncode
        }

    except subprocess.TimeoutExpired:
        return {"success": False, "error": f"Comando expirou apos {timeout} segundos"}
    except Exception as e:
        logger.error("Error executing SSH command", error=str(e))
        return {"success": False, "error": str(e)}


async def get_error_logs(log_type: str, lines: int = 100, filter: Optional[str] = None, **kwargs) -> Dict[str, Any]:
    """Busca logs de erro (Docker containers)."""
    try:
        # Mapeia tipos de log para containers Docker ou arquivos
        log_sources = {
            "laravel": {"type": "docker", "container": "crm-php", "cmd": f"docker logs --tail {lines} crm-php 2>&1"},
            "nginx": {"type": "docker", "container": "crm-nginx", "cmd": f"docker logs --tail {lines} crm-nginx 2>&1"},
            "queue": {"type": "docker", "container": "crm-queue", "cmd": f"docker logs --tail {lines} crm-queue 2>&1"},
            "ai-service": {"type": "docker", "container": "crm-ai-service", "cmd": f"docker logs --tail {lines} crm-ai-service 2>&1"},
            "reverb": {"type": "docker", "container": "crm-reverb", "cmd": f"docker logs --tail {lines} crm-reverb 2>&1"},
            "redis": {"type": "docker", "container": "crm-redis", "cmd": f"docker logs --tail {lines} crm-redis 2>&1"},
        }

        source = log_sources.get(log_type)
        if not source:
            return {"success": False, "error": f"Tipo de log invalido. Use: {', '.join(log_sources.keys())}"}

        # Executa via SSH
        result = await ssh_execute(source["cmd"], timeout=30)

        if result["success"] and filter and result.get("output"):
            # Aplica filtro localmente
            filtered_lines = [l for l in result["output"].split('\n') if filter.lower() in l.lower()]
            result["output"] = '\n'.join(filtered_lines)
            result["filtered"] = True

        result["log_type"] = log_type
        result["container"] = source.get("container")

        return result

    except Exception as e:
        logger.error("Error getting logs", error=str(e))
        return {"success": False, "error": str(e)}


async def git_status(**kwargs) -> Dict[str, Any]:
    """Status do Git."""
    try:
        repo_path = settings.git_repo_path or os.getcwd()

        result = subprocess.run(
            "git status --porcelain -b",
            shell=True,
            capture_output=True,
            text=True,
            cwd=repo_path
        )

        lines = result.stdout.strip().split('\n')
        branch = lines[0] if lines else "unknown"
        files = lines[1:] if len(lines) > 1 else []

        return {
            "success": True,
            "branch": branch,
            "modified_files": len([f for f in files if f.startswith(' M') or f.startswith('M ')]),
            "new_files": len([f for f in files if f.startswith('??')]),
            "staged_files": len([f for f in files if f.startswith('A ') or f.startswith('M ')]),
            "files": files
        }

    except Exception as e:
        logger.error("Error getting git status", error=str(e))
        return {"success": False, "error": str(e)}


async def git_diff(file_path: Optional[str] = None, staged: bool = False, **kwargs) -> Dict[str, Any]:
    """Diferencias do Git."""
    try:
        repo_path = settings.git_repo_path or os.getcwd()

        cmd = "git diff --cached" if staged else "git diff"
        if file_path:
            cmd += f" -- {file_path}"

        result = subprocess.run(
            cmd,
            shell=True,
            capture_output=True,
            text=True,
            cwd=repo_path
        )

        return {
            "success": True,
            "staged": staged,
            "file": file_path,
            "diff": result.stdout[:5000] if len(result.stdout) > 5000 else result.stdout,
            "truncated": len(result.stdout) > 5000
        }

    except Exception as e:
        logger.error("Error getting git diff", error=str(e))
        return {"success": False, "error": str(e)}


async def git_commit(message: str, files: Optional[List[str]] = None, **kwargs) -> Dict[str, Any]:
    """Faz commit."""
    try:
        repo_path = settings.git_repo_path or os.getcwd()

        # Add files
        if files:
            for f in files:
                subprocess.run(f"git add {f}", shell=True, cwd=repo_path)
        else:
            subprocess.run("git add -A", shell=True, cwd=repo_path)

        # Commit
        result = subprocess.run(
            f'git commit -m "{message}"',
            shell=True,
            capture_output=True,
            text=True,
            cwd=repo_path
        )

        return {
            "success": result.returncode == 0,
            "message": message,
            "output": result.stdout,
            "error": result.stderr if result.returncode != 0 else None
        }

    except Exception as e:
        logger.error("Error committing", error=str(e))
        return {"success": False, "error": str(e)}


async def git_push(branch: str = "main", **kwargs) -> Dict[str, Any]:
    """Push para remoto."""
    try:
        repo_path = settings.git_repo_path or os.getcwd()
        remote = settings.git_remote_name

        result = subprocess.run(
            f"git push {remote} {branch}",
            shell=True,
            capture_output=True,
            text=True,
            cwd=repo_path
        )

        return {
            "success": result.returncode == 0,
            "remote": remote,
            "branch": branch,
            "output": result.stdout,
            "error": result.stderr if result.returncode != 0 else None
        }

    except Exception as e:
        logger.error("Error pushing", error=str(e))
        return {"success": False, "error": str(e)}


async def deploy_production(run_migrations: bool = False, clear_cache: bool = True, rebuild: bool = False, **kwargs) -> Dict[str, Any]:
    """Deploy na VPS usando Docker."""
    try:
        project_path = settings.vps_project_path

        commands = [
            f"cd {project_path}",
            "git pull origin main",
        ]

        # Rebuild containers se necessario
        if rebuild:
            commands.append("docker compose build")

        # Restart containers
        commands.append("docker compose up -d")

        # Executa comandos dentro do container PHP
        if clear_cache:
            commands.append("docker exec crm-php php artisan cache:clear")
            commands.append("docker exec crm-php php artisan config:clear")
            commands.append("docker exec crm-php php artisan view:clear")

        if run_migrations:
            commands.append("docker exec crm-php php artisan migrate --force")

        full_cmd = " && ".join(commands)

        result = await ssh_execute(full_cmd, timeout=180)

        result["commands"] = commands
        result["run_migrations"] = run_migrations
        result["clear_cache"] = clear_cache
        result["rebuild"] = rebuild

        return result

    except Exception as e:
        logger.error("Error deploying", error=str(e))
        return {"success": False, "error": str(e)}


async def run_tests(test_type: str = "all", filter: Optional[str] = None, **kwargs) -> Dict[str, Any]:
    """Executa testes."""
    try:
        repo_path = settings.git_repo_path or os.getcwd()

        if test_type == "unit":
            cmd = "php artisan test --testsuite=Unit"
        elif test_type == "feature":
            cmd = "php artisan test --testsuite=Feature"
        else:
            cmd = "php artisan test"

        if filter:
            cmd += f" --filter={filter}"

        result = subprocess.run(
            cmd,
            shell=True,
            capture_output=True,
            text=True,
            cwd=repo_path,
            timeout=300
        )

        return {
            "success": result.returncode == 0,
            "test_type": test_type,
            "filter": filter,
            "output": result.stdout,
            "error": result.stderr if result.returncode != 0 else None
        }

    except subprocess.TimeoutExpired:
        return {"success": False, "error": "Testes expiraram apos 5 minutos"}
    except Exception as e:
        logger.error("Error running tests", error=str(e))
        return {"success": False, "error": str(e)}


async def support_move_lead_stage(lead_id: str, stage_id: str, reason: Optional[str] = None, **kwargs) -> Dict[str, Any]:
    """Move lead no Kanban."""
    try:
        import httpx

        api_url = settings.LARAVEL_API_URL
        api_key = settings.LARAVEL_INTERNAL_KEY

        async with httpx.AsyncClient() as client:
            response = await client.put(
                f"{api_url}/api/internal/leads/{lead_id}/stage",
                json={
                    "stage_id": stage_id,
                    "reason": reason
                },
                headers={
                    "X-Internal-Key": api_key,
                    "Content-Type": "application/json"
                }
            )

        return {
            "success": response.status_code == 200,
            "lead_id": lead_id,
            "new_stage_id": stage_id,
            "reason": reason,
            "response": response.json() if response.status_code == 200 else response.text
        }

    except Exception as e:
        logger.error("Error moving lead stage", error=str(e))
        return {"success": False, "error": str(e)}


# =============================================================================
# AUTONOMOUS FIX FUNCTIONS (Backup/Rollback)
# =============================================================================

async def git_create_backup(tag_name: str, **kwargs) -> Dict[str, Any]:
    """Cria tag de backup no Git antes de modificacoes."""
    try:
        repo_path = settings.git_repo_path or os.getcwd()

        # Cria tag anotada com timestamp
        tag_message = f"Backup antes de fix autonomo - {datetime.now().isoformat()}"
        result = subprocess.run(
            f'git tag -a "{tag_name}" -m "{tag_message}"',
            shell=True,
            capture_output=True,
            text=True,
            cwd=repo_path
        )

        if result.returncode != 0:
            return {
                "success": False,
                "error": f"Falha ao criar tag: {result.stderr}",
                "tag_name": tag_name
            }

        # Push da tag para o remoto
        remote = settings.git_remote_name
        push_result = subprocess.run(
            f"git push {remote} {tag_name}",
            shell=True,
            capture_output=True,
            text=True,
            cwd=repo_path
        )

        return {
            "success": True,
            "tag_name": tag_name,
            "message": tag_message,
            "pushed": push_result.returncode == 0
        }

    except Exception as e:
        logger.error("Error creating backup tag", error=str(e))
        return {"success": False, "error": str(e)}


async def git_rollback(tag_name: str, **kwargs) -> Dict[str, Any]:
    """Reverte para uma tag de backup."""
    try:
        repo_path = settings.git_repo_path or os.getcwd()
        remote = settings.git_remote_name

        # Verifica se a tag existe
        check = subprocess.run(
            f"git tag -l {tag_name}",
            shell=True,
            capture_output=True,
            text=True,
            cwd=repo_path
        )

        if not check.stdout.strip():
            return {
                "success": False,
                "error": f"Tag {tag_name} nao encontrada",
                "tag_name": tag_name
            }

        # Reset para a tag
        reset_result = subprocess.run(
            f"git reset --hard {tag_name}",
            shell=True,
            capture_output=True,
            text=True,
            cwd=repo_path
        )

        if reset_result.returncode != 0:
            return {
                "success": False,
                "error": f"Falha ao fazer reset: {reset_result.stderr}",
                "tag_name": tag_name
            }

        # Force push para o remoto (CUIDADO!)
        push_result = subprocess.run(
            f"git push --force {remote} main",
            shell=True,
            capture_output=True,
            text=True,
            cwd=repo_path
        )

        return {
            "success": True,
            "tag_name": tag_name,
            "reset": True,
            "pushed": push_result.returncode == 0,
            "message": f"Rollback para {tag_name} executado com sucesso"
        }

    except Exception as e:
        logger.error("Error doing rollback", error=str(e))
        return {"success": False, "error": str(e)}


async def verify_health(health_check_url: Optional[str] = None, **kwargs) -> Dict[str, Any]:
    """Verifica saude do sistema apos deploy."""
    try:
        import httpx

        # URL padrao ou custom
        base_url = health_check_url or settings.vps_app_url or "https://crm.omnify.center"

        checks = {
            "app_responding": False,
            "api_responding": False,
            "no_recent_errors": True
        }

        details = {}

        async with httpx.AsyncClient(timeout=15.0) as client:
            # 1. Verifica se a aplicacao responde
            try:
                response = await client.get(f"{base_url}/health")
                checks["app_responding"] = response.status_code == 200
                details["app_status"] = response.status_code
            except Exception as e:
                details["app_error"] = str(e)

            # 2. Verifica se a API responde
            try:
                response = await client.get(f"{base_url}/api/ping")
                checks["api_responding"] = response.status_code == 200
                details["api_status"] = response.status_code
            except Exception as e:
                # Tenta endpoint alternativo
                try:
                    response = await client.get(f"{base_url}/sanctum/csrf-cookie")
                    checks["api_responding"] = response.status_code in [200, 204]
                    details["api_status"] = response.status_code
                except:
                    details["api_error"] = str(e)

        # 3. Verifica logs de erro recentes (via SSH)
        try:
            log_result = await get_error_logs(log_type="laravel", lines=20, filter="ERROR")
            if log_result.get("success") and log_result.get("output"):
                # Se tem erros nos ultimos 2 minutos
                recent_errors = log_result.get("output", "").count("ERROR")
                checks["no_recent_errors"] = recent_errors < 3
                details["recent_errors_count"] = recent_errors
        except:
            pass

        # Resultado final
        healthy = all(checks.values())

        return {
            "success": True,
            "healthy": healthy,
            "checks": checks,
            "details": details,
            "message": "Sistema saudavel" if healthy else "Problemas detectados"
        }

    except Exception as e:
        logger.error("Error verifying health", error=str(e))
        return {
            "success": False,
            "healthy": False,
            "error": str(e)
        }
