"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { logger } from "@/lib/logger";

export const VOICE_LANGUAGES = [
  { code: "he-IL", label: "עברית", flag: "🇮🇱", short: "HE" },
  { code: "en-US", label: "English", flag: "🇺🇸", short: "EN" },
  { code: "ar-SA", label: "العربية", flag: "🇸🇦", short: "AR" },
  { code: "ru-RU", label: "Русский", flag: "🇷🇺", short: "RU" },
] as const;

export type VoiceLang = (typeof VOICE_LANGUAGES)[number]["code"];

interface UseVoiceRecorderProps {
  /**
   * Called with accumulated transcript.
   * - isFinal=false: `text` is the current interim preview (not yet committed)
   * - isFinal=true: `text` is the new finalized segment to append
   */
  onResult: (text: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
  lang?: VoiceLang;
}

export function useVoiceRecorder({ onResult, onError, lang = "he-IL" }: UseVoiceRecorderProps) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  // Keep callbacks in refs to prevent effect re-running
  const onResultRef = useRef(onResult);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onResultRef.current = onResult;
    onErrorRef.current = onError;
  }, [onResult, onError]);

  // Track which result indices have already been committed as final
  // This prevents mobile browsers from re-firing the same final result
  const committedIndicesRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (typeof window === "undefined") return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      logger.warn("Speech Recognition API not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = lang;

    recognition.onstart = () => {
      logger.info("Recording Started");
      committedIndicesRef.current.clear();
      setIsListening(true);
    };

    recognition.onend = () => {
      logger.info("Recording Stopped");
      setIsListening(false);
    };

    recognition.onerror = (event: Event & { error: string }) => {
      logger.error("Speech recognition error", event.error);
      setIsListening(false);
      if (onErrorRef.current) onErrorRef.current(event.error);
    };

    recognition.onresult = (
      event: Event & { resultIndex: number; results: SpeechRecognitionResultList },
    ) => {
      let interimTranscript = "";
      let newFinalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const result = event.results[i];
        const transcript = result[0].transcript;

        if (result.isFinal) {
          // Only process this final result if we haven't already committed it
          if (!committedIndicesRef.current.has(i)) {
            committedIndicesRef.current.add(i);
            newFinalTranscript += transcript;
          }
        } else {
          interimTranscript += transcript;
        }
      }

      logger.info("Voice Result:", { final: newFinalTranscript, interim: interimTranscript });

      // Emit new final text (deduplicated)
      if (newFinalTranscript) {
        onResultRef.current(newFinalTranscript, true);
      }

      // Emit interim preview (always replaces previous interim)
      if (interimTranscript) {
        onResultRef.current(interimTranscript, false);
      } else if (newFinalTranscript) {
        // Clear interim when final arrives with no remaining interim
        onResultRef.current("", false);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [lang]);

  const startListening = useCallback(async () => {
    if (!recognitionRef.current || isListening) return;
    try {
      // Explicitly request mic permission first. Chrome's SpeechRecognition
      // otherwise fails with 'not-allowed' if no prior grant exists — never
      // prompting the user for a real choice.
      if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((t) => t.stop());
      }
      committedIndicesRef.current.clear();
      recognitionRef.current.start();
    } catch (e) {
      logger.error("Failed to start recognition:", e);
      const code =
        e instanceof DOMException && (e.name === "NotAllowedError" || e.name === "SecurityError")
          ? "not-allowed"
          : e instanceof DOMException && e.name === "NotFoundError"
            ? "audio-capture"
            : "start-failed";
      if (onErrorRef.current) onErrorRef.current(code);
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  }, [isListening]);

  const toggleListening = useCallback(() => {
    if (isListening) stopListening();
    else startListening();
  }, [isListening, startListening, stopListening]);

  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    queueMicrotask(() =>
      setIsSupported(
        typeof window !== "undefined" &&
          !!(window.SpeechRecognition || window.webkitSpeechRecognition),
      ),
    );
  }, []);

  return {
    isListening,
    startListening,
    stopListening,
    toggleListening,
    isSupported,
  };
}

// Add types for TypeScript since they might not be in the global scope by default
interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: Event & { error: string }) => void) | null;
  onresult:
    | ((event: Event & { resultIndex: number; results: SpeechRecognitionResultList }) => void)
    | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}

declare global {
  interface Window {
    SpeechRecognition: SpeechRecognitionConstructor;
    webkitSpeechRecognition: SpeechRecognitionConstructor;
  }
}
