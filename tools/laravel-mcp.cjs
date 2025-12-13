#!/usr/bin/env node
/**
 * Laravel MCP Server
 * 
 * MCP Server específico para comandos Laravel Artisan.
 * Use este ao invés do artisan-mcp.cjs que está configurado para CodeIgniter.
 */

const { exec } = require("child_process");
const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");

const PROJECT_ROOT = "/Users/rafaelxavier/crm";

function runArtisan(cmd) {
  return new Promise((resolve) => {
    exec(`php artisan ${cmd}`, { cwd: PROJECT_ROOT }, (error, stdout, stderr) => {
      if (error) {
        resolve({ content: [{ type: "text", text: stderr || error.message }], isError: true });
      } else {
        resolve({ content: [{ type: "text", text: stdout }] });
      }
    });
  });
}

const server = new McpServer({
  name: "laravel-mcp",
  version: "1.0.0"
});

// ==========================================
// COMANDOS DE MIGRAÇÃO
// ==========================================

server.tool(
  "laravel.migrate",
  "Executa todas as migrations pendentes",
  {},
  async () => {
    return await runArtisan("migrate");
  }
);

server.tool(
  "laravel.migrate_fresh",
  "Apaga todas as tabelas e executa migrations do zero",
  { seed: { type: "boolean", description: "Executar seeds após migrate (opcional)" } },
  async ({ seed }) => {
    const cmd = seed ? "migrate:fresh --seed" : "migrate:fresh";
    return await runArtisan(cmd);
  }
);

server.tool(
  "laravel.migrate_rollback",
  "Reverte a última batch de migrations",
  { step: { type: "number", description: "Número de batches para reverter (opcional)" } },
  async ({ step }) => {
    const cmd = step ? `migrate:rollback --step=${step}` : "migrate:rollback";
    return await runArtisan(cmd);
  }
);

server.tool(
  "laravel.migrate_status",
  "Mostra o status de todas as migrations",
  {},
  async () => {
    return await runArtisan("migrate:status");
  }
);

// ==========================================
// COMANDOS DE CRIAÇÃO (MAKE)
// ==========================================

server.tool(
  "laravel.make_model",
  "Cria um novo Model Eloquent",
  {
    name: { type: "string", description: "Nome do Model (ex: Lead, Contact)" },
    migration: { type: "boolean", description: "Criar migration junto (opcional)" },
    factory: { type: "boolean", description: "Criar factory junto (opcional)" },
    seed: { type: "boolean", description: "Criar seeder junto (opcional)" },
    controller: { type: "boolean", description: "Criar controller junto (opcional)" },
    resource: { type: "boolean", description: "Criar resource controller (opcional)" },
    all: { type: "boolean", description: "Criar tudo: migration, factory, seeder, controller (opcional)" }
  },
  async ({ name, migration, factory, seed, controller, resource, all }) => {
    let flags = [];
    if (all) flags.push("-a");
    else {
      if (migration) flags.push("-m");
      if (factory) flags.push("-f");
      if (seed) flags.push("-s");
      if (controller) flags.push("-c");
      if (resource) flags.push("-r");
    }
    return await runArtisan(`make:model ${name} ${flags.join(" ")}`);
  }
);

server.tool(
  "laravel.make_controller",
  "Cria um novo Controller",
  {
    name: { type: "string", description: "Nome do Controller (ex: LeadController)" },
    resource: { type: "boolean", description: "Criar resource controller (opcional)" },
    api: { type: "boolean", description: "Criar API resource controller (opcional)" },
    model: { type: "string", description: "Model para vincular (opcional)" }
  },
  async ({ name, resource, api, model }) => {
    let flags = [];
    if (api) flags.push("--api");
    else if (resource) flags.push("--resource");
    if (model) flags.push(`--model=${model}`);
    return await runArtisan(`make:controller ${name} ${flags.join(" ")}`);
  }
);

