"use client";

import { useRef, useEffect, useState, useMemo, Dispatch, SetStateAction } from "react";
import { Wand2, Mic, MicOff } from "lucide-react";
import { AnimatedLogo } from "@/components/ui/AnimatedLogo";

import { CATEGORY_OPTIONS } from "@/lib/constants";
import { CapabilityMode } from "@/lib/capability-mode";
import { CapabilitySelector } from "@/components/ui/CapabilitySelector";
import { cn } from "@/lib/utils";
import { highlightTextWithPlaceholders } from "@/lib/text-utils";
import { PromptScore } from "@/lib/engines/base-engine";
import { useVoiceRecorder, VOICE_LANGUAGES, VoiceLang } from "@/hooks/useVoiceRecorder";
import { toast } from "sonner";

interface PromptInputProps {
  inputVal: string;
  setInputVal: Dispatch<SetStateAction<string>>;
  handleEnhance: () => void;
  inputScore: PromptScore | null;
  scoreTone: { text: string; bar: string } | null;
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  selectedCapability: CapabilityMode;
  setSelectedCapability: (mode: CapabilityMode) => void;
  isLoading: boolean;
  variables: string[];
  variableValues: Record<string, string>;
  setVariableValues: (values: Record<string, string>) => void;
  onApplyVariables: () => void;
}

import { useI18n } from "@/context/I18nContext";

const EXAMPLES_BY_MODE: Record<string, string[]> = {
  [CapabilityMode.STANDARD]: [
    "כתוב לי מייל שיווקי להשקת מוצר חדש",
    "צור תוכן לפוסט אינסטגרם לעסק קטן",
    "בנה תבנית לתיאור משרה של מפתח Full Stack",
    "כתוב סקריפט לסרטון הסבר על המוצר שלי",
    "צור תוכנית לימודים לקורס AI למתחילים",
    "כתוב מייל מעקב מקצועי ללקוח אחרי פגישה",
    "כתוב תיאור מוצר שמוכר לחנות אונליין",
    "צור שאלון סקר שביעות רצון ללקוחות",
    "כתוב הודעת WhatsApp שיווקית קצרה ואפקטיבית",
  ],
  [CapabilityMode.DEEP_RESEARCH]: [
    "חקור את המגמות העדכניות ב-AI לשנת 2026",
    "נתח את שוק ה-SaaS בישראל - גודל, שחקנים, הזדמנויות",
    "השווה בין אסטרטגיות שיווק B2B ל-B2C בתעשיית הטכנולוגיה",
    "בצע מחקר שוק על תעשיית הפודטק בישראל",
    "נתח את ההשפעה של AI על שוק העבודה ב-5 שנים הקרובות",
  ],
  [CapabilityMode.IMAGE_GENERATION]: [
    "תמונת מוצר על רקע סטודיו לבן מינימליסטי",
    "איור דיגיטלי של עיר עתידנית עם אלמנטים ירוקים",
    "לוגו מודרני לחברת טכנולוגיה בסגנון מינימליסטי",
    "תמונת רקע לאתר - גלי צבע זהב ושחור אבסטרקטי",
    "פורטרט מקצועי בסגנון תאורת רמברנדט",
  ],
  [CapabilityMode.AGENT_BUILDER]: [
    "סוכן שירות לקוחות לחנות אונליין של אופנה",
    "עוזר אישי לניהול לוח זמנים ומשימות יומיות",
    "יועץ שיווק דיגיטלי שמנתח ביצועי קמפיינים",
    "מורה פרטי למתמטיקה שמתאים את ההסבר לרמת התלמיד",
    "סוכן מכירות שעונה על שאלות על מוצרי SaaS",
    "יועץ משפטי ראשוני שמסביר זכויות עובדים",
    "מנהל קהילה שעונה על שאלות ומנהל דיונים",
    "עוזר כתיבה שמשפר טקסטים שיווקיים ועסקיים",
  ],
};

const PLACEHOLDERS_BY_MODE: Record<string, string> = {
  [CapabilityMode.STANDARD]: "",
  [CapabilityMode.DEEP_RESEARCH]: "מה תרצה לחקור? תאר את הנושא, היקף המחקר, והשאלות המרכזיות...",
  [CapabilityMode.IMAGE_GENERATION]: "תאר את התמונה שתרצה ליצור - נושא, סגנון, צבעים, תאורה...",
  [CapabilityMode.AGENT_BUILDER]: "תאר את הסוכן שתרצה לבנות - מה התפקיד שלו, מי קהל היעד, ומה הוא צריך לדעת לעשות...",
};

