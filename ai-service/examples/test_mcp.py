#!/usr/bin/env python3
"""
Script de teste do MCP Server.

Executa exemplos básicos para verificar se tudo está funcionando.

Uso:
    python examples/test_mcp.py
"""
import asyncio
import sys
import os

# Adiciona o diretório pai ao path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


async def test_list_tools():
    """Testa listagem de ferramentas."""
    print("\n" + "="*60)
    print("📋 TESTE 1: Listar Ferramentas")
    print("="*60)
    
    from mcp.server import get_mcp_server
    
    server = get_mcp_server()
    
    # Estatísticas gerais
    stats = server.get_stats()
    print(f"\n✅ MCP Server: {stats['name']} v{stats['version']}")
    print(f"   Total de ferramentas: {stats['total_tools']}")
    print(f"   Categorias: {stats['categories']}")
    
    # Ferramentas por categoria
    print("\n📂 Ferramentas por categoria:")
    for category, count in stats['categories'].items():
        print(f"   {category}: {count} tools")
        tools = server.get_tools_by_category(category)
        for tool in tools[:3]:  # Mostra apenas 3
            print(f"      - {tool['name']}")
        if len(tools) > 3:
            print(f"      ... e mais {len(tools) - 3}")


async def test_sdr_tools():
    """Testa ferramentas SDR."""
    print("\n" + "="*60)
    print("🎯 TESTE 2: Ferramentas SDR")
    print("="*60)
    
    from mcp.server import get_mcp_server
    
    server = get_mcp_server()
    tenant_id = "test-tenant-123"
    lead_id = "test-lead-456"
    
    # Teste 1: Predict Lead Score
    print("\n1️⃣ predict_lead_score:")
    result = await server.call_tool(
        name="predict_lead_score",
        arguments={"lead_id": lead_id, "tenant_id": tenant_id},
        tenant_id=tenant_id,
        agent_type="sdr"
    )
    if result.success:
        print(f"   ✅ Score: {result.result.get('score', 'N/A')}")
        print(f"   ✅ Confidence: {result.result.get('confidence', 'N/A')}")
    else:
        print(f"   ❌ Erro: {result.error}")
    
    # Teste 2: Select SDR Action
    print("\n2️⃣ select_sdr_action:")
    result = await server.call_tool(
        name="select_sdr_action",
        arguments={
            "lead_id": lead_id,
            "tenant_id": tenant_id,
            "current_state": {
                "lead_score": 75,
                "num_messages": 3,
                "sentiment": 0.8
            }
        },
        tenant_id=tenant_id,
        agent_type="sdr"
    )
    if result.success:
        print(f"   ✅ Ação: {result.result.get('action', 'N/A')}")
        print(f"   ✅ Explicação: {result.result.get('explanation', 'N/A')[:100]}...")
    else:
        print(f"   ❌ Erro: {result.error}")
    
    # Teste 3: Classify Intent
    print("\n3️⃣ classify_intent:")
    result = await server.call_tool(
        name="classify_intent",
        arguments={
            "message": "Quero agendar uma demonstração do produto",
            "tenant_id": tenant_id
        },
        tenant_id=tenant_id,
        agent_type="sdr"
    )
    if result.success:
        print(f"   ✅ Intent: {result.result.get('intent', 'N/A')}")
        print(f"   ✅ Confidence: {result.result.get('confidence', 'N/A')}")
    else:
        print(f"   ❌ Erro: {result.error}")


