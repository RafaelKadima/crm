#!/usr/bin/env node
const { exec } = require("child_process");
const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");

function runComposer(cmd) {
  return new Promise((resolve) => {
    exec(`composer ${cmd}`, { cwd: "C:/dev/crm" }, (error, stdout, stderr) => {
      if (error) {
        resolve({ content: [{ type: "text", text: stderr || error.message }], isError: true });
      } else {
        resolve({ content: [{ type: "text", text: stdout }] });
      }
    });
  });
}

const server = new McpServer({
  name: "composer-mcp",
  version: "1.0.0"
});

server.tool("composer.install", "Executa composer install", {}, async () => {
  return await runComposer("install");
});

server.tool("composer.update", "Executa composer update", {}, async () => {
  return await runComposer("update");
});

server.tool(
  "composer.require",
  "Adiciona um pacote via composer require",
  { package: { type: "string", description: "Nome do pacote (ex: vendor/package)" } },
  async ({ package: pkg }) => {
    return await runComposer(`require ${pkg}`);
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
