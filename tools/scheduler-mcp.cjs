#!/usr/bin/env node
const { exec } = require("child_process");
const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");

function runArtisan(cmd) {
  return new Promise((resolve) => {
    exec(`php artisan ${cmd}`, { cwd: "/Users/rafaelxavier/crm" }, (error, stdout, stderr) => {
      if (error) {
        resolve({ content: [{ type: "text", text: stderr || error.message }], isError: true });
      } else {
        resolve({ content: [{ type: "text", text: stdout }] });
      }
    });
  });
}

const server = new McpServer({
  name: "scheduler-mcp",
  version: "1.0.0"
});

server.tool("scheduler.run", "Executa o scheduler do Laravel", {}, async () => {
  return await runArtisan("schedule:run");
});

server.tool("scheduler.list", "Lista tarefas agendadas do Laravel", {}, async () => {
  return await runArtisan("schedule:list");
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
