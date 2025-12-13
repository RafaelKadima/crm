#!/usr/bin/env node
/**
 * Sentry MCP Server
 * 
 * Integração com Sentry para monitoramento de erros e performance.
 * Permite buscar issues, eventos, e gerenciar o monitoramento do CRM.
 */

const { exec } = require("child_process");
const axios = require("axios");
const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");

// Configuração do Sentry
const SENTRY_AUTH_TOKEN = process.env.SENTRY_AUTH_TOKEN || "";
const SENTRY_ORG = process.env.SENTRY_ORG || "";
const SENTRY_PROJECT = process.env.SENTRY_PROJECT || "";
const SENTRY_BASE_URL = process.env.SENTRY_BASE_URL || "https://sentry.io/api/0";

const PROJECT_ROOT = "/Users/rafaelxavier/crm";

function getHeaders() {
  return {
    "Authorization": `Bearer ${SENTRY_AUTH_TOKEN}`,
    "Content-Type": "application/json"
  };
}

async function sentryRequest(method, endpoint, data = null) {
  try {
    const config = {
      method,
      url: `${SENTRY_BASE_URL}${endpoint}`,
      headers: getHeaders()
    };
    if (data && ["POST", "PUT", "PATCH"].includes(method)) config.data = data;
    
    const response = await axios(config);
    return {
      content: [{
        type: "text",
        text: JSON.stringify({ status: response.status, data: response.data }, null, 2)
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          error: true,
          status: error.response?.status,
          message: error.response?.data || error.message
        }, null, 2)
      }],
      isError: true
    };
  }
}

function runCommand(cmd) {
  return new Promise((resolve) => {
    exec(cmd, { cwd: PROJECT_ROOT }, (error, stdout, stderr) => {
      if (error) {
        resolve({ content: [{ type: "text", text: stderr || error.message }], isError: true });
      } else {
        resolve({ content: [{ type: "text", text: stdout }] });
      }
    });
  });
}

const server = new McpServer({
  name: "sentry-mcp",
  version: "1.0.0"
});

// ==========================================
// ISSUES (Erros)
// ==========================================

server.tool("sentry.issues_list", "Lista issues/erros do projeto no Sentry",
  { 
    query: { type: "string", description: "Query de busca (ex: is:unresolved)" },
    limit: { type: "number", description: "Limite de resultados (default: 25)" }
  },
  async ({ query, limit }) => {
    if (!SENTRY_AUTH_TOKEN || !SENTRY_ORG || !SENTRY_PROJECT) {
      return {
        content: [{
          type: "text",
          text: "⚠️ Configuração do Sentry incompleta.\n\nDefina as variáveis de ambiente:\n- SENTRY_AUTH_TOKEN\n- SENTRY_ORG\n- SENTRY_PROJECT"
        }],
        isError: true
      };
    }
    const params = new URLSearchParams();
    if (query) params.append("query", query);
    if (limit) params.append("limit", limit);
    params.append("project", SENTRY_PROJECT);
    
    return await sentryRequest("GET", `/organizations/${SENTRY_ORG}/issues/?${params}`);
  }
);

server.tool("sentry.issue_details", "Retorna detalhes de uma issue específica",
  { issue_id: { type: "string", description: "ID da issue" } },
  async ({ issue_id }) => {
    if (!SENTRY_AUTH_TOKEN) {
      return {
        content: [{ type: "text", text: "⚠️ SENTRY_AUTH_TOKEN não configurado" }],
        isError: true
      };
    }
    return await sentryRequest("GET", `/issues/${issue_id}/`);
  }
);

server.tool("sentry.issue_events", "Lista eventos de uma issue",
  { 
    issue_id: { type: "string", description: "ID da issue" },
    limit: { type: "number", description: "Limite de eventos (default: 10)" }
  },
  async ({ issue_id, limit }) => {
    if (!SENTRY_AUTH_TOKEN) {
      return {
        content: [{ type: "text", text: "⚠️ SENTRY_AUTH_TOKEN não configurado" }],
        isError: true
      };
    }
    const params = limit ? `?limit=${limit}` : "";
    return await sentryRequest("GET", `/issues/${issue_id}/events/${params}`);
  }
);

