"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type SetStateAction } from "react";
import NextImage from "next/image";
import { getAssetPath } from "@/lib/asset-path";
import { getApiPath } from "@/lib/api-path";
import { toast } from 'sonner';
import { User } from "@supabase/supabase-js";
import { useHistory, HistoryItem } from "@/hooks/useHistory";
import { HistoryPanel } from "@/components/features/history/HistoryPanel";
import { PERSONAL_DEFAULT_CATEGORY } from "@/lib/constants";
import { CapabilityMode } from "@/lib/capability-mode";
import { useFavorites } from "@/hooks/useFavorites";
import { UserMenu } from "@/components/layout/user-nav";
import { PromptInput } from "@/components/features/prompt-improver/PromptInput";
import dynamic from "next/dynamic";

const ResultSection = dynamic(
  () => import("@/components/features/prompt-improver/ResultSection").then(mod => mod.ResultSection),
  { ssr: false }
);
import { LoginRequiredModal } from "@/components/ui/LoginRequiredModal";
const FAQBubble = dynamic(
  () => import("@/components/features/faq/FAQBubble").then(mod => mod.FAQBubble),
  { ssr: false }
);
const SmartRefinement = dynamic(
  () => import("@/components/features/prompt-improver/SmartRefinement").then(mod => mod.SmartRefinement),
  { ssr: false }
);
import { extractPlaceholders, escapeRegExp } from "@/lib/text-utils";
import { LibraryPrompt, PersonalPrompt } from "@/lib/types";
import { BaseEngine } from "@/lib/engines/base-engine";
import { createClient } from "@/lib/supabase/client";
import { OnboardingOverlay } from "@/components/ui/OnboardingOverlay";
import { useLibraryContext } from "@/context/LibraryContext";
const LibraryView = dynamic(
  () => import("@/components/views/LibraryView").then(mod => mod.LibraryView),
  { ssr: false }
);
const PersonalLibraryView = dynamic(
  () => import("@/components/views/PersonalLibraryView").then(mod => mod.PersonalLibraryView),
  { ssr: false }
);
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";
import StreamingProgress from "@/components/ui/StreamingProgress";
import { BookOpen, Star, Library, PanelRightOpen, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePromptWorkflow } from "@/hooks/usePromptWorkflow";
import { useStreamingCompletion } from "@/hooks/useStreamingCompletion";
import { useI18n } from "@/context/I18nContext";

// Constants

const getPromptKey = (text: string) => {
  const normalized = text.trim().slice(0, 500);
  if (!normalized) return "empty";
  let hash = 0;
  for (let i = 0; i < normalized.length; i += 1) {
    hash = (hash * 31 + normalized.charCodeAt(i)) | 0;
  }
  return `${Math.abs(hash)}:${normalized.length}`;
};

