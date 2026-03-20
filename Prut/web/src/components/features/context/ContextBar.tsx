"use client";

import { useRef, useState, useCallback, type KeyboardEvent } from "react";
import { Paperclip, Globe, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ContextAttachment } from "@/lib/context/types";

interface ContextBarProps {
  onAddFile: (file: File) => void;
  onAddUrl: (url: string) => void;
  onAddImage: (file: File) => void;
  attachments: ContextAttachment[];
  disabled?: boolean;
}

export function ContextBar({
  onAddFile,
  onAddUrl,
  onAddImage,
  attachments,
  disabled = false,
}: ContextBarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlValue, setUrlValue] = useState("");

  const attachmentCount = attachments.length;

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        onAddFile(file);
      }
      // Reset so the same file can be selected again
      e.target.value = "";
    },
    [onAddFile]
  );

  const handleImageChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        onAddImage(file);
      }
      e.target.value = "";
    },
    [onAddImage]
  );

  const handleUrlSubmit = useCallback(() => {
    const trimmed = urlValue.trim();
    if (trimmed) {
      onAddUrl(trimmed);
      setUrlValue("");
      setShowUrlInput(false);
    }
  }, [urlValue, onAddUrl]);

  const handleUrlKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleUrlSubmit();
      }
      if (e.key === "Escape") {
        setShowUrlInput(false);
        setUrlValue("");
      }
    },
    [handleUrlSubmit]
  );

  return (
    <div dir="rtl" className="flex items-center gap-1">
      {/* File button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "p-1.5 rounded-md transition-colors",
          "text-[var(--text-muted)] hover:text-amber-400",
          "disabled:opacity-40 disabled:pointer-events-none"
        )}
        aria-label="צירוף קובץ"
        title="צירוף קובץ"
      >
        <Paperclip className="w-4 h-4" />
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,.txt,.csv,.xlsx"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* URL button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setShowUrlInput((prev) => !prev)}
        className={cn(
          "p-1.5 rounded-md transition-colors",
          "text-[var(--text-muted)] hover:text-amber-400",
          showUrlInput && "text-amber-400",
          "disabled:opacity-40 disabled:pointer-events-none"
        )}
        aria-label="צירוף כתובת URL"
        title="צירוף כתובת URL"
      >
        <Globe className="w-4 h-4" />
      </button>

      {/* Image button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => imageInputRef.current?.click()}
        className={cn(
          "p-1.5 rounded-md transition-colors",
          "text-[var(--text-muted)] hover:text-amber-400",
          "disabled:opacity-40 disabled:pointer-events-none"
        )}
        aria-label="צירוף תמונה"
        title="צירוף תמונה"
      >
        <ImageIcon className="w-4 h-4" />
      </button>
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageChange}
      />

      {/* Attachment count badge */}
      {attachmentCount > 0 && (
        <span className="w-2 h-2 rounded-full bg-amber-400 ms-1" />
      )}

      {/* Inline URL input */}
      {showUrlInput && (
        <input
          type="url"
          autoFocus
          value={urlValue}
          onChange={(e) => setUrlValue(e.target.value)}
          onKeyDown={handleUrlKeyDown}
          onBlur={() => {
            if (!urlValue.trim()) {
              setShowUrlInput(false);
            }
          }}
          placeholder="הדביקו כתובת URL"
          className={cn(
            "ms-1 px-2 py-1 rounded-md text-xs w-48",
            "bg-[var(--glass-bg)] border border-[var(--glass-border)]",
            "text-[var(--text-primary)] placeholder:text-[var(--text-muted)]",
            "focus:outline-none focus:border-amber-400/50"
          )}
        />
      )}
    </div>
  );
}
