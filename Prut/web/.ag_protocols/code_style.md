# 🎨 HIVE CODE STYLE & ARCHITECTURE

## 🏗️ CORE STACK

- **Frontend:** Next.js (App Router), Tailwind CSS.
- **Database:** Supabase (PostgreSQL).
- **AI Logic:** Integrated via Agent Engines (src/lib/engines).

## ✍️ WRITING RULES

- **Types:** Strict TypeScript. Interfaces over Types.
- **Naming:** CamelCase for functions, PascalCase for components.
- **Components:** Functional components with specific imports.
- **Error Handling:** Use custom error boundaries (see `src/components/ui/ErrorBoundary.tsx`).

## 🧩 MODULARITY

- Keep logic in `src/lib` and UI in `src/components`.
- Do not mix business logic inside components.
