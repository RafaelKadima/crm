#!/usr/bin/env node
/**
 * CRM API MCP Server
 * 
 * MCP Server para interagir com as APIs do CRM.
 * Inclui operações de Leads, Tickets, Contatos, Pipelines e mais.
 */

const axios = require("axios");
const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");

// Configuração base
const BASE_URL = process.env.CRM_API_URL || "http://localhost:8000/api";
const API_TOKEN = process.env.CRM_API_TOKEN || "";

function getHeaders(token) {
  const headers = {
    "Content-Type": "application/json",
    "Accept": "application/json"
  };
  if (token || API_TOKEN) {
    headers["Authorization"] = `Bearer ${token || API_TOKEN}`;
  }
  return headers;
}

async function apiRequest(method, endpoint, data = null, token = null) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: getHeaders(token)
    };
    
    if (data && (method === "POST" || method === "PUT" || method === "PATCH")) {
      config.data = data;
    }
    
    const response = await axios(config);
    return { 
      content: [{ 
        type: "text", 
        text: JSON.stringify({ 
          status: response.status,
          data: response.data 
        }, null, 2) 
      }] 
    };
  } catch (error) {
    const errorData = error.response?.data || error.message;
    return { 
      content: [{ 
        type: "text", 
        text: JSON.stringify({ 
          error: true,
          status: error.response?.status,
          message: errorData 
        }, null, 2) 
      }], 
      isError: true 
    };
  }
}

const server = new McpServer({
  name: "crm-api-mcp",
  version: "1.0.0"
});

// ==========================================
// AUTENTICAÇÃO
// ==========================================

server.tool(
  "crm_api.login",
  "Faz login na API do CRM e retorna o token",
  {
    email: { type: "string", description: "Email do usuário" },
    password: { type: "string", description: "Senha do usuário" }
  },
  async ({ email, password }) => {
    return await apiRequest("POST", "/auth/login", { email, password });
  }
);

server.tool(
  "crm_api.me",
  "Retorna dados do usuário autenticado",
  { token: { type: "string", description: "Token de autenticação (opcional se configurado)" } },
  async ({ token }) => {
    return await apiRequest("GET", "/auth/me", null, token);
  }
);

server.tool(
  "crm_api.logout",
  "Faz logout e invalida o token",
  { token: { type: "string", description: "Token de autenticação" } },
  async ({ token }) => {
    return await apiRequest("POST", "/auth/logout", null, token);
  }
);

// ==========================================
// LEADS
// ==========================================

server.tool(
  "crm_api.leads_list",
  "Lista leads com filtros opcionais",
  {
    token: { type: "string", description: "Token de autenticação (opcional)" },
    stage_id: { type: "string", description: "Filtrar por estágio (opcional)" },
    owner_id: { type: "string", description: "Filtrar por vendedor (opcional)" },
    status: { type: "string", description: "Filtrar por status: open, won, lost, disqualified (opcional)" },
    channel_id: { type: "string", description: "Filtrar por canal (opcional)" },
    search: { type: "string", description: "Buscar por nome/telefone (opcional)" },
    date_from: { type: "string", description: "Data inicial YYYY-MM-DD (opcional)" },
    date_to: { type: "string", description: "Data final YYYY-MM-DD (opcional)" }
  },
  async ({ token, stage_id, owner_id, status, channel_id, search, date_from, date_to }) => {
    const params = new URLSearchParams();
    if (stage_id) params.append("stage_id", stage_id);
    if (owner_id) params.append("owner_id", owner_id);
    if (status) params.append("status", status);
    if (channel_id) params.append("channel_id", channel_id);
    if (search) params.append("search", search);
    if (date_from) params.append("date_from", date_from);
    if (date_to) params.append("date_to", date_to);
    
    const query = params.toString() ? `?${params.toString()}` : "";
    return await apiRequest("GET", `/leads${query}`, null, token);
  }
);

server.tool(
  "crm_api.leads_show",
  "Retorna detalhes de um lead específico",
  {
    token: { type: "string", description: "Token de autenticação (opcional)" },
    id: { type: "string", description: "ID do lead" }
  },
  async ({ token, id }) => {
    return await apiRequest("GET", `/leads/${id}`, null, token);
  }
);

