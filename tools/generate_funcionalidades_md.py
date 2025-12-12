import json
import os
import re
from collections import defaultdict
from datetime import datetime


ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
ROUTES_JSON = os.path.join(ROOT, "storage", "route-list.json")
FRONT_APP = os.path.join(ROOT, "frontend", "src", "App.tsx")
TENANT_FEATURES_PHP = os.path.join(ROOT, "app", "Models", "TenantFeature.php")
OUT_MD = os.path.join(ROOT, "docs", "FUNCIONALIDADES_SISTEMA.md")


def read_text(path: str) -> str:
    with open(path, "r", encoding="utf-8", errors="replace") as f:
        return f.read()


def load_routes() -> list[dict]:
    raw = read_text(ROUTES_JSON).strip()
    # route:list --json retorna um array JSON
    return json.loads(raw)


def parse_frontend_routes(app_tsx: str) -> list[str]:
    text = read_text(app_tsx)
    # Captura path="..." de <Route path="...">
    paths = re.findall(r'path\s*=\s*"([^"]+)"', text)
    # Dedup preservando ordem
    seen = set()
    out = []
    for p in paths:
        if p not in seen:
            seen.add(p)
            out.append(p)
    return out


def parse_feature_catalog(tenant_features_php: str) -> dict[str, dict[str, str]]:
    """
    Extrai o catálogo estático de features em TenantFeature::getAvailableFeatures().
    Não é um parser PHP completo; faz um parse robusto via regex.
    """
    text = read_text(tenant_features_php)
    # Pega o bloco do return [ ... ];
    m = re.search(r"function\s+getAvailableFeatures\(\)\s*:\s*array\s*\{([\s\S]*?)\n\s*\}\s*", text)
    if not m:
        return {}
    block = m.group(1)
    # Extrai pares 'key' => [ 'name' => '...', 'description' => '...', 'icon' => '...']
    features = {}
    # Divide por "'key' => ["
    for km in re.finditer(r"'([a-z0-9_]+)'\s*=>\s*\[([\s\S]*?)\]\s*,", block, re.IGNORECASE):
        key = km.group(1)
        body = km.group(2)
        name = re.search(r"'name'\s*=>\s*'([^']*)'", body)
        desc = re.search(r"'description'\s*=>\s*'([^']*)'", body)
        icon = re.search(r"'icon'\s*=>\s*'([^']*)'", body)
        features[key] = {
            "name": name.group(1) if name else key,
            "description": desc.group(1) if desc else "",
            "icon": icon.group(1) if icon else "",
        }
    return features


def classify_module(uri: str) -> str:
    # Normaliza para facilitar
    u = uri.lstrip("/")
    if u.startswith("api/"):
        u2 = u[4:]
    else:
        u2 = u

    # Mapeamento específico primeiro
    rules = [
        (r"^auth\b|^login\b|^logout\b|^me\b", "Autenticação & Sessão"),
        (r"^branding\b|^tenant/branding\b|^tenant/settings\b|^my-features\b|^check-feature\b", "Tenant, Configurações & Branding"),
        (r"^users\b|^permissions\b|^profile\b", "Usuários & Permissões"),
        (r"^leads\b", "Leads (CRM)"),
        (r"^contacts\b", "Contatos (CRM)"),
        (r"^tickets\b|^files\b|^media\b", "Tickets/Atendimento (Chat) & Arquivos"),
        (r"^pipelines\b", "Pipelines (Kanban)"),
        (r"^channels\b|^queues\b", "Canais, Filas (Queues) & Distribuição"),
        (r"^tasks\b", "Tarefas"),
        (r"^reports\b", "Relatórios"),
        (r"^gtm\b", "GTM & Eventos de Conversão"),
        (r"^products\b|^product-categories\b", "Produtos & Categorias"),
        (r"^landing-pages\b|^lp\b|^public\b", "Landing Pages"),
        (r"^appointments\b|^schedules\b", "Agendamentos"),
        (r"^whatsapp\b|^webhooks/whatsapp\b|^webhooks/meta\b", "WhatsApp & Meta Webhooks"),
        (r"^instagram\b|^webhooks/instagram\b", "Instagram"),
        (r"^ads\b", "Ads Intelligence"),
        (r"^agent-actions\b|^agent-learning\b|^agent\b|^ia\b|^internal\b", "IA (SDR/Orquestração/Learning) & Integrações"),
        (r"^groups\b", "Grupos/Franquias"),
        (r"^super-admin\b|^admin\b", "Super Admin"),
    ]
    for pattern, label in rules:
        if re.search(pattern, u2):
            return label
    # Fallback pelo primeiro segmento
    seg = u2.split("/", 1)[0] if u2 else u
    return f"Outros ({seg})"


def extract_guards(middleware: list[str]) -> dict[str, str]:
    guards: dict[str, str] = {}
    mw = middleware or []
    if any("Authenticate:api" in m or m.endswith("Authenticate:api") for m in mw):
        guards["auth"] = "auth:api"
    if any("ResolveTenant" in m for m in mw) or "tenant" in mw:
        guards["tenant"] = "tenant"
    if any("SuperAdminMiddleware" in m for m in mw) or "super_admin" in mw:
        guards["super_admin"] = "super_admin"

    feature = None
    for m in mw:
        if "CheckFeature:" in m:
            feature = m.split("CheckFeature:", 1)[1]
            break
        if m.startswith("feature:"):
            feature = m.split("feature:", 1)[1]
            break
    if feature:
        guards["feature"] = feature

    if "internal.api" in mw:
        guards["internal"] = "internal.api (X-Internal-Key)"
    return guards


def md_escape(s: str) -> str:
    return (s or "").replace("|", "\\|").strip()


