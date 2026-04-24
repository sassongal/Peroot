# Peroot MCP Server

Gives Claude direct access to the Peroot backend — Supabase data, Redis state, AI prompt configs, and the context engine cache.

## Tools

| Category | Tools |
|---|---|
| **Prompts** | list, get, create, update prompt library entries |
| **Users** | list, get user, history, add/deduct credits, set plan tier |
| **Analytics** | platform stats, activity logs, engine usage breakdown |
| **AI Prompts** | list/get/update engine system prompts, dynamic ai_prompts config |
| **Redis** | get key, scan keys, check/reset rate limits, circuit breaker state |
| **Context Cache** | get/list/invalidate cached context blocks |

## Setup

1. Copy `.env.example` to `.env.local` and fill in credentials
2. `npm install && npm run build`

## Configure in Claude Code

Add to `~/.claude/claude_code_config.json` (or equivalent):

```json
{
  "mcpServers": {
    "peroot": {
      "command": "node",
      "args": ["C:/Users/sasso/dev/Peroot/peroot-mcp-server/dist/index.js"]
    }
  }
}
```