server.tool(
  "crm_api.leads_create",
  "Cria um novo lead",
  {
    token: { type: "string", description: "Token de autenticação (opcional)" },
    contact_id: { type: "string", description: "ID do contato (opcional se passar dados do contato)" },
    contact_name: { type: "string", description: "Nome do contato (se não passar contact_id)" },
    contact_phone: { type: "string", description: "Telefone do contato (se não passar contact_id)" },
    contact_email: { type: "string", description: "Email do contato (opcional)" },
    pipeline_id: { type: "string", description: "ID do pipeline" },
    stage_id: { type: "string", description: "ID do estágio inicial" },
    channel_id: { type: "string", description: "ID do canal de origem" },
    value: { type: "number", description: "Valor potencial (opcional)" },
    expected_close_date: { type: "string", description: "Data prevista de fechamento YYYY-MM-DD (opcional)" }
  },
  async ({ token, contact_id, contact_name, contact_phone, contact_email, pipeline_id, stage_id, channel_id, value, expected_close_date }) => {
    const data = {
      pipeline_id,
      stage_id,
      channel_id
    };
    
    if (contact_id) {
      data.contact_id = contact_id;
    } else {
      data.contact = {
        name: contact_name,
        phone: contact_phone,
        email: contact_email
      };
    }
    
    if (value) data.value = value;
    if (expected_close_date) data.expected_close_date = expected_close_date;
    
    return await apiRequest("POST", "/leads", data, token);
  }
);

server.tool(
  "crm_api.leads_update",
  "Atualiza um lead existente",
  {
    token: { type: "string", description: "Token de autenticação (opcional)" },
    id: { type: "string", description: "ID do lead" },
    stage_id: { type: "string", description: "Novo estágio (opcional)" },
    owner_id: { type: "string", description: "Novo responsável (opcional)" },
    status: { type: "string", description: "Novo status (opcional)" },
    value: { type: "number", description: "Novo valor (opcional)" },
    expected_close_date: { type: "string", description: "Nova data prevista (opcional)" }
  },
  async ({ token, id, stage_id, owner_id, status, value, expected_close_date }) => {
    const data = {};
    if (stage_id) data.stage_id = stage_id;
    if (owner_id) data.owner_id = owner_id;
    if (status) data.status = status;
    if (value !== undefined) data.value = value;
    if (expected_close_date) data.expected_close_date = expected_close_date;
    
    return await apiRequest("PUT", `/leads/${id}`, data, token);
  }
);

server.tool(
  "crm_api.leads_update_stage",
  "Move lead para outro estágio do Kanban",
  {
    token: { type: "string", description: "Token de autenticação (opcional)" },
    id: { type: "string", description: "ID do lead" },
    stage_id: { type: "string", description: "ID do novo estágio" }
  },
  async ({ token, id, stage_id }) => {
    return await apiRequest("PUT", `/leads/${id}/stage`, { stage_id }, token);
  }
);

server.tool(
  "crm_api.leads_assign",
  "Transfere lead para outro vendedor",
  {
    token: { type: "string", description: "Token de autenticação (opcional)" },
    id: { type: "string", description: "ID do lead" },
    owner_id: { type: "string", description: "ID do novo responsável" }
  },
  async ({ token, id, owner_id }) => {
    return await apiRequest("PUT", `/leads/${id}/assign`, { owner_id }, token);
  }
);

// ==========================================
// CONTATOS
// ==========================================

server.tool(
  "crm_api.contacts_list",
  "Lista contatos com filtros opcionais",
  {
    token: { type: "string", description: "Token de autenticação (opcional)" },
    search: { type: "string", description: "Buscar por nome/telefone/email (opcional)" },
    owner_id: { type: "string", description: "Filtrar por responsável (opcional)" }
  },
  async ({ token, search, owner_id }) => {
    const params = new URLSearchParams();
    if (search) params.append("search", search);
    if (owner_id) params.append("owner_id", owner_id);
    
    const query = params.toString() ? `?${params.toString()}` : "";
    return await apiRequest("GET", `/contacts${query}`, null, token);
  }
);

server.tool(
  "crm_api.contacts_show",
  "Retorna detalhes de um contato",
  {
    token: { type: "string", description: "Token de autenticação (opcional)" },
    id: { type: "string", description: "ID do contato" }
  },
  async ({ token, id }) => {
    return await apiRequest("GET", `/contacts/${id}`, null, token);
  }
);

