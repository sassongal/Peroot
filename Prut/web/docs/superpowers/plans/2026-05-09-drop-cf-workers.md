# Drop CF Workers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the Cloudflare Workers extraction dependency, activate the existing in-process fallback on Vercel, fix broken file/URL uploads, and save $5/month.

**Architecture:** Delete the `remote.ts` bridge and simplify `engine/index.ts` to always call the in-process extractors (`dispatchFile`, `extractUrl`). Remove the three CF-related env vars from Vercel. The extraction libs (pdfjs-dist, mammoth, jsdom, xlsx) are already installed and declared as `serverExternalPackages` — no new packages needed.

**Tech Stack:** Next.js 16 App Router, Node.js 24, Vercel Functions, Vitest, TypeScript 5

---

## File Map

| Action | File |
|--------|------|
| Modify | `src/lib/context/engine/index.ts` — remove remote imports + branches |
| Delete | `src/lib/context/engine/extract/remote.ts` |
| Env change | Vercel project — remove 3 env vars via API |

No new files. No new tests needed — the in-process path already has full test coverage in `src/lib/context/engine/__tests__/extract/`.

---

### Task 1: Remove CF Worker env vars from Vercel

The env vars tell the code to route to CF Workers. Removing them activates the in-process path immediately on next deploy.

**Files:**
- No code files — Vercel API call only

- [ ] **Step 1: Remove the three env vars via Vercel API**

Run this Node.js snippet (token is in `.env.local` line 53 as `VERCEL_TOKEN`):

```bash
node -e "
const https = require('https');
const TOKEN = process.env.VERCEL_TOKEN || require('fs').readFileSync('.env.local','utf8').match(/VERCEL_TOKEN=\"([^\"]+)\"/)?.[1];
const TEAM = 'team_kLQpSmIjUkdJnP45AhgPujTy';
const PROJECT = 'prj_gxifbyEmJW5MAVRZCWDXsTiP5Dd6';

function api(method, path, body) {
  return new Promise((res, rej) => {
    const data = body ? JSON.stringify(body) : null;
    const r = https.request({
      hostname: 'api.vercel.com', path, method,
      headers: { Authorization: 'Bearer ' + TOKEN, 'User-Agent': 'node', 'Content-Type': 'application/json', ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}) }
    }, resp => { let d=''; resp.on('data',c=>d+=c); resp.on('end',()=>{ try{res(JSON.parse(d))}catch(e){res(d)} }); });
    r.on('error', rej);
    if (data) r.write(data);
    r.end();
  });
}

async function main() {
  // List all env vars to find IDs for our targets
  const { envs } = await api('GET', '/v9/projects/' + PROJECT + '/env?teamId=' + TEAM);
  const targets = ['EXTRACT_FILE_HTTP_ENDPOINT','EXTRACT_URL_HTTP_ENDPOINT','EXTRACT_SECRET'];
  const toDelete = envs.filter(e => targets.includes(e.key));
  console.log('Found:', toDelete.map(e => e.key + ' (' + e.id + ')'));
  for (const env of toDelete) {
    const r = await api('DELETE', '/v9/projects/' + PROJECT + '/env/' + env.id + '?teamId=' + TEAM);
    console.log('Deleted', env.key, r);
  }
}
main().catch(console.error);
"
```

Expected output:
```
Found: ['EXTRACT_FILE_HTTP_ENDPOINT (env_xxx)', 'EXTRACT_URL_HTTP_ENDPOINT (env_yyy)', 'EXTRACT_SECRET (env_zzz)']
Deleted EXTRACT_FILE_HTTP_ENDPOINT { ... }
Deleted EXTRACT_URL_HTTP_ENDPOINT { ... }
Deleted EXTRACT_SECRET { ... }
```

- [ ] **Step 2: Verify removal**

```bash
node -e "
const https = require('https');
const TOKEN = require('fs').readFileSync('.env.local','utf8').match(/VERCEL_TOKEN=\"([^\"]+)\"/)?.[1];
function api(path) {
  return new Promise((res,rej)=>{const r=https.request({hostname:'api.vercel.com',path,headers:{Authorization:'Bearer '+TOKEN,'User-Agent':'node'}},resp=>{let d='';resp.on('data',c=>d+=c);resp.on('end',()=>res(JSON.parse(d)));});r.on('error',rej);r.end();});
}
api('/v9/projects/prj_gxifbyEmJW5MAVRZCWDXsTiP5Dd6/env?teamId=team_kLQpSmIjUkdJnP45AhgPujTy').then(d=>{
  const keys = d.envs.map(e=>e.key);
  const remaining = ['EXTRACT_FILE_HTTP_ENDPOINT','EXTRACT_URL_HTTP_ENDPOINT','EXTRACT_SECRET'].filter(k=>keys.includes(k));
  console.log(remaining.length === 0 ? 'OK — all 3 env vars removed' : 'FAIL — still present: ' + remaining.join(', '));
});
"
```

