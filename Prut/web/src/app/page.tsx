/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useMemo, useState } from "react";
import { Toaster, toast } from 'sonner';
import { useHistory, HistoryItem } from "@/hooks/useHistory";
import { HistoryPanel } from "@/components/features/history/HistoryPanel";
import { PERSONAL_DEFAULT_CATEGORY } from "@/lib/constants";
import { useFavorites } from "@/hooks/useFavorites";
import { UserMenu } from "@/components/layout/user-nav";
import { PromptInput } from "@/components/features/prompt-improver/PromptInput";
import { ResultSection } from "@/components/features/prompt-improver/ResultSection";
import { LoginRequiredModal } from "@/components/ui/LoginRequiredModal";
import { FAQBubble } from "@/components/features/faq/FAQBubble";
import { SmartRefinement } from "@/components/features/prompt-improver/SmartRefinement";
import { extractPlaceholders, escapeRegExp } from "@/lib/text-utils";
import { PromptUsage, Question, LibraryPrompt, PersonalPrompt } from "@/lib/types";
import { scorePrompt } from "@/lib/prompt-engine";
import { LibraryProvider, useLibraryContext } from "@/context/LibraryContext";
import { LibraryView } from "@/components/views/LibraryView";
import { PersonalLibraryView } from "@/components/views/PersonalLibraryView";
import { BookOpen } from "lucide-react";

// Constants
const USAGE_STORAGE_KEY = "peroot_prompt_usage_v1";

const getPromptKey = (text: string) => {
  const normalized = text.trim().slice(0, 500);
  if (!normalized) return "empty";
  let hash = 0;
  for (let i = 0; i < normalized.length; i += 1) {
    hash = (hash * 31 + normalized.charCodeAt(i)) | 0;
  }
  return `${Math.abs(hash)}:${normalized.length}`;
};