server.tool(
  "crm_api.contacts_create",
  "Cria um novo contato",
  {
    token: { type: "string", description: "Token de autenticação (opcional)" },
    name: { type: "string", description: "Nome do contato" },
    phone: { type: "string", description: "Telefone (WhatsApp)" },
    email: { type: "string", description: "Email (opcional)" },
    cpf: { type: "string", description: "CPF (opcional)" },
    source: { type: "string", description: "Origem: facebook_ads, google_ads, organico, indicacao (opcional)" }
  },
  async ({ token, name, phone, email, cpf, source }) => {
    const data = { name, phone };
    if (email) data.email = email;
    if (cpf) data.cpf = cpf;
    if (source) data.source = source;
    
    return await apiRequest("POST", "/contacts", data, token);
  }
);

server.tool(
  "crm_api.contacts_update",
  "Atualiza um contato existente",
  {
    token: { type: "string", description: "Token de autenticação (opcional)" },
    id: { type: "string", description: "ID do contato" },
    name: { type: "string", description: "Nome (opcional)" },
    phone: { type: "string", description: "Telefone (opcional)" },
    email: { type: "string", description: "Email (opcional)" },
    cpf: { type: "string", description: "CPF (opcional)" },
    address: { type: "object", description: "Endereço como objeto JSON (opcional)" }
  },
  async ({ token, id, name, phone, email, cpf, address }) => {
    const data = {};
    if (name) data.name = name;
    if (phone) data.phone = phone;
    if (email) data.email = email;
    if (cpf) data.cpf = cpf;
    if (address) data.address = address;
    
    return await apiRequest("PUT", `/contacts/${id}`, data, token);
  }
);

// ==========================================
// TICKETS
// ==========================================

server.tool(
  "crm_api.tickets_list",
  "Lista tickets com filtros opcionais",
  {
    token: { type: "string", description: "Token de autenticação (opcional)" },
    status: { type: "string", description: "Filtrar por status: open, pending, waiting_customer, closed (opcional)" },
    assigned_user_id: { type: "string", description: "Filtrar por atendente (opcional)" },
    channel_id: { type: "string", description: "Filtrar por canal (opcional)" }
  },
  async ({ token, status, assigned_user_id, channel_id }) => {
    const params = new URLSearchParams();
    if (status) params.append("status", status);
    if (assigned_user_id) params.append("assigned_user_id", assigned_user_id);
    if (channel_id) params.append("channel_id", channel_id);
    
    const query = params.toString() ? `?${params.toString()}` : "";
    return await apiRequest("GET", `/tickets${query}`, null, token);
  }
);

server.tool(
  "crm_api.tickets_show",
  "Retorna detalhes de um ticket com mensagens",
  {
    token: { type: "string", description: "Token de autenticação (opcional)" },
    id: { type: "string", description: "ID do ticket" }
  },
  async ({ token, id }) => {
    return await apiRequest("GET", `/tickets/${id}`, null, token);
  }
);

server.tool(
  "crm_api.tickets_create",
  "Cria um novo ticket",
  {
    token: { type: "string", description: "Token de autenticação (opcional)" },
    contact_id: { type: "string", description: "ID do contato" },
    channel_id: { type: "string", description: "ID do canal" },
    lead_id: { type: "string", description: "ID do lead (opcional)" }
  },
  async ({ token, contact_id, channel_id, lead_id }) => {
    const data = { contact_id, channel_id };
    if (lead_id) data.lead_id = lead_id;
    
    return await apiRequest("POST", "/tickets", data, token);
  }
);

server.tool(
  "crm_api.tickets_send_message",
  "Envia mensagem em um ticket",
  {
    token: { type: "string", description: "Token de autenticação (opcional)" },
    id: { type: "string", description: "ID do ticket" },
    message: { type: "string", description: "Conteúdo da mensagem" }
  },
  async ({ token, id, message }) => {
    return await apiRequest("POST", `/tickets/${id}/messages`, { 
      message, 
      direction: "outbound" 
    }, token);
  }
);

