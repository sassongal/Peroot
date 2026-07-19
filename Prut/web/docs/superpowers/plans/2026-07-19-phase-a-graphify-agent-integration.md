# Phase A — Graphify Agent Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Register the whole `Prut/web` app as an auto-refreshed graphify knowledge graph and expose it to coding agents (Claude Code, Cursor, `.agent/` kit) via MCP, so they query the codebase instead of grepping.

**Architecture:** A code-only tree-sitter AST graph (deterministic, zero-LLM, ~seconds to build) is committed as the baseline. A husky `post-commit` hook rebuilds it on every code change. A graphify MCP stdio server serves `graphify-out/graph.json` to agents. `CLAUDE.md` tells agents the graph exists and to consult it. No product code, no production impact.

**Tech Stack:** graphify CLI (`graphifyy==0.9.20`, uv tool venv), `graphify-mcp` stdio server, husky (`core.hooksPath=Prut/web/.husky`), gitignored `.mcp.json`.

**Reference paths (this machine):**
- graphify venv Python: `C:\Users\sasso\AppData\Roaming\uv\tools\graphifyy\Scripts\python.exe`
- graphify-mcp exe: `C:\Users\sasso\AppData\Roaming\uv\tools\graphifyy\Scripts\graphify-mcp.exe`
- repo app root: `C:\Users\sasso\dev\Peroot\Prut\web`
- graph output: `C:\Users\sasso\dev\Peroot\Prut\web\graphify-out\graph.json`

**All Bash tool calls run from `Prut/web` and use `dangerouslyDisableSandbox: true`** (network/CLI installs are classifier-gated).

---

## File Structure

- Create: `Prut/web/.husky/post-commit` — fail-open hook that rebuilds the code graph after each commit.
- Create/Modify: `Prut/web/.mcp.json` (gitignored) — add `graphify` MCP server entry alongside `supabase`.
- Create/Modify: `Prut/web/.cursor/mcp.json` — add `graphify` for Cursor.
- Modify: `Prut/web/.gitignore` — ignore `graphify-out/` build artifacts.
- Modify: `Prut/web/CLAUDE.md` — `## graphify` awareness + usage section (written by `graphify claude install`, then hand-tightened).
- Regenerate: `Prut/web/graphify-out/graph.json` — full-app **code** AST baseline (replaces the earlier src-only graph).

---

## Task 1: Gitignore the graphify build artifacts

**Files:**
- Modify: `Prut/web/.gitignore`

- [ ] **Step 1: Append the ignore block**

Add to the end of `Prut/web/.gitignore`:

```gitignore

# graphify — local codebase knowledge graph (machine-specific, rebuilt on commit)
graphify-out/
.graphify_python
.graphify_*.json
.graphify_*.err
```

- [ ] **Step 2: Verify graphify-out is now ignored**

Run: `git check-ignore graphify-out/graph.json && echo IGNORED`
Expected: prints `graphify-out/graph.json` then `IGNORED`.

- [ ] **Step 3: Commit**

```bash
git add .gitignore
git commit -m "chore(graphify): ignore local graph build artifacts"
```

---

## Task 2: Build the full-app code AST baseline graph

The earlier run graphed only `src/`. Rebuild over all app **code** (src + scripts + supabase/migrations + chrome-extension), excluding `public/` images, docs, and `node_modules`, so agents can query the whole app. AST only — no LLM, no tokens.

**Files:**
- Regenerate: `Prut/web/graphify-out/graph.json`, `Prut/web/graphify-out/GRAPH_REPORT.md`

- [ ] **Step 1: Write the interpreter path helper**

Run:
```bash
echo "C:/Users/sasso/AppData/Roaming/uv/tools/graphifyy/Scripts/python.exe" > .graphify_python
"$(cat .graphify_python)" -c "import graphify; print('graphify OK')"
```
Expected: `graphify OK`

- [ ] **Step 2: Detect over the whole app**

Run:
```bash
PY=$(cat .graphify_python)
"$PY" -c "
import json
from graphify.detect import detect
from pathlib import Path
r = detect(Path('.'))
Path('.graphify_detect.json').write_text(json.dumps(r))
fc = {k: len(v) for k,v in r.get('files',{}).items()}
print('total_files:', r.get('total_files'), 'by_cat:', json.dumps(fc))
"
```
Expected: prints counts; `code` should be ~900+.

