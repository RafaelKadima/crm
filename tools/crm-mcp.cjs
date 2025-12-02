#!/usr/bin/env node
const axios = require("axios");
const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");

const server = new McpServer({
  name: "crm-mcp",
  version: "1.0.0"
});

/**
 * 1) Testar distribuição Round-Robin de leads
 */
server.tool(
  "crm.testar_distribuicao_leads",
  "Testa distribuição Round-Robin de leads entre vendedores",
  {
    leads: { type: "array", description: "Array de IDs ou telefones" },
    vendedores: { type: "array", description: "Array de IDs de usuários" }
  },
  async ({ leads, vendedores }) => {
    const result = [];
    let idx = 0;

    for (const lead of leads) {
      const vendedor = vendedores[idx];
      result.push({ lead, vendedor });
      idx = (idx + 1) % vendedores.length;
    }

    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

/**
 * 2) Simular mensagem de WhatsApp (texto personalizado)
 */
server.tool(
  "crm.simular_mensagem_whatsapp",
  "Simula mensagem de WhatsApp personalizada",
  {
    nome: { type: "string", description: "Nome do cliente" },
    origem: { type: "string", description: "Ex: Facebook Ads, Site, Indicação" },
    produto: { type: "string", description: "Produto de interesse" }
  },
  async ({ nome, origem, produto }) => {
    const msg = `
Olá, ${nome}! 👋

Vi aqui que você falou com a gente pelo *${origem}* sobre *${produto}*.
Sou a IA SDR do time comercial e já posso te ajudar com informações,
simulação de oferta e encaminhar para um vendedor humano quando você quiser. 😊
`.trim();

    return { content: [{ type: "text", text: msg }] };
  }
);

/**
 * 3) Auditar multitenancy (confere se todos registros têm tenant_id)
 */
server.tool(
  "crm.auditar_multitenancy",
  "Audita se todos registros têm tenant_id configurado",
  {
    registros: { type: "array", description: "Array de registros a auditar" }
  },
  async ({ registros }) => {
    const semTenant = registros.filter(
      (r) => !r.tenant_id && !r.tenant && !r.empresa_id
    );

    const resumo = {
      total: registros.length,
      sem_tenant: semTenant.length
    };

    return {
      content: [{ type: "text", text: JSON.stringify({ resumo, semTenant }, null, 2) }]
    };
  }
);

/**
 * 4) Gerar esqueleto de fluxo n8n para o CRM
 */
server.tool(
  "crm.gerar_fluxo_n8n",
  "Gera esqueleto de fluxo n8n para o CRM",
  {
    origem: { type: "string", description: "Ex: Facebook, WhatsApp, Landing Page" },
    pipelineId: { type: "number", description: "ID do pipeline" }
  },
  async ({ origem, pipelineId }) => {
    const flow = {
      name: `Fluxo CRM - Origem ${origem}`,
      nodes: [
        { type: "trigger", name: "Entrada Lead", origem },
        { type: "function", name: "Normalizar Dados", script: "// ... " },
        {
          type: "http",
          name: "Criar Contato/Oportunidade",
          url: "https://seu-crm.local/api/leads",
          method: "POST",
          body: { pipeline_id: pipelineId }
        }
      ]
    };

    return { content: [{ type: "text", text: JSON.stringify(flow, null, 2) }] };
  }
);

/**
 * 5) Testar API de contatos do CRM
 */
server.tool(
  "crm.testar_api_contatos",
  "Testa API de contatos do CRM",
  {
    url: { type: "string", description: "URL da API" },
    token: { type: "string", description: "Token de autenticação (opcional)" }
  },
  async ({ url, token }) => {
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.get(url, { headers });
      return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
    } catch (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
  }
);

/**
 * 6) Simular IA SDR (resposta de qualificação)
 */
server.tool(
  "crm.simular_ia_sdr",
  "Simula resposta de IA SDR para qualificação",
  {
    mensagem_cliente: { type: "string", description: "Mensagem do cliente" },
    produto: { type: "string", description: "Produto de interesse" }
  },
  async ({ mensagem_cliente, produto }) => {
    const resposta = `
Cliente disse: "${mensagem_cliente}"

Resposta IA SDR:
"Perfeito, já entendi seu interesse em *${produto}*.  
Você já usa algum concorrente hoje? Qual faixa de investimento mensal pensa em trabalhar?
Assim consigo montar a melhor proposta para seu cenário."
`.trim();

    return { content: [{ type: "text", text: resposta }] };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
