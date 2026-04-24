import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { config } from "dotenv";
import { resolve } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

import { registerPromptTools } from "./tools/prompts.js";
import { registerUserTools } from "./tools/users.js";
import { registerAnalyticsTools } from "./tools/analytics.js";
import { registerAiPromptTools } from "./tools/ai-prompts.js";
import { registerRedisTools } from "./tools/redis-tools.js";
import { registerContextTools } from "./tools/context.js";
import { registerLifecycleTools } from "./tools/lifecycle.js";
import { registerGscTools } from "./tools/gsc.js";

// Load .env.local from the project root (one level up from dist/)
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env.local") });
config({ path: resolve(__dirname, "../.env") }); // fallback

const server = new McpServer({
  name: "peroot-mcp",
  version: "1.0.0",
});

registerPromptTools(server);
registerUserTools(server);
registerAnalyticsTools(server);
registerAiPromptTools(server);
registerRedisTools(server);
registerContextTools(server);
registerLifecycleTools(server);
registerGscTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);