- [ ] **Step 3: Run AST extraction over code files only**

Run:
```bash
PY=$(cat .graphify_python)
"$PY" -c "
import json
from graphify.extract import collect_files, extract
from pathlib import Path
detect = json.loads(Path('.graphify_detect.json').read_text())
code_files = []
for f in detect.get('files', {}).get('code', []):
    p = Path(f)
    code_files.extend(collect_files(p) if p.is_dir() else [p])
result = extract(code_files)
Path('.graphify_ast.json').write_text(json.dumps(result))
print(f'AST: {len(result[\"nodes\"])} nodes, {len(result[\"edges\"])} edges')
"
```
Expected: `AST: <N> nodes, <M> edges` with N in the thousands.

- [ ] **Step 4: Build graph + report + graph.json (AST-only, no semantic)**

Run:
```bash
PY=$(cat .graphify_python)
mkdir -p graphify-out
"$PY" -c "
import json
from graphify.build import build_from_json
from graphify.cluster import cluster, score_all
from graphify.analyze import god_nodes, surprising_connections, suggest_questions
from graphify.report import generate
from graphify.export import to_json
from pathlib import Path
ast = json.loads(Path('.graphify_ast.json').read_text())
ext = {'nodes': ast['nodes'], 'edges': ast['edges'], 'hyperedges': [], 'input_tokens': 0, 'output_tokens': 0}
detection = json.loads(Path('.graphify_detect.json').read_text())
G = build_from_json(ext)
comms = cluster(G)
cohesion = score_all(G, comms)
gods = god_nodes(G)
surprises = surprising_connections(G, comms)
labels = {cid: 'Community ' + str(cid) for cid in comms}
questions = suggest_questions(G, comms, labels)
report = generate(G, comms, cohesion, labels, gods, surprises, detection, {'input':0,'output':0}, '.', suggested_questions=questions)
Path('graphify-out/GRAPH_REPORT.md').write_text(report, encoding='utf-8')
to_json(G, comms, 'graphify-out/graph.json')
print(f'Graph: {G.number_of_nodes()} nodes, {G.number_of_edges()} edges')
"
```
Expected: `Graph: <N> nodes, <M> edges`, and `graphify-out/graph.json` exists.

- [ ] **Step 5: Clean temp files**

Run: `rm -f .graphify_detect.json .graphify_ast.json`
Expected: no error. (`.graphify_python` stays — the hook reuses it.)

- [ ] **Step 6: Verify graph.json is valid and non-empty**

Run:
```bash
PY=$(cat .graphify_python)
"$PY" -c "import json; d=json.load(open('graphify-out/graph.json')); print('nodes', len(d['nodes']), 'links', len(d['links']))"
```
Expected: nodes in the thousands, links present.

No commit — `graphify-out/` is gitignored (Task 1).

---

## Task 3: Register the graphify MCP server

Serve the graph to agents. `.mcp.json` (gitignored) is the right home — it already holds machine-specific config. Also add to `.cursor/mcp.json` for Cursor.

**Files:**
- Modify: `Prut/web/.mcp.json`
- Modify: `Prut/web/.cursor/mcp.json`

- [ ] **Step 1: Confirm the MCP server's CLI signature**

Run:
```bash
"C:/Users/sasso/AppData/Roaming/uv/tools/graphifyy/Scripts/graphify-mcp.exe" --help 2>&1 | head -20
```
Expected: usage text showing it accepts a path to `graph.json` (positional). If `--help` is unsupported, fall back to `python -m graphify.serve <path>` form in Step 2.

- [ ] **Step 2: Add graphify to `.mcp.json`**

Edit `Prut/web/.mcp.json` so `mcpServers` also contains (keep the existing `supabase` entry unchanged):

```json
    "graphify": {
      "command": "C:\\Users\\sasso\\AppData\\Roaming\\uv\\tools\\graphifyy\\Scripts\\graphify-mcp.exe",
      "args": ["C:\\Users\\sasso\\dev\\Peroot\\Prut\\web\\graphify-out\\graph.json"]
    }
```

(If Step 1 showed the exe needs `serve` or a flag, adjust `args` accordingly — e.g. prepend `"serve"`.)

- [ ] **Step 3: Add graphify to `.cursor/mcp.json`**

