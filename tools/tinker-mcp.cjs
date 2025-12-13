#!/usr/bin/env node
const { exec } = require("child_process");
const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");

function runTinker(code) {
  const escaped = code.replace(/"/g, '\\"');
  const cmd = `php artisan tinker --execute="${escaped}"`;

  return new Promise((resolve) => {
    exec(cmd, { cwd: "/Users/rafaelxavier/crm" }, (error, stdout, stderr) => {
      if (error) {
        resolve({ content: [{ type: "text", text: stderr || error.message }], isError: true });
      } else {
        resolve({ content: [{ type: "text", text: stdout }] });
      }
    });
  });
}

const server = new McpServer({
  name: "tinker-mcp",
  version: "1.0.0"
});

server.tool(
  "tinker.eval",
  "Executa código PHP no Laravel Tinker",
  { code: { type: "string", description: "Código PHP a executar" } },
  async ({ code }) => {
    return await runTinker(code);
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
