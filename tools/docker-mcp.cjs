#!/usr/bin/env node
const { exec } = require("child_process");
const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");

function runDocker(cmd) {
  return new Promise((resolve) => {
    exec(`docker ${cmd}`, (error, stdout, stderr) => {
      if (error) {
        resolve({ content: [{ type: "text", text: stderr || error.message }], isError: true });
      } else {
        resolve({ content: [{ type: "text", text: stdout }] });
      }
    });
  });
}

const server = new McpServer({
  name: "docker-mcp",
  version: "1.0.0"
});

server.tool("docker.list", "Lista todos os containers", {}, async () => {
  return await runDocker("ps -a");
});

server.tool(
  "docker.start",
  "Inicia um container",
  { name: { type: "string", description: "Nome ou ID do container" } },
  async ({ name }) => {
    return await runDocker(`start ${name}`);
  }
);

server.tool(
  "docker.stop",
  "Para um container",
  { name: { type: "string", description: "Nome ou ID do container" } },
  async ({ name }) => {
    return await runDocker(`stop ${name}`);
  }
);

server.tool(
  "docker.run",
  "Executa uma nova imagem",
  { image: { type: "string", description: "Nome da imagem Docker" } },
  async ({ image }) => {
    return await runDocker(`run -d ${image}`);
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
