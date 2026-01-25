"use client";

import { useState, useEffect, useCallback, useRef } from 'react';

interface UseVoiceRecorderProps {
  onResult: (text: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
}

export function useVoiceRecorder({ onResult, onError }: UseVoiceRecorderProps) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

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
    recognition.lang = 'he-IL'; // Default to Hebrew to start, or make dynamic later

    recognition.onstart = () => {
      console.log("🎤 Recording Started");
      setIsListening(true);
    };

    recognition.onend = () => {
      console.log("🎤 Recording Stopped");
      setIsListening(false);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error("Speech recognition error", event.error);
      setIsListening(false);
      if (onError) onError(event.error);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
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

      // We only send updates if there is content
      if (finalTranscript || interimTranscript) {
        onResult(finalTranscript || interimTranscript, !!finalTranscript);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [onResult, onError]);

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

  return {
    isListening,
    startListening,
    stopListening,
    toggleListening,
    isSupported: typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition)
  };
}

// Add types for TypeScript since they might not be in the global scope by default
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}
