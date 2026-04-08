"use client";

/**
 * download-prompt-pdf — client-only utility that dynamically imports
 * @react-pdf/renderer, renders a PromptPdfDocument to a blob, and triggers
 * a browser download. The dynamic import keeps the ~500KB renderer out of
 * the initial bundle — it is only fetched when the user clicks Export.
 *
 * "use client" is defensive — any accidental server-side import would
 * blow up because @react-pdf/renderer v4 dispatches to browser APIs at
 * render time.
 */

import type { PromptPdfDocumentProps } from './PromptPdfDocument';

function sanitizeFilename(name: string): string {
  return (
    name
      .trim()
      .replace(/[\\/:*?"<>|]+/g, '')
      .replace(/\s+/g, '-')
      .slice(0, 60) || 'peroot-prompt'
  );
}

export async function downloadPromptPdf(
  data: PromptPdfDocumentProps
): Promise<void> {
  if (typeof window === 'undefined') {
    throw new Error('downloadPromptPdf must be called in the browser');
  }

  // Dynamic imports — these are ~500KB combined, only loaded on demand.
  const [{ pdf }, { PromptPdfDocument }] = await Promise.all([
    import('@react-pdf/renderer'),
    import('./PromptPdfDocument'),
  ]);

  const blob = await pdf(<PromptPdfDocument {...data} />).toBlob();

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${sanitizeFilename(data.title)}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  // Release the blob URL after a short delay so Safari has time to consume it.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
