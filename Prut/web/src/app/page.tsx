"use client";

import { useEffect, useMemo, useState } from "react";
import NextImage from "next/image";
import { Toaster, toast } from 'sonner';
import { User } from "@supabase/supabase-js";
import { useHistory, HistoryItem } from "@/hooks/useHistory";
import { HistoryPanel } from "@/components/features/history/HistoryPanel";
import { PERSONAL_DEFAULT_CATEGORY } from "@/lib/constants";
import { CapabilityMode } from "@/lib/capability-mode";
import { useFavorites } from "@/hooks/useFavorites";
import { UserMenu } from "@/components/layout/user-nav";
import { PromptInput } from "@/components/features/prompt-improver/PromptInput";
import { ResultSection } from "@/components/features/prompt-improver/ResultSection";
import { LoginRequiredModal } from "@/components/ui/LoginRequiredModal";
import { FAQBubble } from "@/components/features/faq/FAQBubble";
import { SmartRefinement } from "@/components/features/prompt-improver/SmartRefinement";
import { extractPlaceholders, escapeRegExp } from "@/lib/text-utils";
import { Question, LibraryPrompt, PersonalPrompt } from "@/lib/types";
import { BaseEngine } from "@/lib/engines/base-engine";
import { createClient } from "@/lib/supabase/client";
import { OnboardingOverlay } from "@/components/ui/OnboardingOverlay";
import { LibraryProvider, useLibraryContext } from "@/context/LibraryContext";
import { LibraryView } from "@/components/views/LibraryView";
import { PersonalLibraryView } from "@/components/views/PersonalLibraryView";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";
import { BookOpen, Star, Library } from "lucide-react";
import { cn } from "@/lib/utils";

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

import { useI18n } from "@/context/I18nContext";

