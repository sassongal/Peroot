"use client";

import { useState, useCallback, useMemo, useRef } from "react";
import type {
  ContextAttachment,
  ContextPayload,
  AttachmentType,
} from "@/lib/context/types";
import { getApiPath } from "@/lib/api-path";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB
const TOKEN_LIMIT = 15_000;

const MAX_FILES = 3;
const MAX_URLS = 3;
const MAX_IMAGES = 3;

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

export function useContextAttachments() {
  const [attachments, setAttachments] = useState<ContextAttachment[]>([]);
  const attachmentsRef = useRef(attachments);
  attachmentsRef.current = attachments;

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

  const isOverLimit = totalTokens > TOKEN_LIMIT;

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
      // Validate count
      if (countByType(attachmentsRef.current, "file") >= MAX_FILES) {
        throw new Error("ניתן לצרף עד 3 קבצים");
      }
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

        const data = await res.json();
        updateAttachment(id, {
          status: "ready",
          extractedText: data.text,
          tokenCount: data.tokens ?? data.tokenCount,
        });
      } catch (err) {
        updateAttachment(id, {
          status: "error",
          error: err instanceof Error ? err.message : "שגיאה לא צפויה",
        });
      }
    },
    [updateAttachment]
  );

  const addUrl = useCallback(
    async (url: string) => {
      // Validate count
      if (countByType(attachmentsRef.current, "url") >= MAX_URLS) {
        throw new Error("ניתן לצרף עד 3 כתובות URL");
      }
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

        const data = await res.json();
        updateAttachment(id, {
          status: "ready",
          extractedText: data.text,
          tokenCount: data.tokens ?? data.tokenCount,
        });
      } catch (err) {
        updateAttachment(id, {
          status: "error",
          error: err instanceof Error ? err.message : "שגיאה לא צפויה",
        });
      }
    },
    [updateAttachment]
  );

  const addImage = useCallback(
    async (file: File) => {
      // Validate count
      if (countByType(attachmentsRef.current, "image") >= MAX_IMAGES) {
        throw new Error("ניתן לצרף עד 3 תמונות");
      }
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

        const data = await res.json();
        updateAttachment(id, {
          status: "ready",
          extractedText: data.description ?? data.text,
          tokenCount: data.tokens ?? data.tokenCount,
        });
      } catch (err) {
        updateAttachment(id, {
          status: "error",
          error: err instanceof Error ? err.message : "שגיאה לא צפויה",
        });
      }
    },
    [updateAttachment]
  );

  const removeAttachment = useCallback((id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setAttachments([]);
  }, []);

  const getContextPayload = useCallback((): ContextPayload[] => {
    return attachments
      .filter((a) => a.status === "ready" && a.extractedText)
      .map((a) => ({
        type: a.type,
        name: a.name,
        content: a.extractedText!,
        tokenCount: a.tokenCount ?? 0,
        format: a.format || undefined,
        filename: a.filename || a.name,
        url: a.url || (a.type === 'url' ? a.name : undefined),
        description: a.type === 'image' ? (a.extractedText || undefined) : undefined,
      }));
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
