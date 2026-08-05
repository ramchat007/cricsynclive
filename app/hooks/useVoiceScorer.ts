"use client";
import { useState, useEffect, useRef } from "react";

export type VoiceCommand = 
  | { type: "runs"; value: number }
  | { type: "extra"; value: "wide" | "no-ball" | "leg-bye" | "bye" }
  | { type: "out" }
  | { type: "undo" };

export function useVoiceScorer(
  onCommandHeard: (command: VoiceCommand, rawText: string) => void
) {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const recognitionRef = useRef<any>(null);
  // 🔥 NEW: Track if the user explicitly clicked the "Off" button
  const isIntentionalStopRef = useRef(false);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Voice scoring is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true; 
    recognition.interimResults = false;
    recognition.lang = "en-IN"; // Optimized for Indian English
    recognitionRef.current = recognition;

    recognition.onresult = (event: any) => {
      const current = event.resultIndex;
      const result = event.results[current][0];
      const confidence = result.confidence;

      const rawTranscript = result.transcript.toLowerCase();
      const transcript = rawTranscript.replace(/[.,!?]/g, '').trim();

      if (confidence < 0.75) return;

      switch (transcript) {
        case "dot ball":
        case "zero":
          onCommandHeard({ type: "runs", value: 0 }, "Dot Ball");
          break;
        case "single":
        case "one":
          onCommandHeard({ type: "runs", value: 1 }, "1 Run");
          break;
        case "double":
        case "two":
          onCommandHeard({ type: "runs", value: 2 }, "2 Runs");
          break;
        case "three":
          onCommandHeard({ type: "runs", value: 3 }, "3 Runs");
          break;
        case "four":
        case "boundary":
          onCommandHeard({ type: "runs", value: 4 }, "4 Runs");
          break;
        case "six":
        case "maximum":
          onCommandHeard({ type: "runs", value: 6 }, "6 Runs");
          break;
        case "wide":
          onCommandHeard({ type: "extra", value: "wide" }, "Wide Ball");
          break;
        case "no ball":
          onCommandHeard({ type: "extra", value: "no-ball" }, "No Ball");
          break;
        case "wicket":
        case "out":
          onCommandHeard({ type: "out" }, "Wicket");
          break;
        case "undo":
        case "revert":
          onCommandHeard({ type: "undo" }, "Undo Last Ball");
          break;
        default:
          break;
      }
    };

    // 🔥 FIX 1: Ignore the "no-speech" timeout
    recognition.onerror = (event: any) => {
      if (event.error === "no-speech") {
        // Normal silence between balls. Do nothing!
        return; 
      }
      if (event.error === "aborted") {
        // Normal when we manually stop it.
        return;
      }
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
    };

    // 🔥 FIX 2: Automatically restart the mic if Chrome kills it
    recognition.onend = () => {
      // If the user didn't click the STOP button, force it back on!
      if (!isIntentionalStopRef.current) {
        try {
          recognition.start();
        } catch (e) {
          // Prevent crashes if it tries to restart too fast
        }
      }
    };

    return () => {
      if (recognitionRef.current) {
        isIntentionalStopRef.current = true;
        recognitionRef.current.stop();
      }
    };
  }, [onCommandHeard]);

  const toggleListening = () => {
    if (isListening) {
      // User physically clicked OFF
      isIntentionalStopRef.current = true;
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      try {
        // User physically clicked ON
        isIntentionalStopRef.current = false;
        recognitionRef.current?.start();
        setIsListening(true);
        setError(null);
      } catch (e) {
        console.error("Recognition already started", e);
      }
    }
  };

  return { isListening, toggleListening, error };
}