function PageContent({ user }: { user: User | null }) {
  const t = useI18n();
  const { history, addToHistory, clearHistory, isLoaded } = useHistory();
  // ... rest of imports stay the same ...
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { toggleFavorite: _toggle } = useFavorites();
  
  const { 
    viewMode, 
    setViewMode, 
    addPrompt,
    personalView,
    setPersonalView,
    updateProfile,
    completeOnboarding
  } = useLibraryContext();

  // User / Auth State
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Editor State
  const [selectedTone, setSelectedTone] = useState("Professional");
  const [selectedCategory, setSelectedCategory] = useState("General");
  const [selectedCapability, setSelectedCapability] = useState<CapabilityMode>(CapabilityMode.STANDARD);
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

  // --- Logic ---

  const showLoginRequired = (feature: string, message?: string) => {
    setLoginRequiredConfig({
      feature,
      message: message || t.home.login_required_msg.replace('{feature}', feature)
    });
    setIsLoginRequiredModalOpen(true);
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const completionKey = useMemo(() => getPromptKey(completion), [completion]);
  
  const inputScore = useMemo(
    () => BaseEngine.scorePrompt(inputVal),
    [inputVal]
  );
  const completionScore = useMemo(
    () => BaseEngine.scorePrompt(completion),
    [completion]
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
        body: JSON.stringify({ 
          prompt: inputVal, 
          tone: selectedTone, 
          category: selectedCategory,
          capability_mode: selectedCapability 
        }),
      });

      if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to enhance prompt");
      }

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        fullText += chunk;
        setCompletion(fullText);
      }

      // Cleanup & Post-processing
      recordUsageSignal("enhance", fullText);
      setDetectedCategory(selectedCategory);

      const extracted = extractPlaceholders(fullText);
      setVariableValues(prev => {
        const next = { ...prev };
        extracted.forEach(ph => { if (!(ph in next)) next[ph] = ""; });
        return next;
      });

      addToHistory({
        original: inputVal,
        enhanced: fullText,
        tone: selectedTone,
        category: selectedCategory,
      });

      if (!user) {
        const nextCount = guestPromptCount + 1;
        setGuestPromptCount(nextCount);
        sessionStorage.setItem("peroot_guest_count", nextCount.toString());
      }
      toast.success(t.prompt_generator.success_toast);

    } catch (e) {
      const err = e as Error;
      console.error("[Enhance] Error:", err);
      toast.error(err.message || t.prompt_generator.error_toast);
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
          capability_mode: selectedCapability,
          previousResult: completion,
          refinementInstruction: instruction,
          questions: questions.map(q => ({ id: q.id, question: q.question })),
          answers: questionAnswers,
        }),
      });

      if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to refine prompt");
      }

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      // Stream the refined text
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        fullText += chunk;
        setCompletion(fullText);
      }

      recordUsageSignal("refine", fullText);
      
      const extracted = extractPlaceholders(fullText);
      setVariableValues(prev => {
        const next = { ...prev };
        extracted.forEach(ph => { if (!(ph in next)) next[ph] = ""; });
        return next;
      });

      // For refinement, we don't always get new questions unless logic changes
      // In current streaming mode, we might need a separate endpoint for metadata
      // For now, clear questions on finish to avoid stale state
      setQuestions([]);
      setQuestionAnswers({});

      toast.success("הפרומפט עודכן!");

    } catch (e) {
      const err = e as Error;
      console.error("[Refine] Error:", err);
      toast.error(err.message || "שגיאה בעדכון הפרומפט");
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
    setInputVal(prompt.prompt);
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
    if (!completion.trim()) return;
    addPrompt({
      title: inputVal.slice(0, 30) + (inputVal.length > 30 ? "..." : ""),
      prompt: completion,
      category: detectedCategory || selectedCategory,
      personal_category: PERSONAL_DEFAULT_CATEGORY,
      capability_mode: selectedCapability,
      use_case: "נשמר מהתוצאה",
      source: "manual"
    });
    recordUsageSignal("save", completion);
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

  // Home View - Restored Layout
  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-[1920px] mx-auto w-full">
      {/* Background Gradient */}
      <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-purple-500/10 via-blue-500/5 to-transparent blur-3xl -z-10" />

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

      {/* Grid Layout - Sidebar First for Right Alignment in RTL */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-8 px-4 md:px-8">

        {/* Right Sidebar (History & Navigation) */}
        <div className="lg:col-span-3 h-[calc(100vh-40px)] sticky top-6 flex flex-col gap-4">
           
           {/* Navigation Buttons */}
           <div className="flex flex-col gap-3">
              <button
                onClick={handleNavPersonal}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all border border-white/10 hover:border-blue-400/30 hover:bg-blue-500/10 hover:text-blue-300 text-slate-400 backdrop-blur-sm group bg-black/20"
              >
                <div className="p-2 rounded-lg bg-white/5 group-hover:bg-white/10 transition-colors">
                  <BookOpen className="w-4 h-4" />
                </div>
                <span>{t.home.personal_library}</span>
              </button>
              
              <button
                onClick={handleNavFavorites}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all border border-white/10 hover:border-yellow-400/30 hover:bg-yellow-500/10 hover:text-yellow-300 text-slate-400 backdrop-blur-sm group",
                  personalView === "favorites" ? "bg-yellow-500/20 text-yellow-300 border-yellow-400/50" : "bg-black/20"
                )}
              >
                <div className={cn("p-2 rounded-lg bg-white/5 group-hover:bg-white/10 transition-colors", personalView === "favorites" && "bg-yellow-500/20")}>
                  <Star className="w-4 h-4" />
                </div>
                <span>{t.home.favorites}</span>
              </button>

              <button
                onClick={handleNavLibrary}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all border border-white/10 hover:border-purple-400/30 hover:bg-purple-500/10 hover:text-purple-300 text-slate-400 backdrop-blur-sm group bg-black/20"
              >
                <div className="p-2 rounded-lg bg-white/5 group-hover:bg-white/10 transition-colors">
                  <Library className="w-4 h-4" />
                </div>
                <span>{t.home.public_library}</span>
              </button>
           </div>

           <div className="flex-1 min-h-0">
             <HistoryPanel
                history={history}
                isLoaded={isLoaded}
                onRestore={handleRestore}
                onClear={clearHistory}
                onSaveToPersonal={addPersonalPromptFromHistory}
                onCopy={handleCopyText}
             />
           </div>
        </div>

        {/* Main Content (Center) */}
        <div className="lg:col-span-9 flex flex-col gap-8 max-w-5xl mx-auto w-full pl-0 lg:pl-12">
           <div className="flex justify-center pb-2">
             <NextImage 
              src="/logo.svg" 
              alt="Peroot" 
              width={384}
              height={120}
              priority
              className="w-40 md:w-48 h-auto drop-shadow-2xl brightness-110"
              style={{ width: 'auto', height: 'auto' }}
             />
           </div>

           <LoadingOverlay isVisible={isLoading} />

           {!completion ? (
             /* INPUT MODE */
             <>
               <PromptInput
                  user={user}
                  inputVal={inputVal}
                  setInputVal={setInputVal}
                  handleEnhance={handleEnhance}
                  inputScore={inputScore}
                  scoreTone={scoreTone}
                  selectedCategory={selectedCategory}
                  setSelectedCategory={setSelectedCategory}
                   selectedCapability={selectedCapability}
                   setSelectedCapability={setSelectedCapability}
                  isLoading={isLoading}
                  variables={inputVariables}
                  variableValues={variableValues}
                  setVariableValues={setVariableValues}
                  onApplyVariables={applyVariablesToPrompt}
               />


             </>
           ) : (
             /* RESULT MODE */
             <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 flex flex-col gap-8">
                 <ResultSection
                     completion={completion}
                     copied={copied}
                     onCopy={handleCopyText}
                     completionScore={completionScore}
                     onSave={saveCompletionToPersonal}
                     onBack={() => setCompletion("")}
                     placeholders={placeholders}
                     variableValues={variableValues}
                     improvementDelta={completionScore.baseScore - inputScore.baseScore}
                     onVariableChange={(key, val) => setVariableValues(prev => ({ ...prev, [key]: val }))}
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

           {/* Removed old placement of ResultSection (lines 493-517) as it is now in conditional block */}


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

      {/* Footer */}
      <div className="mt-20 text-center pb-8 flex flex-col gap-4 animate-in fade-in duration-1000 delay-300">
         <p className="font-mono text-xs text-slate-600 uppercase tracking-widest">
            {t.home.footer_credits}
         </p>
         <div className="flex justify-center gap-6 text-xs text-slate-500 font-medium">
            <a href="/privacy" className="hover:text-slate-300 transition-colors">{t.home.privacy_policy}</a>
            <span className="text-slate-700">|</span>
            <a href="/accessibility" className="hover:text-slate-300 transition-colors">{t.home.accessibility}</a>
         </div>
      </div>
      {/* Onboarding Overlay */}
      {showOnboarding && user && (
          <OnboardingOverlay onComplete={handleOnboardingComplete} />
      )}
    </div>
  );
}

// Wrapper component to provide context and user state
function HomeWrapper() {
  const { user } = useHistory(); 
  const [isLoginRequiredModalOpen, setIsLoginRequiredModalOpen] = useState(false);
  const [loginFeature, setLoginFeature] = useState("");

  const showLoginRequired = (feature: string) => {
      setLoginFeature(feature);
      setIsLoginRequiredModalOpen(true);
  };

  return (
    <LibraryProvider user={user} showLoginRequired={showLoginRequired}>
        <div className="min-h-screen bg-black text-slate-200 selection:bg-blue-500/30 font-sans pb-20 pt-6 px-4 md:px-6 max-w-[100vw] overflow-x-hidden" dir="rtl">
            <Toaster position="top-center" theme="dark" closeButton />
            <PageContent user={user} />
            
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
