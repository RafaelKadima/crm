#!/usr/bin/env node
const { createClient } = require("redis");
const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");

function getClient() {
  const url = process.env.REDIS_URL || "redis://127.0.0.1:6379";
  const client = createClient({ url });

  client.on("error", (err) => {
    console.error("Redis error:", err);
  });

  return client;
}

const server = new McpServer({
  name: "redis-mcp",
  version: "1.0.0"
});

server.tool("redis.ping", "Testa conexão com Redis", {}, async () => {
  try {
    const client = getClient();
    await client.connect();
    const pong = await client.ping();
    await client.disconnect();
    return { content: [{ type: "text", text: pong }] };
  } catch (error) {
    return { content: [{ type: "text", text: error.message }], isError: true };
  }
});

server.tool(
  "redis.get",
  "Obtém valor de uma chave",
  { key: { type: "string", description: "Nome da chave" } },
  async ({ key }) => {
    try {
      const client = getClient();
      await client.connect();
      const value = await client.get(key);
      await client.disconnect();
      return { content: [{ type: "text", text: value ?? "(null)" }] };
    } catch (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
  }
);

server.tool(
  "redis.set",
  "Define valor de uma chave",
  {
    key: { type: "string", description: "Nome da chave" },
    value: { type: "string", description: "Valor a armazenar" },
    ttl: { type: "number", description: "TTL em segundos (opcional)" }
  },
  async ({ key, value, ttl }) => {
    try {
      const client = getClient();
      await client.connect();
      if (ttl) {
        await client.set(key, value, { EX: ttl });
      } else {
        await client.set(key, value);
      }
      await client.disconnect();
      return { content: [{ type: "text", text: `OK (${key})` }] };
    } catch (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
  }
);

server.tool(
  "redis.del",
  "Remove uma chave",
  { key: { type: "string", description: "Nome da chave" } },
  async ({ key }) => {
    try {
      const client = getClient();
      await client.connect();
      const count = await client.del(key);
      await client.disconnect();
      return { content: [{ type: "text", text: `Deleted: ${count}` }] };
    } catch (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
  }
);

server.tool(
  "redis.keys",
  "Lista chaves por padrão",
  { pattern: { type: "string", description: "Padrão de busca (ex: user:*)" } },
  async ({ pattern }) => {
    try {
      const client = getClient();
      await client.connect();
      const keys = await client.keys(pattern);
      await client.disconnect();
      return { content: [{ type: "text", text: JSON.stringify(keys, null, 2) }] };
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
