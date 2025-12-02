#!/usr/bin/env node
const { exec } = require("child_process");
const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");

// Utilitário para executar comandos
function runGit(cmd) {
  return new Promise((resolve) => {
    exec(cmd, { cwd: "C:/dev/crm" }, (error, stdout, stderr) => {
      if (error) {
        resolve({ content: [{ type: "text", text: stderr || error.message }], isError: true });
      } else {
        resolve({ content: [{ type: "text", text: stdout }] });
      }
    });
  });
}

const server = new McpServer({
  name: "git-mcp",
  version: "1.0.0"
});

// status
server.tool("git.status", "Mostra status do repositório Git", {}, async () => {
  return await runGit("git status");
});

// commit
server.tool(
  "git.commit",
  "Faz commit das alterações",
  { message: { type: "string", description: "Mensagem do commit" } },
  async ({ message }) => {
    return await runGit(`git commit -am "${message}"`);
  }
);

// create branch
server.tool(
  "git.create_branch",
  "Cria e muda para uma nova branch",
  { name: { type: "string", description: "Nome da branch" } },
  async ({ name }) => {
    return await runGit(`git checkout -b ${name}`);
  }
);

// merge
server.tool(
  "git.merge",
  "Faz merge de uma branch",
  { source: { type: "string", description: "Branch de origem para merge" } },
  async ({ source }) => {
    return await runGit(`git merge ${source}`);
  }
);

// push
server.tool("git.push", "Envia commits para o repositório remoto", {}, async () => {
  return await runGit("git push");
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
