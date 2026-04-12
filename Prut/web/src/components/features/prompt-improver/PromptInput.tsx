"use client";

import { useRef, useEffect, useState, useMemo, Dispatch, SetStateAction } from "react";
import { Wand2, Mic, MicOff, Paperclip, Globe, ImageIcon, Zap } from "lucide-react";
import { AnimatedLogo } from "@/components/ui/AnimatedLogo";

import { CATEGORY_OPTIONS } from "@/lib/constants";
import { CapabilityMode, capabilitySupportsTargetModel } from "@/lib/capability-mode";
import { CapabilitySelector } from "@/components/ui/CapabilitySelector";
import { ImagePlatformSelector } from "./ImagePlatformSelector";
import { VideoPlatformSelector } from "./VideoPlatformSelector";
import { ImagePlatform, ImageOutputFormat } from "@/lib/media-platforms";
import { VideoPlatform } from "@/lib/video-platforms";
import { cn } from "@/lib/utils";
import { highlightTextWithPlaceholders } from "@/lib/text-utils";
import { getVariableLabel, getVariablePlaceholder } from "@/lib/variable-utils";
import type { InputScore } from "@/lib/engines/scoring/input-scorer";
import { LiveInputScorePill } from "./LiveInputScorePill";
import { InputScoreBreakdown } from "./InputScoreBreakdown";
import { QuickImprovementChips } from "./QuickImprovementChips";
import type { TargetModel } from "@/lib/engines/types";
import { TargetModelSelect } from "@/components/features/prompt-improver/TargetModelSelect";
import { useVoiceRecorder, VOICE_LANGUAGES, VoiceLang } from "@/hooks/useVoiceRecorder";
import { toast } from "sonner";
import { useSubscription } from "@/hooks/useSubscription";
import Link from "next/link";

interface PromptInputProps {
  inputVal: string;
  setInputVal: Dispatch<SetStateAction<string>>;
  handleEnhance: () => void;
  liveInputScore: InputScore | null;
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  selectedCapability: CapabilityMode;
  setSelectedCapability: (mode: CapabilityMode) => void;
  isLoading: boolean;
  variables: string[];
  variableValues: Record<string, string>;
  setVariableValues: (values: Record<string, string>) => void;
  onApplyVariables: () => void;
  imagePlatform: ImagePlatform;
  setImagePlatform: (platform: ImagePlatform) => void;
  imageOutputFormat: ImageOutputFormat;
  setImageOutputFormat: (format: ImageOutputFormat) => void;
  imageAspectRatio: string;
  setImageAspectRatio: (ratio: string) => void;
  videoPlatform: VideoPlatform;
  setVideoPlatform: (platform: VideoPlatform) => void;
  videoAspectRatio: string;
  setVideoAspectRatio: (ratio: string) => void;
  // Context attachments
  onAddFile?: (file: File) => void;
  onAddFiles?: (files: File[]) => Promise<void>;
  onAddUrl?: (url: string) => void;
  onAddImage?: (file: File) => void;
  hasAttachments?: boolean;
  // Target model
  targetModel: TargetModel;
  setTargetModel: (model: TargetModel) => void;
  // Credits
  creditsRemaining?: number | null;
  // Voice interim text callback — lets parent include interim speech in scoring
  onInterimChange?: (text: string) => void;
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
  [CapabilityMode.VIDEO_GENERATION]: [
    "סרטון דרון מעל חוף ים בשקיעה עם גלים שובריים",
    "אנימציה של חתול שמזנק לתפוס פרפר בגינה",
    "סצנה קולנועית של רחוב בטוקיו בלילה עם גשם",
    "סרטון מוצר - בקבוק בושם מסתובב על רקע שחור",
  ],
};

const PLACEHOLDERS_BY_MODE: Record<string, string> = {
  [CapabilityMode.STANDARD]: "",
  [CapabilityMode.DEEP_RESEARCH]: "מה תרצה לחקור? תאר את הנושא, היקף המחקר, והשאלות המרכזיות...",
  [CapabilityMode.IMAGE_GENERATION]: "תאר את התמונה שתרצה ליצור - נושא, סגנון, צבעים, תאורה...",
  [CapabilityMode.AGENT_BUILDER]: "תאר את הסוכן שתרצה לבנות - מה התפקיד שלו, מי קהל היעד, ומה הוא צריך לדעת לעשות...",
  [CapabilityMode.VIDEO_GENERATION]: "תאר את הסצנה שברצונך ליצור...",
};