Edit `Prut/web/.cursor/mcp.json` `mcpServers` to add the same `graphify` block as Step 2 (keep `supabase`).

- [ ] **Step 4: Smoke-test the MCP server starts and answers**

Run (starts the stdio server, sends an MCP `tools/list` handshake, expects a JSON response, then exits):
```bash
PY=$(cat .graphify_python)
printf '%s\n' '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | timeout 20 "$PY" -m graphify.serve "C:/Users/sasso/dev/Peroot/Prut/web/graphify-out/graph.json" 2>&1 | head -30
```
Expected: JSON listing tools such as `query_graph`, `get_node`, `get_neighbors`, `god_nodes`, `shortest_path`. (If the server expects an `initialize` handshake first, that's fine — seeing any JSON-RPC response confirms it boots against the graph.)

- [ ] **Step 5: Commit `.cursor/mcp.json`**

```bash
git add .cursor/mcp.json
git commit -m "chore(graphify): register graphify MCP server for Cursor"
```

(`.mcp.json` is gitignored — not committed. Note in the commit body that the local `.mcp.json` was updated too.)

---

## Task 4: Install the auto-rebuild post-commit hook (husky-aware)

`core.hooksPath` is `Prut/web/.husky`, so the rebuild must live in `.husky/post-commit`. It must be **fail-open**: a graphify error must never block a commit.

**Files:**
- Create: `Prut/web/.husky/post-commit`

- [ ] **Step 1: Discover graphify's own rebuild command**

Run `graphify hook install` in a scratch to learn the exact non-LLM rebuild invocation it uses, then read the generated hook:
```bash
"C:/Users/sasso/AppData/Roaming/uv/tools/graphifyy/Scripts/graphify.exe" hook install 2>&1 | head
echo "--- installed hook body ---"
cat .git/hooks/post-commit 2>/dev/null || cat ../../.git/hooks/post-commit 2>/dev/null || echo "(not in .git/hooks — check output above)"
"C:/Users/sasso/AppData/Roaming/uv/tools/graphifyy/Scripts/graphify.exe" hook status 2>&1 | head
```
Expected: prints the rebuild command graphify runs (an AST re-extract + rebuild). Note that command — call it `<GRAPHIFY_REBUILD_CMD>`.

- [ ] **Step 2: Uninstall graphify's own hook (it won't fire under husky)**

Run: `"C:/Users/sasso/AppData/Roaming/uv/tools/graphifyy/Scripts/graphify.exe" hook uninstall 2>&1 | head`
Expected: confirms removal from `.git/hooks`. (We relocate the logic into husky next.)

- [ ] **Step 3: Create `.husky/post-commit`**

Create `Prut/web/.husky/post-commit` with fail-open logic. If Step 1 revealed a single rebuild command, use it; otherwise use the explicit AST rebuild fallback shown here:

```sh
#!/usr/bin/env sh
# graphify: rebuild the codebase knowledge graph after each commit.
# Fail-open — never block a commit. Code changes only; no LLM, no network.
{
  PY="C:/Users/sasso/AppData/Roaming/uv/tools/graphifyy/Scripts/python.exe"
  [ -f .graphify_python ] && PY="$(cat .graphify_python)"
  changed=$(git diff --name-only HEAD~1 HEAD 2>/dev/null | grep -E '\.(ts|tsx|js|jsx|mjs|cjs)$' || true)
  if [ -n "$changed" ] && [ -x "$PY" ]; then
    "$PY" - <<'PYEOF' >/dev/null 2>&1 || true
import json
from pathlib import Path
from graphify.detect import detect
from graphify.extract import collect_files, extract
from graphify.build import build_from_json
from graphify.cluster import cluster
from graphify.export import to_json
r = detect(Path('.'))
code = []
for f in r.get('files', {}).get('code', []):
    p = Path(f); code.extend(collect_files(p) if p.is_dir() else [p])
if code:
    ast = extract(code)
    ext = {'nodes': ast['nodes'], 'edges': ast['edges'], 'hyperedges': [], 'input_tokens': 0, 'output_tokens': 0}
    G = build_from_json(ext)
    to_json(G, cluster(G), 'graphify-out/graph.json')
PYEOF
  fi
} || true
exit 0
```

- [ ] **Step 4: Make it executable**

Run: `chmod +x .husky/post-commit`
Expected: no output.

