#!/usr/bin/env node
const fs = require("fs/promises");
const path = require("path");
const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");

const ROOT = "C:/dev/crm";

function safePath(rel) {
  const full = path.resolve(ROOT, rel);
  if (!full.startsWith(path.resolve(ROOT))) {
    throw new Error("Path fora do diretório do projeto");
  }
  return full;
}

const server = new McpServer({
  name: "fs-mcp",
  version: "1.0.0"
});

server.tool(
  "fs.read_file",
  "Lê conteúdo de um arquivo",
  { path: { type: "string", description: "Caminho relativo do arquivo" } },
  async ({ path: rel }) => {
    try {
      const full = safePath(rel);
      const content = await fs.readFile(full, "utf8");
      return { content: [{ type: "text", text: content }] };
    } catch (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
  }
);

server.tool(
  "fs.write_file",
  "Escreve conteúdo em um arquivo",
  {
    path: { type: "string", description: "Caminho relativo do arquivo" },
    content: { type: "string", description: "Conteúdo a escrever" }
  },
  async ({ path: rel, content }) => {
    try {
      const full = safePath(rel);
      await fs.writeFile(full, content, "utf8");
      return { content: [{ type: "text", text: `Wrote ${rel}` }] };
    } catch (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
  }
);

server.tool(
  "fs.list_dir",
  "Lista conteúdo de um diretório",
  { path: { type: "string", description: "Caminho relativo do diretório" } },
  async ({ path: rel }) => {
    try {
      const full = safePath(rel);
      const entries = await fs.readdir(full, { withFileTypes: true });
      const result = entries.map((e) => ({
        name: e.name,
        type: e.isDirectory() ? "dir" : "file"
      }));
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    } catch (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
