"use client";

import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ExportPdfButtonProps {
  title: string;
  original: string;
  enhanced: string;
  score?: { before: number | null; after: number } | null;
  createdAt?: string;
  /**
   * Optional per-dimension breakdown. When passed, the generated PDF will
   * include a table that mirrors the in-app ScoreBreakdownDrawer so the
   * export matches what the user sees on screen.
   */
  breakdown?: { label: string; score: number; maxScore: number }[];
  strengths?: string[];
  weaknesses?: string[];
  className?: string;
  disabled?: boolean;
}

/**
 * Client-only button that lazily loads @react-pdf/renderer and downloads a
 * formatted Peroot prompt PDF. Safe for guests and logged-in users — the
 * data is already in memory on the client, no server round-trip needed.
 */
export function ExportPdfButton({
  title,
  original,
  enhanced,
  score,
  createdAt,
  breakdown,
  strengths,
  weaknesses,
  className,
  disabled,
}: ExportPdfButtonProps) {
  const [busy, setBusy] = useState(false);

  const handleClick = async () => {
    if (busy || disabled) return;
    setBusy(true);
    try {
      const { downloadPromptPdf } = await import(
        '@/lib/export/download-prompt-pdf'
      );
      await downloadPromptPdf({
        title,
        original,
        enhanced,
        score,
        createdAt,
        breakdown,
        strengths,
        weaknesses,
      });
      toast.success('ה-PDF הורד בהצלחה');
    } catch (err) {
      console.error('[ExportPdfButton] download failed:', err);
      toast.error('יצירת ה-PDF נכשלה. נסה שוב.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || busy || !enhanced}
      className={cn(
        'p-2 rounded-lg bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-(--text-primary) transition-colors min-h-11 min-w-11 flex items-center justify-center focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none disabled:opacity-50 disabled:cursor-not-allowed',
        className
      )}
      title="הורד כ-PDF"
      aria-label="הורד פרומפט כ-PDF"
    >
      {busy ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Download className="w-4 h-4" />
      )}
    </button>
  );
}
