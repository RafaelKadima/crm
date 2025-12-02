#!/usr/bin/env node
const { Client } = require("pg");
const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");

const server = new McpServer({
  name: "postgres-mcp",
  version: "1.0.0"
});

server.tool(
  "postgres.query",
  "Executa query SQL no PostgreSQL",
  { sql: { type: "string", description: "Query SQL a executar" } },
  async ({ sql }) => {
    const client = new Client({
      user: process.env.PGUSER,
      host: process.env.PGHOST,
      database: process.env.PGDATABASE,
      password: process.env.PGPASSWORD,
      port: process.env.PGPORT ?? 5432
    });

    try {
      await client.connect();
      const result = await client.query(sql);
      await client.end();
      return { content: [{ type: "text", text: JSON.stringify(result.rows, null, 2) }] };
    } catch (error) {
      await client.end().catch(() => {});
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
