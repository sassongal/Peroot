"use client";

import { Copy, Check, ChevronDown, Plus, Pencil, ArrowRight, BookOpen, Search, Trash2, History, Star, GripVertical, X, Wand2 } from "lucide-react";
import { useEffect, useMemo, useState, useRef, DragEvent, Children, isValidElement, cloneElement, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { scorePrompt } from "@/lib/prompt-engine";
import ReactMarkdown from 'react-markdown';
import { Toaster, toast } from 'sonner';
import { useHistory, HistoryItem } from "@/hooks/useHistory";
import { useLibrary, PersonalPrompt } from "@/hooks/useLibrary";
import { useFavorites } from "@/hooks/useFavorites";
import { UserMenu } from "@/components/layout/user-nav";
import { formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';
import Link from "next/link";
import promptsData from "../../prompts.he.json";

// Types
type Question = {
  id?: number;
  question: string;
  description: string;
  examples: string[];
};

type LibraryPrompt = {
  id: string;
  title_he: string;
  category: string;
  use_case: string;
  prompt_he: string;
  variables: string[];
  output_format: string;
  quality_checks: string[];
  source: {
    name: string;
    url: string;
    license: string;
    license_url: string;
    restricted: boolean;
    reference: string;
  };
};



// const TONES = ["Professional", "Casual", "Sales", "Direct"];
const CATEGORY_OPTIONS = [
  { id: "General", label: "כללי" },
  { id: "Marketing", label: "שיווק" },
  { id: "Sales", label: "מכירות" },
  { id: "CustomerSupport", label: "תמיכה" },
  { id: "Product", label: "מוצר" },
  { id: "Operations", label: "תפעול" },
  { id: "HR", label: "משאבי אנוש" },
  { id: "Dev", label: "פיתוח" },
  { id: "Education", label: "חינוך" },
  { id: "Legal", label: "משפטי" },
  { id: "Creative", label: "קריאייטיב" },
  { id: "Social", label: "סושיאל" },
  { id: "Finance", label: "פיננסים" },
  { id: "Healthcare", label: "בריאות" },
  { id: "Ecommerce", label: "אי־קומרס" },
  { id: "RealEstate", label: "נדל\"ן" },
  { id: "Strategy", label: "אסטרטגיה" },
  { id: "Design", label: "עיצוב" },
  { id: "Data", label: "דאטה" },
  { id: "Automation", label: "אוטומציה" },
  { id: "Community", label: "קהילה" },
  { id: "Nonprofit", label: "מלכ\"ר" },
];

const CATEGORY_LABELS: Record<string, string> = {
  Marketing: "שיווק",
  Sales: "מכירות",
  CustomerSupport: "תמיכה",
  Product: "מוצר",
  Operations: "תפעול",
  HR: "משאבי אנוש",
  Dev: "פיתוח",
  Education: "חינוך",
  Legal: "משפטי",
  Creative: "קריאייטיב",
  Social: "סושיאל",
  General: "כללי",
  Finance: "פיננסים",
  Healthcare: "בריאות",
  Ecommerce: "אי־קומרס",
  RealEstate: "נדל\"ן",
  Strategy: "אסטרטגיה",
  Design: "עיצוב",
  Data: "דאטה",
  Automation: "אוטומציה",
  Community: "קהילה",
  Nonprofit: "מלכ\"ר",
};

const PERSONAL_DEFAULT_CATEGORY = "כללי";
const USAGE_STORAGE_KEY = "peroot_prompt_usage_v1";
const PLACEHOLDER_REGEX = /{[^}]+}/g;
const QUICK_ACTIONS = [
  { label: "קצר יותר", instruction: "קצר יותר. שמור על המבנה והדגשים המרכזיים." },
  { label: "יותר אסרטיבי", instruction: "יותר אסרטיבי, ישיר וממוקד תוצאה." },
  { label: "יותר פרקטי", instruction: "יותר פרקטי, עם צעדים מדידים ודוגמאות קצרות." },
];

type PromptUsage = {
  copies?: number;
  saves?: number;
  refinements?: number;
};

const PLACEHOLDER_SUGGESTIONS: Array<{ pattern: RegExp; suggestions: string[] }> = [
  { pattern: /קהל|audience|persona/i, suggestions: ["מנהלי שיווק B2B", "בעלי עסקים קטנים", "סטודנטים"] },
  { pattern: /מטרה|goal|objective|יעד/i, suggestions: ["להגדיל הרשמות", "לשכנע לרכישה", "להסביר תהליך"] },
  { pattern: /פורמט|format|מבנה|output/i, suggestions: ["רשימה של 5 נקודות", "טבלה קצרה", "פסקה אחת"] },
  { pattern: /טון|tone|סגנון|style/i, suggestions: ["אסרטיבי", "ידידותי", "מקצועי"] },
  { pattern: /ערוץ|channel|פלטפורמה|platform/i, suggestions: ["לינקדאין", "מייל", "וואטסאפ"] },
  { pattern: /זמן|timeline|תאריך|דדליין/i, suggestions: ["שבועיים", "עד יום חמישי", "סוף החודש"] },
  { pattern: /תקציב|budget/i, suggestions: ["₪2,000", "₪10,000", "גמיש"] },
];

const highlightTextWithPlaceholders = (text: string): ReactNode[] => {
  const matches = Array.from(text.matchAll(PLACEHOLDER_REGEX));
  if (matches.length === 0) return [text];

  const parts: ReactNode[] = [];
  let cursor = 0;
  matches.forEach((match, index) => {
    const start = match.index ?? 0;
    if (start > cursor) {
      parts.push(text.slice(cursor, start));
    }
    const token = match[0];
    parts.push(
      <span
        key={`ph-${start}-${index}`}
        className="inline-flex items-center rounded-md border border-sky-400/40 bg-sky-400/10 px-1.5 py-0.5 text-[0.8em] text-sky-200"
      >
        {token}
      </span>
    );
    cursor = start + token.length;
  });
  if (cursor < text.length) {
    parts.push(text.slice(cursor));
  }
  return parts;
};

const highlightPlaceholders = (children: ReactNode): ReactNode =>
  Children.map(children, (child) => {
    if (typeof child === "string") return highlightTextWithPlaceholders(child);
    if (isValidElement(child)) {
      const nodeType = child.type;
      if (typeof nodeType === "string" && (nodeType === "code" || nodeType === "pre")) {
        return child;
      }
      if (child.props?.children) {
        return cloneElement(child, {
          ...child.props,
          children: highlightPlaceholders(child.props.children),
        });
      }
    }
    return child;
  });

const markdownComponents = {
  p: ({ children, ...props }: { children?: ReactNode }) => (
    <p {...props}>{highlightPlaceholders(children)}</p>
  ),
  li: ({ children, ...props }: { children?: ReactNode }) => (
    <li {...props}>{highlightPlaceholders(children)}</li>
  ),
  h1: ({ children, ...props }: { children?: ReactNode }) => (
    <h1 {...props}>{highlightPlaceholders(children)}</h1>
  ),
  h2: ({ children, ...props }: { children?: ReactNode }) => (
    <h2 {...props}>{highlightPlaceholders(children)}</h2>
  ),
  h3: ({ children, ...props }: { children?: ReactNode }) => (
    <h3 {...props}>{highlightPlaceholders(children)}</h3>
  ),
  h4: ({ children, ...props }: { children?: ReactNode }) => (
    <h4 {...props}>{highlightPlaceholders(children)}</h4>
  ),
};

const extractPlaceholders = (text: string): string[] => {
  const matches = text.match(PLACEHOLDER_REGEX) || [];
  const unique = new Set(matches.map((match) => match.replace(/[{}]/g, "").trim()));
  return Array.from(unique).filter(Boolean);
};

const getPlaceholderSuggestions = (placeholder: string): string[] => {
  const normalized = placeholder.toLowerCase();
  const hit = PLACEHOLDER_SUGGESTIONS.find((item) => item.pattern.test(normalized));
  return hit ? hit.suggestions : ["פרט מדויק", "דוגמה קצרה", "גבולות ברורים"];
};

const STYLE_STORAGE_KEY = "peroot_prompt_styles_v1";
const STYLE_TOKEN_REGEX = /\[\[(\/?)(c|hl)(?::([a-z]+))?\]\]/g;
const STYLE_TEXT_COLORS: Record<string, string> = {
  red: "text-red-300",
  amber: "text-amber-300",
  emerald: "text-emerald-300",
  blue: "text-sky-300",
  violet: "text-violet-300",
  slate: "text-slate-200",
};
const STYLE_HIGHLIGHT_COLORS: Record<string, string> = {
  yellow: "bg-yellow-400/20 text-yellow-200",
  pink: "bg-pink-400/20 text-pink-200",
  green: "bg-emerald-400/20 text-emerald-200",
  blue: "bg-sky-400/20 text-sky-200",
  violet: "bg-violet-400/20 text-violet-200",
};

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const stripStyleTokens = (value: string) =>
  value.replace(STYLE_TOKEN_REGEX, "");

const toStyledHtml = (value: string) => {
  const escaped = escapeHtml(value);
  const withTokens = escaped
    .replace(/\[\[c:([a-z]+)\]\]/g, (_, color) => {
      const className = STYLE_TEXT_COLORS[color] ?? STYLE_TEXT_COLORS.slate;
      return `<span class="${className}">`;
    })
    .replace(/\[\[hl:([a-z]+)\]\]/g, (_, color) => {
      const className = STYLE_HIGHLIGHT_COLORS[color] ?? STYLE_HIGHLIGHT_COLORS.yellow;
      return `<span class="${className}">`;
    })
    .replace(/\[\[\/c\]\]/g, "</span>")
    .replace(/\[\[\/hl\]\]/g, "</span>");

  return withTokens
    .replace(PLACEHOLDER_REGEX, (match) => `<span class="text-sky-300 font-semibold">${match}</span>`)
    .replace(/\n/g, "<br />");
};

const getPromptKey = (text: string) => {
  const normalized = text.trim().slice(0, 500);
  if (!normalized) return "empty";
  let hash = 0;
  for (let i = 0; i < normalized.length; i += 1) {
    hash = (hash * 31 + normalized.charCodeAt(i)) | 0;
  }
  return `${Math.abs(hash)}:${normalized.length}`;
};

export default function Home() {
  const { history, addToHistory, clearHistory, isLoaded, user } = useHistory();
  const { 
    personalLibrary, 
    personalCategories, 
    addPrompt, 
    removePrompt, 
    updateCategory: updateItemCategory, 
    incrementUseCount,
    updatePrompt,
    updatePromptContent,
    reorderPrompts,
    movePrompt,
    renameCategory,
    addCategory: addLibCategory
  } = useLibrary();
  const { favoriteLibraryIds, favoritePersonalIds, toggleFavorite } = useFavorites();

  const [selectedTone, setSelectedTone] = useState("Professional");
  const [selectedCategory, setSelectedCategory] = useState("General");
  const [inputVal, setInputVal] = useState("");
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);
  const inputTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [viewMode, setViewMode] = useState<"home" | "library" | "personal">("home");
  const [libraryQuery, setLibraryQuery] = useState("");
  const [personalQuery, setPersonalQuery] = useState("");
  const [newPersonalCategory, setNewPersonalCategory] = useState("");
  const [personalSort, setPersonalSort] = useState<"recent" | "title" | "usage" | "custom">("recent");
  const [personalView, setPersonalView] = useState<"all" | "favorites">("all");
  const [editingPersonalId, setEditingPersonalId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingUseCase, setEditingUseCase] = useState("");
  const [renamingCategory, setRenamingCategory] = useState<string | null>(null);
  const [renameCategoryInput, setRenameCategoryInput] = useState("");
  const [draggingPersonalId, setDraggingPersonalId] = useState<string | null>(null);
  const [draggingPersonalCategory, setDraggingPersonalCategory] = useState<string | null>(null);
  const [dragOverPersonalId, setDragOverPersonalId] = useState<string | null>(null);
  
  const [popularityMap, setPopularityMap] = useState<Record<string, number>>({});
  const [hasHydrated, setHasHydrated] = useState(false);
  const [usageMap, setUsageMap] = useState<Record<string, PromptUsage>>({});
  const [remoteUsageMap, setRemoteUsageMap] = useState<Record<string, PromptUsage>>({});
  const [promptStyles, setPromptStyles] = useState<Record<string, string>>({});
  const [editingStylePromptId, setEditingStylePromptId] = useState<string | null>(null);
  const [styleDraft, setStyleDraft] = useState("");
  const styleTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  
  // State for Structured Output
  const [completion, setCompletion] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [detectedCategory, setDetectedCategory] = useState("");
  const [questionAnswers, setQuestionAnswers] = useState<Record<number, string>>({});
  
  const [isLoading, setIsLoading] = useState(false);
  const [refinementInput, setRefinementInput] = useState("");
  
  // Accordion State
  const [openQuestionId, setOpenQuestionId] = useState<number | null>(0); // Default open first

  const libraryPrompts = promptsData as LibraryPrompt[];
  const mergeUsage = (local?: PromptUsage, remote?: PromptUsage) => ({
    copies: (local?.copies ?? 0) + (remote?.copies ?? 0),
    saves: (local?.saves ?? 0) + (remote?.saves ?? 0),
    refinements: (local?.refinements ?? 0) + (remote?.refinements ?? 0),
  });
  const inputKey = useMemo(() => getPromptKey(inputVal), [inputVal]);
  const completionKey = useMemo(() => getPromptKey(completion), [completion]);
  const inputScore = useMemo(
    () => scorePrompt(inputVal, usageMap[inputKey]),
    [inputVal, usageMap, inputKey]
  );
  const completionScore = useMemo(
    () => scorePrompt(completion, mergeUsage(usageMap[completionKey], remoteUsageMap[completionKey])),
    [completion, usageMap, remoteUsageMap, completionKey]
  );
  const improvementDelta = useMemo(
    () => (completion ? completionScore.baseScore - inputScore.baseScore : 0),
    [completion, completionScore.baseScore, inputScore.baseScore]
  );
  const placeholders = useMemo(() => extractPlaceholders(completion), [completion]);
  const scoreTone =
    inputScore.level === "high"
      ? { text: "text-emerald-400", bar: "bg-emerald-500" }
      : inputScore.level === "medium"
        ? { text: "text-yellow-400", bar: "bg-yellow-500" }
        : inputScore.level === "low"
          ? { text: "text-red-400", bar: "bg-red-500" }
          : { text: "text-slate-500", bar: "bg-slate-600" };
  const styleStorageKey = useMemo(
    () => (user?.id ? `${STYLE_STORAGE_KEY}_${user.id}` : STYLE_STORAGE_KEY),
    [user?.id]
  );

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem(USAGE_STORAGE_KEY);
      if (stored) {
        setUsageMap(JSON.parse(stored));
      }
    } catch (error) {
      console.warn("Failed to load usage calibration", error);
    }
  }, []);

  useEffect(() => {
    const textarea = inputTextareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [inputVal]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem(styleStorageKey);
      if (stored) {
        setPromptStyles(JSON.parse(stored));
      } else {
        setPromptStyles({});
      }
    } catch (error) {
      console.warn("Failed to load prompt styles", error);
    }
  }, [styleStorageKey]);

  useEffect(() => {
    if (!user) return;
    const next: Record<string, string> = {};
    personalLibrary.forEach((prompt) => {
      if (prompt.prompt_style) {
        next[prompt.id] = prompt.prompt_style;
      }
    });
    if (Object.keys(next).length > 0) {
      setPromptStyles(next);
    }
  }, [user, personalLibrary]);

  useEffect(() => {
    let isMounted = true;
    const loadPopularity = async () => {
      try {
        const response = await fetch("/api/library-popularity", { cache: "no-store" });
        if (!response.ok) throw new Error(`Failed to load popularity: ${response.status}`);
        const data = await response.json();
        if (!data?.popularity) return;

        if (isMounted) {
          setPopularityMap((prev) => ({ ...prev, ...data.popularity }));
        }
      } catch (error) {
        console.warn("Failed to load popularity map", error);
      }
    };
    loadPopularity();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    const key = completionKey;
    if (!completion || key === "empty") return;
    const controller = new AbortController();
    const loadUsage = async () => {
      try {
        const response = await fetch(`/api/prompt-usage?key=${encodeURIComponent(key)}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!response.ok) return;
        const data = await response.json();
        if (!data) return;
        setRemoteUsageMap((prev) => ({
          ...prev,
          [key]: {
            copies: data.copies ?? 0,
            saves: data.saves ?? 0,
            refinements: data.refinements ?? 0,
          },
        }));
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          console.warn("Failed to load remote usage", error);
        }
      }
    };
    loadUsage();
    return () => controller.abort();
  }, [completion, completionKey]);

  const recordUsageSignal = (type: "copy" | "save" | "refine", text: string) => {
    const target = text.trim();
    if (!target) return;
    const key = getPromptKey(target);
    void fetch("/api/prompt-usage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt_key: key,
        event_type: type,
        prompt_length: target.length,
      }),
    }).catch(() => {});
    setUsageMap((prev) => {
      const current = prev[key] ?? { copies: 0, saves: 0, refinements: 0 };
      const next = {
        ...current,
        copies: current.copies ?? 0,
        saves: current.saves ?? 0,
        refinements: current.refinements ?? 0,
      };
      if (type === "copy") next.copies += 1;
      if (type === "save") next.saves += 1;
      if (type === "refine") next.refinements += 1;
      const updated = { ...prev, [key]: next };
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(USAGE_STORAGE_KEY, JSON.stringify(updated));
        } catch (error) {
          console.warn("Failed to persist usage calibration", error);
        }
      }
      return updated;
    });
  };

  const persistPromptStyles = (next: Record<string, string>) => {
    setPromptStyles(next);
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(styleStorageKey, JSON.stringify(next));
    } catch (error) {
      console.warn("Failed to persist prompt styles", error);
    }
  };

  const openStyleEditor = (prompt: PersonalPrompt) => {
    setEditingStylePromptId(prompt.id);
    setStyleDraft(promptStyles[prompt.id] ?? prompt.prompt_style ?? prompt.prompt_he);
    setTimeout(() => styleTextareaRef.current?.focus(), 0);
  };

  const closeStyleEditor = () => {
    setEditingStylePromptId(null);
    setStyleDraft("");
  };

  const applyStyleToken = (type: "c" | "hl", color: string) => {
    const textarea = styleTextareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart ?? 0;
    const end = textarea.selectionEnd ?? 0;
    if (start === end) return;
    const open = `[[${type}:${color}]]`;
    const close = `[[/${type}]]`;
    const before = styleDraft.slice(0, start);
    const selected = styleDraft.slice(start, end);
    const after = styleDraft.slice(end);
    const next = `${before}${open}${selected}${close}${after}`;
    setStyleDraft(next);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.selectionStart = start + open.length;
      textarea.selectionEnd = end + open.length;
    });
  };

  const clearStyleTokens = () => {
    setStyleDraft(stripStyleTokens(styleDraft));
  };

  const saveStylePrompt = async (promptId: string) => {
    const plain = stripStyleTokens(styleDraft).trim();
    if (plain) {
      await updatePromptContent(promptId, plain, styleDraft);
    }
    persistPromptStyles({ ...promptStyles, [promptId]: styleDraft });
    closeStyleEditor();
    toast.success("העיצוב נשמר");
  };

  const getStyledPromptMarkup = (prompt: PersonalPrompt) =>
    promptStyles[prompt.id] ?? prompt.prompt_style ?? prompt.prompt_he;

  const variables = useMemo(() => extractPlaceholders(inputVal), [inputVal]);
  const variablesKey = useMemo(() => variables.join("|"), [variables]);

  useEffect(() => {
    setVariableValues((prev) => {
      const next: Record<string, string> = {};
      variables.forEach((variable) => {
        next[variable] = prev[variable] ?? "";
      });
      return next;
    });
  }, [variablesKey]);

  const applyVariablesToPrompt = () => {
    if (variables.length === 0) return;
    let next = inputVal;
    variables.forEach((variable) => {
      const value = variableValues[variable]?.trim();
      if (!value) return;
      const pattern = new RegExp(`\\{\\s*${escapeRegExp(variable)}\\s*\\}`, "g");
      next = next.replace(pattern, value);
    });
    setInputVal(next);
  };

  const filteredLibrary = useMemo(() => {
    const query = libraryQuery.trim().toLowerCase();
    if (!query) return libraryPrompts;
    return libraryPrompts.filter((prompt) => 
      [prompt.title_he, prompt.use_case, prompt.category, prompt.prompt_he]
        .join(" ").toLowerCase().includes(query)
    );
  }, [libraryPrompts, libraryQuery]);

  const getUpdatedAt = (prompt: PersonalPrompt) => {
    if (typeof prompt.updated_at === "number") return prompt.updated_at;
    if (typeof prompt.updated_at === "string") {
      const parsed = Date.parse(prompt.updated_at);
      return Number.isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  };

  const getSortIndex = (prompt: PersonalPrompt) =>
    typeof prompt.sort_index === "number" ? prompt.sort_index : 0;

  const filteredPersonalLibrary = useMemo(() => {
    const query = personalQuery.trim().toLowerCase();
    let result = [...personalLibrary];
    
    if (query) {
      result = result.filter(p => 
        [p.title_he, p.prompt_he, p.use_case, p.personal_category]
          .join(" ").toLowerCase().includes(query)
      );
    }

    if (personalSort === "title") {
      result.sort((a, b) => a.title_he.localeCompare(b.title_he));
    } else if (personalSort === "usage") {
      result.sort((a, b) => {
        const diff = b.use_count - a.use_count;
        return diff !== 0 ? diff : getUpdatedAt(b) - getUpdatedAt(a);
      });
    } else if (personalSort === "custom") {
      result.sort((a, b) => {
        const diff = getSortIndex(a) - getSortIndex(b);
        return diff !== 0 ? diff : getUpdatedAt(b) - getUpdatedAt(a);
      });
    } else {
      result.sort((a, b) => getUpdatedAt(b) - getUpdatedAt(a));
    }

    return result;
  }, [personalLibrary, personalQuery, personalSort]);

  const handleEnhance = async () => {
    if (!inputVal.trim()) return;
    setIsLoading(true);
    setCompletion("");
    setQuestions([]);
    setQuestionAnswers({});
    try {
      const response = await fetch("/api/enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: inputVal, tone: selectedTone, category: selectedCategory }),
      });
      if (!response.ok) throw new Error("Failed to enhance prompt");
      const data = await response.json();
      const nextQuestions = data.clarifying_questions || [];
      setCompletion(data.great_prompt);
      setQuestions(nextQuestions);
      setQuestionAnswers({});
      setDetectedCategory(data.category || selectedCategory);
      setOpenQuestionId(nextQuestions.length > 0 ? 0 : null);
      addToHistory({
        original: inputVal,
        enhanced: data.great_prompt,
        tone: selectedTone,
        category: data.category || selectedCategory,
      });
      toast.success("הפרומפט שופר!");
    } catch (error) {
      toast.error("שגיאה בשיפור הפרומפט");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefine = async (instruction: string) => {
    if (!instruction.trim() || !completion) return;
    setIsLoading(true);
    try {
      const response = await fetch("/api/enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: inputVal,
          tone: selectedTone,
          category: selectedCategory,
          previousResult: completion,
          refinementInstruction: instruction,
        }),
      });
      if (!response.ok) throw new Error("Failed to refine prompt");
      const data = await response.json();
      setCompletion(data.great_prompt);
      recordUsageSignal("refine", data.great_prompt);
      if (data.clarifying_questions?.length > 0) {
        setQuestions(data.clarifying_questions);
        setQuestionAnswers({});
        setOpenQuestionId(0);
      } else {
        setQuestions([]);
        setQuestionAnswers({});
        setOpenQuestionId(null);
      }
      setRefinementInput("");
      toast.success("הפרומפט עודכן!");
    } catch (error) {
      toast.error("שגיאה בעדכון הפרומפט");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyText = async (text: string, message = "הועתק ללוח!") => {
    await navigator.clipboard.writeText(text);
    toast.success(message);
  };

  const handleCopy = async () => {
    if (!completion) return;
    await handleCopyText(completion, "הועתק ללוח!");
    recordUsageSignal("copy", completion);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRestore = (item: HistoryItem) => {
    setInputVal(item.original);
    setSelectedTone(item.tone);
    setSelectedCategory(item.category);
    setCompletion(item.enhanced);
    setQuestions([]);
    toast.success("הפרומפט שוחזר");
  };

  const addPersonalPromptFromHistory = (item: HistoryItem) => {
    addPrompt({
      title_he: item.original.slice(0, 30) + (item.original.length > 30 ? "..." : ""),
      prompt_he: item.enhanced,
      category: item.category,
      personal_category: PERSONAL_DEFAULT_CATEGORY,
      use_case: "נשמר מהיסטוריה",
      source: "manual"
    });
    recordUsageSignal("save", item.enhanced);
    toast.success("נשמר לספריה האישית!");
  };

  const saveCompletionToPersonal = () => {
    if (!completion.trim()) return;
    addPrompt({
      title_he: inputVal.slice(0, 30) + (inputVal.length > 30 ? "..." : ""),
      prompt_he: completion,
      category: detectedCategory || selectedCategory,
      personal_category: PERSONAL_DEFAULT_CATEGORY,
      use_case: "נשמר מהתוצאה",
      source: "enhance"
    });
    recordUsageSignal("save", completion);
    toast.success("נשמר לספריה האישית!");
  };

  const addPersonalPromptFromLibrary = (prompt: LibraryPrompt) => {
    addPrompt({
      title_he: prompt.title_he,
      prompt_he: prompt.prompt_he,
      category: prompt.category,
      personal_category: PERSONAL_DEFAULT_CATEGORY,
      use_case: prompt.use_case,
      source: "library"
    });
    toast.success("הפרומפט התווסף לספריה האישית שלך!");
  };

  const addPersonalCategory = () => {
    const normalized = newPersonalCategory.replace(/\s+/g, " ").trim();
    if (!normalized) return;
    addLibCategory(normalized);
    setNewPersonalCategory("");
    toast.success("קטגוריה התווספה!");
  };

  const startRenameCategory = (category: string) => {
    setRenamingCategory(category);
    setRenameCategoryInput(category);
  };

  const cancelRenameCategory = () => {
    setRenamingCategory(null);
    setRenameCategoryInput("");
  };

  const saveRenameCategory = async () => {
    if (!renamingCategory) return;
    const normalized = renameCategoryInput.replace(/\s+/g, " ").trim();
    if (!normalized) return;
    if (normalized === renamingCategory) {
      cancelRenameCategory();
      return;
    }
    await renameCategory(renamingCategory, normalized);
    cancelRenameCategory();
    toast.success("שם הקטגוריה עודכן");
  };

  const startEditingPersonalPrompt = (prompt: PersonalPrompt) => {
    setEditingPersonalId(prompt.id);
    setEditingTitle(prompt.title_he);
    setEditingUseCase(prompt.use_case);
  };

  const cancelEditingPersonalPrompt = () => {
    setEditingPersonalId(null);
    setEditingTitle("");
    setEditingUseCase("");
  };

  const saveEditingPersonalPrompt = async () => {
    if (!editingPersonalId) return;
    const nextTitle = editingTitle.trim() || "פרומפט אישי";
    const nextUseCase = editingUseCase.trim();
    await updatePrompt(editingPersonalId, {
      title_he: nextTitle,
      use_case: nextUseCase,
    });
    cancelEditingPersonalPrompt();
    toast.success("הפרומפט עודכן");
  };

  const reorderWithinCategory = (category: string, draggedId: string, targetId?: string) => {
    const items = personalLibrary
      .filter((item) => item.personal_category === category)
      .sort((a, b) => getSortIndex(a) - getSortIndex(b));

    const dragIndex = items.findIndex((item) => item.id === draggedId);
    if (dragIndex === -1) return;

    const targetIndex = targetId ? items.findIndex((item) => item.id === targetId) : -1;
    if (targetId && targetIndex === -1) return;

    const nextItems = [...items];
    const [moved] = nextItems.splice(dragIndex, 1);
    let insertIndex = targetIndex === -1 ? nextItems.length : targetIndex;
    if (dragIndex < insertIndex) insertIndex -= 1;
    if (insertIndex < 0) insertIndex = 0;
    nextItems.splice(insertIndex, 0, moved);

    reorderPrompts(category, nextItems.map((item) => item.id));
  };

  const getCategoryOrder = (category: string) =>
    personalLibrary
      .filter((item) => item.personal_category === category)
      .sort((a, b) => getSortIndex(a) - getSortIndex(b));

  const moveToCategory = (draggedId: string, targetCategory: string, targetId?: string) => {
    const ordered = getCategoryOrder(targetCategory);
    const targetIndex = targetId
      ? ordered.findIndex((item) => item.id === targetId)
      : ordered.length;
    const normalizedIndex = targetIndex < 0 ? ordered.length : targetIndex;
    movePrompt(draggedId, targetCategory, normalizedIndex);
  };

  const handlePersonalDragStart = (
    event: DragEvent<HTMLDivElement>,
    prompt: PersonalPrompt
  ) => {
    if (renamingCategory) {
      cancelRenameCategory();
    }
    setPersonalSort("custom");
    setDraggingPersonalId(prompt.id);
    setDraggingPersonalCategory(prompt.personal_category);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", prompt.id);
    event.dataTransfer.setData("application/x-peroot-category", prompt.personal_category);
  };

  const handlePersonalDragOver = (
    event: DragEvent<HTMLDivElement>,
    prompt: PersonalPrompt
  ) => {
    event.preventDefault();
    setDragOverPersonalId(prompt.id);
  };

  const handlePersonalDrop = (
    event: DragEvent<HTMLDivElement>,
    prompt: PersonalPrompt
  ) => {
    event.preventDefault();
    event.stopPropagation();
    const draggedId = event.dataTransfer.getData("text/plain") || draggingPersonalId;
    const dragCategory =
      event.dataTransfer.getData("application/x-peroot-category") || draggingPersonalCategory;

    if (!draggedId || draggedId === prompt.id) return;
    const sourceCategory = dragCategory ?? prompt.personal_category;
    if (sourceCategory === prompt.personal_category) {
      reorderWithinCategory(prompt.personal_category, draggedId, prompt.id);
    } else {
      moveToCategory(draggedId, prompt.personal_category, prompt.id);
    }
    setDragOverPersonalId(null);
    setDraggingPersonalId(null);
    setDraggingPersonalCategory(null);
  };

  const handlePersonalDropToEnd = (event: DragEvent<HTMLDivElement>, category: string) => {
    event.preventDefault();
    event.stopPropagation();
    const draggedId = event.dataTransfer.getData("text/plain") || draggingPersonalId;
    const dragCategory =
      event.dataTransfer.getData("application/x-peroot-category") || draggingPersonalCategory;
    if (!draggedId) return;
    const sourceCategory = dragCategory ?? category;
    if (sourceCategory !== category) {
      moveToCategory(draggedId, category);
    } else {
      reorderWithinCategory(category, draggedId);
    }
    setDragOverPersonalId(null);
    setDraggingPersonalId(null);
    setDraggingPersonalCategory(null);
  };

  const handlePersonalDragEnd = () => {
    setDragOverPersonalId(null);
    setDraggingPersonalId(null);
    setDraggingPersonalCategory(null);
  };

  const handleImportHistory = () => {
    history.forEach(item => {
        addPrompt({
            title_he: item.original.slice(0, 30) + (item.original.length > 30 ? "..." : ""),
            prompt_he: item.enhanced,
            category: item.category,
            personal_category: PERSONAL_DEFAULT_CATEGORY,
            use_case: "ייבוא מהיסטוריה",
            source: "manual"
        });
    });
    toast.success(`יובאו ${history.length} פרומפטים מההיסטוריה`);
  };

  const handleUsePersonalPrompt = (prompt: PersonalPrompt) => {
    incrementUseCount(prompt.id);
    setInputVal(prompt.prompt_he);
    setCompletion("");
    setQuestions([]);
    setViewMode("home");
    toast.success("הפרומפט נטען לעריכה");
  };

  const handleUseLibraryPrompt = (prompt: LibraryPrompt) => {
    incrementPopularity(prompt.id);
    setInputVal(prompt.prompt_he);
    setCompletion("");
    setQuestions([]);
    setViewMode("home");
    toast.success("הפרומפט נטען לעריכה");
  };

  const handleShowPersonalFavorites = () => {
    setPersonalView("favorites");
    setViewMode("personal");
  };

  const handleShowPersonalLibrary = () => {
    setPersonalView("all");
    setViewMode("personal");
  };

  const removePersonalPrompt = (id: string) => {
    if (editingPersonalId === id) {
      cancelEditingPersonalPrompt();
    }
    removePrompt(id);
    toast.success("הוסר מהספריה");
  };

  const updatePersonalPromptCategory = (id: string, cat: string) => {
    updateItemCategory(id, cat);
  };

  const incrementPopularity = (id: string, delta = 1) => {
    setPopularityMap((prev) => ({ ...prev, [id]: (prev[id] ?? 0) + delta }));
    fetch("/api/library-popularity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, delta }),
    }).catch(() => {});
  };

  // --- RENDER HELPERS ---

  const renderInitialView = () => (
    <div className="flex flex-col items-center justify-center min-h-[80vh] w-full max-w-2xl mx-auto px-4 animate-in fade-in zoom-in duration-500">


      <div className="mb-12 text-center relative flex flex-col items-center">
        <div className="absolute inset-0 bg-blue-500/20 blur-[100px] rounded-full pointer-events-none"></div>
        <img 
          src="/assets/branding/logo.svg" 
          alt="פירוט" 
          className="w-48 md:w-64 h-auto relative z-10 mb-1 drop-shadow-[0_0_30px_rgba(255,255,255,0.2)] brightness-110 contrast-110"
        />
        <p className="text-lg text-slate-400 font-light tracking-wide max-w-md mx-auto relative z-10">
          הפוך מחשבות לפרומפטים מדויקים
        </p>
      </div>

      {/* Main Input Card */}
      <div className="w-full max-w-4xl mx-auto flex flex-col lg:flex-row gap-6 items-stretch">
        {variables.length > 0 && (
          <div className="w-full lg:w-72 glass-card p-4 rounded-2xl border-white/10 bg-white/[0.02]">
            <div className="text-xs text-slate-400 uppercase tracking-widest">משתנים</div>
            <p className="text-[11px] text-slate-500 mt-2">
              מלא/י ערכים והחלף אותם בפרומפט בלחיצה.
            </p>
            <div className="mt-4 space-y-3">
              {variables.map((variable) => (
                <div key={variable} className="space-y-2">
                  <label className="text-xs text-sky-300 font-semibold">{`{${variable}}`}</label>
                  <input
                    dir="rtl"
                    value={variableValues[variable] ?? ""}
                    onChange={(e) =>
                      setVariableValues((prev) => ({ ...prev, [variable]: e.target.value }))
                    }
                    className="w-full bg-black/30 border border-white/10 rounded-lg py-2 px-3 text-sm text-slate-200 focus:outline-none focus:border-sky-500/50"
                    placeholder="הכנס ערך..."
                  />
                </div>
              ))}
            </div>
            <button
              onClick={applyVariablesToPrompt}
              className="mt-4 w-full px-3 py-2 rounded-lg bg-white text-black text-sm font-semibold hover:bg-slate-200 transition-colors"
            >
              הכנס לפרומפט
            </button>
            {inputVal.trim() && (
              <div className="mt-4 text-[11px] text-slate-500">
                תצוגה חיה:
                <div className="mt-2 rounded-lg border border-white/10 bg-black/30 p-2 text-xs text-slate-200">
                  {highlightTextWithPlaceholders(inputVal)}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex-1 glass-card p-2 rounded-2xl shadow-2xl shadow-black/50 border-white/5 relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
            <div className="relative bg-black/40 rounded-xl overflow-hidden border border-white/5">
             <div
              aria-hidden
              className="absolute inset-0 p-6 text-xl text-slate-200 font-sans leading-relaxed whitespace-pre-wrap break-words pointer-events-none"
              dir="rtl"
              suppressHydrationWarning
             >
              {highlightTextWithPlaceholders(inputVal)}
             </div>
             <textarea
              dir="rtl"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleEnhance();
                }
              }}
              placeholder="מה תרצה ליצור היום? (למשל: מייל ללקוח, פוסט ללינקדאין, קוד בפייתון...)"
              className="w-full min-h-[8rem] bg-transparent p-6 text-xl text-transparent caret-white placeholder:text-slate-600 focus:outline-none resize-none font-sans leading-relaxed"
              ref={inputTextareaRef}
            />

            <div className="px-6 pb-4 pt-2 border-t border-white/5">
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span className="font-mono tracking-widest">חוזק פרומפט</span>
                <span className={cn("font-semibold", scoreTone.text)}>
                  {inputScore.label} · {inputScore.score}%
                </span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-white/5 overflow-hidden">
                <div
                  className={cn("h-full transition-all duration-500", scoreTone.bar)}
                  style={{ width: `${inputScore.score}%` }}
                />
              </div>
              {inputScore.usageBoost > 0 && (
                <div className="mt-2 text-[10px] text-slate-500">
                  כיול שימוש +{inputScore.usageBoost}
                </div>
              )}
              {inputScore.tips.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {inputScore.tips.map((tip, index) => (
                    <span
                      key={`${tip}-${index}`}
                      className="text-[10px] px-2 py-1 rounded-full bg-white/5 text-slate-300 border border-white/10"
                    >
                      {tip}
                    </span>
                  ))}
                </div>
              )}
            </div>
            
            <div className="flex items-center justify-between px-4 pb-4 bg-white/0">
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-500">קטגוריה</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-xs text-slate-200 focus:outline-none focus:border-white/30"
                >
                  {CATEGORY_OPTIONS.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleEnhance}
                disabled={isLoading || !inputVal.trim()}
                className="flex items-center justify-center w-12 h-10 bg-white text-black rounded-lg font-medium hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed group/btn"
                aria-label="שפר פרומפט"
              >
                {isLoading ? (
                  <span className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin"></span>
                ) : (
                  <Wand2 className="w-5 h-5 text-slate-900 group-hover/btn:rotate-12 transition-transform" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <div className="mt-16 text-center">
         <p className="font-mono text-xs text-slate-600 uppercase tracking-widest">
            Peroot © 2024 · Designed for Builders
         </p>
      </div>
    </div>
  );

  const renderHistoryPanel = () => (
    <div className="glass-card rounded-xl p-5 border-white/10 bg-white/[0.02] flex flex-col max-h-[70vh]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={handleShowPersonalLibrary}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all border bg-white text-black border-white hover:bg-slate-200"
          >
            <BookOpen className="w-3 h-3" />
            ספריה אישית
          </button>
          <button
            onClick={handleShowPersonalFavorites}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all border border-white/10 text-slate-300 hover:bg-white/10"
          >
            <Star className="w-3 h-3" />
            מועדפים
          </button>
          <button
            onClick={() => setViewMode("library")}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all border border-white/10 text-slate-300 hover:bg-white/10"
          >
            <BookOpen className="w-3 h-3" />
            ספריה מלאה
          </button>
        </div>
        {history.length > 0 && (
          <button
            onClick={clearHistory}
            className="flex items-center gap-2 px-2 py-1 text-xs text-slate-400 hover:text-white transition-colors"
            title="נקה היסטוריה"
          >
            <Trash2 className="w-3 h-3" />
            נקה
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <History className="w-3 h-3" />
          היסטוריה
        </div>
        {!isLoaded && (
          <div className="text-xs text-slate-500 text-center py-6">טוען היסטוריה...</div>
        )}
        {isLoaded && history.length === 0 && (
          <div className="text-xs text-slate-500 text-center py-6">אין פרומפטים בהיסטוריה</div>
        )}
        {history.map((item) => (
          <div
            key={item.id}
            className="rounded-xl border border-white/10 bg-black/30 p-4 hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] px-2 py-0.5 rounded-full border border-white/10 text-slate-400">
                {CATEGORY_LABELS[item.category] ?? item.category}
              </span>
              <span className="text-[10px] text-slate-500" suppressHydrationWarning>
                {hasHydrated ? formatDistanceToNow(new Date(item.timestamp), { addSuffix: true, locale: he }) : "..."}
              </span>
            </div>
            <p className="text-sm text-slate-200 mt-2 leading-relaxed max-h-16 overflow-hidden" dir="rtl">
              {item.original}
            </p>
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={() => handleRestore(item)}
                className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-white text-black text-xs hover:bg-slate-200 transition-colors"
              >
                <ArrowRight className="w-3 h-3" />
                שחזר
              </button>
              <button
                onClick={() => addPersonalPromptFromHistory(item)}
                className="flex items-center gap-2 px-2.5 py-1 rounded-md border border-white/10 text-slate-300 text-xs hover:bg-white/10 transition-colors"
              >
                <Plus className="w-3 h-3" />
                שמור לאישי
              </button>
              <button
                onClick={() => handleCopyText(item.enhanced)}
                className="flex items-center gap-2 px-2.5 py-1 rounded-md border border-white/10 text-slate-300 text-xs hover:bg-white/10 transition-colors"
              >
                <Copy className="w-3 h-3" />
                העתק פלט
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderResultMain = () => (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="glass-card p-6 rounded-xl border-white/10 flex items-start justify-between group">
        <div>
          <h2 className="text-xl text-slate-200 font-medium font-serif leading-relaxed" dir="rtl">
            {inputVal}
          </h2>
        </div>
        <button
          onClick={() => setCompletion("")}
          className="p-2 hover:bg-white/10 rounded-lg text-slate-500 hover:text-white transition-colors"
          title="Edit Original Request"
        >
          <Pencil className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
        <span
          className={cn(
            "font-semibold",
            improvementDelta >= 12
              ? "text-emerald-400"
              : improvementDelta >= 4
                ? "text-yellow-400"
                : improvementDelta >= 0
                  ? "text-slate-300"
                  : "text-red-400"
          )}
        >
          שיפור {improvementDelta >= 0 ? `+${improvementDelta}` : improvementDelta}
        </span>
        <span className="text-[10px] uppercase tracking-widest text-slate-600">מדד חוזק</span>
        {completionScore.usageBoost > 0 && (
          <span className="text-[10px] text-slate-500">כיול שימוש +{completionScore.usageBoost}</span>
        )}
      </div>

      <div className="glass-card rounded-xl p-8 border-silver/10 bg-black/40 relative min-h-[600px]">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-sm font-mono text-slate-400 uppercase tracking-wider flex items-center gap-2">
            Great Prompt
            <span className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 text-[10px] border border-green-500/20">Optimized</span>
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={saveCompletionToPersonal}
              className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-white border border-white/5 text-xs font-medium"
            >
              <BookOpen className="w-3 h-3" />
              שמור לאישי
            </button>
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-white border border-white/5 text-xs font-medium"
            >
              {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>

        <div dir="rtl" className="prose prose-invert prose-p:text-slate-300 prose-headings:font-serif prose-headings:text-silver max-w-none font-sans leading-relaxed text-lg">
          <ReactMarkdown components={markdownComponents}>{completion}</ReactMarkdown>
        </div>

        {placeholders.length > 0 && (
          <div className="mt-8 rounded-xl border border-sky-400/20 bg-sky-400/10 p-4">
            <div className="text-xs text-sky-200 font-semibold">חסרים להשלמה</div>
            <div className="mt-3 flex flex-col gap-3 text-xs text-slate-300">
              {placeholders.map((placeholder) => {
                const suggestions = getPlaceholderSuggestions(placeholder).slice(0, 3);
                return (
                  <div key={placeholder} className="flex flex-wrap items-center gap-2">
                    <span className="text-sky-200 font-mono">{`{${placeholder}}`}</span>
                    <span className="text-slate-500">לדוגמה:</span>
                    {suggestions.map((suggestion) => (
                      <span
                        key={`${placeholder}-${suggestion}`}
                        className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-slate-200"
                      >
                        {suggestion}
                      </span>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderImprovePanel = () => (
    <div className="glass-card rounded-xl p-6 border-white/10 bg-white/[0.02]" dir="rtl">
      <div className="mb-6 text-right">
        <h2 className="text-xl font-serif text-white mb-2">שפר את הפרומפט</h2>
        <p className="text-sm text-slate-500">ענה/י על השאלות כדי לקבל תוצאה מדויקת יותר.</p>
      </div>

      <div className="mb-6">
        <div className="text-[11px] uppercase tracking-widest text-slate-500 mb-2">דלתות מהירות</div>
        <div className="flex flex-wrap gap-3">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.label}
              onClick={() => handleRefine(action.instruction)}
              disabled={isLoading || !completion}
              className="min-w-[120px] rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-right text-xs font-semibold text-slate-200 hover:bg-white/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {questions.map((q, idx) => {
          const isOpen = openQuestionId === idx;
          const answerValue = questionAnswers[idx] ?? "";
          const sendAnswer = (value: string) => {
            const trimmed = value.trim();
            if (!trimmed) return;
            handleRefine(`תשובה לשאלה \"${q.question}\": ${trimmed}`);
            setQuestionAnswers((prev) => ({ ...prev, [idx]: "" }));
          };

          return (
            <div
              key={idx}
              className={cn(
                "border rounded-xl transition-all duration-300 overflow-hidden",
                isOpen ? "border-white/20 bg-white/5" : "border-white/5 hover:border-white/10"
              )}
            >
              <button
                onClick={() => setOpenQuestionId(isOpen ? null : idx)}
                className="w-full flex items-center justify-between p-4 text-right"
              >
                <ChevronDown className={cn("w-4 h-4 text-slate-500 transition-transform", isOpen && "rotate-180")} />
                <div className="flex items-center gap-3">
                  <span className="font-medium text-slate-200 text-sm" dir="rtl">{q.question}</span>
                  <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center text-xs font-mono">
                    {idx + 1}
                  </span>
                </div>
              </button>

              {isOpen && (
                <div className="px-4 pb-4 animate-in slide-in-from-top-2 duration-200">
                  <p className="text-xs text-slate-400 mb-3 text-right" dir="rtl">{q.description}</p>

                  <div className="relative mb-3">
                    <textarea
                      dir="rtl"
                      placeholder="כתוב/י תשובה כאן..."
                      value={answerValue}
                      onChange={(e) =>
                        setQuestionAnswers((prev) => ({ ...prev, [idx]: e.target.value }))
                      }
                      className="w-full h-24 bg-black/30 border border-white/10 rounded-lg p-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-purple-500/50 resize-none"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          sendAnswer(e.currentTarget.value);
                        }
                      }}
                    />
                    <button
                      onClick={() => sendAnswer(answerValue)}
                      disabled={!answerValue.trim()}
                      className="absolute bottom-2 left-2 p-1.5 bg-purple-600 rounded-md text-white hover:bg-purple-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="שלח/י תשובה"
                    >
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="flex flex-col gap-2">
                    {q.examples.map((ex, i) => (
                      <button
                        key={i}
                        onClick={() => handleRefine(`תשובה לשאלה \"${q.question}\": ${ex}`)}
                        className="flex items-center justify-between p-2 rounded-lg border border-white/5 hover:bg-white/5 hover:border-white/10 transition-colors group/ex"
                      >
                        <Plus className="w-3 h-3 text-slate-500 group-hover/ex:text-purple-400" />
                        <span className="text-xs text-slate-300 text-right w-full pr-2" dir="rtl">{ex}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-6 pt-6 border-t border-white/10">
        <div className="flex items-center justify-between mb-3 cursor-pointer" onClick={() => setOpenQuestionId(999)}>
          <ChevronDown className={cn("w-4 h-4 text-slate-500 transition-transform", openQuestionId === 999 && "rotate-180")} />
          <h3 className="text-sm font-medium text-slate-300">ליטוש ידני</h3>
        </div>

        {openQuestionId === 999 && (
          <div className="space-y-4 animate-in slide-in-from-top-2">
            <p className="text-xs text-slate-500 text-right">ערוך/י מהר או הוסף/י פרטים חסרים.</p>
            <div className="relative">
              <textarea
                value={refinementInput}
                onChange={(e) => setRefinementInput(e.target.value)}
                placeholder="הגבל אורך, טון, סגנון ועוד..."
                className="w-full h-24 bg-black/30 border border-white/10 rounded-lg p-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-white/30 resize-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleRefine(refinementInput);
                  }
                }}
              />
              <button
                onClick={() => handleRefine(refinementInput)}
                disabled={!refinementInput.trim()}
                className="absolute bottom-2 left-2 p-1.5 bg-white text-black rounded-md hover:bg-slate-200 transition-colors"
              >
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderLibraryPage = () => {
    const grouped = filteredLibrary.reduce<Record<string, LibraryPrompt[]>>((acc, prompt) => {
      const key = prompt.category || "General";
      if (!acc[key]) acc[key] = [];
      acc[key].push(prompt);
      return acc;
    }, {});

    const orderedCategories = Object.keys(CATEGORY_LABELS).filter((cat) => grouped[cat]?.length);
    const totalCount = filteredLibrary.length;

    return (
      <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Small Header Logo */}
        <div className="flex items-center justify-start -mb-4">
          <button 
            onClick={() => setViewMode("home")}
            className="group flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <img 
              src="/assets/branding/logo.svg" 
              alt="Peroot" 
              className="h-10 w-auto brightness-110 transition-transform group-hover:scale-105" 
            />
          </button>
        </div>
        <div className="glass-card p-6 rounded-xl border-white/10 bg-black/40">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-3xl font-serif text-white">ספריית פרומפטים</h2>
              <p className="text-sm text-slate-500 mt-1">
                {totalCount} פרומפטים זמינים · מיון לפי פופולריות · חיפוש לפי מילים, שימוש או קטגוריה
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setViewMode("personal")}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 text-sm text-slate-300 hover:bg-white/10 transition-colors"
              >
                <BookOpen className="w-4 h-4" />
                ספריה אישית
              </button>
              <button
                onClick={() => setViewMode("home")}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 text-sm text-slate-300 hover:bg-white/10 transition-colors"
              >
                <ArrowRight className="w-4 h-4" />
                חזרה לעריכה
              </button>
            </div>
          </div>

          <div className="relative mt-5">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              dir="rtl"
              value={libraryQuery}
              onChange={(e) => setLibraryQuery(e.target.value)}
              placeholder="חפש/י רעיון לפרומפט לפי מילים, קטגוריה או שימוש..."
              className="w-full bg-black/30 border border-white/10 rounded-lg py-3 pr-10 pl-4 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-white/20"
            />
          </div>

          {orderedCategories.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {orderedCategories.map((category) => (
                <a
                  key={category}
                  href={`#category-${category}`}
                  className="text-xs px-3 py-1 rounded-full border border-white/10 text-slate-300 hover:bg-white/10 transition-colors"
                  suppressHydrationWarning
                >
                  {CATEGORY_LABELS[category] ?? category}
                </a>
              ))}
            </div>
          )}
        </div>

        {orderedCategories.map((category) => (
          <div
            key={category}
            id={`category-${category}`}
            className="space-y-4 scroll-mt-24 rounded-3xl border border-white/5 bg-gradient-to-l from-white/[0.035] via-white/[0.015] to-transparent px-4 md:px-6 py-6"
          >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-white/10 pb-4">
              <div className="flex items-baseline gap-3">
                <h3 className="text-2xl md:text-3xl font-serif font-semibold text-slate-100 tracking-wide">
                  {CATEGORY_LABELS[category] ?? category}
                </h3>
                <span className="text-sm text-slate-400">{grouped[category].length} פרומפטים</span>
              </div>
              <span className="text-xs px-3 py-1 rounded-full border border-white/10 text-slate-400">
                {category}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-5">
              {[...grouped[category]]
                .sort((a, b) => {
                  const aFavorite = favoriteLibraryIds.has(a.id);
                  const bFavorite = favoriteLibraryIds.has(b.id);
                  if (aFavorite !== bFavorite) return aFavorite ? -1 : 1;

                  const aPopularity = popularityMap[a.id] ?? 0;
                  const bPopularity = popularityMap[b.id] ?? 0;
                  if (aPopularity !== bPopularity) return bPopularity - aPopularity;

                  return a.title_he.localeCompare(b.title_he);
                })
                .map((prompt) => {
                const variablePreview = prompt.variables.slice(0, 4);
                const remainingVars = prompt.variables.length - variablePreview.length;
                const popularityCount = popularityMap[prompt.id] ?? 0;
                const isFavorite = favoriteLibraryIds.has(prompt.id);

                return (
                  <div
                    key={prompt.id}
                    className="rounded-3xl border border-white/10 bg-black/30 p-6 md:p-7 hover:bg-white/5 transition-colors flex flex-col gap-5 min-h-[360px]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="text-xl md:text-2xl text-slate-100 font-semibold" dir="rtl">{prompt.title_he}</h4>
                        <p className="text-sm text-slate-400 mt-2" dir="rtl">{prompt.use_case}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleFavorite("library", prompt.id)}
                        className={cn(
                          "shrink-0 p-1.5 rounded-full border transition-colors",
                          isFavorite
                            ? "border-yellow-300/40 bg-yellow-300/10 text-yellow-300"
                            : "border-white/10 text-slate-500 hover:text-slate-300 hover:bg-white/10"
                        )}
                        aria-pressed={isFavorite}
                        aria-label={isFavorite ? "הסר ממועדפים" : "הוסף למועדפים"}
                      >
                        <Star className={cn("w-3 h-3", isFavorite ? "text-yellow-300 fill-yellow-300" : "text-slate-500")} />
                      </button>
                    </div>

                    <div className="text-sm text-slate-300 leading-relaxed max-h-40 overflow-hidden" dir="rtl">
                      {prompt.prompt_he}
                    </div>

                    {prompt.variables.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {variablePreview.map((variable) => (
                          <span
                            key={variable}
                            className="text-xs px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-slate-300"
                          >
                            {variable}
                          </span>
                        ))}
                        {remainingVars > 0 && (
                          <span className="text-xs px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-slate-500">
                            +{remainingVars}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>{popularityCount > 0 ? `נבחר ${popularityCount} פעמים` : "חדש"}</span>
                      {isFavorite && <span className="text-yellow-300">מועדף</span>}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 pt-1">
                      <button
                        onClick={() => handleUseLibraryPrompt(prompt)}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-black text-sm hover:bg-slate-200 transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                        השתמש בפרומפט
                      </button>
                      <button
                        onClick={() => addPersonalPromptFromLibrary(prompt)}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 text-slate-300 text-sm hover:bg-white/10 transition-colors"
                      >
                        <BookOpen className="w-3 h-3" />
                        שמור לאישי
                      </button>
                      <button
                        onClick={async () => {
                          await handleCopyText(prompt.prompt_he);
                          incrementPopularity(prompt.id);
                        }}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 text-slate-300 text-sm hover:bg-white/10 transition-colors"
                      >
                        <Copy className="w-3 h-3" />
                        העתק
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {totalCount === 0 && (
          <div className="glass-card p-10 rounded-xl border-white/10 bg-black/40 text-center text-slate-500">
            לא נמצאו פרומפטים תואמים לחיפוש שלך.
          </div>
        )}
      </div>
    );
  };

  const renderPersonalLibraryPage = () => {
    const normalizedPersonalQuery = personalQuery.trim().toLowerCase();
    const favoritesLibrary = libraryPrompts.filter((prompt) => favoriteLibraryIds.has(prompt.id));
    const favoritesPersonal = personalLibrary.filter((prompt) => favoritePersonalIds.has(prompt.id));

    const filteredFavoritesLibrary = normalizedPersonalQuery
      ? favoritesLibrary.filter((prompt) =>
          [prompt.title_he, prompt.use_case, prompt.prompt_he, prompt.category]
            .join(" ")
            .toLowerCase()
            .includes(normalizedPersonalQuery)
        )
      : favoritesLibrary;

    const filteredFavoritesPersonal = normalizedPersonalQuery
      ? favoritesPersonal.filter((prompt) =>
          [prompt.title_he, prompt.use_case, prompt.prompt_he, prompt.personal_category]
            .join(" ")
            .toLowerCase()
            .includes(normalizedPersonalQuery)
        )
      : favoritesPersonal;

    const displayItems = personalView === "favorites" 
      ? personalLibrary.filter(p => favoritePersonalIds.has(p.id))
      : filteredPersonalLibrary;

    const categorySet = new Set([PERSONAL_DEFAULT_CATEGORY, ...personalCategories]);
    displayItems.forEach((prompt) => {
      if (prompt.personal_category) categorySet.add(prompt.personal_category);
    });

    const orderedCategories = Array.from(categorySet).filter((cat) =>
      displayItems.some((prompt) => prompt.personal_category === cat)
    );

    const grouped = displayItems.reduce<Record<string, PersonalPrompt[]>>((acc, prompt) => {
      const key = prompt.personal_category || PERSONAL_DEFAULT_CATEGORY;
      if (!acc[key]) acc[key] = [];
      acc[key].push(prompt);
      return acc;
    }, {});

    const totalCount =
      personalView === "favorites"
        ? filteredFavoritesLibrary.length + displayItems.length
        : filteredPersonalLibrary.length;

    return (
      <div className="flex flex-col gap-7 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Small Header Logo */}
        <div className="flex items-center justify-start -mb-4">
          <button 
            onClick={() => setViewMode("home")}
            className="group flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <img 
              src="/assets/branding/logo.svg" 
              alt="Peroot" 
              className="h-10 w-auto brightness-110 transition-transform group-hover:scale-105" 
            />
          </button>
        </div>

        <div className="glass-card p-7 md:p-9 rounded-2xl border-white/10 bg-black/40">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h2 className="text-4xl md:text-5xl font-serif text-white">ספריה אישית</h2>
              <p className="text-base text-slate-400 mt-2">
                {totalCount} פרומפטים {personalView === "favorites" ? "מועדפים" : "אישיים"} · ארגון לפי קטגוריות מותאמות
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => {
                  setPersonalView("all");
                  setViewMode("library");
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 text-sm text-slate-300 hover:bg-white/10 transition-colors"
              >
                <BookOpen className="w-4 h-4" />
                ספריה מלאה
              </button>
              <button
                onClick={() => setPersonalView((prev) => (prev === "favorites" ? "all" : "favorites"))}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg border text-sm transition-colors",
                  personalView === "favorites"
                    ? "border-yellow-300/40 bg-yellow-300/10 text-yellow-200"
                    : "border-white/10 text-slate-300 hover:bg-white/10"
                )}
              >
                <Star className="w-4 h-4" />
                מועדפים
              </button>
              <button
                onClick={() => setViewMode("home")}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 text-sm text-slate-300 hover:bg-white/10 transition-colors"
              >
                <ArrowRight className="w-4 h-4" />
                חזרה לעריכה
              </button>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="relative lg:col-span-2">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                dir="rtl"
                value={personalQuery}
                onChange={(e) => setPersonalQuery(e.target.value)}
                placeholder={personalView === "favorites" ? "חיפוש בתוך המועדפים..." : "חיפוש חופשי בתוך הפרומפטים האישיים..."}
                className="w-full bg-black/30 border border-white/10 rounded-lg py-3 pr-10 pl-4 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-white/20"
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="text-xs text-slate-500">מיון</label>
              <select
                value={personalSort}
                onChange={(e) => setPersonalSort(e.target.value as "recent" | "title" | "usage" | "custom")}
                className="flex-1 bg-black/30 border border-white/10 rounded-lg py-2.5 px-3 text-sm text-slate-200 focus:outline-none focus:border-white/30"
              >
                <option value="recent">עודכן לאחרונה</option>
                <option value="title">אלפביתי</option>
                <option value="usage">בשימוש גבוה</option>
                <option value="custom">סדר ידני</option>
              </select>
            </div>
          </div>

          {personalView === "all" && (
            <div className="mt-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="flex items-center gap-2">
                <input
                  dir="rtl"
                  value={newPersonalCategory}
                  onChange={(e) => setNewPersonalCategory(e.target.value)}
                  placeholder="קטגוריה חדשה..."
                  className="w-full md:w-64 bg-black/30 border border-white/10 rounded-lg py-2.5 px-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-white/30"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addPersonalCategory();
                    }
                  }}
                />
                <button
                  onClick={addPersonalCategory}
                  className="px-4 py-2 rounded-lg bg-white text-black text-sm hover:bg-slate-200 transition-colors"
                >
                  צור קטגוריה
                </button>
              </div>
              <button
                onClick={handleImportHistory}
                disabled={history.length === 0}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm border border-white/10 transition-colors",
                  history.length === 0
                    ? "text-slate-600 cursor-not-allowed"
                    : "text-slate-300 hover:bg-white/10"
                )}
              >
                ייבא מהיסטוריה
              </button>
            </div>
          )}

          {personalSort === "custom" && personalView === "all" && (
            <div className="mt-3 text-xs text-slate-500">
              גרור/י כרטיסים כדי לשנות את הסדר בתוך כל קטגוריה.
            </div>
          )}

          {orderedCategories.length > 0 && personalView === "all" && (
            <div className="mt-6 flex flex-wrap gap-2">
              {orderedCategories.map((category) => (
                <a
                  key={category}
                  href={`#personal-category-${category}`}
                  className="text-xs px-3 py-1 rounded-full border border-white/10 text-slate-300 hover:bg-white/10 transition-colors"
                  suppressHydrationWarning
                >
                  {category}
                </a>
              ))}
            </div>
          )}
        </div>

        {personalView === "favorites" ? (
          <div className="flex flex-col gap-6">
            {filteredFavoritesLibrary.length > 0 && (
              <div className="space-y-4 rounded-3xl border border-white/10 bg-gradient-to-l from-yellow-300/5 via-white/[0.03] to-transparent px-5 md:px-7 py-7">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div className="flex items-baseline gap-3">
                    <h3 className="text-3xl md:text-4xl font-serif font-semibold text-slate-100 tracking-wide">
                      מועדפים מהספריה
                    </h3>
                    <span className="text-sm text-slate-400">{filteredFavoritesLibrary.length} פרומפטים</span>
                  </div>
                  <span className="text-xs px-3 py-1 rounded-full border border-white/10 text-slate-400">
                    ספריה מלאה
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6">
                  {filteredFavoritesLibrary.map((prompt) => (
                    <div
                      key={prompt.id}
                      className="rounded-[28px] border border-white/15 bg-black/40 p-7 md:p-8 hover:bg-white/5 transition-colors flex flex-col gap-5 min-h-[380px]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h4 className="text-2xl text-slate-100 font-semibold" dir="rtl">{prompt.title_he}</h4>
                          <p className="text-sm text-slate-400 mt-2" dir="rtl">{prompt.use_case}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleFavorite("library", prompt.id)}
                          className="shrink-0 p-2 rounded-full border border-yellow-300/40 bg-yellow-300/10 text-yellow-300"
                          aria-label="הסר ממועדפים"
                        >
                          <Star className="w-4 h-4 text-yellow-300 fill-yellow-300" />
                        </button>
                      </div>
                      <div className="text-sm text-slate-300 leading-relaxed max-h-40 overflow-hidden" dir="rtl">
                        {prompt.prompt_he}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 pt-1">
                        <button
                          onClick={() => handleUseLibraryPrompt(prompt)}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-black text-sm hover:bg-slate-200 transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                          השתמש בפרומפט
                        </button>
                        <button
                          onClick={() => addPersonalPromptFromLibrary(prompt)}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 text-slate-300 text-sm hover:bg-white/10 transition-colors"
                        >
                          <BookOpen className="w-3 h-3" />
                          שמור לאישי
                        </button>
                        <button
                          onClick={() => handleCopyText(prompt.prompt_he)}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 text-slate-300 text-sm hover:bg-white/10 transition-colors"
                        >
                          <Copy className="w-3 h-3" />
                          העתק
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {filteredFavoritesPersonal.length > 0 && (
              <div className="space-y-4 rounded-3xl border border-white/10 bg-gradient-to-l from-white/[0.05] via-white/[0.03] to-transparent px-5 md:px-7 py-7">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div className="flex items-baseline gap-3">
                    <h3 className="text-3xl md:text-4xl font-serif font-semibold text-slate-100 tracking-wide">
                      מועדפים אישיים
                    </h3>
                    <span className="text-sm text-slate-400">{filteredFavoritesPersonal.length} פרומפטים</span>
                  </div>
                  <span className="text-xs px-3 py-1 rounded-full border border-white/10 text-slate-400">
                    ספריה אישית
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6">
                  {filteredFavoritesPersonal.map((prompt) => {
                    const isEditing = editingPersonalId === prompt.id;
                    const isFavorite = favoritePersonalIds.has(prompt.id);
                    const isStyling = editingStylePromptId === prompt.id;
                    const styledMarkup = getStyledPromptMarkup(prompt);

                    return (
                      <div
                        key={prompt.id}
                        className="rounded-[28px] border border-white/15 bg-black/40 p-7 md:p-8 hover:bg-white/5 transition-colors flex flex-col gap-5 min-h-[380px]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            {isEditing ? (
                              <div className="space-y-3">
                                <input
                                  dir="rtl"
                                  value={editingTitle}
                                  onChange={(e) => setEditingTitle(e.target.value)}
                                  className="w-full bg-black/30 border border-white/10 rounded-lg py-2 px-3 text-base text-slate-200 focus:outline-none focus:border-white/30"
                                  placeholder="כותרת לפרומפט"
                                />
                                <textarea
                                  dir="rtl"
                                  value={editingUseCase}
                                  onChange={(e) => setEditingUseCase(e.target.value)}
                                  className="w-full h-20 bg-black/30 border border-white/10 rounded-lg py-2 px-3 text-sm text-slate-300 focus:outline-none focus:border-white/30 resize-none"
                                  placeholder="תיאור קצר לשימוש בפרומפט"
                                />
                              </div>
                            ) : (
                              <>
                                <h4 className="text-2xl text-slate-100 font-semibold" dir="rtl">{prompt.title_he}</h4>
                                <p className="text-sm text-slate-400 mt-2" dir="rtl">{prompt.use_case}</p>
                              </>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => toggleFavorite("personal", prompt.id)}
                              className={cn(
                                "p-2 rounded-full border transition-colors",
                                isFavorite
                                  ? "border-yellow-300/40 bg-yellow-300/10 text-yellow-300"
                                  : "border-white/10 text-slate-500 hover:text-slate-300 hover:bg-white/10"
                              )}
                              aria-label={isFavorite ? "הסר ממועדפים" : "הוסף למועדפים"}
                            >
                              <Star className={cn("w-4 h-4", isFavorite ? "text-yellow-300 fill-yellow-300" : "text-slate-500")} />
                            </button>
                            {isEditing ? (
                              <>
                                <button
                                  onClick={saveEditingPersonalPrompt}
                                  className="p-2 rounded-full border border-white/10 text-slate-300 hover:bg-white/10 transition-colors"
                                  title="שמור שינויים"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={cancelEditingPersonalPrompt}
                                  className="p-2 rounded-full border border-white/10 text-slate-500 hover:bg-white/10 transition-colors"
                                  title="בטל עריכה"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => startEditingPersonalPrompt(prompt)}
                                className="p-2 rounded-full border border-white/10 text-slate-500 hover:text-slate-200 hover:bg-white/10 transition-colors"
                                title="ערוך פרטי פרומפט"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>

                        <div
                          className="text-sm text-slate-300 leading-relaxed max-h-40 overflow-hidden"
                          dir="rtl"
                          dangerouslySetInnerHTML={{ __html: toStyledHtml(styledMarkup) }}
                        />

                        {isStyling && (
                          <div className="mt-4 rounded-xl border border-white/10 bg-black/40 p-4">
                            <div className="text-[11px] text-slate-500 mb-2">בחר/י טקסט ואז צבע/היילייט</div>
                            <div className="flex flex-wrap gap-2 mb-3">
                              {Object.keys(STYLE_TEXT_COLORS).map((color) => (
                                <button
                                  key={`text-${color}`}
                                  onClick={() => applyStyleToken("c", color)}
                                  className="px-2 py-1 rounded-full text-[10px] border border-white/10 text-slate-300 hover:bg-white/10"
                                  title={`צבע טקסט: ${color}`}
                                >
                                  <span className={cn("font-semibold", STYLE_TEXT_COLORS[color])}>Aa</span>
                                </button>
                              ))}
                            </div>
                            <div className="flex flex-wrap gap-2 mb-3">
                              {Object.keys(STYLE_HIGHLIGHT_COLORS).map((color) => (
                                <button
                                  key={`hl-${color}`}
                                  onClick={() => applyStyleToken("hl", color)}
                                  className={cn(
                                    "px-2 py-1 rounded-full text-[10px] border border-white/10 hover:bg-white/10",
                                    STYLE_HIGHLIGHT_COLORS[color]
                                  )}
                                  title={`היילייט: ${color}`}
                                >
                                  HL
                                </button>
                              ))}
                            </div>
                            <textarea
                              ref={styleTextareaRef}
                              dir="rtl"
                              value={styleDraft}
                              onChange={(e) => setStyleDraft(e.target.value)}
                              className="w-full h-28 bg-black/30 border border-white/10 rounded-lg p-3 text-xs text-slate-200 focus:outline-none focus:border-white/30 resize-none"
                              placeholder="ערוך/י טקסט והשתמש/י בכפתורים לצבעים והדגשות"
                            />
                            <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                              <button
                                onClick={clearStyleTokens}
                                className="px-2 py-1 rounded-full border border-white/10 text-slate-400 hover:bg-white/10"
                              >
                                נקה עיצוב
                              </button>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => saveStylePrompt(prompt.id)}
                                  className="px-3 py-1 rounded-full bg-white text-black hover:bg-slate-200"
                                >
                                  שמור
                                </button>
                                <button
                                  onClick={closeStyleEditor}
                                  className="px-3 py-1 rounded-full border border-white/10 text-slate-400 hover:bg-white/10"
                                >
                                  סגור
                                </button>
                              </div>
                            </div>
                            <div className="mt-4 text-[11px] text-slate-500">תצוגה מקדימה</div>
                            <div
                              className="mt-2 text-sm text-slate-200 leading-relaxed"
                              dir="rtl"
                              dangerouslySetInnerHTML={{ __html: toStyledHtml(styleDraft) }}
                            />
                          </div>
                        )}

                        <div className="flex items-center justify-between text-xs text-slate-400">
                          <span>{prompt.use_count > 0 ? `שומש ${prompt.use_count} פעמים` : "חדש"}</span>
                          <span className="text-slate-500">
                            {prompt.personal_category}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 pt-1">
                          <button
                            onClick={() => handleUsePersonalPrompt(prompt)}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-black text-sm hover:bg-slate-200 transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                            השתמש בפרומפט
                          </button>
                          <button
                            onClick={() => handleCopyText(prompt.prompt_he)}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 text-slate-300 text-sm hover:bg-white/10 transition-colors"
                          >
                            <Copy className="w-3 h-3" />
                            העתק
                          </button>
                          <button
                            onClick={() => openStyleEditor(prompt)}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 text-slate-300 text-sm hover:bg-white/10 transition-colors"
                          >
                            <Pencil className="w-3 h-3" />
                            עיצוב
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {totalCount === 0 && (
              <div className="glass-card p-10 rounded-xl border-white/10 bg-black/40 text-center text-slate-500">
                אין עדיין מועדפים. סמנו פרומפטים בכוכב כדי שיופיעו כאן.
              </div>
            )}
          </div>
        ) : (
          <>
            {orderedCategories.map((category) => (
              <div
                key={category}
                id={`personal-category-${category}`}
                className="space-y-4 scroll-mt-24 rounded-3xl border border-white/10 bg-gradient-to-l from-white/[0.06] via-white/[0.03] to-transparent px-5 md:px-7 py-7"
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => handlePersonalDropToEnd(event, category)}
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-white/10 pb-4">
                  <div className="flex items-center gap-4 flex-1">
                    {renamingCategory === category ? (
                      <div className="flex items-center gap-2 flex-1 max-w-md">
                        <input
                          dir="rtl"
                          value={renameCategoryInput}
                          onChange={(e) => setRenameCategoryInput(e.target.value)}
                          className="flex-1 bg-black/30 border border-white/10 rounded-lg py-2 px-3 text-xl font-serif text-white focus:outline-none focus:border-white/30"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveRenameCategory();
                            if (e.key === "Escape") cancelRenameCategory();
                          }}
                        />
                        <button
                          onClick={saveRenameCategory}
                          className="p-2 rounded-full border border-white/10 text-slate-300 hover:bg-white/10"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={cancelRenameCategory}
                          className="p-2 rounded-full border border-white/10 text-slate-500 hover:bg-white/10"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-baseline gap-3 group/cat">
                        <h3 className="text-3xl md:text-4xl font-serif font-semibold text-slate-100 tracking-wide">
                          {category}
                        </h3>
                        {category !== PERSONAL_DEFAULT_CATEGORY && (
                          <button
                            onClick={() => startRenameCategory(category)}
                            className="opacity-0 group-hover/cat:opacity-100 p-1 text-slate-500 hover:text-white transition-all"
                            title="שנה שם קטגוריה"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                        )}
                        <span className="text-sm text-slate-400">{grouped[category]?.length ?? 0} פרומפטים</span>
                      </div>
                    )}
                  </div>
                  <span className="text-xs px-3 py-1 rounded-full border border-white/10 text-slate-400">
                    אישי
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6">
                  {(grouped[category] ?? []).map((prompt) => {
                    const isEditing = editingPersonalId === prompt.id;
                    const isDragging = draggingPersonalId === prompt.id;
                    const isDragOver = dragOverPersonalId === prompt.id && draggingPersonalId !== prompt.id;
                    const canDrag = !isEditing;
                    const isFavorite = favoritePersonalIds.has(prompt.id);
                    const isStyling = editingStylePromptId === prompt.id;
                    const styledMarkup = getStyledPromptMarkup(prompt);

                    return (
                      <div
                        key={prompt.id}
                        draggable={canDrag}
                        onDragStart={(event) => handlePersonalDragStart(event, prompt)}
                        onDragEnd={handlePersonalDragEnd}
                        onDragOver={(event) => handlePersonalDragOver(event, prompt)}
                        onDrop={(event) => handlePersonalDrop(event, prompt)}
                        className={cn(
                          "rounded-[28px] border border-white/15 bg-black/40 p-7 md:p-8 hover:bg-white/5 transition-colors flex flex-col gap-5 min-h-[420px]",
                          canDrag && "cursor-grab",
                          isDragging && "opacity-60",
                          isDragOver && "ring-2 ring-white/30"
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <GripVertical className={cn("w-4 h-4 mt-1 text-slate-500", canDrag ? "opacity-100" : "opacity-30")} />
                            <div>
                              {isEditing ? (
                                <div className="space-y-3">
                                  <input
                                    dir="rtl"
                                    value={editingTitle}
                                    onChange={(e) => setEditingTitle(e.target.value)}
                                    className="w-full bg-black/30 border border-white/10 rounded-lg py-2 px-3 text-base text-slate-200 focus:outline-none focus:border-white/30"
                                    placeholder="כותרת לפרומפט"
                                  />
                                  <textarea
                                    dir="rtl"
                                    value={editingUseCase}
                                    onChange={(e) => setEditingUseCase(e.target.value)}
                                    className="w-full h-20 bg-black/30 border border-white/10 rounded-lg py-2 px-3 text-sm text-slate-300 focus:outline-none focus:border-white/30 resize-none"
                                    placeholder="תיאור קצר לשימוש בפרומפט"
                                  />
                                </div>
                              ) : (
                                <>
                                  <h4 className="text-2xl text-slate-100 font-semibold" dir="rtl">{prompt.title_he}</h4>
                                  <p className="text-sm text-slate-400 mt-2" dir="rtl">{prompt.use_case}</p>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => toggleFavorite("personal", prompt.id)}
                              className={cn(
                                "p-2 rounded-full border transition-colors",
                                isFavorite
                                  ? "border-yellow-300/40 bg-yellow-300/10 text-yellow-300"
                                  : "border-white/10 text-slate-500 hover:text-slate-300 hover:bg-white/10"
                              )}
                              aria-label={isFavorite ? "הסר ממועדפים" : "הוסף למועדפים"}
                            >
                              <Star className={cn("w-4 h-4", isFavorite ? "text-yellow-300 fill-yellow-300" : "text-slate-500")} />
                            </button>
                            {isEditing ? (
                              <>
                                <button
                                  onClick={saveEditingPersonalPrompt}
                                  className="p-2 rounded-full border border-white/10 text-slate-300 hover:bg-white/10 transition-colors"
                                  title="שמור שינויים"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={cancelEditingPersonalPrompt}
                                  className="p-2 rounded-full border border-white/10 text-slate-500 hover:bg-white/10 transition-colors"
                                  title="בטל עריכה"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => startEditingPersonalPrompt(prompt)}
                                className="p-2 rounded-full border border-white/10 text-slate-500 hover:text-slate-200 hover:bg-white/10 transition-colors"
                                title="ערוך פרטי פרומפט"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => removePersonalPrompt(prompt.id)}
                              className="p-2 rounded-full border border-white/10 text-slate-500 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                              title="הסר מהספריה האישית"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div
                          className="text-sm text-slate-300 leading-relaxed max-h-44 overflow-hidden"
                          dir="rtl"
                          dangerouslySetInnerHTML={{ __html: toStyledHtml(styledMarkup) }}
                        />

                        {isStyling && (
                          <div className="mt-4 rounded-xl border border-white/10 bg-black/40 p-4">
                            <div className="text-[11px] text-slate-500 mb-2">בחר/י טקסט ואז צבע/היילייט</div>
                            <div className="flex flex-wrap gap-2 mb-3">
                              {Object.keys(STYLE_TEXT_COLORS).map((color) => (
                                <button
                                  key={`text-${color}`}
                                  onClick={() => applyStyleToken("c", color)}
                                  className="px-2 py-1 rounded-full text-[10px] border border-white/10 text-slate-300 hover:bg-white/10"
                                  title={`צבע טקסט: ${color}`}
                                >
                                  <span className={cn("font-semibold", STYLE_TEXT_COLORS[color])}>Aa</span>
                                </button>
                              ))}
                            </div>
                            <div className="flex flex-wrap gap-2 mb-3">
                              {Object.keys(STYLE_HIGHLIGHT_COLORS).map((color) => (
                                <button
                                  key={`hl-${color}`}
                                  onClick={() => applyStyleToken("hl", color)}
                                  className={cn(
                                    "px-2 py-1 rounded-full text-[10px] border border-white/10 hover:bg-white/10",
                                    STYLE_HIGHLIGHT_COLORS[color]
                                  )}
                                  title={`היילייט: ${color}`}
                                >
                                  HL
                                </button>
                              ))}
                            </div>
                            <textarea
                              ref={styleTextareaRef}
                              dir="rtl"
                              value={styleDraft}
                              onChange={(e) => setStyleDraft(e.target.value)}
                              className="w-full h-28 bg-black/30 border border-white/10 rounded-lg p-3 text-xs text-slate-200 focus:outline-none focus:border-white/30 resize-none"
                              placeholder="ערוך/י טקסט והשתמש/י בכפתורים לצבעים והדגשות"
                            />
                            <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                              <button
                                onClick={clearStyleTokens}
                                className="px-2 py-1 rounded-full border border-white/10 text-slate-400 hover:bg-white/10"
                              >
                                נקה עיצוב
                              </button>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => saveStylePrompt(prompt.id)}
                                  className="px-3 py-1 rounded-full bg-white text-black hover:bg-slate-200"
                                >
                                  שמור
                                </button>
                                <button
                                  onClick={closeStyleEditor}
                                  className="px-3 py-1 rounded-full border border-white/10 text-slate-400 hover:bg-white/10"
                                >
                                  סגור
                                </button>
                              </div>
                            </div>
                            <div className="mt-4 text-[11px] text-slate-500">תצוגה מקדימה</div>
                            <div
                              className="mt-2 text-sm text-slate-200 leading-relaxed"
                              dir="rtl"
                              dangerouslySetInnerHTML={{ __html: toStyledHtml(styleDraft) }}
                            />
                          </div>
                        )}

                        <div className="flex flex-col gap-2">
                          <label className="text-xs text-slate-500">קטגוריה אישית</label>
                          <select
                            value={prompt.personal_category}
                            onChange={(e) => updatePersonalPromptCategory(prompt.id, e.target.value)}
                            className="bg-black/30 border border-white/10 rounded-lg py-2 px-3 text-sm text-slate-200 focus:outline-none focus:border-white/30"
                          >
                            {Array.from(
                              new Set([
                                PERSONAL_DEFAULT_CATEGORY,
                                ...personalCategories,
                                ...filteredPersonalLibrary.map((item) => item.personal_category),
                              ])
                            ).map((cat) => (
                              <option key={cat} value={cat}>
                                {cat}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="flex items-center justify-between text-xs text-slate-400">
                          <span>{prompt.use_count > 0 ? `שומש ${prompt.use_count} פעמים` : "חדש"}</span>
                          <span className="text-slate-500">
                            {prompt.source === "library" ? "נשמר מספריה" : "פרומפט שלי"}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 pt-1">
                          <button
                            onClick={() => handleUsePersonalPrompt(prompt)}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-black text-sm hover:bg-slate-200 transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                            השתמש בפרומפט
                          </button>
                          <button
                            onClick={() => handleCopyText(prompt.prompt_he)}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 text-slate-300 text-sm hover:bg-white/10 transition-colors"
                          >
                            <Copy className="w-3 h-3" />
                            העתק
                          </button>
                          <button
                            onClick={() => openStyleEditor(prompt)}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 text-slate-300 text-sm hover:bg-white/10 transition-colors"
                          >
                            <Pencil className="w-3 h-3" />
                            עיצוב
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {personalSort === "custom" && draggingPersonalId && (
                  <div
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => handlePersonalDropToEnd(event, category)}
                    className="mt-4 border border-dashed border-white/15 rounded-2xl px-4 py-3 text-xs text-slate-500 text-center"
                  >
                    שחרר/י כאן כדי למקם בסוף הקטגוריה
                  </div>
                )}
              </div>
            ))}

            {totalCount === 0 && (
              <div className="glass-card p-10 rounded-xl border-white/10 bg-black/40 text-center text-slate-500">
                אין עדיין פרומפטים בספריה האישית. שמור/י פרומפטים מהספריה או מההיסטוריה.
              </div>
            )}
          </>
        )}
      </div>
    );
  };
  return (
    <main className="min-h-screen bg-black text-silver font-sans relative overflow-hidden selection:bg-purple-500/30">
      {isLoading && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div
            className="flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-black/60 px-8 py-6 shadow-[0_0_60px_rgba(59,130,246,0.25)]"
            role="status"
            aria-live="polite"
          >
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-white/80 animate-pulse" />
                <span className="h-2.5 w-2.5 rounded-full bg-white/70 animate-pulse" style={{ animationDelay: "120ms" }} />
                <span className="h-2.5 w-2.5 rounded-full bg-white/60 animate-pulse" style={{ animationDelay: "240ms" }} />
              </div>
              <span className="text-sm text-slate-200 font-medium">מייצרים את הפרומפט שלך</span>
            </div>
            <p className="text-[11px] text-slate-500">מכווננים הקשר, טון ותוצאה רצויה...</p>
          </div>
        </div>
      )}
      {/* Header UI (Top Left) */}
      <div className="fixed top-6 left-6 z-[9999]">
        <UserMenu user={user} position="top" />
      </div>

      {/* User Actions UI (Bottom Left) */}
      <div className="fixed bottom-6 left-6 z-[9999]">
        <UserMenu user={user} position="bottom" />
      </div>

      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end gap-3">
        <button 
          className="px-6 py-2.5 bg-white text-black font-semibold rounded-lg border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all active:translate-x-[4px] active:translate-y-[4px] active:shadow-none"
        >
          Help us improve
        </button>
        <div className="flex items-center gap-4 text-[10px] text-slate-500 font-medium" suppressHydrationWarning>
          <Link href="/privacy" className="hover:text-purple-400 transition-colors underline decoration-white/5 underline-offset-4" suppressHydrationWarning>Privacy Policy</Link>
          <span className="w-1 h-1 rounded-full bg-slate-800" />
          <Link href="/accessibility" className="hover:text-purple-400 transition-colors underline decoration-white/5 underline-offset-4" suppressHydrationWarning>Accessibility</Link>
          <span className="w-1 h-1 rounded-full bg-slate-800" />
          <span className="select-none">© Peroot 2026</span>
        </div>
      </div>
      <div className="noise-overlay fixed inset-0 z-0 pointer-events-none opacity-20"></div>
      <Toaster theme="dark" position="top-center" />
      
      {/* Background Gradients */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-900/10 blur-[150px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-900/10 blur-[150px] rounded-full"></div>
      </div>

      <div className="relative z-10 w-full">
        {viewMode === "library" ? (
          <div className="w-full max-w-[1800px] mx-auto p-4 md:p-8">
            {renderLibraryPage()}
          </div>
        ) : viewMode === "personal" ? (
          <div className="w-full max-w-[1800px] mx-auto p-4 md:p-8">
            {renderPersonalLibraryPage()}
          </div>
        ) : (
          <div className="w-full max-w-[1800px] mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 order-1 lg:order-2">
              {!completion ? renderInitialView() : renderResultMain()}
            </div>
            <div className="lg:col-span-4 order-2 lg:order-1 flex flex-col gap-6">
              {renderHistoryPanel()}
              {completion ? renderImprovePanel() : null}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
