# LLM Provider Setup Guide

Quick reference for configuring API keys and understanding the multi-provider routing system.

---

## 1. Provider Overview

| Provider | Models | Env Var | Free Tier | Signup |
|---|---|---|---|---|
| Google AI Studio | Gemini 2.5 Flash, Flash Lite, Pro | `GOOGLE_GENERATIVE_AI_API_KEY` | 1,500 req/day, 1M tokens/min | https://aistudio.google.com/apikey |
| Mistral AI | Small 3.1, Nemo | `MISTRAL_API_KEY` | 1B tokens/month, 1 req/sec | https://console.mistral.ai/api-keys/ |
| Groq | Llama 4 Scout, GPT-OSS 20B | `GROQ_API_KEY` | 14,400 req/day, varies by model | https://console.groq.com/keys |
| DeepSeek | DeepSeek Chat (V3) | `DEEPSEEK_API_KEY` | 5M token welcome bonus, then pay-as-you-go | https://platform.deepseek.com/api_keys |

---

## 2. Setup Steps

### Adding `MISTRAL_API_KEY` (new)

1. Go to https://console.mistral.ai/api-keys/ and create an API key
2. Open the Vercel project dashboard: **Settings > Environment Variables**
3. Add `MISTRAL_API_KEY` with the key value, enabled for **all environments** (Production, Preview, Development)
4. Redeploy the latest commit so the new variable takes effect

### Verifying existing keys

`GROQ_API_KEY` and `DEEPSEEK_API_KEY` should already be configured in Vercel. After the model routing update, verify they still work:

```bash
# Pull latest env vars locally
vercel env pull

# Check the keys are present
grep -E "GROQ_API_KEY|DEEPSEEK_API_KEY" .env.local
```

If a key is missing or expired, re-add it from the provider console linked in the table above.

---

## 3. Model Routing

The fallback chain determines which model handles each request. If the primary model fails or is rate-limited, the system automatically tries the next one.

### Free users

```
Gemini 2.5 Flash  -->  Mistral Small 3.1  -->  Gemini 2.5 Flash Lite  -->  Llama 4 Scout  -->  GPT-OSS 20B
```

All models in this chain are free-tier eligible. The ordering prioritizes quality first, then falls back to lower-cost/higher-availability alternatives.

### Pro users

```
DeepSeek Chat (V3)  -->  Gemini 2.5 Pro  -->  [free chain above]
```

Pro starts with the highest-quality models. If both premium models fail, it gracefully degrades into the free chain.

### Vision (multimodal)

```
Gemini 2.5 Flash (only)
```

Only Google models support multimodal input (images). There is no fallback chain for vision requests -- if Flash is unavailable, the request fails.

---

## 4. Cost Estimates

| Scenario | Old Cost | New Cost | Saving |
|---|---|---|---|
| 1K free requests | ~$2.60 | ~$0.50 | 81% |
| 1K pro requests | ~$10.50 | ~$0.90 | 91% |
| 100K mixed requests | ~$260 | ~$26 | 90% |

Estimates assume average token usage per request. Actual costs depend on prompt/completion lengths and which model in the chain handles each request.

---

## 5. Monitoring

### Vercel Function Logs

Look for `[AIGateway] Attempting:` lines to see which model is being tried and whether fallbacks are triggering.

### Admin Dashboard

Go to `/admin` and check the **Costs** tab for aggregated spend per provider and model.

### Sentry

Watch for new error types from the added providers. Key things to look for:
- `MISTRAL_API_KEY` authentication failures
- Rate limit errors from Groq (varies by model)
- DeepSeek timeout or availability issues

---

## 6. Rollback Plan

If response quality drops after switching to the new routing:

1. Revert the `TASK_ROUTING` configuration in `src/lib/ai/models.ts` to the previous values
2. Push to `main` -- Vercel auto-deploys on merge
3. No environment variable changes are needed; all keys can stay configured

---

## 7. Future Opportunities

- **LLM response caching via Upstash Redis** -- cache identical prompts to reduce API calls by 15-30%
- **Cloudflare Workers AI** -- free inference tier as an additional fallback provider
- **Azure Translator for Hebrew<>English** -- translate prompts before sending to non-Hebrew-optimized models (2M chars/month free tier)
