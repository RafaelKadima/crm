#!/usr/bin/env node
const { createClient } = require("@supabase/supabase-js");
const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");

function getSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_KEY;
  
  if (!url || !key) {
    throw new Error("SUPABASE_URL e SUPABASE_KEY devem estar definidos nas variáveis de ambiente");
  }
  
  return createClient(url, key);
}

const server = new McpServer({
  name: "supabase-mcp",
  version: "1.0.0"
});

server.tool(
  "supabase.query",
  "Consulta dados no Supabase",
  {
    table: { type: "string", description: "Nome da tabela" },
    filter: { type: "object", description: "Filtros de busca (chave: valor)" }
  },
  async ({ table, filter }) => {
    try {
      const supabase = getSupabaseClient();
      let query = supabase.from(table).select("*");

      for (const key of Object.keys(filter || {})) {
        query = query.eq(key, filter[key]);
      }

      const { data, error } = await query;

      return { content: [{ type: "text", text: JSON.stringify({ data, error }, null, 2) }] };
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
