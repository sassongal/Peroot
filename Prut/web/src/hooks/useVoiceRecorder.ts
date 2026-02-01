"use client";

import { useState, useEffect, useCallback, useRef } from 'react';


interface UseVoiceRecorderProps {
  onResult: (text: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
}

export function useVoiceRecorder({ onResult, onError }: UseVoiceRecorderProps) {
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
      console.warn("Speech Recognition API not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'he-IL';

    recognition.onstart = () => {
      console.log("🎤 Recording Started");
      setIsListening(true);
    };

    recognition.onend = () => {
      console.log("🎤 Recording Stopped");
      setIsListening(false);
    };

    recognition.onerror = (event: Event & { error: string }) => {
      console.error("Speech recognition error", event.error);
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
      
      console.log("🎤 Result:", { final: finalTranscript, interim: interimTranscript });

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
  }, []); // Empty dependency array - only init once!

  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.error("Failed to start recognition:", e);
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
