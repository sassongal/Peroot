#!/usr/bin/env npx tsx
/**
 * Peroot Platform MCP Server
 * 
 * Unified MCP server providing tools for Redis diagnostics, 
 * Supabase management, Resend Email integration, and Platform health.
 * 
 * Instrumented with Sentry for monitoring.
 */

import * as Sentry from "@sentry/node";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import Redis from "ioredis";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import dotenv from "dotenv";
import path from "path";

// 1. Initialize Sentry
Sentry.init({
  dsn: "https://9e494a4f43eca116d1caa0826b7d4df7@o4510767730196480.ingest.de.sentry.io/4510767735832656",
  tracesSampleRate: 1.0,
  sendDefaultPii: true,
  environment: process.env.NODE_ENV || "development",
});

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

// 2. Setup Clients
const redis = process.env.REDIS_URL ? new Redis(process.env.REDIS_URL) : null;
const supabase = (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
  ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null;
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// 3. Create MCP Server
const server = new McpServer({
  name: "peroot-platform",
  version: "1.0.0",
});

// 4. Wrap with Sentry
const instrumentedServer = Sentry.wrapMcpServerWithSentry(server);

// --- TOOLS ---

/**
 * Tool: Send Transactional Email
 */
instrumentedServer.tool(
  "send_email",
  "Sends a transactional email via Resend",
  {
    to: z.string().email().describe("Recipient email address"),
    subject: z.string().min(1).describe("Email subject"),
    html: z.string().min(1).describe("HTML content (RTL supported)"),
    from: z.string().optional().describe("Override sender email (default from env)")
  },
  async ({ to, subject, html, from }) => {
    if (!resend) return { content: [{ type: "text", text: "Resend client not configured" }] };

    const { data, error } = await resend.emails.send({
        from: from || process.env.RESEND_FROM_EMAIL || "no-reply@joya-tech.net",
        to,
        subject,
        html,
    });

    if (error) {
        return { 
            content: [{ type: "text", text: `Failed to send email: ${error.message}` }],
            isError: true 
        };
    }

    return {
      content: [{ type: "text", text: `Email sent successfully. ID: ${data?.id}` }]
    };
  }
);

/**
 * Tool: Get User Rate Limit
 */
instrumentedServer.tool(
  "get_rate_limit",
  "Checks the current rate limit status for a user in Redis",
  { identifier: z.string().describe("User ID or IP address") },
  async ({ identifier }) => {
    if (!redis) return { content: [{ type: "text", text: "Redis connection not available" }] };
    
    const key = `@peroot/ratelimit:${identifier}`;
    const count = await redis.get(key);
    const ttl = await redis.ttl(key);
    
    return {
      content: [{ 
        type: "text", 
        text: `User ${identifier} has used ${count || 0} requests. TTL: ${ttl}s` 
      }]
    };
  }
);

/**
 * Tool: Reset User Rate Limit
 */
instrumentedServer.tool(
  "reset_rate_limit",
  "Resets the rate limit for a specific user",
  { identifier: z.string().describe("User ID or IP address") },
  async ({ identifier }) => {
    if (!redis) return { content: [{ type: "text", text: "Redis connection not available" }] };
    
    const key = `@peroot/ratelimit:${identifier}`;
    await redis.del(key);
    
    return {
      content: [{ type: "text", text: `Rate limit for ${identifier} has been reset.` }]
    };
  }
);

/**
 * Tool: Get User Contribution Stats
 */
instrumentedServer.tool(
  "get_user_stats",
  "Fetches contribution and gamification stats for a user from Supabase",
  { userId: z.string().uuid().describe("The user's UUID") },
  async ({ userId }) => {
    if (!supabase) return { content: [{ type: "text", text: "Supabase connection not available" }] };
    
    const { data: stats, error } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
      
    if (error) throw error;
    if (!stats) return { content: [{ type: "text", text: "User stats not found" }] };
    
    return {
      content: [{ type: "text", text: JSON.stringify(stats, null, 2) }]
    };
  }
);

/**
 * Tool: Platform Health Check
 */
instrumentedServer.tool(
  "platform_health",
  "Verifies connection to Redis, Supabase and Resend",
  {},
  async () => {
    const redisOk = redis ? (await redis.ping() === "PONG") : false;
    const supabaseOk = !!supabase;
    const resendOk = !!resend;
    
    return {
      content: [{ 
        type: "text", 
        text: `Redis: ${redisOk ? "UP" : "DOWN"}\nSupabase: ${supabaseOk ? "CONNECTED" : "DISCONNECTED"}\nResend: ${resendOk ? "CONFIGURED" : "MISSING"}` 
      }]
    };
  }
);

// 5. Run Server
async function main() {
  const transport = new StdioServerTransport();
  await instrumentedServer.connect(transport);
  console.error("Peroot Platform MCP server running on stdio");
}

main().catch((error) => {
  Sentry.captureException(error);
  process.exit(1);
});
