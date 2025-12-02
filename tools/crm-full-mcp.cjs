#!/usr/bin/env node
/**
 * CRM Full MCP Server
 * 
 * MCP Server CONSOLIDADO para o CRM.
 * Inclui: API REST + Helpers de simulação/teste
 * 
 * Este arquivo substitui: crm-api-mcp, crm-mcp
 */

const axios = require("axios");
const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");

const BASE_URL = process.env.CRM_API_URL || "http://localhost:8000/api";
const API_TOKEN = process.env.CRM_API_TOKEN || "";

function getHeaders(token) {
  const headers = { "Content-Type": "application/json", "Accept": "application/json" };
  if (token || API_TOKEN) headers["Authorization"] = `Bearer ${token || API_TOKEN}`;
  return headers;
}

async function apiRequest(method, endpoint, data = null, token = null) {
  try {
    const config = { method, url: `${BASE_URL}${endpoint}`, headers: getHeaders(token) };
    if (data && ["POST", "PUT", "PATCH"].includes(method)) config.data = data;
    const response = await axios(config);
    return { content: [{ type: "text", text: JSON.stringify({ status: response.status, data: response.data }, null, 2) }] };
  } catch (error) {
    return { content: [{ type: "text", text: JSON.stringify({ error: true, status: error.response?.status, message: error.response?.data || error.message }, null, 2) }], isError: true };
  }
}

const server = new McpServer({ name: "crm-full-mcp", version: "1.0.0" });

// ==========================================
// AUTENTICAÇÃO
// ==========================================

server.tool("crm.login", "Faz login na API do CRM",
  { email: { type: "string", description: "Email" }, password: { type: "string", description: "Senha" } },
  async ({ email, password }) => await apiRequest("POST", "/auth/login", { email, password }));

server.tool("crm.me", "Retorna dados do usuário autenticado",
  { token: { type: "string", description: "Token (opcional)" } },
  async ({ token }) => await apiRequest("GET", "/auth/me", null, token));

server.tool("crm.logout", "Faz logout",
  { token: { type: "string", description: "Token" } },
  async ({ token }) => await apiRequest("POST", "/auth/logout", null, token));

// ==========================================
// LEADS
// ==========================================

server.tool("crm.leads_list", "Lista leads com filtros",
  { token: { type: "string" }, stage_id: { type: "string" }, owner_id: { type: "string" }, status: { type: "string" }, search: { type: "string" } },
  async ({ token, stage_id, owner_id, status, search }) => {
    const params = new URLSearchParams();
    if (stage_id) params.append("stage_id", stage_id);
    if (owner_id) params.append("owner_id", owner_id);
    if (status) params.append("status", status);
    if (search) params.append("search", search);
    return await apiRequest("GET", `/leads?${params}`, null, token);
  });

server.tool("crm.leads_show", "Retorna detalhes de um lead",
  { token: { type: "string" }, id: { type: "string", description: "ID do lead" } },
  async ({ token, id }) => await apiRequest("GET", `/leads/${id}`, null, token));

server.tool("crm.leads_create", "Cria um novo lead",
  { token: { type: "string" }, contact_name: { type: "string" }, contact_phone: { type: "string" }, pipeline_id: { type: "string" }, stage_id: { type: "string" }, channel_id: { type: "string" }, value: { type: "number" } },
  async ({ token, contact_name, contact_phone, pipeline_id, stage_id, channel_id, value }) => {
    const data = { contact: { name: contact_name, phone: contact_phone }, pipeline_id, stage_id, channel_id };
    if (value) data.value = value;
    return await apiRequest("POST", "/leads", data, token);
  });

server.tool("crm.leads_update_stage", "Move lead para outro estágio do Kanban",
  { token: { type: "string" }, id: { type: "string" }, stage_id: { type: "string" } },
  async ({ token, id, stage_id }) => await apiRequest("PUT", `/leads/${id}/stage`, { stage_id }, token));

server.tool("crm.leads_assign", "Transfere lead para outro vendedor",
  { token: { type: "string" }, id: { type: "string" }, owner_id: { type: "string" } },
  async ({ token, id, owner_id }) => await apiRequest("PUT", `/leads/${id}/assign`, { owner_id }, token));

// ==========================================
// CONTATOS
// ==========================================

server.tool("crm.contacts_list", "Lista contatos",
  { token: { type: "string" }, search: { type: "string" } },
  async ({ token, search }) => await apiRequest("GET", `/contacts${search ? `?search=${search}` : ""}`, null, token));

server.tool("crm.contacts_show", "Retorna detalhes de um contato",
  { token: { type: "string" }, id: { type: "string" } },
  async ({ token, id }) => await apiRequest("GET", `/contacts/${id}`, null, token));

server.tool("crm.contacts_create", "Cria um novo contato",
  { token: { type: "string" }, name: { type: "string" }, phone: { type: "string" }, email: { type: "string" }, source: { type: "string" } },
  async ({ token, name, phone, email, source }) => await apiRequest("POST", "/contacts", { name, phone, email, source }, token));

// ==========================================
// TICKETS
// ==========================================

server.tool("crm.tickets_list", "Lista tickets",
  { token: { type: "string" }, status: { type: "string" }, assigned_user_id: { type: "string" } },
  async ({ token, status, assigned_user_id }) => {
    const params = new URLSearchParams();
    if (status) params.append("status", status);
    if (assigned_user_id) params.append("assigned_user_id", assigned_user_id);
    return await apiRequest("GET", `/tickets?${params}`, null, token);
  });

