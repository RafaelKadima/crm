#!/usr/bin/env node
const { exec } = require("child_process");
const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");

const server = new McpServer({
  name: "artisan-mcp",
  version: "1.0.0"
});

server.tool(
  "run",
  "Executa comandos php spark no projeto CodeIgniter",
  {
    command: {
      type: "string",
      description: "O comando spark a ser executado (ex: 'migrate', 'db:seed', 'make:controller Nome')"
    }
  },
  async ({ command }) => {
    return new Promise((resolve) => {
      exec(`php spark ${command}`, { cwd: "/Users/rafaelxavier/crm" }, (error, stdout, stderr) => {
        if (error) {
          resolve({
            content: [{ type: "text", text: stderr || error.message }],
            isError: true
          });
        } else {
          resolve({
            content: [{ type: "text", text: stdout }]
          });
        }
      });
    });
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