server.tool(
  "laravel.make_migration",
  "Cria uma nova migration",
  {
    name: { type: "string", description: "Nome da migration (ex: create_leads_table)" },
    table: { type: "string", description: "Nome da tabela (opcional)" },
    create: { type: "string", description: "Criar nova tabela (opcional)" }
  },
  async ({ name, table, create }) => {
    let flags = [];
    if (create) flags.push(`--create=${create}`);
    else if (table) flags.push(`--table=${table}`);
    return await runArtisan(`make:migration ${name} ${flags.join(" ")}`);
  }
);

server.tool(
  "laravel.make_seeder",
  "Cria um novo Seeder",
  { name: { type: "string", description: "Nome do Seeder (ex: LeadSeeder)" } },
  async ({ name }) => {
    return await runArtisan(`make:seeder ${name}`);
  }
);

server.tool(
  "laravel.make_factory",
  "Cria uma nova Factory",
  {
    name: { type: "string", description: "Nome da Factory (ex: LeadFactory)" },
    model: { type: "string", description: "Model para vincular (opcional)" }
  },
  async ({ name, model }) => {
    const flags = model ? `--model=${model}` : "";
    return await runArtisan(`make:factory ${name} ${flags}`);
  }
);

server.tool(
  "laravel.make_request",
  "Cria um Form Request para validação",
  { name: { type: "string", description: "Nome do Request (ex: StoreLeadRequest)" } },
  async ({ name }) => {
    return await runArtisan(`make:request ${name}`);
  }
);

server.tool(
  "laravel.make_resource",
  "Cria um API Resource",
  {
    name: { type: "string", description: "Nome do Resource (ex: LeadResource)" },
    collection: { type: "boolean", description: "Criar como collection (opcional)" }
  },
  async ({ name, collection }) => {
    const flags = collection ? "--collection" : "";
    return await runArtisan(`make:resource ${name} ${flags}`);
  }
);

server.tool(
  "laravel.make_event",
  "Cria um novo Event",
  { name: { type: "string", description: "Nome do Event (ex: LeadStageChanged)" } },
  async ({ name }) => {
    return await runArtisan(`make:event ${name}`);
  }
);

server.tool(
  "laravel.make_listener",
  "Cria um novo Listener",
  {
    name: { type: "string", description: "Nome do Listener (ex: RegisterLeadActivity)" },
    event: { type: "string", description: "Event para vincular (opcional)" },
    queued: { type: "boolean", description: "Usar queue (opcional)" }
  },
  async ({ name, event, queued }) => {
    let flags = [];
    if (event) flags.push(`--event=${event}`);
    if (queued) flags.push("--queued");
    return await runArtisan(`make:listener ${name} ${flags.join(" ")}`);
  }
);

server.tool(
  "laravel.make_job",
  "Cria um novo Job para fila",
  {
    name: { type: "string", description: "Nome do Job (ex: SendLeadToExternalSystem)" },
    sync: { type: "boolean", description: "Job síncrono, sem fila (opcional)" }
  },
  async ({ name, sync }) => {
    const flags = sync ? "--sync" : "";
    return await runArtisan(`make:job ${name} ${flags}`);
  }
);

server.tool(
  "laravel.make_middleware",
  "Cria um novo Middleware",
  { name: { type: "string", description: "Nome do Middleware (ex: ResolveTenant)" } },
  async ({ name }) => {
    return await runArtisan(`make:middleware ${name}`);
  }
);

server.tool(
  "laravel.make_policy",
  "Cria uma nova Policy",
  {
    name: { type: "string", description: "Nome da Policy (ex: LeadPolicy)" },
    model: { type: "string", description: "Model para vincular (opcional)" }
  },
  async ({ name, model }) => {
    const flags = model ? `--model=${model}` : "";
    return await runArtisan(`make:policy ${name} ${flags}`);
  }
);

server.tool(
  "laravel.make_service",
  "Cria um novo Service (via stub customizado ou manualmente)",
  { name: { type: "string", description: "Nome do Service (ex: LeadAssignmentService)" } },
  async ({ name }) => {
    // Laravel não tem make:service nativo, mas podemos criar via classe genérica
    return await runArtisan(`make:class App/Services/${name}`);
  }
);

// ==========================================
// COMANDOS DE SEED
// ==========================================

