"use client";
import React, { useState } from "react";
import { Info, X, Mic } from "lucide-react";

export default function VoiceManualModal() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="bg-[var(--surface-2)] border border-[var(--border-1)] hover:bg-[var(--border-1)] text-[var(--text-muted)] font-black text-[12px] uppercase rounded-xl transition-all active:scale-95 flex flex-col items-center justify-center"
      >
        <Info size={18} />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200 w-screen h-screen">
          <div className="bg-[var(--surface-1)] border border-[var(--border-1)] rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-[var(--border-1)] bg-[var(--surface-2)]/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[var(--accent)]/10 flex items-center justify-center">
                  <Mic size={20} className="text-[var(--accent)]" />
                </div>
                <div>
                  <h3 className="font-black text-[var(--foreground)] leading-none text-lg">
                    Voice Scoring
                  </h3>
                  <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mt-1">
                    Command Manual
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-10 h-10 rounded-xl bg-[var(--surface-2)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--foreground)] active:scale-95 transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-5 flex flex-col gap-4">
              <p className="text-xs font-bold text-[var(--text-muted)] mb-1">
                Say any of these exact phrases after tapping the microphone
                icon:
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[var(--surface-2)] p-3 rounded-xl border border-[var(--border-1)]">
                  <span className="text-[9px] font-black uppercase text-[var(--text-muted)] tracking-widest block mb-1">
                    Runs
                  </span>
                  <div className="text-sm font-bold text-[var(--foreground)]">
                    "Dot" or "Zero"
                  </div>
                  <div className="text-sm font-bold text-[var(--foreground)]">
                    "Single" or "One"
                  </div>
                  <div className="text-sm font-bold text-[var(--foreground)]">
                    "Double" or "Two"
                  </div>
                  <div className="text-sm font-bold text-[var(--foreground)]">
                    "Three"
                  </div>
                  <div className="text-sm font-bold text-[var(--foreground)]">
                    "Four" or "Boundary"
                  </div>
                  <div className="text-sm font-bold text-[var(--foreground)]">
                    "Six" or "Maximum"
                  </div>
                </div>

                <div className="bg-[var(--surface-2)] p-3 rounded-xl border border-[var(--border-1)] flex flex-col gap-4">
                  <div>
                    <span className="text-[9px] font-black uppercase text-[var(--text-muted)] tracking-widest block mb-1">
                      Extras
                    </span>
                    <div className="text-sm font-bold text-orange-500">
                      "Wide"
                    </div>
                    <div className="text-sm font-bold text-orange-500">
                      "No Ball"
                    </div>
                  </div>
                  <div>
                    <span className="text-[9px] font-black uppercase text-[var(--text-muted)] tracking-widest block mb-1">
                      Wickets
                    </span>
                    <div className="text-sm font-bold text-red-500">
                      "Wicket" or "Out"
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-[var(--accent)]/10 p-3 rounded-xl border border-[var(--accent)]/20 flex items-center justify-between">
                <div>
                  <span className="text-[9px] font-black uppercase text-[var(--accent)] tracking-widest block mb-0.5">
                    Corrections
                  </span>
                  <div className="text-sm font-bold text-[var(--foreground)]">
                    "Undo" or "Revert"
                  </div>
                </div>
                <span className="text-xs font-bold text-[var(--text-muted)]">
                  Reverts last ball
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