export function PromptInput({
  inputVal,
  setInputVal,
  handleEnhance,
  liveInputScore,
  selectedCategory,
  setSelectedCategory,
  selectedCapability,
  setSelectedCapability,
  isLoading,
  variables,
  variableValues,
  setVariableValues,
  onApplyVariables,
  imagePlatform,
  setImagePlatform,
  imageOutputFormat,
  setImageOutputFormat,
  imageAspectRatio,
  setImageAspectRatio,
  videoPlatform,
  setVideoPlatform,
  videoAspectRatio,
  setVideoAspectRatio,
  onAddFile,
  onAddFiles,
  onAddUrl,
  onAddImage,
  hasAttachments,
  targetModel,
  setTargetModel,
  creditsRemaining,
  onInterimChange,
}: PromptInputProps) {
    const t = useI18n();
    const { isPro } = useSubscription();
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const [showUrlInput, setShowUrlInput] = useState(false);
    const [urlValue, setUrlValue] = useState("");
    const [interimResult, setInterimResult] = useState("");
    const [voiceLang, setVoiceLang] = useState<VoiceLang>('he-IL');
    const [showLangPicker, setShowLangPicker] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);
    const [scoreBreakdownOpen, setScoreBreakdownOpen] = useState(false);

    // Close language picker on click outside
    useEffect(() => {
      if (!showLangPicker) return;
      const handler = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (!target.closest('[data-lang-picker]')) setShowLangPicker(false);
      };
      document.addEventListener('click', handler);
      return () => document.removeEventListener('click', handler);
    }, [showLangPicker]);

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
      queueMicrotask(() => setDisplayedExamples(shuffled.slice(0, 4)));
    }, [selectedCapability]);

    // Voice Recorder Logic
    const { isListening, toggleListening, isSupported } = useVoiceRecorder({
        onResult: (text, isFinal) => {
            if (isFinal) {
                // Append only the new finalized segment (already deduplicated in hook)
                setInputVal((prev: string) => {
                    const trimmed = prev.trim();
                    return trimmed ? trimmed + " " + text.trim() : text.trim();
                });
                setInterimResult("");
                onInterimChange?.("");
            } else {
                // Replace interim preview (not committed to inputVal)
                setInterimResult(text);
                onInterimChange?.(text);
            }
        },
        onError: (err) => {
            toast.error("שגיאה בהקלטה: " + err);
            setInterimResult("");
            onInterimChange?.("");
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
      <InputScoreBreakdown
        isOpen={scoreBreakdownOpen}
        onClose={() => setScoreBreakdownOpen(false)}
        score={liveInputScore}
        inputText={inputVal}
      />

      {/* Capability Mode Selector */}
      <div className="w-full max-w-4xl mx-auto">
        <div className="text-xs text-(--text-muted) uppercase tracking-widest mb-2 px-1">{t.prompt_generator.capability_mode}</div>
        <CapabilitySelector
          value={selectedCapability}
          onChange={setSelectedCapability}
          disabled={isLoading}
          compact
          isPro={isPro}
        />
      </div>

      {/* Image Platform Selector - only visible in IMAGE_GENERATION mode */}
      {selectedCapability === CapabilityMode.IMAGE_GENERATION && (
        <div className="w-full max-w-4xl mx-auto">
          <ImagePlatformSelector
            selectedPlatform={imagePlatform}
            onPlatformChange={setImagePlatform}
            outputFormat={imageOutputFormat}
            onOutputFormatChange={setImageOutputFormat}
            aspectRatio={imageAspectRatio}
            onAspectRatioChange={setImageAspectRatio}
            disabled={isLoading}
          />
        </div>
      )}

      {/* Video Platform Selector - only visible in VIDEO_GENERATION mode */}
      {selectedCapability === CapabilityMode.VIDEO_GENERATION && (
        <div className="w-full max-w-4xl mx-auto">
          <VideoPlatformSelector
            selectedPlatform={videoPlatform}
            onPlatformChange={setVideoPlatform}
            aspectRatio={videoAspectRatio}
            onAspectRatioChange={setVideoAspectRatio}
            disabled={isLoading}
          />
        </div>
      )}

      <div className="w-full max-w-4xl mx-auto flex flex-col-reverse lg:flex-row gap-4 items-stretch">
        {variables.length > 0 && (
          <div className="w-full lg:w-72 glass-card p-4 rounded-2xl border-(--glass-border) bg-(--glass-bg)">
            <div className="text-xs text-(--text-muted) uppercase tracking-widest">{t.prompt_generator.variables}</div>
            <p className="text-[11px] text-(--text-muted) mt-2">
              {t.prompt_generator.variables_hint}
            </p>
            <div className="mt-4 space-y-3">
              {variables.map((variable, index) => {
                const inputId = `variable-input-${index}`;
                const label = getVariableLabel(variable);
                const isEmpty = !(variableValues[variable] ?? "").trim();
                return (
                  <div key={`${variable}-${index}`} className="space-y-2">
                    <label
                      htmlFor={inputId}
                      className="text-xs font-semibold flex items-center gap-1 text-(--text-primary)"
                      title={variable}
                    >
                      <span>{label}</span>
                      {isEmpty && (
                        <span className="text-red-400" aria-hidden="true">*</span>
                      )}
                    </label>
                    <input
                      id={inputId}
                      dir="rtl"
                      value={variableValues[variable] ?? ""}
                      onChange={(e) =>
                        setVariableValues({ ...variableValues, [variable]: e.target.value })
                      }
                      aria-label={label}
                      className={cn(
                        "w-full border rounded-lg py-2.5 px-3 text-base md:text-sm text-(--text-primary) focus-visible:outline-none focus:outline-none transition-colors",
                        isEmpty
                          ? "bg-black/5 dark:bg-black/30 border-sky-500/40 focus:border-sky-500/60 focus-visible:ring-2 focus-visible:ring-sky-500/30"
                          : "bg-emerald-500/4 dark:bg-emerald-400/4 border-emerald-500/40 dark:border-emerald-400/40 focus:border-emerald-500/60 focus-visible:ring-2 focus-visible:ring-emerald-500/30"
                      )}
                      placeholder={getVariablePlaceholder(variable)}
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
                <div className="text-xs text-(--text-muted) uppercase tracking-widest">{t.prompt_generator.live_view}</div>
                <div className="rounded-xl border border-(--glass-border) bg-black/5 dark:bg-black/30 p-4 text-base md:text-lg text-(--text-primary) leading-relaxed min-h-[100px]">
                  {highlightedContent}
                </div>
              </div>
            )}
          </div>
        )}

        <div
          className={cn(
            "flex-1 glass-card p-1 rounded-2xl border-(--glass-border) bg-linear-to-br from-black/3 dark:from-white/8 to-transparent shadow-2xl shadow-amber-900/10 group focus-within:border-amber-500/30 transition-colors duration-300",
            isDragOver && "border-blue-500/50 bg-blue-500/5 ring-2 ring-blue-500/20"
          )}
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragOver(false);
            const dropped = Array.from(e.dataTransfer.files);
            const imageFiles = dropped.filter((f) => f.type.startsWith('image/'));
            const docFiles = dropped.filter((f) => !f.type.startsWith('image/'));

            for (const img of imageFiles) {
              try { onAddImage?.(img); toast.success(`"${img.name}" נוספה`); }
              catch (err) { toast.error(err instanceof Error ? err.message : "שגיאה בהוספת תמונה"); }
            }

            if (docFiles.length === 0) return;
            if (docFiles.length > 1 && onAddFiles) {
              onAddFiles(docFiles).then(() => {
                toast.success(`${docFiles.length} קבצים נוספו`);
              }).catch((err: unknown) => {
                toast.error(err instanceof Error ? err.message : "שגיאה בהוספת קבצים");
              });
            } else {
              for (const file of docFiles) {
                try { onAddFile?.(file); toast.success(`"${file.name}" נוסף`); }
                catch (err) { toast.error(err instanceof Error ? err.message : "שגיאה בהוספת קובץ"); }
              }
            }
          }}>
          <div className="bg-white/60 dark:bg-black/40 rounded-xl flex flex-col gap-4 relative">
            {/* Scroll wrapper: long prompts used to clip (overflow-hidden on layers). */}
            <div className="max-h-[min(75vh,36rem)] overflow-y-auto min-h-0 rounded-t-xl overscroll-contain">
              <div className="relative min-h-[120px] md:min-h-[160px]">
                <div
                  aria-hidden
                  className="absolute inset-0 p-6 md:p-8 text-base md:text-lg lg:text-xl text-(--text-primary) font-sans leading-relaxed whitespace-pre-wrap wrap-break-word pointer-events-none z-0"
                  dir="rtl"
                >
                  {highlightedContent}
                </div>
                <textarea
                  ref={textareaRef}
                  dir="rtl"
                  value={displayValue}
                  onChange={(e) => {
                    setInputVal(e.target.value);
                    setInterimResult("");
                  }}
                  placeholder={PLACEHOLDERS_BY_MODE[selectedCapability] || t.prompt_generator.placeholder}
                  aria-label="כתוב את הפרומפט שלך"
                  className="w-full min-h-[120px] md:min-h-[160px] bg-transparent p-6 md:p-8 text-base md:text-lg lg:text-xl text-transparent caret-(--text-primary) placeholder:text-(--text-muted) focus:outline-none resize-none leading-relaxed relative z-10 font-sans block overflow-y-auto"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      handleEnhance();
                    }
                  }}
                />
              </div>
            </div>

            {/* Voice + Context Icons row — z-40 so TargetModelSelect dropdown stacks above footer (z-20) and enhance CTA */}
               <div className="flex items-center justify-between px-6 pt-2 relative z-40">
                   {/* Right side (RTL): Voice + Language */}
                   <div className="flex items-center gap-1.5">
                     {isSupported && (
                       <>
                         <button
                           onClick={toggleListening}
                           className={cn(
                             "p-2.5 min-h-[44px] min-w-[44px] rounded-full transition-all duration-300 backdrop-blur-md shadow-lg flex items-center justify-center group/mic",
                             isListening
                               ? "bg-red-500/20 text-red-400 border border-red-500/50 animate-pulse"
                               : "bg-black/5 dark:bg-black/30 text-(--text-muted) border border-(--glass-border) hover:text-(--text-primary) hover:bg-black/10 dark:hover:bg-white/10"
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
                         <div className="relative" data-lang-picker>
                           <button
                             onClick={() => setShowLangPicker(prev => !prev)}
                             className="px-2 py-1.5 rounded-full text-xs bg-black/5 dark:bg-black/30 text-(--text-muted) border border-(--glass-border) hover:text-(--text-primary) hover:bg-black/10 dark:hover:bg-white/10 backdrop-blur-md transition-all cursor-pointer"
                             title="שפת הקלטה"
                             aria-label="בחר שפת הקלטה"
                           >
                             {VOICE_LANGUAGES.find(l => l.code === voiceLang)?.short ?? 'HE'}
                           </button>
                           {showLangPicker && (
                             <div className="absolute bottom-full end-0 mb-1.5 bg-white/95 dark:bg-zinc-900/95 border border-(--glass-border) rounded-xl shadow-xl backdrop-blur-md overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200 min-w-[120px] md:min-w-[140px] max-w-[calc(100vw-2rem)]">
                               {VOICE_LANGUAGES.map(lang => (
                                 <button
                                   key={lang.code}
                                   onClick={() => { setVoiceLang(lang.code); setShowLangPicker(false); }}
                                   className={cn(
                                     "w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors cursor-pointer",
                                     voiceLang === lang.code
                                       ? "bg-amber-500/10 text-amber-600 dark:text-amber-300"
                                       : "text-(--text-secondary) hover:bg-black/5 dark:hover:bg-white/5"
                                   )}
                                 >
                                   <span className="font-mono font-bold text-[10px]">{lang.short}</span>
                                   <span>{lang.label}</span>
                                 </button>
                               ))}
                             </div>
                           )}
                         </div>
                         {isListening && (
                             <span className="text-[10px] bg-black/80 px-2 py-1 rounded-md text-red-300 whitespace-nowrap animate-in fade-in">
                                 מקליט...
                             </span>
                         )}
                       </>
                     )}
                   </div>

                   {/* Left side (RTL): Context attachment icons + model selector */}
                   <div className="flex items-center gap-1.5 flex-wrap justify-end">
                     {capabilitySupportsTargetModel(selectedCapability) && (
                       <TargetModelSelect
                         value={targetModel}
                         onChange={setTargetModel}
                         disabled={isLoading}
                       />
                     )}

                     {/* File upload */}
                     {onAddFile && (
                       <>
                         <input
                           ref={fileInputRef}
                           type="file"
                           accept=".pdf,.docx,.txt,.csv,.xlsx"
                           className="hidden"
                           onChange={(e) => {
                             const file = e.target.files?.[0];
                             if (file) {
                               try {
                                 onAddFile(file);
                                 toast.success(`"${file.name}" נוסף — מחלץ תוכן...`);
                               } catch (err) {
                                 toast.error(err instanceof Error ? err.message : "שגיאה בהוספת קובץ");
                               }
                             }
                             e.target.value = '';
                           }}
                         />
                         <button
                           onClick={() => fileInputRef.current?.click()}
                           className={cn(
                             "p-2 rounded-lg transition-colors cursor-pointer",
                             "text-(--text-muted) hover:text-amber-400 hover:bg-amber-500/10"
                           )}
                           title="צרף קובץ (PDF, Word, Excel, CSV, TXT)"
                           aria-label="צרף קובץ"
                           disabled={isLoading}
                         >
                           <Paperclip className="w-4 h-4" />
                         </button>
                       </>
                     )}

                     {/* URL input */}
                     {onAddUrl && (
                       <div className="relative">
                         <button
                           onClick={() => setShowUrlInput(prev => !prev)}
                           className={cn(
                             "p-2 rounded-lg transition-colors cursor-pointer",
                             showUrlInput
                               ? "text-amber-400 bg-amber-500/10"
                               : "text-(--text-muted) hover:text-amber-400 hover:bg-amber-500/10"
                           )}
                           title="צרף קישור URL"
                           aria-label="צרף קישור"
                           disabled={isLoading}
                         >
                           <Globe className="w-4 h-4" />
                         </button>
                         {showUrlInput && (
                           <div className="absolute bottom-full end-0 mb-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
                             <input
                               type="url"
                               value={urlValue}
                               onChange={(e) => setUrlValue(e.target.value)}
                               onKeyDown={(e) => {
                                 if (e.key === 'Enter' && urlValue.trim()) {
                                   try {
                                     onAddUrl(urlValue.trim());
                                     setUrlValue('');
                                     setShowUrlInput(false);
                                     toast.success("הקישור נוסף — מחלץ תוכן...");
                                   } catch (err) {
                                     toast.error(err instanceof Error ? err.message : "שגיאה בהוספת קישור");
                                   }
                                 }
                                 if (e.key === 'Escape') setShowUrlInput(false);
                               }}
                               placeholder="הדביקו כתובת URL ולחצו Enter"
                               className="w-64 px-3 py-2 rounded-xl text-xs bg-white/95 dark:bg-zinc-900/95 border border-(--glass-border) text-(--text-primary) placeholder:text-(--text-muted) shadow-xl backdrop-blur-md focus:outline-none focus:border-amber-500/50"
                               dir="ltr"
                               autoFocus
                             />
                           </div>
                         )}
                       </div>
                     )}

                     {/* Image upload */}
                     {onAddImage && (
                       <>
                         <input
                           ref={imageInputRef}
                           type="file"
                           accept="image/*"
                           className="hidden"
                           onChange={(e) => {
                             const file = e.target.files?.[0];
                             if (file) {
                               try {
                                 onAddImage(file);
                                 toast.success(`"${file.name}" נוספה — מעבד תמונה...`);
                               } catch (err) {
                                 toast.error(err instanceof Error ? err.message : "שגיאה בהוספת תמונה");
                               }
                             }
                             e.target.value = '';
                           }}
                         />
                         <button
                           onClick={() => imageInputRef.current?.click()}
                           className={cn(
                             "p-2 rounded-lg transition-colors cursor-pointer",
                             "text-(--text-muted) hover:text-amber-400 hover:bg-amber-500/10"
                           )}
                           title="צרף תמונה"
                           aria-label="צרף תמונה"
                           disabled={isLoading}
                         >
                           <ImageIcon className="w-4 h-4" />
                         </button>
                       </>
                     )}

                     {/* Attachment indicator dot */}
                     {hasAttachments && (
                       <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" title="יש קבצים מצורפים" />
                     )}
                   </div>
               </div>


            {!inputVal.trim() && !isListening && (
              <div className="px-6 pb-4 relative z-20 animate-in fade-in duration-300">
                <div className="text-xs text-(--text-muted) uppercase tracking-widest mb-3 text-start" dir="rtl">נסו לדוגמה:</div>
                <div className="flex flex-wrap gap-2 justify-end" dir="rtl">
                  {displayedExamples.map((example, i) => (
                    <button
                      key={i}
                      onClick={() => setInputVal(example)}
                      aria-label={`השתמש בדוגמה: ${example}`}
                      className="px-3 py-2.5 rounded-full border border-(--glass-border) bg-(--glass-bg) text-xs text-(--text-muted) hover:bg-amber-500/10 hover:text-amber-600 dark:hover:text-amber-300 hover:border-amber-500/20 transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Last credit warning - inline banner */}
            {creditsRemaining === 1 && !isPro && (
              <div className="flex items-center justify-between gap-3 mx-5 md:mx-7 mt-3 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25" dir="rtl">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500 shrink-0" />
                  <span className="text-sm text-amber-700 dark:text-amber-300">
                    קרדיט אחרון! שדרג ל-Pro בשביל 150 קרדיטים בחודש
                  </span>
                </div>
                <Link
                  href="/pricing"
                  className="shrink-0 px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-bold transition-colors"
                >
                  שדרג
                </Link>
              </div>
            )}

            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 border-t border-(--glass-border) pt-5 p-5 md:p-7 relative z-20 bg-slate-50/95 dark:bg-zinc-950/95 md:bg-black/5 md:dark:bg-black/20 backdrop-blur-xl md:backdrop-blur-none">
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-(--text-muted) uppercase tracking-widest shrink-0">{t.prompt_generator.category}</span>
                <div className="relative group/select min-w-[140px]">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full ps-10 pe-4 py-2 rounded-xl text-base md:text-sm font-medium transition-all duration-300 border border-(--glass-border) bg-(--glass-bg) text-(--text-primary) hover:border-black/20 dark:hover:border-white/30 hover:bg-black/6 dark:hover:bg-white/5 appearance-none cursor-pointer focus-visible:ring-2 focus-visible:ring-amber-400/50 focus-visible:outline-none focus:outline-none"
                    aria-label="בחר קטגוריה"
                  >
                    {CATEGORY_OPTIONS.map(cat => (
                      <option key={cat.id} value={cat.id} className="bg-white dark:bg-zinc-900 text-(--text-primary)">
                        {cat.label}
                      </option>
                    ))}
                  </select>
                  <div className="absolute start-3 top-1/2 -translate-y-1/2 pointer-events-none text-(--text-muted)">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              <LiveInputScorePill
                score={liveInputScore}
                onOpenBreakdown={() => setScoreBreakdownOpen(true)}
              />

              <QuickImprovementChips
                score={liveInputScore}
                onInsert={(text) => {
                  setInputVal((prev: string) => {
                    const sep = prev && !prev.endsWith('\n') ? '\n' : '';
                    return prev + sep + text;
                  });
                  textareaRef.current?.focus();
                }}
                className="px-1"
              />

              <button
                onClick={handleEnhance}
                disabled={isLoading || !inputVal.trim()}
                className={cn(
                  "group relative rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-3 shadow-lg overflow-hidden cursor-pointer",
                  "px-8 py-4 min-w-[160px]",
                  isLoading || !inputVal.trim()
                    ? "bg-(--glass-bg) text-(--text-muted) cursor-not-allowed border border-(--glass-border)"
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
                  <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:animate-shimmer" />
                )}
              </button>
              {creditsRemaining != null && creditsRemaining >= 0 && (
                <span className={cn(
                  "text-[10px] font-bold px-2 py-1 rounded-lg border",
                  creditsRemaining > 2
                    ? "text-(--text-muted) border-(--glass-border) bg-(--glass-bg)"
                    : creditsRemaining > 0
                      ? "text-amber-600 dark:text-amber-400 border-amber-500/20 bg-amber-500/5"
                      : "text-red-400 border-red-500/20 bg-red-500/5"
                )}>
                  {creditsRemaining} credits
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Feature Grid Removed as requested */}

      {/* Centered Navigation Tabs */}

    </div>
  );
}
