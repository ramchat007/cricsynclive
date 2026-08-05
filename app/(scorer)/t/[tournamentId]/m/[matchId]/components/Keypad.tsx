"use client";
import React from "react";
import VoiceManualModal from "./VoiceManualModal";

type MoreActionType =
  | "penalty-add"
  | "penalty-minus"
  | "dead-ball"
  | "end-innings";

// Add the new onManualInteraction prop to your existing types
type KeypadProps = {
  engine: any;
  handleRecordBall: (runs: number) => void;
  setMoreActionType: (type: MoreActionType) => void; // 👈 Updated from (type: string)
  setShowMoreModal: (show: boolean) => void;
  setPendingExtraType: (type: any) => void;
  setShowExtrasModal: (show: boolean) => void;
  setPlayerOutId: (id: string) => void;
  setShowWicketModal: (show: boolean) => void;
  onManualInteraction?: () => void;
};

export default function Keypad({
  engine,
  handleRecordBall,
  setMoreActionType,
  setShowMoreModal,
  setPendingExtraType,
  setShowExtrasModal,
  setPlayerOutId,
  setShowWicketModal,
  onManualInteraction, // <--- DESTRUCTURE THE NEW PROP
}: KeypadProps) {
  return (
    <div
      onClickCapture={onManualInteraction}
      className="order-1 lg:order-1 fixed bottom-0 left-0 right-0 z-[70] bg-[var(--surface-1)]/95 backdrop-blur-xl border-t border-[var(--border-1)] shadow-[0_-10px_30px_rgba(0,0,0,0.1)] pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-3 px-3 lg:static lg:bg-transparent lg:border-none lg:shadow-none lg:p-0 lg:pb-0"
    >
      <div className="lg:bg-[var(--surface-1)] lg:p-6 lg:rounded-[2.5rem] lg:border lg:border-[var(--border-1)] lg:shadow-sm">
        <h3 className="hidden lg:block text-xs font-black text-[var(--text-muted)] uppercase tracking-widest mb-4 ml-1">
          Record Next Ball
        </h3>

        {/* Top Row: 0, 1, 2, 3 */}
        <div className="grid grid-cols-4 gap-1.5 sm:gap-3 mb-1.5 sm:mb-3">
          {[0, 1, 2, 3].map((runs) => (
            <button
              key={runs}
              onClick={() => handleRecordBall(runs)}
              disabled={engine.isSubmittingBall}
              className="bg-[var(--surface-2)] border border-[var(--border-1)] hover:bg-[var(--border-1)] disabled:opacity-50 text-[var(--foreground)] font-black text-xl sm:text-2xl py-2 sm:py-3 rounded-xl transition-all active:scale-95"
            >
              {runs}
            </button>
          ))}
        </div>

        {/* Middle Row: 4, 6, More Actions (Spans 2 columns) */}
        <div className="grid grid-cols-4 gap-1.5 sm:gap-3 mb-2 sm:mb-6">
          <button
            onClick={() => handleRecordBall(4)}
            disabled={engine.isSubmittingBall}
            className="bg-[var(--surface-2)] border border-[var(--border-1)] hover:bg-[var(--border-1)] disabled:opacity-50 text-[var(--foreground)] font-black text-xl sm:text-2xl py-2 sm:py-3 rounded-xl transition-all active:scale-95"
          >
            4
          </button>
          <button
            onClick={() => handleRecordBall(6)}
            disabled={engine.isSubmittingBall}
            className="bg-[var(--accent)] hover:opacity-90 disabled:opacity-50 text-[var(--background)] font-black text-xl sm:text-2xl py-2 sm:py-3 rounded-xl transition-all shadow-md active:scale-95"
          >
            6
          </button>

          {/* 🔥 WIDE "MORE ACTIONS" BUTTON 🔥 */}
          <button
            onClick={() => {
              setMoreActionType("penalty-add"); // Default reset
              setShowMoreModal(true);
            }}
            className="bg-[var(--surface-2)] border border-[var(--border-1)] hover:bg-[var(--border-1)] text-[var(--text-muted)] font-black text-[15px] uppercase rounded-xl transition-all active:scale-95 flex flex-col items-center justify-center"
          >
            <span>⚙️</span>
            <span>More</span>
          </button>
        </div>

        <hr className="border-[var(--border-1)] hidden sm:block mb-3" />

        {/* Bottom Row: WD, NB, LB, B, OUT */}
        <div className="grid grid-cols-5 gap-1.5 sm:gap-3">
          <button
            onClick={() => {
              setPendingExtraType("wide");
              setShowExtrasModal(true);
            }}
            className="bg-orange-500/10 border border-orange-500/20 text-orange-500 font-black text-xs sm:text-base uppercase py-2.5 sm:py-5 rounded-xl active:scale-95 transition-all"
          >
            WD
          </button>
          <button
            onClick={() => {
              setPendingExtraType("no-ball");
              setShowExtrasModal(true);
            }}
            className="bg-orange-500/10 border border-orange-500/20 text-orange-500 font-black text-xs sm:text-base uppercase py-2.5 sm:py-5 rounded-xl active:scale-95 transition-all"
          >
            NB
          </button>
          <button
            onClick={() => {
              setPendingExtraType("leg-bye");
              setShowExtrasModal(true);
            }}
            className="bg-[var(--surface-2)] border border-[var(--border-1)] text-[var(--text-muted)] font-black text-xs sm:text-base uppercase py-2.5 sm:py-5 rounded-xl active:scale-95 transition-all"
          >
            LB
          </button>
          <button
            onClick={() => {
              setPendingExtraType("bye");
              setShowExtrasModal(true);
            }}
            className="bg-[var(--surface-2)] border border-[var(--border-1)] text-[var(--text-muted)] font-black text-xs sm:text-base uppercase py-2.5 sm:py-5 rounded-xl active:scale-95 transition-all"
          >
            B
          </button>
          <button
            onClick={() => {
              setPlayerOutId(engine.match!.live_striker_id);
              setShowWicketModal(true);
            }}
            className="bg-red-500 hover:bg-red-600 text-white font-black text-xs sm:text-base uppercase py-2.5 sm:py-5 rounded-xl shadow-md active:scale-95 transition-all"
          >
            OUT
          </button>
        </div>
      </div>
        {/* <VoiceManualModal /> */}
    </div>
  );
}