def main() -> None:
    routes = load_routes()
    frontend_paths = parse_frontend_routes(FRONT_APP) if os.path.exists(FRONT_APP) else []
    features = parse_feature_catalog(TENANT_FEATURES_PHP) if os.path.exists(TENANT_FEATURES_PHP) else {}

    api_routes = []
    other_routes = []
    for r in routes:
        uri = r.get("uri") or ""
        if uri.startswith("api/"):
            api_routes.append(r)
        else:
            other_routes.append(r)

    modules: dict[str, list[dict]] = defaultdict(list)
    for r in api_routes:
        modules[classify_module(r.get("uri", ""))].append(r)

    # Ordena módulos e rotas
    module_order = [
        "Autenticação & Sessão",
        "Tenant, Configurações & Branding",
        "Usuários & Permissões",
        "Leads (CRM)",
        "Contatos (CRM)",
        "Tickets/Atendimento (Chat) & Arquivos",
        "Pipelines (Kanban)",
        "Canais, Filas (Queues) & Distribuição",
        "Tarefas",
        "Agendamentos",
        "Produtos & Categorias",
        "Landing Pages",
        "Relatórios",
        "GTM & Eventos de Conversão",
        "Ads Intelligence",
        "IA (SDR/Orquestração/Learning) & Integrações",
        "Grupos/Franquias",
        "Super Admin",
    ]
    ordered_modules = [m for m in module_order if m in modules] + sorted([m for m in modules if m not in module_order])

    # Build Markdown
    now = datetime.now().strftime("%Y-%m-%d %H:%M")
    lines: list[str] = []
    lines.append("# Funcionalidades do Sistema (CRM)\n")
    lines.append(f"_Gerado automaticamente em {now} a partir das rotas do Laravel + rotas do Frontend._\n")

    lines.append("## Visão geral\n")
    lines.append("- **Arquitetura**: Laravel (API/Jobs/Events) + Frontend React (Vite) + microserviço IA (FastAPI) + Redis (fila/cache) + Postgres (dados) + WebSocket (Reverb/Pusher).\n")
    lines.append("- **Multi-tenant**: grande parte das rotas roda em escopo de tenant (middleware `tenant`/`ResolveTenant`).\n")
    lines.append("- **Feature flags**: módulos podem ser ativados/desativados por tenant (middleware `feature:<key>` / `CheckFeature:<key>`).\n")
    lines.append("- **Papéis**: Usuários por tenant + **Super Admin** separado para gestão global e custos.\n")

    lines.append("## Catálogo de módulos (feature flags)\n")
    if features:
        lines.append("| Feature Key | Nome | Descrição | Icon |\n|---|---|---|---|\n")
        for key in sorted(features.keys()):
            f = features[key]
            lines.append(f"| `{md_escape(key)}` | {md_escape(f.get('name',''))} | {md_escape(f.get('description',''))} | `{md_escape(f.get('icon',''))}` |\n")
    else:
        lines.append("_Não foi possível extrair o catálogo de features._\n")

    lines.append("\n## Frontend (telas/rotas)\n")
    if frontend_paths:
        lines.append("| Path | Observação |\n|---|---|\n")
        for p in frontend_paths:
            obs = "pública" if p.startswith("/lp/") or p == "/login" else "autenticada"
            if p.startswith("/super-admin"):
                obs = "super-admin (rota dedicada)"
            lines.append(f"| `{md_escape(p)}` | {obs} |\n")
    else:
        lines.append("_Rotas do frontend não encontradas._\n")

    lines.append("\n## Backend (API REST)\n")
    lines.append("_Abaixo estão as rotas `api/*` agrupadas por módulo. Guards/escopo são inferidos pelos middlewares._\n")

    for module in ordered_modules:
        routes_in_module = modules[module]
        # Ordena por uri e método (apenas para facilitar leitura)
        routes_in_module = sorted(routes_in_module, key=lambda r: (r.get("uri", ""), r.get("method", "")))
        lines.append(f"\n### {module}\n")
        lines.append("| Método | URI | Action | Guards |\n|---|---|---|---|\n")
        for r in routes_in_module:
            method = r.get("method", "")
            uri = r.get("uri", "")
            action = r.get("action", "")
            guards = extract_guards(r.get("middleware", []) or [])
            guards_str = ", ".join([f"`{k}:{v}`" for k, v in guards.items()]) if guards else ""
            lines.append(f"| `{md_escape(method)}` | `/{md_escape(uri)}` | `{md_escape(action)}` | {guards_str} |\n")

    # Extras (não-api)
    lines.append("\n## Backend (rotas não-API relevantes)\n")
    # Filtra um subconjunto útil: oauth, broadcasting, up, storage
    interesting = []
    for r in other_routes:
        uri = (r.get("uri") or "").lstrip("/")
        if uri.startswith("oauth/") or uri.startswith("broadcasting/") or uri in ("up",) or uri.startswith("storage/"):
            interesting.append(r)
    interesting = sorted(interesting, key=lambda r: (r.get("uri", ""), r.get("method", "")))

    if interesting:
        lines.append("| Método | URI | Action |\n|---|---|---|\n")
        for r in interesting:
            lines.append(f"| `{md_escape(r.get('method',''))}` | `/{md_escape(r.get('uri',''))}` | `{md_escape(r.get('action',''))}` |\n")
    else:
        lines.append("_Sem rotas não-API destacáveis._\n")

    os.makedirs(os.path.dirname(OUT_MD), exist_ok=True)
    with open(OUT_MD, "w", encoding="utf-8") as f:
        f.writelines(lines)

    print(f"Wrote: {OUT_MD}")


if __name__ == "__main__":
    main()


