"use client";

import { useState, useCallback, useMemo, useRef } from "react";
import type { ContextAttachment, ContextPayload, AttachmentType } from "@/lib/context/types";
import type { ProcessingStage } from "@/lib/context/engine/types";
import { PLAN_CONTEXT_LIMITS } from "@/lib/plans";
import { getApiPath } from "@/lib/api-path";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB

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

function countByType(attachments: ContextAttachment[], type: AttachmentType): number {
  return attachments.filter((a) => a.type === type).length;
}

async function readSseStream(
  response: Response,
  onStage: (stage: ProcessingStage) => void,
  onBlock: (block: unknown) => void,
  onError: (error: string) => void,
): Promise<void> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";
    for (const part of parts) {
      const line = part.trim();
      if (!line.startsWith("data:")) continue;
      try {
        const parsed = JSON.parse(line.slice(5).trim()) as Record<string, unknown>;
        if (parsed.stage) onStage(parsed.stage as ProcessingStage);
        else if (parsed.block) onBlock(parsed.block);
        else if (parsed.error) onError(parsed.error as string);
      } catch {
        // malformed SSE line — skip
      }
    }
  }
}

export interface UseContextAttachmentsOptions {
  tier?: "free" | "pro";
}

export function useContextAttachments(options: UseContextAttachmentsOptions = {}) {
  const tier = options.tier ?? "free";
  const limits = PLAN_CONTEXT_LIMITS[tier];

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
    [attachments],
  );

  const isOverLimit = totalTokens > limits.total;

  const updateAttachment = useCallback((id: string, updates: Partial<ContextAttachment>) => {
    setAttachments((prev) => prev.map((a) => (a.id === id ? { ...a, ...updates } : a)));
  }, []);

  const addFile = useCallback(
    async (file: File) => {
      if (
        countByType(attachmentsRef.current, "file") + pendingCounts.current.file >=
        limits.maxFiles
      ) {
        throw new Error(`ניתן לצרף עד ${limits.maxFiles} קבצים`);
      }
      pendingCounts.current.file++;
      if (file.size > MAX_FILE_SIZE) {
        throw new Error("הקובץ גדול מדי (מקסימום 10MB)");
      }
      if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
        throw new Error("פורמט קובץ לא נתמך");
      }

      const id = generateId();
      const attachment: ContextAttachment = {
        id,
        type: "file",
        name: file.name,
        filename: file.name,
        format: file.name.split(".").pop()?.toLowerCase(),
        size_mb: parseFloat((file.size / (1024 * 1024)).toFixed(2)),
        status: "loading",
        stage: "uploading",
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
          throw new Error((body as { error?: string }).error || "שגיאה בחילוץ הקובץ");
        }

        await readSseStream(
          res,
          (stage) => updateAttachment(id, { stage }),
          (block) => {
            const b = block as { stage?: string };
            setAttachments((prev) =>
              prev.map((a) =>
                a.id === id
                  ? {
                      ...a,
                      block: block as ContextAttachment["block"],
                      stage: b.stage as ProcessingStage,
                      status: b.stage === "error" ? "error" : "ready",
                    }
                  : a,
              ),
            );
          },
          (error) => updateAttachment(id, { status: "error", error }),
        );
      } catch (err) {
        updateAttachment(id, {
          status: "error",
          error: err instanceof Error ? err.message : "שגיאה לא צפויה",
        });
      } finally {
        pendingCounts.current.file--;
      }
    },
    [limits.maxFiles, updateAttachment],
  );

  const addUrl = useCallback(
    async (url: string) => {
      if (
        countByType(attachmentsRef.current, "url") + pendingCounts.current.url >=
        limits.maxUrls
      ) {
        throw new Error(`ניתן לצרף עד ${limits.maxUrls} כתובות URL`);
      }
      pendingCounts.current.url++;
      try {
        new URL(url);
      } catch {
        throw new Error("כתובת URL לא תקינה");
      }

      const id = generateId();
      const parsed = new URL(url);
      const displayName = parsed.hostname.replace(/^www\./, "");
      const attachment: ContextAttachment = {
        id,
        type: "url",
        name: displayName,
        url,
        status: "loading",
        stage: "extracting",
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
          throw new Error((body as { error?: string }).error || "שגיאה בחילוץ התוכן מהכתובת");
        }

        await readSseStream(
          res,
          (stage) => updateAttachment(id, { stage }),
          (block) => {
            const b = block as { stage?: string };
            setAttachments((prev) =>
              prev.map((a) =>
                a.id === id
                  ? {
                      ...a,
                      block: block as ContextAttachment["block"],
                      stage: b.stage as ProcessingStage,
                      status: b.stage === "error" ? "error" : "ready",
                    }
                  : a,
              ),
            );
          },
          (error) => updateAttachment(id, { status: "error", error }),
        );
      } catch (err) {
        updateAttachment(id, {
          status: "error",
          error: err instanceof Error ? err.message : "שגיאה לא צפויה",
        });
      } finally {
        pendingCounts.current.url--;
      }
    },
    [limits.maxUrls, updateAttachment],
  );

  const addImage = useCallback(
    async (file: File) => {
      if (
        countByType(attachmentsRef.current, "image") + pendingCounts.current.image >=
        limits.maxImages
      ) {
        throw new Error(`ניתן לצרף עד ${limits.maxImages} תמונות`);
      }
      pendingCounts.current.image++;
      if (file.size > MAX_IMAGE_SIZE) {
        throw new Error("התמונה גדולה מדי (מקסימום 5MB)");
      }
      if (!file.type.startsWith("image/")) {
        throw new Error("פורמט תמונה לא נתמך");
      }

      const id = generateId();
      const attachment: ContextAttachment = {
        id,
        type: "image",
        name: file.name,
        filename: file.name,
        format: file.name.split(".").pop()?.toLowerCase(),
        size_mb: parseFloat((file.size / (1024 * 1024)).toFixed(2)),
        status: "loading",
        stage: "uploading",
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
          throw new Error((body as { error?: string }).error || "שגיאה בעיבוד התמונה");
        }

        await readSseStream(
          res,
          (stage) => updateAttachment(id, { stage }),
          (block) => {
            const b = block as { stage?: string };
            setAttachments((prev) =>
              prev.map((a) =>
                a.id === id
                  ? {
                      ...a,
                      block: block as ContextAttachment["block"],
                      stage: b.stage as ProcessingStage,
                      status: b.stage === "error" ? "error" : "ready",
                    }
                  : a,
              ),
            );
          },
          (error) => updateAttachment(id, { status: "error", error }),
        );
      } catch (err) {
        updateAttachment(id, {
          status: "error",
          error: err instanceof Error ? err.message : "שגיאה לא צפויה",
        });
      } finally {
        pendingCounts.current.image--;
      }
    },
    [limits.maxImages, updateAttachment],
  );

  const removeAttachment = useCallback((id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setAttachments([]);
  }, []);

  const getContextPayload = useCallback((): ContextPayload[] => {
    return attachments
      .filter((a) => a.status === "ready" && a.block)
      .map((a) => a.block as unknown as ContextPayload);
  }, [attachments]);

  return {
    attachments,
    totalTokens,
    isOverLimit,
    addFile,
    addUrl,
    addImage,
    removeAttachment,
    clearAll,
    getContextPayload,
  };
}
