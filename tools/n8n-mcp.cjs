#!/usr/bin/env node
const axios = require("axios");
const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");

const server = new McpServer({
  name: "n8n-mcp",
  version: "1.0.0"
});

server.tool(
  "n8n.run",
  "Dispara um webhook do n8n",
  {
    url: { type: "string", description: "URL do webhook n8n" },
    data: { type: "object", description: "Dados a enviar" }
  },
  async ({ url, data }) => {
    try {
      const result = await axios.post(url, data);
      return { content: [{ type: "text", text: JSON.stringify(result.data, null, 2) }] };
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