async def test_ads_tools():
    """Testa ferramentas Ads."""
    print("\n" + "="*60)
    print("📣 TESTE 3: Ferramentas Ads")
    print("="*60)
    
    from mcp.server import get_mcp_server
    
    server = get_mcp_server()
    tenant_id = "test-tenant-123"
    
    # Teste 1: Predict Campaign Performance
    print("\n1️⃣ predict_campaign_performance:")
    result = await server.call_tool(
        name="predict_campaign_performance",
        arguments={
            "tenant_id": tenant_id,
            "campaign_config": {
                "objective": "OUTCOME_SALES",
                "daily_budget": 100,
                "creative_type_index": 0,
                "audience_size": 50000
            }
        },
        tenant_id=tenant_id,
        agent_type="ads"
    )
    if result.success:
        preds = result.result.get('predictions', {})
        print(f"   ✅ ROAS estimado: {preds.get('roas', 'N/A')}x")
        print(f"   ✅ CTR estimado: {preds.get('ctr', 'N/A')}%")
        print(f"   ✅ Conversões: {preds.get('estimated_conversions', 'N/A')}")
    else:
        print(f"   ❌ Erro: {result.error}")
    
    # Teste 2: Get Budget Recommendation
    print("\n2️⃣ get_budget_recommendation:")
    result = await server.call_tool(
        name="get_budget_recommendation",
        arguments={
            "tenant_id": tenant_id,
            "objective": "OUTCOME_SALES",
            "target_conversions": 50
        },
        tenant_id=tenant_id,
        agent_type="ads"
    )
    if result.success:
        print(f"   ✅ Budget recomendado: R${result.result.get('recommended_daily_budget', 'N/A')}")
        print(f"   ✅ Mínimo: R${result.result.get('minimum_daily_budget', 'N/A')}")
        print(f"   ✅ Máximo: R${result.result.get('maximum_daily_budget', 'N/A')}")
    else:
        print(f"   ❌ Erro: {result.error}")
    
    # Teste 3: Generate Ad Copy
    print("\n3️⃣ generate_ad_copy:")
    result = await server.call_tool(
        name="generate_ad_copy",
        arguments={
            "tenant_id": tenant_id,
            "product_name": "CRM Pro",
            "objective": "OUTCOME_SALES",
            "tone": "casual"
        },
        tenant_id=tenant_id,
        agent_type="ads"
    )
    if result.success:
        print(f"   ✅ Variações geradas: {len(result.result.get('variations', []))}")
        for i, v in enumerate(result.result.get('variations', [])[:3]):
            print(f"      {i+1}. {v}")
    else:
        print(f"   ❌ Erro: {result.error}")


async def test_rag_tools():
    """Testa ferramentas RAG."""
    print("\n" + "="*60)
    print("📚 TESTE 4: Ferramentas RAG")
    print("="*60)
    
    from mcp.server import get_mcp_server
    
    server = get_mcp_server()
    tenant_id = "test-tenant-123"
    
    # Teste 1: Search Knowledge
    print("\n1️⃣ search_knowledge:")
    result = await server.call_tool(
        name="search_knowledge",
        arguments={
            "query": "melhores práticas para vendas",
            "tenant_id": tenant_id,
            "top_k": 3
        },
        tenant_id=tenant_id,
        agent_type="sdr"
    )
    if result.success:
        print(f"   ✅ Resultados encontrados: {result.result.get('count', 0)}")
    else:
        print(f"   ❌ Erro: {result.error}")
    
    # Teste 2: Get Best Practices
    print("\n2️⃣ get_best_practices:")
    result = await server.call_tool(
        name="get_best_practices",
        arguments={
            "tenant_id": tenant_id,
            "context": "qualificação de leads",
            "agent_type": "sdr"
        },
        tenant_id=tenant_id,
        agent_type="sdr"
    )
    if result.success:
        print(f"   ✅ Práticas encontradas: {result.result.get('count', 0)}")
    else:
        print(f"   ❌ Erro: {result.error}")