Expected: `OK — all 3 env vars removed`

---

### Task 2: Simplify `engine/index.ts` — remove remote branch

Remove the import block and replace the two remote/local branches with direct in-process calls.

**Files:**
- Modify: `src/lib/context/engine/index.ts:9-14` (import block) and `:59-73` (dispatch logic)

- [ ] **Step 1: Remove the remote import block (lines 9-14)**

In `src/lib/context/engine/index.ts`, replace:

```ts
import {
  isRemoteUrlConfigured,
  isRemoteFileConfigured,
  extractUrlRemote,
  dispatchFileRemote,
} from "./extract/remote";
```

With nothing — delete those 6 lines entirely.

- [ ] **Step 2: Simplify the file dispatch branch (lines 59-61)**

Replace:

```ts
      const r = isRemoteFileConfigured()
        ? await dispatchFileRemote(input.buffer, input.filename, input.mimeType)
        : await dispatchFile(input.buffer, input.filename, input.mimeType);
```

With:

```ts
      const r = await dispatchFile(input.buffer, input.filename, input.mimeType);
```

- [ ] **Step 3: Simplify the URL dispatch branch (lines 68-73)**

Replace:

```ts
      if (isRemoteUrlConfigured()) {
        r = await extractUrlRemote(input.url, { jinaFallback: limits.jinaFallback });
      } else {
        const { extractUrl } = await import("./extract/url");
        r = await extractUrl(input.url, { jinaFallback: limits.jinaFallback });
      }
```

With:

```ts
      const { extractUrl } = await import("./extract/url");
      r = await extractUrl(input.url, { jinaFallback: limits.jinaFallback });
```

- [ ] **Step 4: Run typecheck**

```bash
npx tsc --noEmit
```

Expected: no output (zero errors)

- [ ] **Step 5: Run the full test suite**

```bash
npx vitest run
```

Expected: all tests pass (1067+). The extraction tests in `src/lib/context/engine/__tests__/extract/` cover the in-process path directly.

- [ ] **Step 6: Commit**

```bash
git add src/lib/context/engine/index.ts
git commit -m "refactor(context): remove CF Worker remote branch, always use in-process extraction"
```

---

### Task 3: Delete `remote.ts`

The bridge file is now unreferenced. Delete it.

**Files:**
- Delete: `src/lib/context/engine/extract/remote.ts`

- [ ] **Step 1: Confirm nothing imports remote.ts**

```bash
grep -r "extract/remote" src/ --include="*.ts" --include="*.tsx"
```

Expected: no output

- [ ] **Step 2: Delete the file**

```bash
rm src/lib/context/engine/extract/remote.ts
```

- [ ] **Step 3: Run typecheck again**

```bash
npx tsc --noEmit
```

Expected: no output

- [ ] **Step 4: Run tests again**

```bash
npx vitest run
```

Expected: all tests pass

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore(context): delete CF Worker remote bridge — extraction runs in-process on Vercel Pro"
```

---

### Task 4: Push and verify deployment

- [ ] **Step 1: Push to main**

```bash
git push origin main
```

- [ ] **Step 2: Confirm Vercel deployment starts**

Check https://vercel.com/sassongals-projects/web/deployments — a new deployment should appear within ~30 seconds.

- [ ] **Step 3: Smoke test uploads on production**

Once the deployment is live (green):
1. Go to https://peroot.space, log in
2. Open a prompt improvement session
3. Click the attachment button, upload a PDF (any PDF ≤10MB)
4. Verify the attachment card shows `extracting → enriching → ready` without a red error
5. Paste a URL into the URL field, verify the same stages complete successfully

- [ ] **Step 4: Cancel CF Workers Paid plan**

In the Cloudflare dashboard (dash.cloudflare.com):
- Go to Workers & Pages → Plans
- Downgrade from Paid ($5/month) to Free
- The `workers.dev` subdomains become dormant (safe — no traffic reaches them anymore)

---

## Self-Review

**Spec coverage:**
- ✅ Remove EXTRACT_FILE_HTTP_ENDPOINT + EXTRACT_URL_HTTP_ENDPOINT + EXTRACT_SECRET → Task 1
- ✅ Simplify engine/index.ts file branch → Task 2 Step 2
- ✅ Simplify engine/index.ts URL branch → Task 2 Step 3
- ✅ Remove remote imports → Task 2 Step 1
- ✅ Delete remote.ts → Task 3
- ✅ Cancel CF Workers plan → Task 4 Step 4
- ✅ Keep CF_AI_GATEWAY_URL untouched → not mentioned = not touched

**Placeholder scan:** None found.

**Type consistency:** `dispatchFile` and `extractUrl` signatures unchanged — the callers pass identical arguments to what the remote branch passed.
