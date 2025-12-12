#!/usr/bin/env python3
"""Teste rápido do MCP Server."""
import asyncio
from mcp.server import get_mcp_server


async def test():
    server = get_mcp_server()
    
    # Teste 1: Gerar copy de anúncio
    print('\n=== Teste: generate_ad_copy ===')
    result = await server.call_tool(
        name='generate_ad_copy',
        arguments={
            'tenant_id': 'test-123',
            'product_name': 'CRM Pro',
            'objective': 'OUTCOME_SALES',
            'tone': 'casual'
        },
        tenant_id='test-123',
        agent_type='ads'
    )
    if result.success:
        print('Variações geradas:')
        for i, v in enumerate(result.result.get('variations', []), 1):
            print(f'  {i}. {v}')
    
    # Teste 2: Calcular desconto
    print('\n=== Teste: calculate_discount ===')
    result = await server.call_tool(
        name='calculate_discount',
        arguments={
            'lead_id': 'lead-456',
            'tenant_id': 'test-123',
            'product_value': 1000.0
        },
        tenant_id='test-123',
        agent_type='sdr'
    )
    if result.success:
        r = result.result
        print(f'Lead Score: {r.get("lead_score")}')
        print(f'Desconto max: {r.get("max_discount_percentage")}%')
        print(f'Preço mínimo: R$ {r.get("minimum_price")}')
    
    # Teste 3: Verificar disponibilidade
    print('\n=== Teste: check_availability ===')
    result = await server.call_tool(
        name='check_availability',
        arguments={
            'tenant_id': 'test-123',
            'date': '2025-12-15'
        },
        tenant_id='test-123',
        agent_type='sdr'
    )
    if result.success:
        print(f'Horários disponíveis: {result.result.get("available_slots", [])}')
    
    # Teste 4: Predizer performance de campanha
    print('\n=== Teste: predict_campaign_performance ===')
    result = await server.call_tool(
        name='predict_campaign_performance',
        arguments={
            'tenant_id': 'test-123',
            'campaign_config': {
                'objective': 'OUTCOME_SALES',
                'daily_budget': 150,
                'creative_type_index': 0,
                'audience_size': 100000
            }
        },
        tenant_id='test-123',
        agent_type='ads'
    )
    if result.success:
        preds = result.result.get('predictions', {})
        print(f'ROAS estimado: {preds.get("roas")}x')
        print(f'CTR estimado: {preds.get("ctr")}%')
        print(f'Conversões: {preds.get("estimated_conversions")}')
    
    # Teste 5: Status do RL
    print('\n=== Teste: get_policy_mode ===')
    result = await server.call_tool(
        name='get_policy_mode',
        arguments={
            'agent_type': 'sdr',
            'tenant_id': 'test-123'
        },
        tenant_id='test-123',
        agent_type='sdr'
    )
    if result.success:
        print(f'Modo atual: {result.result.get("mode")}')
        print(f'Descrição: {result.result.get("description")}')
    
    print('\n[OK] Todos os testes concluidos!')


if __name__ == '__main__':
    asyncio.run(test())