server.tool("sentry.issue_resolve", "Marca uma issue como resolvida",
  { issue_id: { type: "string", description: "ID da issue" } },
  async ({ issue_id }) => {
    if (!SENTRY_AUTH_TOKEN) {
      return {
        content: [{ type: "text", text: "⚠️ SENTRY_AUTH_TOKEN não configurado" }],
        isError: true
      };
    }
    return await sentryRequest("PUT", `/issues/${issue_id}/`, { status: "resolved" });
  }
);

server.tool("sentry.issue_ignore", "Ignora uma issue",
  { 
    issue_id: { type: "string", description: "ID da issue" },
    reason: { type: "string", description: "Motivo (ignoredCount, ignoredUntil, ignoredUserCount)" }
  },
  async ({ issue_id, reason }) => {
    if (!SENTRY_AUTH_TOKEN) {
      return {
        content: [{ type: "text", text: "⚠️ SENTRY_AUTH_TOKEN não configurado" }],
        isError: true
      };
    }
    return await sentryRequest("PUT", `/issues/${issue_id}/`, { status: "ignored", statusDetails: { ignoreReason: reason || "ignoredUntilConditionMet" } });
  }
);

// ==========================================
// PROJECTS
// ==========================================

server.tool("sentry.projects_list", "Lista projetos da organização",
  {},
  async () => {
    if (!SENTRY_AUTH_TOKEN || !SENTRY_ORG) {
      return {
        content: [{ type: "text", text: "⚠️ SENTRY_AUTH_TOKEN ou SENTRY_ORG não configurados" }],
        isError: true
      };
    }
    return await sentryRequest("GET", `/organizations/${SENTRY_ORG}/projects/`);
  }
);

server.tool("sentry.project_stats", "Retorna estatísticas do projeto",
  { 
    stat: { type: "string", description: "Tipo de estatística (received, rejected, blacklisted)" },
    resolution: { type: "string", description: "Resolução (1h, 1d, default: 1d)" }
  },
  async ({ stat, resolution }) => {
    if (!SENTRY_AUTH_TOKEN || !SENTRY_ORG || !SENTRY_PROJECT) {
      return {
        content: [{ type: "text", text: "⚠️ Configuração do Sentry incompleta" }],
        isError: true
      };
    }
    const params = new URLSearchParams();
    if (stat) params.append("stat", stat);
    if (resolution) params.append("resolution", resolution);
    
    return await sentryRequest("GET", `/projects/${SENTRY_ORG}/${SENTRY_PROJECT}/stats/?${params}`);
  }
);

// ==========================================
// RELEASES
// ==========================================

server.tool("sentry.releases_list", "Lista releases do projeto",
  { limit: { type: "number", description: "Limite de resultados" } },
  async ({ limit }) => {
    if (!SENTRY_AUTH_TOKEN || !SENTRY_ORG) {
      return {
        content: [{ type: "text", text: "⚠️ Configuração do Sentry incompleta" }],
        isError: true
      };
    }
    const params = limit ? `?per_page=${limit}` : "";
    return await sentryRequest("GET", `/organizations/${SENTRY_ORG}/releases/${params}`);
  }
);

server.tool("sentry.release_create", "Cria uma nova release",
  { 
    version: { type: "string", description: "Versão da release" },
    ref: { type: "string", description: "Referência git (commit hash)" }
  },
  async ({ version, ref }) => {
    if (!SENTRY_AUTH_TOKEN || !SENTRY_ORG || !SENTRY_PROJECT) {
      return {
        content: [{ type: "text", text: "⚠️ Configuração do Sentry incompleta" }],
        isError: true
      };
    }
    return await sentryRequest("POST", `/organizations/${SENTRY_ORG}/releases/`, {
      version,
      ref,
      projects: [SENTRY_PROJECT]
    });
  }
);

// ==========================================
// PERFORMANCE (Transactions)
// ==========================================

server.tool("sentry.transactions_list", "Lista transações de performance",
  { 
    query: { type: "string", description: "Query de busca" },
    limit: { type: "number", description: "Limite de resultados" }
  },
  async ({ query, limit }) => {
    if (!SENTRY_AUTH_TOKEN || !SENTRY_ORG) {
      return {
        content: [{ type: "text", text: "⚠️ Configuração do Sentry incompleta" }],
        isError: true
      };
    }
    const params = new URLSearchParams();
    params.append("field", "transaction");
    params.append("field", "p95()");
    params.append("field", "count()");
    if (query) params.append("query", query);
    if (limit) params.append("per_page", limit);
    
    return await sentryRequest("GET", `/organizations/${SENTRY_ORG}/events/?${params}`);
  }
);