async def test_rl_tools():
    """Testa ferramentas RL."""
    print("\n" + "="*60)
    print("🎮 TESTE 5: Ferramentas RL")
    print("="*60)
    
    from mcp.server import get_mcp_server
    
    server = get_mcp_server()
    tenant_id = "test-tenant-123"
    
    # Teste 1: Get RL Status
    print("\n1️⃣ get_rl_status:")
    result = await server.call_tool(
        name="get_rl_status",
        arguments={"tenant_id": tenant_id},
        tenant_id=tenant_id,
        agent_type="sdr"
    )
    if result.success:
        status = result.result.get('status', {})
        for agent_type, info in status.items():
            print(f"   ✅ {agent_type}: modo={info.get('current_mode', 'N/A')}, exp={info.get('experience_count', 0)}")
    else:
        print(f"   ❌ Erro: {result.error}")
    
    # Teste 2: Get Policy Mode
    print("\n2️⃣ get_policy_mode:")
    result = await server.call_tool(
        name="get_policy_mode",
        arguments={"agent_type": "sdr", "tenant_id": tenant_id},
        tenant_id=tenant_id,
        agent_type="sdr"
    )
    if result.success:
        print(f"   ✅ Modo: {result.result.get('mode', 'N/A')}")
        print(f"   ✅ Descrição: {result.result.get('description', 'N/A')}")
    else:
        print(f"   ❌ Erro: {result.error}")
    
    # Teste 3: Record Experience
    print("\n3️⃣ record_experience:")
    result = await server.call_tool(
        name="record_experience",
        arguments={
            "agent_type": "sdr",
            "tenant_id": tenant_id,
            "state": {"lead_score": 75, "num_messages": 5},
            "action": "SCHEDULE",
            "reward": 10.0
        },
        tenant_id=tenant_id,
        agent_type="sdr"
    )
    if result.success:
        print(f"   ✅ Experience ID: {result.result.get('experience_id', 'N/A')}")
    else:
        print(f"   ❌ Erro: {result.error}")


async def test_permissions():
    """Testa sistema de permissões."""
    print("\n" + "="*60)
    print("🔒 TESTE 6: Sistema de Permissões")
    print("="*60)
    
    from mcp.permissions import get_mcp_permissions
    
    permissions = get_mcp_permissions()
    
    # Teste permissões SDR
    print("\n1️⃣ Permissões SDR:")
    sdr_tools = permissions.get_agent_tools("sdr")
    print(f"   ✅ Total de ferramentas permitidas: {len(sdr_tools)}")
    print(f"   ✅ Exemplos: {sdr_tools[:5]}")
    
    # Teste permissões Ads
    print("\n2️⃣ Permissões Ads:")
    ads_tools = permissions.get_agent_tools("ads")
    print(f"   ✅ Total de ferramentas permitidas: {len(ads_tools)}")
    print(f"   ✅ Exemplos: {ads_tools[:5]}")
    
    # Teste verificação de permissão
    print("\n3️⃣ Verificação de permissão:")
    
    # SDR pode usar predict_lead_score
    allowed = await permissions.check_permission("sdr", "predict_lead_score", "test-tenant")
    print(f"   SDR -> predict_lead_score: {'✅ Permitido' if allowed else '❌ Negado'}")
    
    # SDR não pode usar create_campaign
    allowed = await permissions.check_permission("sdr", "create_campaign", "test-tenant")
    print(f"   SDR -> create_campaign: {'✅ Permitido' if allowed else '❌ Negado'}")
    
    # Ads pode usar create_campaign
    allowed = await permissions.check_permission("ads", "create_campaign", "test-tenant")
    print(f"   Ads -> create_campaign: {'✅ Permitido' if allowed else '❌ Negado'}")


async def test_system_prompt():
    """Testa geração de system prompt."""
    print("\n" + "="*60)
    print("📝 TESTE 7: System Prompt")
    print("="*60)
    
    from mcp.server import get_mcp_server
    
    server = get_mcp_server()
    
    # System prompt do SDR
    print("\n1️⃣ System Prompt SDR (preview):")
    prompt = server.get_system_prompt("sdr")
    print(f"   Tamanho: {len(prompt)} caracteres")
    print(f"   Preview:\n{prompt[:500]}...")
    
    # System prompt do Ads
    print("\n2️⃣ System Prompt Ads (preview):")
    prompt = server.get_system_prompt("ads")
    print(f"   Tamanho: {len(prompt)} caracteres")


async def main():
    """Executa todos os testes."""
    print("\n" + "="*60)
    print("🚀 TESTES DO MCP SERVER")
    print("="*60)
    
    try:
        await test_list_tools()
        await test_sdr_tools()
        await test_ads_tools()
        await test_rag_tools()
        await test_rl_tools()
        await test_permissions()
        await test_system_prompt()
        
        print("\n" + "="*60)
        print("✅ TODOS OS TESTES CONCLUÍDOS!")
        print("="*60)
        
    except Exception as e:
        print(f"\n❌ ERRO: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())

