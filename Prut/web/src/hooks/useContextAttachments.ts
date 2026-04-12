"use client";

import { useState, useCallback, useMemo, useRef } from "react";
import type {
  ContextAttachment,
  ContextPayload,
  AttachmentType,
  AttachmentStatus,
} from "@/lib/context/types";
import type { ProcessingStage } from "@/lib/context/engine/types";
import { getApiPath } from "@/lib/api-path";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB

// Tier-specific limits (mirror server-side plans.ts)
const TIER_LIMITS = {
  free:  { maxFiles: 1, maxUrls: 1, maxImages: 1, tokenLimit: 8_000 },
  pro:   { maxFiles: 5, maxUrls: 5, maxImages: 5, tokenLimit: 40_000 },
} as const;

type Tier = keyof typeof TIER_LIMITS;

const ACCEPTED_FILE_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/csv",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function countByType(
  attachments: ContextAttachment[],
  type: AttachmentType
): number {
  return attachments.filter((a) => a.type === type).length;
}

export function useContextAttachments(tier: Tier = 'free') {
  const limits = TIER_LIMITS[tier];
  const [attachments, setAttachments] = useState<ContextAttachment[]>([]);
  const attachmentsRef = useRef(attachments);
  attachmentsRef.current = attachments;

  // Sync counters to prevent double-click races (ref scoped to this instance)
  const pendingCounts = useRef({ file: 0, url: 0, image: 0 });

  const totalTokens = useMemo(
    () =>
      attachments.reduce((sum, a) => {
        if (a.status === "ready" && a.tokenCount) {
          return sum + a.tokenCount;
        }
        return sum;
      }, 0),
    [attachments]
  );

  const isOverLimit = totalTokens > limits.tokenLimit;

  const updateAttachment = useCallback(
    (id: string, updates: Partial<ContextAttachment>) => {
      setAttachments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, ...updates } : a))
      );
    },
    []
  );

  const addFile = useCallback(
    async (file: File) => {
      // Validate count (sync counter prevents double-click race)
      if (countByType(attachmentsRef.current, "file") + pendingCounts.current.file >= limits.maxFiles) {
        throw new Error(`ניתן לצרף עד ${limits.maxFiles} קבצים`);
      }
      pendingCounts.current.file++;
      // Validate size
      if (file.size > MAX_FILE_SIZE) {
        throw new Error("הקובץ גדול מדי (מקסימום 10MB)");
      }
      // Validate type
      if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
        throw new Error("פורמט קובץ לא נתמך");
      }

      const id = generateId();
      const attachment: ContextAttachment = {
        id,
        type: "file",
        name: file.name,
        filename: file.name,
        format: file.name.split('.').pop()?.toLowerCase(),
        size_mb: parseFloat((file.size / (1024 * 1024)).toFixed(2)),
        status: "loading",
      };

      setAttachments((prev) => [...prev, attachment]);

      try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch(getApiPath("/api/context/extract-file"), {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "שגיאה בחילוץ הקובץ");
        }

        const body = await res.json();
        if (body.block) {
          setAttachments((prev) => prev.map(a =>
            a.id === id
              ? { ...a, block: body.block, stage: body.block.stage, status: body.block.stage === 'error' ? 'error' : 'ready' }
              : a,
          ));
          return;
        }
        // legacy fallback (can be removed once all three routes return {block})
        updateAttachment(id, {
          status: "ready",
          extractedText: body.text,
          tokenCount: body.tokens ?? body.tokenCount,
        });
      } catch (err) {
        updateAttachment(id, {
          status: "error",
          error: err instanceof Error ? err.message : "שגיאה לא צפויה",
        });
      } finally {
        pendingCounts.current.file--;
      }
    },
    [updateAttachment, limits.maxFiles]
  );

  const addFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;
      // Validate size/type before modifying state
      for (const file of files) {
        if (file.size > MAX_FILE_SIZE) throw new Error(`הקובץ ${file.name} גדול מדי (מקסימום 10MB)`);
        if (!ACCEPTED_FILE_TYPES.includes(file.type)) throw new Error(`פורמט קובץ לא נתמך: ${file.name}`);
      }
      // Validate count atomically (pendingCounts prevents races)
      const currentCount = countByType(attachmentsRef.current, "file") + pendingCounts.current.file;
      if (currentCount + files.length > limits.maxFiles) {
        throw new Error(`ניתן לצרף עד ${limits.maxFiles} קבצים`);
      }
      pendingCounts.current.file += files.length;

      const ids = files.map(() => generateId());
      setAttachments((prev) => [
        ...prev,
        ...files.map((file, i) => ({
          id: ids[i],
          type: "file" as AttachmentType,
          name: file.name,
          filename: file.name,
          format: file.name.split('.').pop()?.toLowerCase(),
          size_mb: parseFloat((file.size / (1024 * 1024)).toFixed(2)),
          status: "loading" as const,
        })),
      ]);

      try {
        const formData = new FormData();
        for (const file of files) formData.append("files", file);
        const res = await fetch(getApiPath("/api/context/extract-files"), {
          method: "POST",
          body: formData,
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "שגיאה בחילוץ הקבצים");
        }
        const body = await res.json();
        const blocks: unknown[] = body.blocks ?? [];
        setAttachments((prev) =>
          prev.map((a) => {
            const idx = ids.indexOf(a.id);
            if (idx === -1) return a;
            const block = blocks[idx] as { stage?: string } | undefined;
            if (!block) return { ...a, status: "error" as const, error: "שגיאה בעיבוד" } as ContextAttachment;
            return {
              ...a,
              block: block as ContextAttachment['block'],
              stage: block.stage as ProcessingStage | undefined,
              status: (block.stage === "error" ? "error" : "ready") as AttachmentStatus,
            } as ContextAttachment;
          })
        );
      } catch (err) {
        setAttachments((prev) =>
          prev.map((a) =>
            ids.includes(a.id)
              ? { ...a, status: "error" as const, error: err instanceof Error ? err.message : "שגיאה לא צפויה" }
              : a
          )
        );
      } finally {
        pendingCounts.current.file -= files.length;
      }
    },
    [limits.maxFiles]
  );

  const addUrl = useCallback(
    async (url: string) => {
      // Validate count (sync counter prevents double-click race)
      if (countByType(attachmentsRef.current, "url") + pendingCounts.current.url >= limits.maxUrls) {
        throw new Error(`ניתן לצרף עד ${limits.maxUrls} כתובות URL`);
      }
      pendingCounts.current.url++;
      // Validate URL format
      try {
        new URL(url);
      } catch {
        throw new Error("כתובת URL לא תקינה");
      }

      const id = generateId();
      const attachment: ContextAttachment = {
        id,
        type: "url",
        name: url,
        status: "loading",
      };

      setAttachments((prev) => [...prev, attachment]);

      try {
        const res = await fetch(getApiPath("/api/context/extract-url"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "שגיאה בחילוץ התוכן מהכתובת");
        }

        const body = await res.json();
        if (body.block) {
          setAttachments((prev) => prev.map(a =>
            a.id === id
              ? { ...a, block: body.block, stage: body.block.stage, status: body.block.stage === 'error' ? 'error' : 'ready' }
              : a,
          ));
          return;
        }
        // legacy fallback (can be removed once all three routes return {block})
        updateAttachment(id, {
          status: "ready",
          extractedText: body.text,
          tokenCount: body.tokens ?? body.tokenCount,
        });
      } catch (err) {
        updateAttachment(id, {
          status: "error",
          error: err instanceof Error ? err.message : "שגיאה לא צפויה",
        });
      } finally {
        pendingCounts.current.url--;
      }
    },
    [updateAttachment, limits.maxUrls]
  );

  const addImage = useCallback(
    async (file: File) => {
      // Validate count (sync counter prevents double-click race)
      if (countByType(attachmentsRef.current, "image") + pendingCounts.current.image >= limits.maxImages) {
        throw new Error(`ניתן לצרף עד ${limits.maxImages} תמונות`);
      }
      pendingCounts.current.image++;
      // Validate size
      if (file.size > MAX_IMAGE_SIZE) {
        throw new Error("התמונה גדולה מדי (מקסימום 5MB)");
      }
      // Validate type
      if (!file.type.startsWith("image/")) {
        throw new Error("פורמט תמונה לא נתמך");
      }

      const id = generateId();
      const attachment: ContextAttachment = {
        id,
        type: "image",
        name: file.name,
        filename: file.name,
        format: file.name.split('.').pop()?.toLowerCase(),
        size_mb: parseFloat((file.size / (1024 * 1024)).toFixed(2)),
        status: "loading",
      };

      setAttachments((prev) => [...prev, attachment]);

      try {
        const formData = new FormData();
        formData.append("image", file);

        const res = await fetch(getApiPath("/api/context/describe-image"), {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "שגיאה בעיבוד התמונה");
        }

        const body = await res.json();
        if (body.block) {
          setAttachments((prev) => prev.map(a =>
            a.id === id
              ? { ...a, block: body.block, stage: body.block.stage, status: body.block.stage === 'error' ? 'error' : 'ready' }
              : a,
          ));
          return;
        }
        // legacy fallback (can be removed once all three routes return {block})
        updateAttachment(id, {
          status: "ready",
          extractedText: body.description ?? body.text,
          tokenCount: body.tokens ?? body.tokenCount,
        });
      } catch (err) {
        updateAttachment(id, {
          status: "error",
          error: err instanceof Error ? err.message : "שגיאה לא צפויה",
        });
      } finally {
        pendingCounts.current.image--;
      }
    },
    [updateAttachment, limits.maxImages]
  );

  const retryAttachment = useCallback(
    async (id: string) => {
      const att = attachmentsRef.current.find((a) => a.id === id);
      if (!att || att.status !== 'error') return;

      // Remove old entry and re-add via the appropriate method
      setAttachments((prev) => prev.filter((a) => a.id !== id));

      if (att.type === 'url' && att.name) {
        await addUrl(att.name);
      }
      // For file/image we can't retry without the original File object,
      // so we just clear the error so the user can re-attach.
    },
    [addUrl]
  );

  const removeAttachment = useCallback((id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setAttachments([]);
  }, []);

  const getContextPayload = useCallback((): ContextPayload[] => {
    return attachments
      .filter((a) => a.status === "ready" && (a.block || a.extractedText))
      .map((a) => {
        // Prefer the new ContextBlock shape when available
        if (a.block) {
          return a.block as unknown as ContextPayload;
        }
        // Legacy fallback
        return {
          type: a.type,
          name: a.name,
          content: a.extractedText!,
          tokenCount: a.tokenCount ?? 0,
          format: a.format || undefined,
          filename: a.filename || a.name,
          url: a.url || (a.type === 'url' ? a.name : undefined),
          description: a.type === 'image' ? (a.extractedText || undefined) : undefined,
        };
      });
  }, [attachments]);

  return {
    attachments,
    totalTokens,
    isOverLimit,
    limits,
    addFile,
    addFiles,
    addUrl,
    addImage,
    retryAttachment,
    removeAttachment,
    clearAll,
    getContextPayload,
  };
}
