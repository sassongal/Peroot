# Peroot (פירוט)

Peroot is a Hebrew-first prompt engineering playground that transforms raw ideas into structured, high‑quality prompts. The project includes a Next.js web app and product documentation.

## Structure
- `Prut/` – Product docs (PRD, specs, strategy, etc.)
- `Prut/web/` – Next.js app (UI, API routes, prompt engine)

## Local Development
1. Install dependencies
   ```bash
   cd Prut/web
   npm install
   ```
2. Create `.env.local` in `Prut/web` with the required keys:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `GEMINI_API_KEY`
   - any other provider keys you use
3. Run the app
   ```bash
   npm run dev
   ```

## Build
```bash
cd Prut/web
npm run build
npm run start
```

## Notes
- The prompt engine and UI are RTL‑optimized.
- The app uses Supabase for auth, history, and personal library storage.

---
If you need help onboarding or contributing, open an issue or reach out.
