'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronDown, ChevronRight } from 'lucide-react';
import { CopyButton } from './CopyButton';
import type { ContextBlock } from '@/lib/context/engine/types';

interface Props {
  block: ContextBlock;
  onClose: () => void;
  onRefreshEnrich?: () => void;
  onRemove?: () => void;
}

export function AttachmentDetailsDrawer({ block, onClose, onRefreshEnrich, onRemove }: Props) {
  const [showRaw, setShowRaw] = useState(false);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);

  const d = block.display;
  const fullContext = [
    d.title,
    `סוג: ${d.documentType}`,
    `תקציר: ${d.summary}`,
    'נקודות מפתח:',
    ...d.keyFacts.map((f) => `- ${f}`),
    'ישויות:',
    ...d.entities.map((e) => `- ${e.name} (${e.type})`),
  ].join('\n');

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center p-4 overflow-y-auto"
        onClick={onClose}
        dir="rtl"
      >
        <motion.div
          initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
          className="bg-white dark:bg-zinc-900 rounded-2xl max-w-2xl w-full my-8 shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-4 p-5 border-b border-zinc-100 dark:border-zinc-800">
            <div className="flex-1 min-w-0">
              <div className="text-xs text-purple-600 dark:text-purple-400 font-medium">{d.documentType}</div>
              <h2 className="font-bold text-lg truncate text-zinc-900 dark:text-zinc-100">{d.title}</h2>
            </div>
            <div className="flex items-center gap-2">
              <CopyButton text={fullContext} label="העתק את הקונטקסט המלא" />
              <button onClick={onClose} aria-label="סגור" className="p-2 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="p-5 space-y-5">
            <Section title="תקציר" copyText={d.summary}>
              <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">{d.summary}</p>
            </Section>

            {d.keyFacts.length > 0 && (
              <Section title="נקודות מפתח" copyText={d.keyFacts.map((f) => `• ${f}`).join('\n')}>
                <ul className="space-y-1.5">
                  {d.keyFacts.map((f, i) => (
                    <li key={i} className="flex items-start justify-between gap-2 text-sm">
                      <span>• {f}</span>
                      <CopyButton text={f} />
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {d.entities.length > 0 && (
              <Section title="ישויות" copyText={d.entities.map((e) => `${e.name} (${e.type})`).join('\n')}>
                <div className="flex flex-wrap gap-1.5">
                  {d.entities.map((e, i) => (
                    <span key={i} className="text-xs bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-full">
                      {e.name} <span className="text-zinc-400 dark:text-zinc-500">· {e.type}</span>
                    </span>
                  ))}
                </div>
              </Section>
            )}

            {d.rawText && (
              <div>
                <button
                  onClick={() => setShowRaw((v) => !v)}
                  className="flex items-center gap-1 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                >
                  {showRaw ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  טקסט גולמי
                  {showRaw && <span className="ms-auto"><CopyButton text={d.rawText} /></span>}
                </button>
                {showRaw && (
                  <pre className="mt-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg p-3 text-xs overflow-x-auto max-h-64 text-zinc-800 dark:text-zinc-200">
                    {d.rawText}
                  </pre>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800/50 border-t border-zinc-100 dark:border-zinc-800">
            {onRefreshEnrich && (
              <button onClick={onRefreshEnrich} className="text-sm text-purple-700 dark:text-purple-400 hover:underline">
                רענן תיאור
              </button>
            )}
            {onRemove && (
              <button onClick={() => { onRemove(); onClose(); }} className="text-sm text-red-600 dark:text-red-400 hover:underline">
                הסר מהקונטקסט
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function Section({ title, children, copyText }: {
  title: string; children: React.ReactNode; copyText: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">{title}</h3>
        <CopyButton text={copyText} />
      </div>
      {children}
    </div>
  );
}
