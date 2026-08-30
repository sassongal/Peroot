import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { CopySetupPrompt } from "@/components/connect/CopySetupPrompt";
import { PEROOT_COMMANDS, CONNECT_CAPABILITIES } from "@/lib/connect/commands";
import {
  ArrowLeft,
  Bot,
  BrainCircuit,
  Image as ImageIcon,
  KeyRound,
  Library,
  MessageSquare,
  Plug,
  Search,
  Sparkles,
  Terminal,
  Video,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Peroot Connect — חבר את Peroot לסוכן ה-AI שלך",
  description:
    "חיבור Peroot ל-Claude, Cursor וכל סוכן AI: פקודות /peroot להפיכת כל בקשה לפרומפט מושלם — טקסט, תמונה, וידאו, מחקר וסוכנים — עם שמירה ותיוג לספרייה האישית.",
};

// Icons per command — the command LIST itself comes from the shared source
// (PEROOT_COMMANDS), so this page cannot drift from what /api/mcp serves.
const COMMAND_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  enhance: Sparkles,
  image: ImageIcon,
  video: Video,
  research: Search,
  agent: Bot,
  save: Library,
  find: Search,
  quota: MessageSquare,
  help: BrainCircuit,
};

const COMMANDS = PEROOT_COMMANDS.map((c) => ({
  cmd: `/peroot:${c.name}`,
  icon: COMMAND_ICONS[c.name] ?? Sparkles,
  desc: c.pageDescription,
}));

const CLAUDE_SNIPPET = `{
  "mcpServers": {
    "peroot": {
      "command": "npx",
      "args": [
        "-y", "mcp-remote",
        "https://www.peroot.space/api/mcp",
        "--header", "Authorization: Bearer prk_live_XXXX"
      ]
    }
  }
}`;

const CURSOR_SNIPPET = `{
  "mcpServers": {
    "peroot": {
      "url": "https://www.peroot.space/api/mcp",
      "headers": { "Authorization": "Bearer prk_live_XXXX" }
    }
  }
}`;

const CURL_SNIPPET = `curl -X POST https://www.peroot.space/api/v1/enhance \\
  -H "Authorization: Bearer prk_live_XXXX" \\
  -H "Content-Type: application/json" \\
  -d '{"prompt": "כתוב פוסט על...", "mode": "STANDARD", "target_model": "claude"}'`;

function Snippet({ title, code, note }: { title: string; code: string; note?: string }) {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-white flex items-center gap-2">
        <Terminal className="w-4 h-4 text-slate-500" />
        {title}
      </h4>
      <pre
        dir="ltr"
        className="p-4 bg-black/40 rounded-xl border border-white/10 font-mono text-xs text-slate-300 overflow-x-auto whitespace-pre"
      >
        {code}
      </pre>
      {note && <p className="text-xs text-slate-500">{note}</p>}
    </div>
  );
}

/**
 * Peroot Connect — public landing + setup guide. Visible to everyone;
 * key creation lives in Settings (authenticated).
 */
