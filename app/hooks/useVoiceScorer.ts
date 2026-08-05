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
  const isIntentionalStopRef = useRef(false);
  const lockUntilRef = useRef<number>(0); 

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Voice scoring is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true; 
    recognition.interimResults = true; 
    recognition.lang = "en-IN"; // Keep this for Indian accents
    recognitionRef.current = recognition;

    recognition.onresult = (event: any) => {
      // 1. If we are processing a toast, ignore new audio
      if (Date.now() < lockUntilRef.current) return;

      // 2. Read the latest chunk of audio
      const current = event.results.length - 1;
      const rawText = event.results[current][0].transcript.toLowerCase();
      
      // Strip ALL weird characters the browser tries to add, leaving only letters, numbers, and spaces
      const text = rawText.replace(/[^a-z0-9\s-]/g, ' ').trim();
      
      if (!text) return;
      console.log(`🎤 Heard: "${text}"`);

      // 3. Trigger Function (The "Rest & Reset" action)
      const triggerAction = (command: VoiceCommand, label: string) => {
        console.log(`✅ MATCHED: ${label}`);
        
        // Lock out new commands for 3.5 seconds
        lockUntilRef.current = Date.now() + 3500; 
        onCommandHeard(command, label);
        
        // IMMEDIATELY KILL THE MIC to wipe the browser's memory buffer
        recognition.stop(); 
      };

      // 4. Ultra-Aggressive Keyword Matching (Trained for Phonetic Typos)
      if (/\b(zero|dot|0|hero|jhero)\b/.test(text)) return triggerAction({ type: "runs", value: 0 }, "Dot Ball");
      if (/\b(one|single|1|van|won|on|un)\b/.test(text)) return triggerAction({ type: "runs", value: 1 }, "1 Run");
      if (/\b(two|double|2|too|to|tu|do)\b/.test(text)) return triggerAction({ type: "runs", value: 2 }, "2 Runs");
      if (/\b(three|3|tree|free|tri)\b/.test(text)) return triggerAction({ type: "runs", value: 3 }, "3 Runs");
      if (/\b(four|boundary|4|for|far|phor|phone)\b/.test(text)) return triggerAction({ type: "runs", value: 4 }, "4 Runs");
      if (/\b(six|maximum|6|sex|siks|seek)\b/.test(text)) return triggerAction({ type: "runs", value: 6 }, "6 Runs");
      if (/\b(wide|why|white|void)\b/.test(text)) return triggerAction({ type: "extra", value: "wide" }, "Wide Ball");
      if (/\b(no\s?ball|noball|no bowl)\b/.test(text)) return triggerAction({ type: "extra", value: "no-ball" }, "No Ball");
      if (/\b(wicket|out|howzat|catch)\b/.test(text)) return triggerAction({ type: "out" }, "Wicket");
      if (/\b(undo|revert)\b/.test(text)) return triggerAction({ type: "undo" }, "Undo");
    };

    recognition.onerror = (event: any) => {
      // Ignore normal silent pauses
      if (event.error === "no-speech" || event.error === "aborted") return;
      
      console.error("Speech API Error:", event.error);
      
      // If we hit a network limit, don't crash the UI. Just wait.
      if (event.error === "network") {
        console.warn("Network error hit. Backing off for 2 seconds...");
        // Temporarily lock the mic so it doesn't spam Google's servers
        lockUntilRef.current = Date.now() + 2000; 
      }
    };

    recognition.onend = () => {
      if (!isIntentionalStopRef.current) {
        // Check if we are currently locked (due to a toast OR a network error)
        const timeRemaining = Math.max(0, lockUntilRef.current - Date.now());
        
        setTimeout(() => {
          try {
            // Only restart if the user hasn't manually turned it off in the meantime
            if (!isIntentionalStopRef.current) {
              recognition.start();
              console.log("🔄 Mic Rebooted");
            }
          } catch (e) {
            console.error("Reboot failed", e);
          }
        }, timeRemaining + 100); 
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
      isIntentionalStopRef.current = true;
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      try {
        isIntentionalStopRef.current = false;
        lockUntilRef.current = 0;
        recognitionRef.current?.start();
        setIsListening(true);
        setError(null);
      } catch (e) {
        console.error("Failed to start", e);
      }
    }
  };

  return { isListening, toggleListening, error };
}