#!/usr/bin/env node
const { exec } = require("child_process");
const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");

function runArtisan(cmd) {
  return new Promise((resolve) => {
    exec(`php artisan ${cmd}`, { cwd: "C:/dev/crm" }, (error, stdout, stderr) => {
      if (error) {
        resolve({ content: [{ type: "text", text: stderr || error.message }], isError: true });
      } else {
        resolve({ content: [{ type: "text", text: stdout }] });
      }
    });
  });
}

const server = new McpServer({
  name: "queue-mcp",
  version: "1.0.0"
});

server.tool("queue.work_once", "Processa um job da fila", {}, async () => {
  return await runArtisan("queue:work --once");
});

server.tool("queue.restart", "Reinicia workers da fila", {}, async () => {
  return await runArtisan("queue:restart");
});

server.tool("queue.failed", "Lista jobs que falharam", {}, async () => {
  return await runArtisan("queue:failed");
});

server.tool(
  "queue.retry",
  "Reprocessa um job que falhou",
  { id: { type: "string", description: "ID do job a reprocessar" } },
  async ({ id }) => {
    return await runArtisan(`queue:retry ${id}`);
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