server.tool(
  "crm_api.tickets_transfer",
  "Transfere ticket para outro atendente",
  {
    token: { type: "string", description: "Token de autenticação (opcional)" },
    id: { type: "string", description: "ID do ticket" },
    assigned_user_id: { type: "string", description: "ID do novo atendente" }
  },
  async ({ token, id, assigned_user_id }) => {
    return await apiRequest("PUT", `/tickets/${id}/transfer`, { assigned_user_id }, token);
  }
);

server.tool(
  "crm_api.tickets_close",
  "Finaliza um ticket",
  {
    token: { type: "string", description: "Token de autenticação (opcional)" },
    id: { type: "string", description: "ID do ticket" },
    result: { type: "string", description: "Resultado/motivo do encerramento" }
  },
  async ({ token, id, result }) => {
    return await apiRequest("PUT", `/tickets/${id}/close`, { result }, token);
  }
);

// ==========================================
// PIPELINES E STAGES
// ==========================================

server.tool(
  "crm_api.pipelines_list",
  "Lista todos os pipelines (funis)",
  { token: { type: "string", description: "Token de autenticação (opcional)" } },
  async ({ token }) => {
    return await apiRequest("GET", "/pipelines", null, token);
  }
);

server.tool(
  "crm_api.pipelines_show",
  "Retorna detalhes de um pipeline com seus estágios",
  {
    token: { type: "string", description: "Token de autenticação (opcional)" },
    id: { type: "string", description: "ID do pipeline" }
  },
  async ({ token, id }) => {
    return await apiRequest("GET", `/pipelines/${id}`, null, token);
  }
);

server.tool(
  "crm_api.stages_list",
  "Lista estágios de um pipeline",
  {
    token: { type: "string", description: "Token de autenticação (opcional)" },
    pipeline_id: { type: "string", description: "ID do pipeline" }
  },
  async ({ token, pipeline_id }) => {
    return await apiRequest("GET", `/pipelines/${pipeline_id}/stages`, null, token);
  }
);

// ==========================================
// ENDPOINTS DA IA (n8n → CRM)
// ==========================================

server.tool(
  "crm_api.ia_update_stage",
  "IA atualiza estágio do lead",
  {
    token: { type: "string", description: "Token de autenticação (opcional)" },
    lead_id: { type: "string", description: "ID do lead" },
    stage_id: { type: "string", description: "ID do novo estágio" }
  },
  async ({ token, lead_id, stage_id }) => {
    return await apiRequest("POST", `/ia/leads/${lead_id}/update-stage`, { 
      stage_id, 
      source: "ia" 
    }, token);
  }
);

server.tool(
  "crm_api.ia_update_data",
  "IA atualiza dados do contato do lead",
  {
    token: { type: "string", description: "Token de autenticação (opcional)" },
    lead_id: { type: "string", description: "ID do lead" },
    name: { type: "string", description: "Nome (opcional)" },
    email: { type: "string", description: "Email (opcional)" },
    cpf: { type: "string", description: "CPF (opcional)" },
    address: { type: "object", description: "Endereço (opcional)" }
  },
  async ({ token, lead_id, name, email, cpf, address }) => {
    const data = {};
    if (name) data.name = name;
    if (email) data.email = email;
    if (cpf) data.cpf = cpf;
    if (address) data.address = address;
    
    return await apiRequest("POST", `/ia/leads/${lead_id}/update-data`, data, token);
  }
);

server.tool(
  "crm_api.ia_assign_owner",
  "IA atribui lead a um vendedor (ou usa Round-Robin)",
  {
    token: { type: "string", description: "Token de autenticação (opcional)" },
    lead_id: { type: "string", description: "ID do lead" },
    user_id: { type: "string", description: "ID do vendedor (opcional, se não passar usa Round-Robin)" }
  },
  async ({ token, lead_id, user_id }) => {
    const data = user_id ? { user_id } : {};
    return await apiRequest("POST", `/ia/leads/${lead_id}/assign-owner`, data, token);
  }
);

server.tool(
  "crm_api.ia_send_message",
  "IA envia mensagem em um ticket",
  {
    token: { type: "string", description: "Token de autenticação (opcional)" },
    ticket_id: { type: "string", description: "ID do ticket" },
    message: { type: "string", description: "Mensagem da IA" },
    direction: { type: "string", description: "inbound ou outbound" }
  },
  async ({ token, ticket_id, message, direction }) => {
    return await apiRequest("POST", `/ia/tickets/${ticket_id}/messages`, { 
      message, 
      direction: direction || "outbound" 
    }, token);
  }
);

