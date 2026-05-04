"use client";

import { useRef, useState, useMemo } from "react";
import MiniSearch from "minisearch";
import { Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { FAQ_ITEMS } from "@/lib/faq-data";

type FAQItem = { question: string; answer: string; category: string };
type Message = {
  role: "user" | "assistant";
  content: string;
  sources?: FAQItem[];
};

const SCORE_THRESHOLD = 0.3;
const FALLBACK_MSG =
  "לא מצאתי מידע על זה בתוכן העזרה. אשמח אם תפנה/י לדף יצירת קשר: peroot.space/contact";
const WELCOME_MSG = "שלום! אני כאן לעזור עם כל שאלה על Peroot. שאל/י חופשי!";

export function FAQChatBot() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: WELCOME_MSG },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const searchIndex = useMemo(() => {
    const index = new MiniSearch<FAQItem & { id: number }>({
      fields: ["question", "answer", "category"],
      storeFields: ["question", "answer", "category"],
      searchOptions: {
        boost: { question: 2, category: 1.5 },
        fuzzy: 0.2,
        prefix: true,
      },
    });
    index.addAll(FAQ_ITEMS.map((item, i) => ({ id: i, ...item })));
    return index;
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = input.trim();
    if (!q || isLoading) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: q }]);
    setIsLoading(true);

    const results = searchIndex.search(q) as unknown as (FAQItem & {
      id: number;
      score: number;
    })[];
    const top3 = results.slice(0, 3);
    const maxScore = top3[0]?.score ?? 0;

    if (maxScore < SCORE_THRESHOLD) {
      setMessages((prev) => [...prev, { role: "assistant", content: FALLBACK_MSG, sources: [] }]);
      setIsLoading(false);
      scrollToBottom();
      return;
    }

    const context = top3.map(({ question, answer, category }) => ({
      question,
      answer,
      category,
    }));

    // Add placeholder assistant message for streaming
    setMessages((prev) => [...prev, { role: "assistant", content: "", sources: context }]);

    try {
      const res = await fetch("/api/faq-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, context }),
      });

      if (!res.ok || !res.body) {
        throw new Error("API error");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          assistantText += decoder.decode(value, { stream: true });
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              role: "assistant",
              content: assistantText,
              sources: context,
            };
            return updated;
          });
        }
      } finally {
        reader.releaseLock();
      }
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: "משהו השתבש. נסה שוב או צור קשר.",
          sources: [],
        };
        return updated;
      });
    } finally {
      setIsLoading(false);
      scrollToBottom();
    }
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden min-h-0">
      {/* Message thread */}
      <div
        className="flex-1 overflow-y-auto px-4 py-3 space-y-4 min-h-0 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent hover:scrollbar-thumb-white/20"
        dir="rtl"
      >
        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn(
              "flex flex-col gap-1.5",
              msg.role === "user" ? "items-end" : "items-start",
            )}
          >
            <div
              className={cn(
                "max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed",
                msg.role === "user"
                  ? "bg-slate-900 dark:bg-white text-white dark:text-black rounded-br-sm"
                  : "bg-black/5 dark:bg-white/10 text-(--text-primary) rounded-bl-sm border border-(--glass-border)",
              )}
            >
              {msg.content ||
                (isLoading && i === messages.length - 1 ? (
                  <span className="opacity-50">מקליד...</span>
                ) : null)}
            </div>
            {msg.sources && msg.sources.length > 0 && (
              <div className="flex flex-wrap gap-1 px-1 items-center">
                <span className="text-xs text-(--text-muted)">מבוסס על:</span>
                {msg.sources.map((s, si) => (
                  <span
                    key={si}
                    className="text-xs bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/20"
                  >
                    {s.category}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 px-4 py-3 border-t border-(--glass-border) bg-(--glass-bg)"
        dir="rtl"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="שאל/י כאן..."
          disabled={isLoading}
          className="flex-1 bg-transparent text-sm text-(--text-primary) placeholder:text-(--text-muted) focus:outline-none"
          dir="rtl"
          aria-label="שאלה לעוזר"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="p-2 rounded-full bg-slate-900 dark:bg-white text-white dark:text-black disabled:opacity-40 transition-all hover:scale-105 focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none"
          aria-label="שלח"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
