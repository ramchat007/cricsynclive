"use client";
import React, { useEffect, useState } from "react";
import { Mic, X, Check } from "lucide-react";

type VoiceToastProps = {
  commandText: string;
  onAccept: () => void;
  onCancel: () => void;
  durationMs?: number;
};

export default function VoiceConfirmationToast({
  commandText,
  onAccept,
  onCancel,
  durationMs = 3000,
}: VoiceToastProps) {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    // 1. Visual Progress Bar Timer (Only updates UI)
    const intervalTime = 30; 
    const step = (intervalTime / durationMs) * 100;
    
    const progressTimer = setInterval(() => {
      setProgress((prev) => Math.max(0, prev - step));
    }, intervalTime);

    // 2. Action Timer (Safely calls the parent function)
    const actionTimer = setTimeout(() => {
      onAccept();
    }, durationMs);

    // Cleanup both timers if user manually clicks a button to kill the toast
    return () => {
      clearInterval(progressTimer);
      clearTimeout(actionTimer);
    };
  }, [durationMs, onAccept]);

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-sm animate-in slide-in-from-bottom-10 fade-in duration-300">
      <div className="bg-[var(--surface-1)] border border-[var(--border-1)] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[var(--accent)]/15 flex items-center justify-center animate-pulse shrink-0">
              <Mic size={20} className="text-[var(--accent)]" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                Voice Command
              </p>
              <p className="text-lg font-black text-[var(--foreground)] leading-none mt-0.5 truncate max-w-[150px]">
                {commandText}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button 
              onClick={onCancel}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 active:scale-90 transition-all"
            >
              <X size={20} />
            </button>
            <button 
              onClick={onAccept}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-[var(--accent)] text-[var(--background)] active:scale-90 transition-all shadow-md"
            >
              <Check size={20} />
            </button>
          </div>
        </div>
        <div className="w-full h-1.5 bg-[var(--surface-2)]">
          <div 
            className="h-full bg-[var(--accent)] transition-all ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}