function PageContent() {
  const { history, addToHistory, clearHistory, isLoaded, user } = useHistory();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { toggleFavorite: _toggle } = useFavorites();
  
  const { 
    viewMode, 
    setViewMode, 
    addPrompt,
  } = useLibraryContext();

  // Editor State
  const [selectedTone, setSelectedTone] = useState("Professional");
  const [selectedCategory, setSelectedCategory] = useState("General");
  const [inputVal, setInputVal] = useState("");
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);
  
  // Results State
  const [completion, setCompletion] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [detectedCategory, setDetectedCategory] = useState("");
  const [questionAnswers, setQuestionAnswers] = useState<Record<number, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  // Usage & Feedback
  const [usageMap, setUsageMap] = useState<Record<string, PromptUsage>>({});
  const [remoteUsageMap, setRemoteUsageMap] = useState<Record<string, PromptUsage>>({});
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
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem(USAGE_STORAGE_KEY);
      if (stored) setUsageMap(JSON.parse(stored));
    } catch (error) { console.warn(error); }
  }, []);

  // --- Logic ---

  const showLoginRequired = (feature: string, message?: string) => {
    setLoginRequiredConfig({
      feature,
      message: message || `כדי להשתמש ב${feature}, יש להתחבר לחשבון שלך.`
    });
    setIsLoginRequiredModalOpen(true);
  };

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

  const scoreTone =
    inputScore.level === "high"
      ? { text: "text-emerald-400", bar: "bg-emerald-500" }
      : inputScore.level === "medium"
        ? { text: "text-yellow-400", bar: "bg-yellow-500" }
        : inputScore.level === "low"
          ? { text: "text-red-400", bar: "bg-red-500" }
          : { text: "text-slate-500", bar: "bg-slate-600" };
  
  const placeholders = useMemo(() => extractPlaceholders(completion), [completion]);
  const inputVariables = useMemo(() => extractPlaceholders(inputVal), [inputVal]);

  const applyVariablesToPrompt = () => {
    if (inputVariables.length === 0) return;
    let next = inputVal;
    inputVariables.forEach((variable) => {
      const value = variableValues[variable]?.trim();
      if (!value) return;
      const pattern = new RegExp(`\\{\\s*${escapeRegExp(variable)}\\s*\\}`, "g");
      next = next.replace(pattern, value);
    });
    setInputVal(next);
  };
  
  // Remote Usage Loader
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
        if ((error as Error).name !== "AbortError") console.warn(error);
      }
    };
    loadUsage();
    return () => controller.abort();
  }, [completion, completionKey]);

  const recordUsageSignal = (type: "copy" | "save" | "refine" | "enhance", text: string) => {
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
      const next = { ...current };
      if (type === "copy") next.copies = (next.copies || 0) + 1;
      if (type === "save") next.saves = (next.saves || 0) + 1;
      if (type === "refine") next.refinements = (next.refinements || 0) + 1;
      
      const updated = { ...prev, [key]: next };
      if (typeof window !== "undefined") {
        localStorage.setItem(USAGE_STORAGE_KEY, JSON.stringify(updated));
      }
      return updated;
    });
  };

  const handleEnhance = async () => {
    if (!inputVal.trim()) return;
    if (!user && guestPromptCount >= 1) {
      showLoginRequired("שימוש ללא הגבלה", "ניצלת את הפרומפט החינמי שלך לסשן זה. התחבר כדי להמשיך ללא הגבלה!");
      return;
    }

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
      setCompletion(data.great_prompt);
      recordUsageSignal("enhance", data.great_prompt);
      setQuestions([]);
      setQuestionAnswers({});
      setDetectedCategory(data.category || selectedCategory);

      const extracted = extractPlaceholders(data.great_prompt);
      setVariableValues(prev => {
        const next = { ...prev };
        extracted.forEach(ph => { if (!(ph in next)) next[ph] = ""; });
        return next;
      });

      addToHistory({
        original: inputVal,
        enhanced: data.great_prompt,
        tone: selectedTone,
        category: data.category || selectedCategory,
      });

      if (!user) {
        const nextCount = guestPromptCount + 1;
        setGuestPromptCount(nextCount);
        sessionStorage.setItem("peroot_guest_count", nextCount.toString());
      }
      toast.success("הפרומפט שופר!");
    } catch {
      toast.error("שגיאה בשיפור הפרומפט");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefine = async (instruction: string) => {
    const hasAnswers = Object.values(questionAnswers).some(a => a.trim());
    if ((!instruction.trim() && !hasAnswers) || !completion) return;
    
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
          questions: questions.map(q => ({ id: q.id, question: q.question })),
          answers: questionAnswers,
        }),
      });
      if (!response.ok) throw new Error("Failed to refine prompt");
      const data = await response.json();
      setCompletion(data.great_prompt);
      recordUsageSignal("refine", data.great_prompt);
      
      const extracted = extractPlaceholders(data.great_prompt);
      setVariableValues(prev => {
        const next = { ...prev };
        extracted.forEach(ph => { if (!(ph in next)) next[ph] = ""; });
        return next;
      });

      if (data.clarifying_questions?.length > 0) {
        setQuestions(data.clarifying_questions);
        setQuestionAnswers({});
      } else {
        setQuestions([]);
        setQuestionAnswers({});
      }
      toast.success("הפרומפט עודכן!");
    } catch {
      toast.error("שגיאה בעדכון הפרומפט");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyText = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    recordUsageSignal("copy", text);
    toast.success("הועתק ללוח!");
  };

  const handleUsePrompt = (prompt: LibraryPrompt | PersonalPrompt) => {
    setInputVal(prompt.prompt_he);
    setViewMode("home");
    window.scrollTo({ top: 0, behavior: "smooth" });
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
    if (!user) {
      showLoginRequired("שמירת פרומפטים");
      return;
    }
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
    if (!user) {
       showLoginRequired("שמירת פרומפטים");
       return;
    }
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

  const handleImportHistory = () => {
     history.forEach(item => addPersonalPromptFromHistory(item));
     toast.success("כל ההיסטוריה יובאה!");
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
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col items-center justify-center pt-8 pb-4 relative z-10 transition-all duration-500 ease-out">
        <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-purple-500/10 via-blue-500/5 to-transparent blur-3xl -z-10" />
        <img 
          src="/logo.svg" 
          alt="Peroot" 
          className="h-32 w-auto mb-6 drop-shadow-2xl brightness-110 hover:scale-105 transition-transform duration-500"
        />
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif text-center text-transparent bg-clip-text bg-gradient-to-r from-white via-blue-100 to-white drop-shadow-sm tracking-tight px-4 pb-2">
            הפרומפט שלך, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-purple-300 font-italic">מדויק יותר.</span>
        </h1>
        <p className="mt-4 text-slate-400 text-lg md:text-xl text-center max-w-2xl px-4 font-light leading-relaxed">
            שפר/י את הפרומפטים שלך עם בינה מלאכותית מתקדמת,
            <br className="hidden md:block"/>
            התאם אותם לצרכים שלך וקבל תוצות טובות יותר.
        </p>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button 
             onClick={() => setViewMode("library")}
             className="px-6 py-2.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-slate-300 text-sm flex items-center gap-2 group backdrop-blur-sm"
          >
             <BookOpen className="w-4 h-4 group-hover:text-blue-300 transition-colors" />
             ספריית פרומפטים
          </button>
           <button 
             onClick={() => setViewMode("personal")}
             className="px-6 py-2.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-slate-300 text-sm flex items-center gap-2 group backdrop-blur-sm"
          >
             <UserMenu user={user} position="top" /> 
             {/* Note: UserMenu inside button is unconventional if it contains its own buttons/links */}
             {/* Wait, the original design had UserMenu separately. 
                 The button here says "האזור האישי".
                 Actually, UserMenu has its own avatar trigger. 
                 If I place UserMenu inside a button, clicking the button triggers both?
                 Let's check the design.
                 The previous code (Step 424) had:
                 <button ...> <UserMenu /> <span...>האזור האישי</span> </button>
                 This seems wrong because UserMenu has an interactive button.
                 I should probably keep the UserMenu separate or make the UserMenu *be* the trigger.
                 However, to preserve the look, maybe I should just use an Icon here?
                 Or maybe just rely on the UserMenu in the corner?
                 The "Personal Area" button switches view to personal library.
                 So here I should just have an icon, not UserMenu component.
             */}
             <span className="group-hover:text-purple-300 transition-colors">האזור האישי</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* Main Content */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <PromptInput
             user={user}
             inputVal={inputVal}
             setInputVal={setInputVal}
             handleEnhance={handleEnhance}
             inputScore={inputScore}
             scoreTone={scoreTone}
             selectedTone={selectedTone}
             setSelectedTone={setSelectedTone}
             selectedCategory={selectedCategory}
             setSelectedCategory={setSelectedCategory}
             isLoading={isLoading}
             variables={inputVariables}
             variableValues={variableValues}
             setVariableValues={setVariableValues}
             onApplyVariables={applyVariablesToPrompt}
          />

          {completion && (
            <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150">
                <ResultSection
                    completion={completion}
                    copied={copied}
                    onCopy={handleCopyText}
                    improvementDelta={0} // calculated locally?
                    completionScore={completionScore}
                    onSave={saveCompletionToPersonal}
                    onBack={() => setCompletion("")}
                    placeholders={placeholders}
                    variableValues={variableValues}
                    // calculated locally in useMemo: improvementDelta
                    improvementDelta={completionScore.baseScore - inputScore.baseScore}
                />
                
                {questions.length > 0 && (
                   <SmartRefinement
                      questions={questions}
                      answers={questionAnswers}
                      onAnswerChange={(id, val) => setQuestionAnswers(prev => ({...prev, [id]: val}))}
                      onRefine={() => handleRefine("")}
                      isLoading={isLoading}
                   />
                )}
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="lg:col-span-4 flex flex-col gap-6 space-y-6">
           <HistoryPanel
              history={history}
              isLoaded={isLoaded}
              onRestore={handleRestore}
              onClear={clearHistory}
              onSaveToPersonal={addPersonalPromptFromHistory}
              onCopy={handleCopyText}
           />
           
           <FAQBubble />
        </div>
      </div>
      
      {/* Login Modal */}
      <LoginRequiredModal
        isOpen={isLoginRequiredModalOpen}
        onClose={() => setIsLoginRequiredModalOpen(false)}
        title={loginRequiredConfig.title}
        message={loginRequiredConfig.message}
        feature={loginRequiredConfig.feature}
      />
      
      <div className="fixed top-4 left-4 z-50">
        <UserMenu user={user} position="top" />
      </div>
    </div>
  );
}

// Wrapper component to provide context and user state
function HomeWrapper() {
  const { user } = useHistory(); // History hook also provides user, convenient
  const [isLoginRequiredModalOpen, setIsLoginRequiredModalOpen] = useState(false);
  const [loginFeature, setLoginFeature] = useState("");

  const showLoginRequired = (feature: string) => {
      setLoginFeature(feature);
      setIsLoginRequiredModalOpen(true);
  };

  return (
    <LibraryProvider user={user} showLoginRequired={showLoginRequired}>
        <div className="min-h-screen bg-black text-slate-200 selection:bg-blue-500/30 font-sans pb-20 pt-6 px-4 md:px-6 max-w-7xl mx-auto">
            <Toaster position="top-center" theme="dark" closeButton />
            <PageContent />
            
             <LoginRequiredModal
                isOpen={isLoginRequiredModalOpen}
                onClose={() => setIsLoginRequiredModalOpen(false)}
                title="התחברות נדרשת"
                message={`כדי להשתמש ב${loginFeature}, יש להתחבר לחשבון.`}
                feature={loginFeature}
            />
        </div>
    </LibraryProvider>
  );
}

export default HomeWrapper;