// ==========================================
// ALERTAS
// ==========================================

server.tool("sentry.alerts_list", "Lista alertas configurados",
  {},
  async () => {
    if (!SENTRY_AUTH_TOKEN || !SENTRY_ORG || !SENTRY_PROJECT) {
      return {
        content: [{ type: "text", text: "⚠️ Configuração do Sentry incompleta" }],
        isError: true
      };
    }
    return await sentryRequest("GET", `/projects/${SENTRY_ORG}/${SENTRY_PROJECT}/rules/`);
  }
);

// ==========================================
// CONFIGURAÇÃO LOCAL
// ==========================================

server.tool("sentry.check_config", "Verifica configuração do Sentry no projeto Laravel",
  {},
  async () => {
    // Verifica se o pacote está instalado
    const composerCheck = await runCommand("composer show sentry/sentry-laravel 2>/dev/null || echo 'Pacote não instalado'");
    
    // Verifica arquivo de configuração
    const configCheck = await runCommand("cat config/sentry.php 2>/dev/null | head -50 || echo 'Arquivo não encontrado'");
    
    // Verifica variáveis de ambiente
    const envCheck = await runCommand("grep -E '^SENTRY_' .env 2>/dev/null || echo 'Nenhuma variável SENTRY_ encontrada no .env'");
    
    return {
      content: [{
        type: "text",
        text: `📦 Pacote Composer:\n${composerCheck.content[0].text}\n\n` +
              `⚙️ Arquivo config/sentry.php:\n${configCheck.content[0].text}\n\n` +
              `🔑 Variáveis .env:\n${envCheck.content[0].text}`
      }]
    };
  }
);

server.tool("sentry.test_dsn", "Testa se o DSN do Sentry está funcionando",
  {},
  async () => {
    return await runCommand('php artisan sentry:test 2>&1 || echo "Comando sentry:test não disponível"');
  }
);

server.tool("sentry.publish_config", "Publica configuração do Sentry no Laravel",
  {},
  async () => {
    return await runCommand("php artisan vendor:publish --provider=\"Sentry\\Laravel\\ServiceProvider\"");
  }
);

// ==========================================
// HELPERS
// ==========================================

server.tool("sentry.summary", "Resumo rápido de erros não resolvidos",
  {},
  async () => {
    if (!SENTRY_AUTH_TOKEN || !SENTRY_ORG || !SENTRY_PROJECT) {
      return {
        content: [{
          type: "text",
          text: `📊 Resumo do Sentry (Configuração Local)

⚠️ Variáveis de ambiente necessárias para API:
- SENTRY_AUTH_TOKEN: ${SENTRY_AUTH_TOKEN ? "✅ Configurado" : "❌ Não configurado"}
- SENTRY_ORG: ${SENTRY_ORG ? "✅ " + SENTRY_ORG : "❌ Não configurado"}
- SENTRY_PROJECT: ${SENTRY_PROJECT ? "✅ " + SENTRY_PROJECT : "❌ Não configurado"}

💡 Para configurar, adicione no terminal ou no arquivo de ambiente:
export SENTRY_AUTH_TOKEN="seu-token"
export SENTRY_ORG="sua-organizacao"
export SENTRY_PROJECT="seu-projeto"

Você pode gerar um token em: https://sentry.io/settings/auth-tokens/`
        }]
      };
    }
    
    // Busca issues não resolvidas
    const issues = await sentryRequest("GET", `/organizations/${SENTRY_ORG}/issues/?query=is:unresolved&project=${SENTRY_PROJECT}&limit=10`);
    
    if (issues.isError) {
      return issues;
    }
    
    const data = JSON.parse(issues.content[0].text);
    const issueList = data.data || [];
    
    let summary = `📊 Resumo do Sentry - ${SENTRY_PROJECT}\n\n`;
    summary += `🔴 Issues não resolvidas: ${issueList.length}+\n\n`;
    
    if (issueList.length > 0) {
      summary += "📋 Top Issues:\n";
      issueList.slice(0, 5).forEach((issue, i) => {
        summary += `${i + 1}. [${issue.shortId}] ${issue.title}\n`;
        summary += `   👀 ${issue.count || 0} eventos | 👥 ${issue.userCount || 0} usuários\n`;
      });
    }
    
    return {
      content: [{ type: "text", text: summary }]
    };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);