export function PromptInput({
  inputVal,
  setInputVal,
  handleEnhance,
  inputScore,
  scoreTone,
  selectedCategory,
  setSelectedCategory,
  selectedCapability,
  setSelectedCapability,
  isLoading,
  variables,
  variableValues,
  setVariableValues,
  onApplyVariables,
}: PromptInputProps) {
    const t = useI18n();
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [interimResult, setInterimResult] = useState("");
    const [voiceLang, setVoiceLang] = useState<VoiceLang>('he-IL');
    const [showLangPicker, setShowLangPicker] = useState(false);

    // Performance optimization: Memoize heavy text processing
    // This prevents re-calculation when other props (like loading state) change
    const displayValue = inputVal + (interimResult ? (inputVal && !inputVal.endsWith(' ') ? ' ' : '') + interimResult : '');
    const highlightedContent = useMemo(() => highlightTextWithPlaceholders(displayValue), [displayValue]);

    const [displayedExamples, setDisplayedExamples] = useState(() => {
      const examples = EXAMPLES_BY_MODE[selectedCapability] || EXAMPLES_BY_MODE[CapabilityMode.STANDARD];
      return examples.slice(0, 4); // deterministic on SSR
    });

    useEffect(() => {
      const examples = EXAMPLES_BY_MODE[selectedCapability] || EXAMPLES_BY_MODE[CapabilityMode.STANDARD];
      const shuffled = [...examples].sort(() => Math.random() - 0.5);
      setDisplayedExamples(shuffled.slice(0, 4));
    }, [selectedCapability]);

    // Voice Recorder Logic
    const { isListening, toggleListening, isSupported } = useVoiceRecorder({
        onResult: (text, isFinal) => {
            if (isFinal) {
                setInputVal((prev: string) => {
                    const prefix = prev.trim() ? prev.trim() + " " : "";
                    return prefix + text;
                });
                setInterimResult("");
            } else {
                setInterimResult(text);
            }
        },
        onError: (err) => {
            toast.error("שגיאה בהקלטה: " + err);
            setInterimResult("");
        },
        lang: voiceLang,
    });

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [inputVal, interimResult]);


  return (
    <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Capability Mode Selector */}
      <div className="w-full max-w-4xl mx-auto">
        <div className="text-xs text-slate-400 uppercase tracking-widest mb-2 px-1">{t.prompt_generator.capability_mode}</div>
        <CapabilitySelector
          value={selectedCapability}
          onChange={setSelectedCapability}
          disabled={isLoading}
          compact
        />
      </div>

      <div className="w-full max-w-4xl mx-auto flex flex-col lg:flex-row gap-4 items-stretch">
        {variables.length > 0 && (
          <div className="w-full lg:w-72 glass-card p-4 rounded-2xl border-white/10 bg-white/[0.02]">
            <div className="text-xs text-slate-400 uppercase tracking-widest">{t.prompt_generator.variables}</div>
            <p className="text-[11px] text-slate-500 mt-2">
              {t.prompt_generator.variables_hint}
            </p>
            <div className="mt-4 space-y-3">
              {variables.map((variable, index) => {
                const inputId = `variable-input-${index}`;
                const isEmpty = !(variableValues[variable] ?? "").trim();
                return (
                  <div key={`${variable}-${index}`} className="space-y-2">
                    <label htmlFor={inputId} className="text-xs text-amber-300 font-semibold flex items-center gap-1">
                      {`{${variable}}`}
                      <span className="text-red-400" aria-hidden="true">*</span>
                    </label>
                    <input
                      id={inputId}
                      dir="rtl"
                      value={variableValues[variable] ?? ""}
                      onChange={(e) =>
                        setVariableValues({ ...variableValues, [variable]: e.target.value })
                      }
                      className={cn(
                        "w-full bg-black/30 border rounded-lg py-2.5 px-3 text-base md:text-sm text-slate-200 focus-visible:ring-2 focus-visible:ring-amber-400/50 focus-visible:outline-none focus:outline-none transition-colors",
                        isEmpty
                          ? "border-amber-500/50 ring-1 ring-amber-500/30 focus:border-amber-500/70"
                          : "border-white/10 focus:border-amber-500/50"
                      )}
                      placeholder={t.onboarding.sim_placeholder}
                    />
                  </div>
                );
              })}
            </div>
            {(() => {
              const allFilled = variables.every(v => (variableValues[v] ?? "").trim() !== "");
              return (
                <button
                  onClick={() => {
                    onApplyVariables();
                    toast.success(`${variables.length} משתנים הוחלו בהצלחה`);
                  }}
                  disabled={!allFilled}
                  className={cn(
                    "mt-4 w-full px-3 py-2 rounded-lg text-sm font-semibold transition-colors",
                    allFilled
                      ? "bg-white text-black hover:bg-slate-200 cursor-pointer"
                      : "bg-white/20 text-slate-500 cursor-not-allowed"
                  )}
                >
                  {t.prompt_generator.apply_to_prompt}
                </button>
              );
            })()}
            {inputVal.trim() && (
              <div className="mt-4 space-y-2">
                <div className="text-xs text-slate-400 uppercase tracking-widest">{t.prompt_generator.live_view}</div>
                <div className="rounded-xl border border-white/10 bg-black/30 p-4 text-base md:text-lg text-slate-200 leading-relaxed min-h-[100px]">
                  {highlightedContent}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex-1 glass-card p-1 rounded-2xl border-white/10 bg-gradient-to-br from-white/[0.08] to-transparent shadow-2xl shadow-amber-900/10 group focus-within:border-amber-500/30 transition-colors duration-300">
          <div className="bg-black/40 rounded-xl overflow-hidden flex flex-col gap-4 relative">
             <div
              aria-hidden
              className="absolute inset-0 p-6 md:p-8 text-base md:text-lg lg:text-xl text-slate-200 font-sans leading-relaxed whitespace-pre-wrap break-words pointer-events-none z-0 overflow-hidden"
              dir="rtl"
             >
              {highlightedContent}
             </div>
            <textarea
              ref={textareaRef}
              dir="rtl"
              value={displayValue}
              onChange={(e) => {
                 // Committing interim result if typing happens
                 setInputVal(e.target.value);
                 setInterimResult("");
              }}
              placeholder={PLACEHOLDERS_BY_MODE[selectedCapability] || t.prompt_generator.placeholder}
              className="w-full min-h-[160px] bg-transparent p-6 md:p-8 text-base md:text-lg lg:text-xl text-transparent caret-white placeholder:text-slate-500 focus:outline-none resize-none leading-relaxed relative z-10 font-sans overflow-hidden"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  handleEnhance();
                }
              }}
            />

            
            {inputScore && scoreTone && (
              <div className="px-6 pb-4 pt-2 border-t border-white/5 relative z-20 bg-black/20">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-mono tracking-widest">{t.prompt_generator.prompt_strength}</span>
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
                    {t.prompt_generator.usage_boost} +{inputScore.usageBoost}
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
            )}

            {/* Voice Input Trigger + Language Picker — bottom-left of textarea */}
            {isSupported && (
               <div className="absolute bottom-4 end-4 z-30 flex items-center gap-1.5">
                   <button
                     onClick={toggleListening}
                     className={cn(
                       "p-2.5 rounded-full transition-all duration-300 backdrop-blur-md shadow-lg flex items-center justify-center group/mic",
                       isListening
                         ? "bg-red-500/20 text-red-400 border border-red-500/50 animate-pulse"
                         : "bg-black/30 text-slate-400 border border-white/10 hover:text-white hover:bg-white/10"
                     )}
                     title={isListening ? "עצור הקלטה" : "הקלט קולית"}
                     aria-label={isListening ? "עצור הקלטה" : "הקלט קולית"}
                   >
                       {isListening ? (
                           <MicOff className="w-5 h-5" />
                       ) : (
                           <Mic className="w-5 h-5 group-hover/mic:scale-110 transition-transform" />
                       )}
                   </button>
                   {/* Language picker */}
                   <div className="relative">
                     <button
                       onClick={() => setShowLangPicker(prev => !prev)}
                       className="px-2 py-1.5 rounded-full text-xs bg-black/30 text-slate-400 border border-white/10 hover:text-white hover:bg-white/10 backdrop-blur-md transition-all cursor-pointer"
                       title="שפת הקלטה"
                       aria-label="בחר שפת הקלטה"
                     >
                       {VOICE_LANGUAGES.find(l => l.code === voiceLang)?.flag ?? '🌐'}
                     </button>
                     {showLangPicker && (
                       <div className="absolute bottom-full end-0 mb-1.5 bg-zinc-900/95 border border-white/10 rounded-xl shadow-xl backdrop-blur-md overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200 min-w-[140px]">
                         {VOICE_LANGUAGES.map(lang => (
                           <button
                             key={lang.code}
                             onClick={() => { setVoiceLang(lang.code); setShowLangPicker(false); }}
                             className={cn(
                               "w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors cursor-pointer",
                               voiceLang === lang.code
                                 ? "bg-amber-500/10 text-amber-300"
                                 : "text-slate-300 hover:bg-white/5"
                             )}
                           >
                             <span>{lang.flag}</span>
                             <span>{lang.label}</span>
                           </button>
                         ))}
                       </div>
                     )}
                   </div>
                   {isListening && (
                       <span className="absolute bottom-full end-0 mb-2 text-[10px] bg-black/80 px-2 py-1 rounded-md text-red-300 whitespace-nowrap animate-in fade-in">
                           מקליט...
                       </span>
                   )}
               </div>
            )}

            {!inputVal.trim() && !isListening && (
              <div className="px-6 pb-4 relative z-20 animate-in fade-in duration-300">
                <div className="text-xs text-slate-500 uppercase tracking-widest mb-3 text-start" dir="rtl">נסו לדוגמה:</div>
                <div className="flex flex-wrap gap-2 justify-end" dir="rtl">
                  {displayedExamples.map((example, i) => (
                    <button
                      key={i}
                      onClick={() => setInputVal(example)}
                      aria-label={`השתמש בדוגמה: ${example}`}
                      className="px-3 py-2.5 rounded-full border border-white/10 bg-white/[0.03] text-xs text-slate-400 hover:bg-amber-500/10 hover:text-amber-300 hover:border-amber-500/20 transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 border-t border-white/5 pt-5 p-5 md:p-7 relative z-20 bg-black/20">
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest shrink-0">{t.prompt_generator.category}</span>
                <div className="relative group/select min-w-[140px]">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full ps-10 pe-4 py-2 rounded-xl text-base md:text-sm font-medium transition-all duration-300 border border-white/10 bg-white/[0.03] text-slate-200 hover:border-white/30 hover:bg-white/[0.05] appearance-none cursor-pointer focus-visible:ring-2 focus-visible:ring-amber-400/50 focus-visible:outline-none focus:outline-none"
                    aria-label="בחר קטגוריה"
                  >
                    {CATEGORY_OPTIONS.map(cat => (
                      <option key={cat.id} value={cat.id} className="bg-zinc-900 text-slate-200">
                        {cat.label}
                      </option>
                    ))}
                  </select>
                  <div className="absolute start-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              <button
                onClick={handleEnhance}
                disabled={isLoading || !inputVal.trim()}
                className={cn(
                  "group relative rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-3 shadow-lg overflow-hidden cursor-pointer",
                  "px-8 py-4 min-w-[160px]",
                  isLoading || !inputVal.trim()
                    ? "bg-white/5 text-slate-500 cursor-not-allowed border border-white/5"
                    : "accent-gradient text-black hover:scale-[1.03] hover:shadow-[0_0_40px_rgba(245,158,11,0.3)] border border-amber-400/50 active:scale-[0.97]"
                )}
              >
                <span className="relative z-10 flex items-center gap-2.5">
                  {isLoading ? (
                    <>
                      <AnimatedLogo size="md" />
                      <span className="text-sm font-semibold">{t.prompt_generator.processing}</span>
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-5 h-5 transition-transform group-hover:rotate-12" />
                      <span className="text-base font-bold">{selectedCapability === CapabilityMode.AGENT_BUILDER ? "בנה סוכן" : "שדרג"}</span>
                      <kbd className="text-[10px] opacity-50 font-normal font-mono bg-black/10 px-1.5 py-0.5 rounded">⌘↵</kbd>
                    </>
                  )}
                </span>
                {!isLoading && inputVal.trim() && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-[-100%] group-hover:animate-shimmer" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Grid Removed as requested */}

      {/* Centered Navigation Tabs */}

    </div>
  );
}