server.tool("crm.tickets_show", "Retorna detalhes de um ticket com mensagens",
  { token: { type: "string" }, id: { type: "string" } },
  async ({ token, id }) => await apiRequest("GET", `/tickets/${id}`, null, token));

server.tool("crm.tickets_send_message", "Envia mensagem em um ticket",
  { token: { type: "string" }, id: { type: "string" }, message: { type: "string" } },
  async ({ token, id, message }) => await apiRequest("POST", `/tickets/${id}/messages`, { message, direction: "outbound" }, token));

server.tool("crm.tickets_close", "Finaliza um ticket",
  { token: { type: "string" }, id: { type: "string" }, result: { type: "string" } },
  async ({ token, id, result }) => await apiRequest("PUT", `/tickets/${id}/close`, { result }, token));

// ==========================================
// PIPELINES
// ==========================================

server.tool("crm.pipelines_list", "Lista todos os pipelines (funis)",
  { token: { type: "string" } },
  async ({ token }) => await apiRequest("GET", "/pipelines", null, token));

server.tool("crm.stages_list", "Lista estágios de um pipeline",
  { token: { type: "string" }, pipeline_id: { type: "string" } },
  async ({ token, pipeline_id }) => await apiRequest("GET", `/pipelines/${pipeline_id}/stages`, null, token));

// ==========================================
// ENDPOINTS DA IA (n8n → CRM)
// ==========================================

server.tool("crm.ia_update_stage", "IA atualiza estágio do lead",
  { token: { type: "string" }, lead_id: { type: "string" }, stage_id: { type: "string" } },
  async ({ token, lead_id, stage_id }) => await apiRequest("POST", `/ia/leads/${lead_id}/update-stage`, { stage_id, source: "ia" }, token));

server.tool("crm.ia_assign_owner", "IA atribui lead a um vendedor (Round-Robin se não passar user_id)",
  { token: { type: "string" }, lead_id: { type: "string" }, user_id: { type: "string" } },
  async ({ token, lead_id, user_id }) => await apiRequest("POST", `/ia/leads/${lead_id}/assign-owner`, user_id ? { user_id } : {}, token));

server.tool("crm.ia_send_message", "IA envia mensagem em um ticket",
  { token: { type: "string" }, ticket_id: { type: "string" }, message: { type: "string" } },
  async ({ token, ticket_id, message }) => await apiRequest("POST", `/ia/tickets/${ticket_id}/messages`, { message, direction: "outbound" }, token));

// ==========================================
// RELATÓRIOS
// ==========================================

server.tool("crm.report_funnel", "Relatório do funil de vendas",
  { token: { type: "string" }, pipeline_id: { type: "string" } },
  async ({ token, pipeline_id }) => await apiRequest("GET", `/reports/funnel${pipeline_id ? `?pipeline_id=${pipeline_id}` : ""}`, null, token));

server.tool("crm.report_productivity", "Relatório de produtividade dos vendedores",
  { token: { type: "string" } },
  async ({ token }) => await apiRequest("GET", "/reports/productivity", null, token));

server.tool("crm.report_ia", "Relatório de performance da IA SDR",
  { token: { type: "string" } },
  async ({ token }) => await apiRequest("GET", "/reports/ia", null, token));

server.tool("crm.report_distribution", "Relatório de distribuição Round-Robin",
  { token: { type: "string" } },
  async ({ token }) => await apiRequest("GET", "/reports/distribution", null, token));

// ==========================================
// WEBHOOK EXTERNO
// ==========================================

server.tool("crm.webhook_external", "Recebe dados de sistema externo (ERP, etc)",
  { token: { type: "string" }, action: { type: "string" }, data: { type: "object" } },
  async ({ token, action, data }) => await apiRequest("POST", "/external/webhook", { action, data }, token));

// ==========================================
// HELPERS DE SIMULAÇÃO/TESTE
// ==========================================

server.tool("crm.testar_distribuicao", "Testa distribuição Round-Robin de leads",
  { leads: { type: "array", description: "Array de IDs de leads" }, vendedores: { type: "array", description: "Array de IDs de vendedores" } },
  async ({ leads, vendedores }) => {
    const result = leads.map((lead, i) => ({ lead, vendedor: vendedores[i % vendedores.length] }));
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  });

server.tool("crm.simular_mensagem_whatsapp", "Simula mensagem de WhatsApp personalizada",
  { nome: { type: "string" }, origem: { type: "string" }, produto: { type: "string" } },
  async ({ nome, origem, produto }) => {
    const msg = `Olá, ${nome}! 👋\n\nVi que você veio pelo *${origem}* interessado em *${produto}*.\nSou a IA SDR e posso te ajudar com informações! 😊`;
    return { content: [{ type: "text", text: msg }] };
  });

server.tool("crm.auditar_multitenancy", "Audita se todos registros têm tenant_id",
  { registros: { type: "array", description: "Array de registros" } },
  async ({ registros }) => {
    const semTenant = registros.filter(r => !r.tenant_id);
    return { content: [{ type: "text", text: JSON.stringify({ total: registros.length, sem_tenant: semTenant.length, registros: semTenant }, null, 2) }] };
  });

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);