function PageContent({ user }: { user: User | null }) {
  const t = useI18n();
  const { history, addToHistory, clearHistory, isLoaded } = useHistory();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { toggleFavorite: _toggle } = useFavorites();

  const {
    viewMode,
    setViewMode,
    addPrompt,
    personalView,
    setPersonalView,
    completeOnboarding
  } = useLibraryContext();

  const { state: ps, dispatch } = usePromptWorkflow();

  const setInputVal = useCallback((action: SetStateAction<string>) => {
    if (typeof action === 'function') {
      // We need current value for functional updates — read from ref
      dispatch({ type: 'SET_INPUT', payload: action(ps.input) });
    } else {
      dispatch({ type: 'SET_INPUT', payload: action });
    }
  }, [dispatch, ps.input]);

  // Mutable refs for streaming delimiter parsing
  const streamAccRef = useRef({ promptText: "", questionsPart: "", foundDelimiter: false });

  const { startStream } = useStreamingCompletion({
    onChunk: useCallback((chunk: string) => {
      const acc = streamAccRef.current;
      if (!acc.foundDelimiter) {
        if (chunk.includes("[GENIUS_QUESTIONS]")) {
          acc.foundDelimiter = true;
          const [text, json] = chunk.split("[GENIUS_QUESTIONS]");
          acc.promptText += text;
          acc.questionsPart += json || "";
          dispatch({ type: 'SET_COMPLETION', payload: acc.promptText });
        } else {
          acc.promptText += chunk;
          dispatch({ type: 'SET_COMPLETION', payload: acc.promptText });
        }
      } else {
        acc.questionsPart += chunk;
      }
    }, [dispatch]),
    onDone: useCallback(() => {
      dispatch({ type: 'STREAM_DONE' });
    }, [dispatch]),
    onError: useCallback((error: Error) => {
      dispatch({ type: 'SET_ERROR', payload: error.message });
    }, [dispatch]),
  });

  // Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // User / Auth State
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Usage & Feedback
  const [guestPromptCount, setGuestPromptCount] = useState(0);

  // Modals
  const [isLoginRequiredModalOpen, setIsLoginRequiredModalOpen] = useState(false);
  const [loginRequiredConfig, setLoginRequiredConfig] = useState<{title?: string; message?: string; feature?: string}>({});

  // --- Effects ---

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = sessionStorage.getItem("peroot_guest_count");
    if (stored) setGuestPromptCount(parseInt(stored, 10));
  }, []);

  useEffect(() => {
    const supabase = createClient();
    const fetchUserProfile = async () => {
      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('onboarding_completed')
          .eq('id', user.id)
          .maybeSingle();

        if (error) {
          console.error("Error fetching profile:", error);
        } else if (data) {
          if (!data.onboarding_completed) {
            setShowOnboarding(true);
          }
        }
      } else {
        setShowOnboarding(false);
      }
    };
    fetchUserProfile();
  }, [user]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (ps.completion) {
          dispatch({ type: 'SET_COMPLETION', payload: '' });
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'c') {
        if (ps.completion) {
          navigator.clipboard.writeText(ps.completion);
          dispatch({ type: 'SET_COPIED', payload: true });
          setTimeout(() => dispatch({ type: 'SET_COPIED', payload: false }), 2000);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [ps.completion, dispatch]);

  // --- Logic ---

  const showLoginRequired = (feature: string, message?: string) => {
    setLoginRequiredConfig({
      feature,
      message: message || t.home.login_required_msg.replace('{feature}', feature)
    });
    setIsLoginRequiredModalOpen(true);
  };

  const inputScore = useMemo(
    () => BaseEngine.scorePrompt(ps.input),
    [ps.input]
  );
  const completionScore = useMemo(
    () => BaseEngine.scorePrompt(ps.completion),
    [ps.completion]
  );

  const scoreTone =
    inputScore.level === "high"
      ? { text: "text-amber-400", bar: "bg-gradient-to-r from-amber-500 to-yellow-400" }
      : inputScore.level === "medium"
        ? { text: "text-amber-500/70", bar: "bg-gradient-to-r from-amber-600 to-amber-400" }
        : inputScore.level === "low"
          ? { text: "text-red-400", bar: "bg-red-500" }
          : { text: "text-slate-500", bar: "bg-slate-600" };

  const placeholders = useMemo(() => extractPlaceholders(ps.completion), [ps.completion]);
  const inputVariables = useMemo(() => extractPlaceholders(ps.input), [ps.input]);

  const applyVariablesToPrompt = () => {
    if (inputVariables.length === 0) return;
    let next = ps.input;
    inputVariables.forEach((variable) => {
      const value = ps.variableValues[variable]?.trim();
      if (!value) return;
      const pattern = new RegExp(`\\{\\s*${escapeRegExp(variable)}\\s*\\}`, "g");
      next = next.replace(pattern, value);
    });
    dispatch({ type: 'SET_INPUT', payload: next });
  };

  const recordUsageSignal = (type: "copy" | "save" | "refine" | "enhance", text: string) => {
    const target = text.trim();
    if (!target) return;
    const key = getPromptKey(target);
    void fetch(getApiPath("/api/prompt-usage"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt_key: key,
        event_type: type,
        prompt_length: target.length,
      }),
    }).catch(() => {});
  };

  const processStreamResult = (label: string) => {
    const acc = streamAccRef.current;
    if (acc.questionsPart) {
      try {
        let jsonStr = acc.questionsPart.trim();
        // Handle common AI formatting issues (markdown code blocks)
        if (jsonStr.startsWith("```json")) jsonStr = jsonStr.replace(/^```json\s*/, "").replace(/```\s*$/, "");
        if (jsonStr.startsWith("```")) jsonStr = jsonStr.replace(/^```\s*/, "").replace(/```\s*$/, "");
        const parsed = JSON.parse(jsonStr);
        const questions = Array.isArray(parsed) ? parsed : parsed.questions || [];
        dispatch({ type: 'SET_QUESTIONS', payload: questions });
      } catch (e) {
        console.warn(`[${label}] Questions parse failed, attempting recovery`, e);
        // Try to extract JSON array from malformed response
        const arrayMatch = acc.questionsPart.match(/\[[\s\S]*\]/);
        if (arrayMatch) {
          try {
            dispatch({ type: 'SET_QUESTIONS', payload: JSON.parse(arrayMatch[0]) });
          } catch { /* truly unrecoverable — no questions shown */ }
        }
      }
    }

    const extracted = extractPlaceholders(acc.promptText);
    const newVars = { ...ps.variableValues };
    extracted.forEach(ph => { if (!(ph in newVars)) newVars[ph] = ""; });
    dispatch({ type: 'SET_VARIABLE_VALUES', payload: newVars });

    return acc.promptText;
  };

  const handleEnhance = async () => {
    if (!ps.input.trim() || ps.isLoading) return;
    if (!user && guestPromptCount >= 1) {
      showLoginRequired("שימוש ללא הגבלה", "ניצלת את הפרומפט החינמי שלך לסשן זה. התחבר כדי להמשיך ללא הגבלה!");
      return;
    }

    dispatch({ type: 'START_STREAM' });
    dispatch({ type: 'SET_QUESTIONS', payload: [] });
    dispatch({ type: 'CLEAR_ANSWERS' });
    streamAccRef.current = { promptText: "", questionsPart: "", foundDelimiter: false };

    await startStream(getApiPath("/api/enhance"), {
      prompt: ps.input,
      tone: ps.selectedTone,
      category: ps.selectedCategory,
      capability_mode: ps.selectedCapability,
    });

    const promptText = processStreamResult("Enhance");
    if (promptText) {
      recordUsageSignal("enhance", promptText);
      dispatch({ type: 'SET_DETECTED_CATEGORY', payload: ps.selectedCategory });

      addToHistory({
        original: ps.input,
        enhanced: promptText,
        tone: ps.selectedTone,
        category: ps.selectedCategory,
      });

      if (!user) {
        const nextCount = guestPromptCount + 1;
        setGuestPromptCount(nextCount);
        sessionStorage.setItem("peroot_guest_count", nextCount.toString());
      }
      toast.success(t.prompt_generator.success_toast);
    }
  };

  const handleRefine = async (instruction: string) => {
    if (ps.isLoading) return;
    const hasAnswers = Object.values(ps.questionAnswers).some(a => a.trim());
    if ((!instruction.trim() && !hasAnswers) || !ps.completion) return;

    // Capture before START_STREAM resets completion to ""
    const currentCompletion = ps.completion;

    dispatch({ type: 'START_STREAM' });
    dispatch({ type: 'SET_QUESTIONS', payload: [] });
    streamAccRef.current = { promptText: "", questionsPart: "", foundDelimiter: false };

    // Build combined instruction from answers + custom instruction
    const answerParts = ps.questions
      .filter(q => ps.questionAnswers[q.id]?.trim())
      .map(q => `שאלה: ${q.question}\nתשובה: ${ps.questionAnswers[q.id]}`);

    const combinedInstruction = [
      ...answerParts,
      instruction.trim() ? `הוראה נוספת: ${instruction}` : "",
    ].filter(Boolean).join("\n\n");

    // Convert numeric keys to string keys for API
    const stringAnswers: Record<string, string> = {};
    for (const [k, v] of Object.entries(ps.questionAnswers)) {
      if (v.trim()) stringAnswers[String(k)] = v;
    }

    await startStream(getApiPath("/api/enhance"), {
      prompt: ps.input,
      tone: ps.selectedTone,
      category: ps.selectedCategory,
      capability_mode: ps.selectedCapability,
      previousResult: currentCompletion,
      refinementInstruction: combinedInstruction,
      answers: stringAnswers,
    });

    const promptText = processStreamResult("Refine");
    if (promptText) {
      recordUsageSignal("refine", promptText);
      dispatch({ type: 'INCREMENT_ITERATION' });
      toast.success("הפרומפט עודכן!");
    }
  };

  const handleCopyText = async (text: string) => {
    await navigator.clipboard.writeText(text);
    dispatch({ type: 'SET_COPIED', payload: true });
    setTimeout(() => dispatch({ type: 'SET_COPIED', payload: false }), 2000);
    recordUsageSignal("copy", text);
    toast.success("הועתק ללוח!");
  };

  const handleUsePrompt = (prompt: LibraryPrompt | PersonalPrompt) => {
    dispatch({ type: 'SET_INPUT', payload: prompt.prompt });
    setViewMode("home");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleRestore = (item: HistoryItem) => {
    dispatch({ type: 'SET_INPUT', payload: item.original });
    dispatch({ type: 'SET_TONE', payload: item.tone });
    dispatch({ type: 'SET_CATEGORY', payload: item.category });
    dispatch({ type: 'SET_COMPLETION', payload: item.enhanced });
    dispatch({ type: 'SET_QUESTIONS', payload: [] });
    toast.success("הפרומפט שוחזר");
  };

  const addPersonalPromptFromHistory = (item: HistoryItem) => {
    if (!user) {
      showLoginRequired("שמירת פרומפטים");
      return;
    }
    addPrompt({
      title: item.original.slice(0, 30) + (item.original.length > 30 ? "..." : ""),
      prompt: item.enhanced,
      category: item.category,
      personal_category: PERSONAL_DEFAULT_CATEGORY,
      capability_mode: CapabilityMode.STANDARD,
      use_case: "נשמר מהיסטוריה",
      source: "manual"
    });
    recordUsageSignal("save", item.enhanced);
    toast.success("נשמר לספריה האישית!");
  };

  const saveCompletionToPersonal = () => {
    if (!user) {
       showLoginRequired("שמירת פרומפטים");
       return;
    }
    if (!ps.completion.trim()) return;
    addPrompt({
      title: ps.input.slice(0, 30) + (ps.input.length > 30 ? "..." : ""),
      prompt: ps.completion,
      category: ps.detectedCategory || ps.selectedCategory,
      personal_category: PERSONAL_DEFAULT_CATEGORY,
      capability_mode: ps.selectedCapability,
      use_case: "נשמר מהתוצאה",
      source: "manual"
    });
    recordUsageSignal("save", ps.completion);
    toast.success("נשמר לספריה האישית!");
  };

  const handleImportHistory = () => {
     history.forEach(item => addPersonalPromptFromHistory(item));
     toast.success("כל ההיסטוריה יובאה!");
  };

  const handleOnboardingComplete = async () => {
      try {
          await completeOnboarding();
          setShowOnboarding(false);
          toast.success("ברוכים הבאים לפירוט!");
      } catch (e) {
          console.error('[Onboarding] Error:', e);
          toast.error("שגיאה בשמירת נתוני Onboarding");
      }
  };

  const handleNavPersonal = () => {
     setViewMode("personal");
     setPersonalView("all");
  };

  const handleNavFavorites = () => {
    setViewMode("personal");
    setPersonalView("favorites");
  };

  const handleNavLibrary = () => {
    setViewMode("library");
  };

  // --- Render ---

  if (viewMode === "library") {
    return (
        <LibraryView
            onUsePrompt={handleUsePrompt}
            onCopyText={async (t) => { await handleCopyText(t); }}
        />
    );
  }

  if (viewMode === "personal") {
    return (
        <PersonalLibraryView
            onUsePrompt={handleUsePrompt}
            onCopyText={async (t) => { await handleCopyText(t); }}
            handleImportHistory={handleImportHistory}
            historyLength={history.length}
        />
    );
  }

  // Home View
  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-[1920px] mx-auto w-full">
      {/* Background Gradient */}
      <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-amber-500/8 via-yellow-500/4 to-transparent blur-3xl -z-10" />

      {/* Fixed Elements */}
      <div className="fixed top-6 left-6 z-50">
         <UserMenu user={user} position="top" />
      </div>

      <div className="fixed bottom-6 left-6 z-50">
         <UserMenu user={user} position="bottom" />
      </div>

      <div className="fixed bottom-6 right-6 z-50">
         <FAQBubble />
      </div>

      {/* Sidebar Toggle Button (Desktop: fixed right, Mobile: fixed right) */}
      <div className="fixed top-6 right-6 z-50">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all border backdrop-blur-md cursor-pointer",
            sidebarOpen
              ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
              : "bg-black/40 border-white/10 text-slate-400 hover:text-white hover:border-white/20"
          )}
          title="היסטוריה וניווט"
        >
          <PanelRightOpen className="w-4 h-4" />
          <span className="hidden md:inline">היסטוריה</span>
        </button>
      </div>

      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden animate-in fade-in duration-200"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Drawer */}
      <div className={cn(
        "fixed top-0 right-0 z-40 h-full w-80 lg:w-72 bg-black/95 backdrop-blur-xl border-l border-white/10 flex flex-col transition-transform duration-300 ease-out",
        sidebarOpen ? "translate-x-0" : "translate-x-full"
      )}>
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <span className="text-sm font-bold text-white">ניווט והיסטוריה</span>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Buttons */}
        <div className="flex flex-col gap-2 p-4">
          <button
            onClick={() => { handleNavPersonal(); setSidebarOpen(false); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all border border-white/10 hover:border-amber-400/30 hover:bg-amber-500/10 hover:text-amber-300 text-slate-400 group bg-black/20 cursor-pointer"
          >
            <BookOpen className="w-4 h-4" />
            <span>{t.home.personal_library}</span>
          </button>

          <button
            onClick={() => { handleNavFavorites(); setSidebarOpen(false); }}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all border border-white/10 hover:border-amber-400/30 hover:bg-amber-500/10 hover:text-amber-300 text-slate-400 group cursor-pointer",
              personalView === "favorites" ? "bg-amber-500/20 text-amber-300 border-amber-400/50" : "bg-black/20"
            )}
          >
            <Star className="w-4 h-4" />
            <span>{t.home.favorites}</span>
          </button>

          <button
            onClick={() => { handleNavLibrary(); setSidebarOpen(false); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all border border-white/10 hover:border-amber-400/30 hover:bg-amber-500/10 hover:text-amber-300 text-slate-400 group bg-black/20 cursor-pointer"
          >
            <Library className="w-4 h-4" />
            <span>{t.home.public_library}</span>
          </button>
        </div>

        {/* History Panel - takes remaining space */}
        <div className="flex-1 min-h-0 px-4 pb-4">
          <HistoryPanel
            history={history}
            isLoaded={isLoaded}
            onRestore={(item) => { handleRestore(item); setSidebarOpen(false); }}
            onClear={clearHistory}
            onSaveToPersonal={addPersonalPromptFromHistory}
            onCopy={handleCopyText}
          />
        </div>
      </div>

      {/* Main Content (Full Width) */}
      <div className="flex flex-col gap-4 md:gap-6 max-w-4xl mx-auto w-full px-4 md:px-8 pt-2 md:pt-4">
           <div className="flex justify-center">
             <div className="hero-logo-container">
               <div className="hero-logo-ring hero-logo-ring-1" />
               <div className="hero-logo-ring hero-logo-ring-2" />
               <div className="hero-logo-ring hero-logo-ring-3" />
               <NextImage
                 src={getAssetPath("/Peroot.svg")}
                 alt="Peroot"
                 className="hero-logo-image"
                 width={360}
                 height={140}
                 priority
               />
             </div>
           </div>

           <LoadingOverlay isVisible={ps.isLoading} />
           <StreamingProgress phase={ps.streamPhase} />

           {!ps.completion ? (
             /* INPUT MODE */
             <>
               <PromptInput
                  inputVal={ps.input}
                  setInputVal={setInputVal}
                  handleEnhance={handleEnhance}
                  inputScore={inputScore}
                  scoreTone={scoreTone}
                  selectedCategory={ps.selectedCategory}
                  setSelectedCategory={(cat: string) => dispatch({ type: 'SET_CATEGORY', payload: cat })}
                  selectedCapability={ps.selectedCapability}
                  setSelectedCapability={(cap: CapabilityMode) => dispatch({ type: 'SET_CAPABILITY', payload: cap })}
                  isLoading={ps.isLoading}
                  variables={inputVariables}
                  variableValues={ps.variableValues}
                  setVariableValues={(vals: Record<string, string>) => dispatch({ type: 'SET_VARIABLE_VALUES', payload: vals })}
                  onApplyVariables={applyVariablesToPrompt}
               />
             </>
           ) : (
             /* RESULT MODE */
             <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 flex flex-col gap-8">
                 <ResultSection
                     completion={ps.completion}
                     copied={ps.copied}
                     onCopy={handleCopyText}
                     completionScore={completionScore}
                     onSave={saveCompletionToPersonal}
                     onBack={() => dispatch({ type: 'SET_COMPLETION', payload: "" })}
                     placeholders={placeholders}
                     variableValues={ps.variableValues}
                     improvementDelta={completionScore.baseScore - inputScore.baseScore}
                     onVariableChange={(key, val) => dispatch({ type: 'SET_VARIABLE_VALUES', payload: { ...ps.variableValues, [key]: val } })}
                     onImproveAgain={() => {
                       dispatch({ type: 'SET_INPUT', payload: ps.completion });
                       dispatch({ type: 'INCREMENT_ITERATION' });
                       handleEnhance();
                     }}
                     iterationCount={ps.iterationCount}
                 />

                 {ps.questions.length > 0 && (
                    <SmartRefinement
                       questions={ps.questions}
                       answers={ps.questionAnswers}
                       onAnswerChange={(id, val) => dispatch({ type: 'SET_QUESTION_ANSWER', payload: { id, answer: val } })}
                       onRefine={(instruction) => handleRefine(instruction || "")}
                       isLoading={ps.isLoading}
                    />
                 )}
             </div>
           )}

        </div>

      {/* Login Modal */}
      <LoginRequiredModal
        isOpen={isLoginRequiredModalOpen}
        onClose={() => setIsLoginRequiredModalOpen(false)}
        title={loginRequiredConfig.title}
        message={loginRequiredConfig.message}
        feature={loginRequiredConfig.feature}
      />

      {/* Onboarding Overlay */}
      {showOnboarding && user && (
          <OnboardingOverlay onComplete={handleOnboardingComplete} />
      )}
    </div>
  );
}

// Wrapper is no longer needed as context is global
export default function HomePage() {
  const { user } = useHistory();
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": "Peroot",
            "applicationCategory": "ProductivityApplication",
            "operatingSystem": "Web",
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "ILS"
            },
            "aggregateRating": {
              "@type": "AggregateRating",
              "ratingValue": "4.8",
              "ratingCount": "120"
            }
          })
        }}
      />
      <div className="relative min-h-[calc(100vh-1rem)] flex flex-col items-center p-4 bg-black text-slate-200 selection:bg-blue-500/30 font-sans pb-10 pt-2 px-4 md:px-6 max-w-[100vw] overflow-x-hidden" dir="rtl">
        <PageContent user={user} />
    </div>
    </>
  );
}
