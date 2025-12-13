#!/usr/bin/env node
/**
 * Laravel Full MCP Server
 * 
 * MCP Server CONSOLIDADO para Laravel.
 * Inclui: Artisan, Migrations, Make, Cache, Queue, Scheduler, Tinker, Composer
 * 
 * Este arquivo substitui: laravel-mcp, queue-mcp, scheduler-mcp, tinker-mcp, composer-mcp
 */

const { exec } = require("child_process");
const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");

const PROJECT_ROOT = "/Users/rafaelxavier/crm";

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
  name: "laravel-full-mcp",
  version: "1.0.0"
});

// ==========================================
// MIGRATIONS
// ==========================================

server.tool("laravel.migrate", "Executa todas as migrations pendentes", {}, 
  async () => await runCommand("php artisan migrate"));

server.tool("laravel.migrate_fresh", "Apaga todas as tabelas e executa migrations do zero", {},
  async () => await runCommand("php artisan migrate:fresh --seed"));

server.tool("laravel.migrate_rollback", "Reverte a última batch de migrations", {},
  async () => await runCommand("php artisan migrate:rollback"));

server.tool("laravel.migrate_status", "Mostra o status de todas as migrations", {},
  async () => await runCommand("php artisan migrate:status"));

// ==========================================
// MAKE COMMANDS (Criação)
// ==========================================

server.tool("laravel.make_model", "Cria um novo Model Eloquent",
  { name: { type: "string", description: "Nome do Model" } },
  async ({ name }) => await runCommand(`php artisan make:model ${name} -a`));

server.tool("laravel.make_controller", "Cria um novo Controller",
  { name: { type: "string", description: "Nome do Controller" } },
  async ({ name }) => await runCommand(`php artisan make:controller ${name} --api`));

server.tool("laravel.make_migration", "Cria uma nova migration",
  { name: { type: "string", description: "Nome da migration (ex: create_leads_table)" } },
  async ({ name }) => await runCommand(`php artisan make:migration ${name}`));

server.tool("laravel.make_seeder", "Cria um novo Seeder",
  { name: { type: "string", description: "Nome do Seeder" } },
  async ({ name }) => await runCommand(`php artisan make:seeder ${name}`));

server.tool("laravel.make_request", "Cria um Form Request para validação",
  { name: { type: "string", description: "Nome do Request" } },
  async ({ name }) => await runCommand(`php artisan make:request ${name}`));

server.tool("laravel.make_resource", "Cria um API Resource",
  { name: { type: "string", description: "Nome do Resource" } },
  async ({ name }) => await runCommand(`php artisan make:resource ${name}`));

server.tool("laravel.make_event", "Cria um novo Event",
  { name: { type: "string", description: "Nome do Event" } },
  async ({ name }) => await runCommand(`php artisan make:event ${name}`));

server.tool("laravel.make_listener", "Cria um novo Listener",
  { name: { type: "string", description: "Nome do Listener" } },
  async ({ name }) => await runCommand(`php artisan make:listener ${name} --queued`));

server.tool("laravel.make_job", "Cria um novo Job para fila",
  { name: { type: "string", description: "Nome do Job" } },
  async ({ name }) => await runCommand(`php artisan make:job ${name}`));

server.tool("laravel.make_middleware", "Cria um novo Middleware",
  { name: { type: "string", description: "Nome do Middleware" } },
  async ({ name }) => await runCommand(`php artisan make:middleware ${name}`));

server.tool("laravel.make_policy", "Cria uma nova Policy",
  { name: { type: "string", description: "Nome da Policy" } },
  async ({ name }) => await runCommand(`php artisan make:policy ${name}`));

// ==========================================
// SEEDS E CACHE
// ==========================================

server.tool("laravel.db_seed", "Executa os seeders do banco de dados", {},
  async () => await runCommand("php artisan db:seed"));

server.tool("laravel.optimize_clear", "Limpa todos os caches (config, route, view, cache)", {},
  async () => await runCommand("php artisan optimize:clear"));

server.tool("laravel.route_list", "Lista todas as rotas registradas", {},
  async () => await runCommand("php artisan route:list"));

// ==========================================
// TESTES E UTILITÁRIOS
// ==========================================

server.tool("laravel.test", "Executa os testes da aplicação", {},
  async () => await runCommand("php artisan test"));

server.tool("laravel.serve", "Inicia o servidor de desenvolvimento", {},
  async () => await runCommand("php artisan serve"));

server.tool("laravel.artisan", "Executa qualquer comando Artisan",
  { command: { type: "string", description: "Comando completo (ex: 'inspire')" } },
  async ({ command }) => await runCommand(`php artisan ${command}`));

// ==========================================
// QUEUE (Filas)
// ==========================================

server.tool("laravel.queue_work", "Processa um job da fila", {},
  async () => await runCommand("php artisan queue:work --once"));

server.tool("laravel.queue_failed", "Lista jobs que falharam", {},
  async () => await runCommand("php artisan queue:failed"));

server.tool("laravel.queue_retry", "Reprocessa um job que falhou",
  { id: { type: "string", description: "ID do job" } },
  async ({ id }) => await runCommand(`php artisan queue:retry ${id}`));

// ==========================================
// SCHEDULER (Agendamentos)
// ==========================================

server.tool("laravel.schedule_run", "Executa o scheduler do Laravel", {},
  async () => await runCommand("php artisan schedule:run"));

server.tool("laravel.schedule_list", "Lista tarefas agendadas", {},
  async () => await runCommand("php artisan schedule:list"));

// ==========================================
// TINKER (REPL PHP)
// ==========================================

server.tool("laravel.tinker", "Executa código PHP no Laravel Tinker",
  { code: { type: "string", description: "Código PHP a executar" } },
  async ({ code }) => {
    const escaped = code.replace(/"/g, '\\"');
    return await runCommand(`php artisan tinker --execute="${escaped}"`);
  });

// ==========================================
// COMPOSER
// ==========================================

server.tool("laravel.composer_install", "Executa composer install", {},
  async () => await runCommand("composer install"));

server.tool("laravel.composer_update", "Executa composer update", {},
  async () => await runCommand("composer update"));

server.tool("laravel.composer_require", "Adiciona um pacote via composer",
  { package: { type: "string", description: "Nome do pacote" } },
  async ({ package: pkg }) => await runCommand(`composer require ${pkg}`));

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);

