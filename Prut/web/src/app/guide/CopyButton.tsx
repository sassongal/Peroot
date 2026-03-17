'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="absolute top-2 left-2 p-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors group/copy"
      title="העתק פרומפט"
      aria-label="העתק פרומפט"
    >
      {copied ? (
        <Check className="w-3.5 h-3.5 text-emerald-400" />
      ) : (
        <Copy className="w-3.5 h-3.5 text-slate-500 group-hover/copy:text-slate-300 transition-colors" />
      )}
    </button>
  );
}
