# LLM Access Guide (Peroot)

This repo is private. Use **one** of the following options to grant a model read access.

## Option A — Fine‑grained GitHub token (recommended)
1. GitHub → **Settings** → **Developer settings** → **Personal access tokens** → **Fine‑grained tokens**.
2. Create a token with:
   - **Repository access**: Only the `Peroot` repo
   - **Permissions**: `Contents` → **Read‑only**
3. Copy the token and keep it private.
4. Clone:
   ```bash
   git clone https://<TOKEN>@github.com/sassongal/Peroot.git
   ```

## Option B — Collaborator access
1. GitHub → Repo → **Settings** → **Collaborators** → Add user/bot.
2. Grant **Read** access.
3. The model/tool can clone using its own credentials.

## Option C — GitHub App (advanced)
1. Create a GitHub App with `contents:read`.
2. Install it on the `Peroot` repo.
3. Use the installation token to fetch contents.

## Safety Notes
- **Never** commit tokens into the repo.
- Revoke tokens after use if they’re temporary.
- Use read‑only permissions only.

---
If you need a one‑liner for a model or a tool, share the **Option A** clone URL (without leaking elsewhere).