server.tool(
  "laravel.db_seed",
  "Executa os seeders do banco de dados",
  { class: { type: "string", description: "Classe específica para executar (opcional)" } },
  async ({ class: seederClass }) => {
    const flags = seederClass ? `--class=${seederClass}` : "";
    return await runArtisan(`db:seed ${flags}`);
  }
);

// ==========================================
// COMANDOS DE CACHE
// ==========================================

server.tool(
  "laravel.cache_clear",
  "Limpa o cache da aplicação",
  {},
  async () => {
    return await runArtisan("cache:clear");
  }
);

server.tool(
  "laravel.config_clear",
  "Limpa o cache de configuração",
  {},
  async () => {
    return await runArtisan("config:clear");
  }
);

server.tool(
  "laravel.config_cache",
  "Cria cache de configuração para produção",
  {},
  async () => {
    return await runArtisan("config:cache");
  }
);

server.tool(
  "laravel.route_clear",
  "Limpa o cache de rotas",
  {},
  async () => {
    return await runArtisan("route:clear");
  }
);

server.tool(
  "laravel.route_cache",
  "Cria cache de rotas para produção",
  {},
  async () => {
    return await runArtisan("route:cache");
  }
);

server.tool(
  "laravel.view_clear",
  "Limpa o cache de views compiladas",
  {},
  async () => {
    return await runArtisan("view:clear");
  }
);

server.tool(
  "laravel.optimize_clear",
  "Limpa todos os caches (config, route, view, cache)",
  {},
  async () => {
    return await runArtisan("optimize:clear");
  }
);

// ==========================================
// COMANDOS DE ROTA
// ==========================================

server.tool(
  "laravel.route_list",
  "Lista todas as rotas registradas",
  {
    path: { type: "string", description: "Filtrar por path (opcional)" },
    method: { type: "string", description: "Filtrar por método HTTP (opcional)" },
    name: { type: "string", description: "Filtrar por nome da rota (opcional)" }
  },
  async ({ path, method, name }) => {
    let flags = [];
    if (path) flags.push(`--path=${path}`);
    if (method) flags.push(`--method=${method}`);
    if (name) flags.push(`--name=${name}`);
    return await runArtisan(`route:list ${flags.join(" ")}`);
  }
);

// ==========================================
// COMANDOS DE TESTE
// ==========================================

server.tool(
  "laravel.test",
  "Executa os testes da aplicação",
  {
    filter: { type: "string", description: "Filtrar testes por nome (opcional)" },
    testsuite: { type: "string", description: "Test suite específica (opcional)" }
  },
  async ({ filter, testsuite }) => {
    let flags = [];
    if (filter) flags.push(`--filter=${filter}`);
    if (testsuite) flags.push(`--testsuite=${testsuite}`);
    return await runArtisan(`test ${flags.join(" ")}`);
  }
);

// ==========================================
// COMANDOS ÚTEIS
// ==========================================

server.tool(
  "laravel.serve",
  "Inicia o servidor de desenvolvimento",
  { port: { type: "number", description: "Porta (default: 8000)" } },
  async ({ port }) => {
    const flags = port ? `--port=${port}` : "";
    return await runArtisan(`serve ${flags}`);
  }
);

server.tool(
  "laravel.key_generate",
  "Gera uma nova APP_KEY",
  {},
  async () => {
    return await runArtisan("key:generate");
  }
);

server.tool(
  "laravel.storage_link",
  "Cria link simbólico do storage para public",
  {},
  async () => {
    return await runArtisan("storage:link");
  }
);

server.tool(
  "laravel.about",
  "Mostra informações sobre a aplicação Laravel",
  {},
  async () => {
    return await runArtisan("about");
  }
);

server.tool(
  "laravel.list",
  "Lista todos os comandos Artisan disponíveis",
  {},
  async () => {
    return await runArtisan("list");
  }
);

// ==========================================
// COMANDO GENÉRICO
// ==========================================

server.tool(
  "laravel.artisan",
  "Executa qualquer comando Artisan",
  { command: { type: "string", description: "Comando completo (ex: 'make:model Lead -m')" } },
  async ({ command }) => {
    return await runArtisan(command);
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);