// ==========================================
// RELATÓRIOS
// ==========================================

server.tool(
  "crm_api.report_funnel",
  "Relatório do funil de vendas",
  {
    token: { type: "string", description: "Token de autenticação (opcional)" },
    pipeline_id: { type: "string", description: "ID do pipeline (opcional)" },
    date_from: { type: "string", description: "Data inicial YYYY-MM-DD (opcional)" },
    date_to: { type: "string", description: "Data final YYYY-MM-DD (opcional)" }
  },
  async ({ token, pipeline_id, date_from, date_to }) => {
    const params = new URLSearchParams();
    if (pipeline_id) params.append("pipeline_id", pipeline_id);
    if (date_from) params.append("date_from", date_from);
    if (date_to) params.append("date_to", date_to);
    
    const query = params.toString() ? `?${params.toString()}` : "";
    return await apiRequest("GET", `/reports/funnel${query}`, null, token);
  }
);

server.tool(
  "crm_api.report_productivity",
  "Relatório de produtividade dos vendedores",
  {
    token: { type: "string", description: "Token de autenticação (opcional)" },
    owner_id: { type: "string", description: "Filtrar por vendedor (opcional)" },
    team_id: { type: "string", description: "Filtrar por time (opcional)" },
    date_from: { type: "string", description: "Data inicial YYYY-MM-DD (opcional)" },
    date_to: { type: "string", description: "Data final YYYY-MM-DD (opcional)" }
  },
  async ({ token, owner_id, team_id, date_from, date_to }) => {
    const params = new URLSearchParams();
    if (owner_id) params.append("owner_id", owner_id);
    if (team_id) params.append("team_id", team_id);
    if (date_from) params.append("date_from", date_from);
    if (date_to) params.append("date_to", date_to);
    
    const query = params.toString() ? `?${params.toString()}` : "";
    return await apiRequest("GET", `/reports/productivity${query}`, null, token);
  }
);

server.tool(
  "crm_api.report_ia",
  "Relatório de performance da IA SDR",
  {
    token: { type: "string", description: "Token de autenticação (opcional)" },
    date_from: { type: "string", description: "Data inicial YYYY-MM-DD (opcional)" },
    date_to: { type: "string", description: "Data final YYYY-MM-DD (opcional)" }
  },
  async ({ token, date_from, date_to }) => {
    const params = new URLSearchParams();
    if (date_from) params.append("date_from", date_from);
    if (date_to) params.append("date_to", date_to);
    
    const query = params.toString() ? `?${params.toString()}` : "";
    return await apiRequest("GET", `/reports/ia${query}`, null, token);
  }
);

server.tool(
  "crm_api.report_distribution",
  "Relatório de distribuição Round-Robin",
  {
    token: { type: "string", description: "Token de autenticação (opcional)" },
    channel_id: { type: "string", description: "Filtrar por canal (opcional)" },
    date_from: { type: "string", description: "Data inicial YYYY-MM-DD (opcional)" },
    date_to: { type: "string", description: "Data final YYYY-MM-DD (opcional)" }
  },
  async ({ token, channel_id, date_from, date_to }) => {
    const params = new URLSearchParams();
    if (channel_id) params.append("channel_id", channel_id);
    if (date_from) params.append("date_from", date_from);
    if (date_to) params.append("date_to", date_to);
    
    const query = params.toString() ? `?${params.toString()}` : "";
    return await apiRequest("GET", `/reports/distribution${query}`, null, token);
  }
);

// ==========================================
// WEBHOOKS EXTERNOS
// ==========================================

server.tool(
  "crm_api.webhook_external",
  "Recebe dados de sistema externo (ERP, etc)",
  {
    token: { type: "string", description: "Token de autenticação (opcional)" },
    action: { type: "string", description: "Ação: create_lead, update_lead, create_contact" },
    data: { type: "object", description: "Dados do registro" }
  },
  async ({ token, action, data }) => {
    return await apiRequest("POST", "/external/webhook", { action, data }, token);
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);

