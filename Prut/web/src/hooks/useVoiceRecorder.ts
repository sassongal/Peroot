"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { logger } from "@/lib/logger";


export const VOICE_LANGUAGES = [
  { code: 'he-IL', label: 'עברית', flag: '🇮🇱', short: 'HE' },
  { code: 'en-US', label: 'English', flag: '🇺🇸', short: 'EN' },
  { code: 'ar-SA', label: 'العربية', flag: '🇸🇦', short: 'AR' },
  { code: 'ru-RU', label: 'Русский', flag: '🇷🇺', short: 'RU' },
] as const;

export type VoiceLang = typeof VOICE_LANGUAGES[number]['code'];

interface UseVoiceRecorderProps {
  onResult: (text: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
  lang?: VoiceLang;
}

export function useVoiceRecorder({ onResult, onError, lang = 'he-IL' }: UseVoiceRecorderProps) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  // Keep callbacks in refs to prevent effect re-running
  const onResultRef = useRef(onResult);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onResultRef.current = onResult;
    onErrorRef.current = onError;
  }, [onResult, onError]);

  useEffect(() => {
    // Basic browser support check
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

    recognition.onresult = (event: Event & { resultIndex: number; results: SpeechRecognitionResultList }) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      logger.info("Voice Result:", { final: finalTranscript, interim: interimTranscript });

      if (finalTranscript || interimTranscript) {
        onResultRef.current(finalTranscript || interimTranscript, !!finalTranscript);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [lang]); // Re-init when language changes

  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
      } catch (e) {
        logger.error("Failed to start recognition:", e);
      }
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
    setIsSupported(typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition));
  }, []);

  return {
    isListening,
    startListening,
    stopListening,
    toggleListening,
    isSupported
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
  onresult: ((event: Event & { resultIndex: number; results: SpeechRecognitionResultList }) => void) | null;
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