export default function ConnectPage() {
  return (
    <main dir="rtl" className="min-h-screen bg-[#080808] text-white">
      <div className="max-w-4xl mx-auto px-4 py-16 space-y-16">
        {/* Hero */}
        <header className="text-center space-y-5">
          <div className="flex justify-center">
            <Image
              src="/Peroot-hero.webp"
              alt="פירוט"
              width={720}
              height={316}
              className="w-full max-w-[280px] h-auto"
              priority
            />
          </div>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm text-slate-300">
            <Plug className="w-4 h-4 text-amber-400" />
            Peroot Connect
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold leading-tight">
            המוח של Peroot,
            <br />
            בתוך הסוכן שלך
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto text-lg">
            חבר את Claude, Cursor או כל סוכן AI ל-Peroot — וכל בקשה הופכת לפרומפט מושלם ומורחב:
            טקסט, תמונה, וידאו, מחקר וסוכנים. עם הזיכרון האישי שלך, הסקילים לכל פלטפורמה, והספרייה
            שלך — מכל מקום.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Link
              href="/settings?tab=connect"
              className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl transition-colors"
            >
              <KeyRound className="w-4 h-4" />
              צור מפתח חיבור
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 text-slate-200 font-medium rounded-xl border border-white/10 transition-colors"
            >
              לשדרוג ל-PRO
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </div>
          <p className="text-xs text-slate-500">
            זמין לכל משתמש רשום — השדרוגים נספרים מהמכסה הרגילה: חינמי 1 ליום · PRO 150 לחודש
          </p>
        </header>

        {/* Why */}
        <section className="grid sm:grid-cols-3 gap-4">
          {[
            {
              icon: BrainCircuit,
              title: "מוח אחד, בכל מקום",
              desc: "העובדות האישיות, הסגנון והספרייה שלך מלווים כל שדרוג — גם דרך הסוכן",
            },
            {
              icon: Sparkles,
              title: "סקילים לכל פלטפורמה",
              desc: "הפרומפט יוצא מותאם ליעד: Midjourney, Sora, ChatGPT, Claude, Gemini ועוד",
            },
            {
              icon: Library,
              title: "הכל נשמר אצלך",
              desc: "ביקשת לשמור? הפרומפט מתויג ונכנס לספרייה ול-Memory Palace שלך",
            },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="p-5 bg-white/5 rounded-xl border border-white/10 space-y-2">
              <Icon className="w-5 h-5 text-amber-400" />
              <h3 className="font-semibold text-white">{title}</h3>
              <p className="text-sm text-slate-400">{desc}</p>
            </div>
          ))}
        </section>

        {/* Commands */}
        <section className="space-y-5">
          <h2 className="text-2xl font-bold text-center">הפקודות</h2>
          <p className="text-sm text-slate-400 text-center">
            אחרי החיבור, הסוכן שלך מכיר את משפחת הפקודות של Peroot:
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            {COMMANDS.map(({ cmd, icon: Icon, desc }) => (
              <div
                key={cmd}
                className="flex items-center gap-3 p-4 bg-white/5 rounded-xl border border-white/10"
              >
                <Icon className="w-4 h-4 text-amber-400 shrink-0" />
                <div className="min-w-0">
                  <code dir="ltr" className="text-sm font-mono text-amber-300">
                    {cmd}
                  </code>
                  <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-500 text-center">
            אפשר גם בשפה חופשית — ״שדרג לי את זה דרך Peroot לוידאו, מותאם לקלוד״ — והסוכן כבר ידע
            לבחור את המוד ואת מודל היעד.
          </p>
        </section>

        {/* Full capability surface — beyond the commands */}
        <section className="space-y-5">
          <h2 className="text-2xl font-bold text-center">ומעבר לפקודות — כל מה שהסוכן מקבל</h2>
          <p className="text-sm text-slate-400 text-center">
            14 כלים עומדים לרשות הסוכן המחובר. השדרוג צורך קרדיט מהמכסה — כל השאר חינם:
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {CONNECT_CAPABILITIES.map(({ title, desc }) => (
              <div
                key={title}
                className="p-4 bg-white/5 rounded-xl border border-white/10 space-y-1"
              >
                <h3 className="text-sm font-semibold text-white">{title}</h3>
                <p className="text-xs text-slate-400">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Setup */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold text-center">איך מתחברים</h2>
          <div className="p-5 bg-amber-500/10 border border-amber-500/25 rounded-xl flex flex-col sm:flex-row items-center gap-4 justify-between">
            <p className="text-sm text-slate-300 text-center sm:text-right">
              <span className="font-semibold text-amber-300">הדרך המהירה:</span> העתק פרומפט חיבור
              מוכן, הדבק אצל הסוכן שלך — והוא כבר יידע להתחבר ל-Peroot לבד.
            </p>
            <CopySetupPrompt className="shrink-0" />
          </div>
          <ol className="grid sm:grid-cols-3 gap-4 text-sm">
            {[
              ["צור מפתח", "בהגדרות → Peroot Connect. המפתח מוצג פעם אחת — שמור אותו"],
              ["הדבק את ההגדרות", "בחר את הכלי שלך למטה והדבק את קטע ההגדרה עם המפתח"],
              ["דבר עם הסוכן", "הקלד /peroot:enhance או פשוט בקש ממנו לשדרג דרך Peroot"],
            ].map(([title, desc], i) => (
              <li
                key={title}
                className="p-4 bg-white/5 rounded-xl border border-white/10 space-y-2"
              >
                <span className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-sm font-bold">
                  {i + 1}
                </span>
                <h3 className="font-semibold text-white">{title}</h3>
                <p className="text-slate-400 text-xs">{desc}</p>
              </li>
            ))}
          </ol>
          <div className="space-y-6">
            <Snippet
              title="Claude Desktop  (claude_desktop_config.json)"
              code={CLAUDE_SNIPPET}
              note="שמור, הפעל מחדש את Claude Desktop, וחפש את peroot ברשימת הכלים."
            />
            <Snippet title="Cursor  (~/.cursor/mcp.json)" code={CURSOR_SNIPPET} />
            <Snippet
              title="REST API  (כל שפה, כל כלי)"
              code={CURL_SNIPPET}
              note="mode: STANDARD / DEEP_RESEARCH / IMAGE_GENERATION / VIDEO_GENERATION / AGENT_BUILDER · target_model: chatgpt / claude / gemini / general"
            />
          </div>
          <p className="text-xs text-slate-500 text-center">
            מתחברים מ-claude.ai או ChatGPT? הוסיפו קונקטור עם הכתובת
            https://www.peroot.space/api/mcp — האישור נעשה בחלון התחברות של Peroot (OAuth, ללא
            מפתח).{" "}
            <Link href="/connect/docs" className="text-amber-400/80 hover:text-amber-300">
              לתיעוד ה-API המלא ←
            </Link>
          </p>
        </section>

        {/* Bottom CTA */}
        <section className="text-center p-8 bg-white/5 rounded-2xl border border-white/10 space-y-4">
          <h2 className="text-xl font-bold">מוכן לחבר?</h2>
          <p className="text-sm text-slate-400">
            דקה אחת של הגדרה — וכל סוכן שלך כותב פרומפטים ברמה של Peroot.
          </p>
          <Link
            href="/settings?tab=connect"
            className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl transition-colors"
          >
            <Plug className="w-4 h-4" />
            להתחלה
          </Link>
        </section>
      </div>
    </main>
  );
}