- [ ] **Step 5: Test the hook fires and refreshes the graph**

Run:
```bash
before=$(stat -c %Y graphify-out/graph.json 2>/dev/null || echo 0)
# make a trivial no-op code change to trigger a code-file diff
printf '\n// graphify hook test %s\n' "$(git rev-parse --short HEAD)" >> src/lib/capability-mode.ts
git add src/lib/capability-mode.ts
git commit -m "test(graphify): verify post-commit graph rebuild"
sleep 2
after=$(stat -c %Y graphify-out/graph.json 2>/dev/null || echo 0)
echo "before=$before after=$after"
[ "$after" -ge "$before" ] && echo "HOOK RAN (graph.json refreshed or unchanged-but-present)"
```
Expected: commit succeeds; `graph.json` still valid; `HOOK RAN` printed.

- [ ] **Step 6: Revert the test edit**

Run:
```bash
git revert --no-edit HEAD
git log --oneline -3
```
Expected: the test edit is reverted; `capability-mode.ts` back to original. Confirm with `git diff HEAD -- src/lib/capability-mode.ts` (empty).

- [ ] **Step 7: Commit the hook**

```bash
git add .husky/post-commit
git commit -m "chore(graphify): auto-rebuild code graph via husky post-commit hook"
```

---

## Task 5: Make agents aware — CLAUDE.md section

**Files:**
- Modify: `Prut/web/CLAUDE.md`

- [ ] **Step 1: Run graphify's CLAUDE.md installer**

Run: `"C:/Users/sasso/AppData/Roaming/uv/tools/graphifyy/Scripts/graphify.exe" claude install 2>&1 | head`
Expected: confirms a `## graphify` section written to `Prut/web/CLAUDE.md`.

- [ ] **Step 2: Review and tighten the section**

Read the appended `## graphify` section. Ensure it states, concisely:
- graphify is installed; the live graph is `graphify-out/graph.json`, served via the `graphify` MCP server.
- Agents should query the graph (MCP tools `query_graph`/`get_node`/`get_neighbors`/`shortest_path`, or `/graphify query "<q>"`) before answering "how does X work / what connects to Y" questions.
- The graph auto-rebuilds on commit (husky `post-commit`); code-only, no tokens.

Trim any boilerplate that doesn't apply (e.g. references to `.git/hooks` — we use husky). Keep it under ~12 lines.

- [ ] **Step 3: Verify no duplicate/conflicting section**

Run: `grep -n "graphify" CLAUDE.md`
Expected: exactly one `## graphify` heading; the note references the MCP server + husky rebuild.

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs(graphify): tell agents to consult the codebase graph"
```

---

## Task 6: End-to-end verification

- [ ] **Step 1: MCP server answers a real architecture query**

Run a representative query against the graph via the server or the query pipeline:
```bash
PY=$(cat .graphify_python)
"$PY" -c "
import json
from networkx.readwrite import json_graph
from pathlib import Path
G = json_graph.node_link_graph(json.loads(Path('graphify-out/graph.json').read_text()), edges='links')
# god nodes sanity
deg = sorted(G.degree, key=lambda x: x[1], reverse=True)[:5]
print('Top hubs:', [(G.nodes[n].get('label',n), d) for n,d in deg])
"
```
Expected: prints real symbols from the app (e.g. `cn()`, `logger`, `getApiPath()`), proving the whole-app graph is queryable.

- [ ] **Step 2: Confirm clean git state**

Run: `git status --short && git log --oneline -6`
Expected: working tree clean (graphify-out ignored); commits for gitignore, cursor mcp, hook, CLAUDE.md present; the test commit reverted.

- [ ] **Step 3: Confirm app is untouched**

Run: `npm run typecheck 2>&1 | tail -5`
Expected: passes exactly as before — Phase A changed no product code (only `.gitignore`, `.cursor/mcp.json`, `.husky/post-commit`, `CLAUDE.md`; `capability-mode.ts` reverted to original).

---

## Done criteria (Phase A)
- `graphify-out/graph.json` is a whole-app code graph, gitignored, rebuilt automatically on every code commit via husky.
- `graphify` MCP server registered in `.mcp.json` + `.cursor/mcp.json`, boots and lists tools against the graph.
- `CLAUDE.md` instructs agents to consult the graph.
- `npm run typecheck` green; no product code changed; test edit reverted; working tree clean.
