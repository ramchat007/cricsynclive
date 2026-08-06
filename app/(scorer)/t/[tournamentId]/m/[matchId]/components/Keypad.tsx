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
  
  const strikerId = engine.match?.live_striker_id;
  
  const allPlayers = [
    ...(engine.team1Players || []),
    ...(engine.team2Players || []),
  ];
  
  const activeStriker = allPlayers.find(
    (player: any) => player.id === strikerId,
  );


  const strikerName =
    activeStriker?.full_name ||
    activeStriker?.name ||
    activeStriker?.short_name ||
    "Striker";

  console.log(
    "Keypad Rendered: Striker Name:",
    strikerName,
    "Striker ID:",
    strikerId,
  );
  return (
    <div
      onClickCapture={onManualInteraction}
      className="order-1 lg:order-1 fixed bottom-0 left-0 right-0 z-[70] bg-[var(--surface-1)]/90 backdrop-blur-2xl border-t border-[var(--border-1)] shadow-[0_-20px_40px_rgba(0,0,0,0.15)] pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-4 px-3 sm:px-4 lg:static lg:bg-transparent lg:border-none lg:shadow-none lg:p-0 lg:pb-0 transition-transform duration-300"
    >
      <div className="lg:bg-[var(--surface-1)] lg:p-6 lg:rounded-2xl lg:border lg:border-[var(--border-1)] lg:shadow-sm max-w-lg mx-auto lg:max-w-none">
        {/* CONSOLE HEADER & LIVE SYNC INDICATOR */}
        <div className="flex items-center justify-between mb-3 px-1 lg:mb-4">
          <h3 className="text-[13px] sm:text-xs font-black text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
            Record Next Ball
          </h3>
          {strikerId && (
            <span className="flex items-center gap-1.5 bg-[var(--accent)]/10 border border-[var(--accent)]/20 px-2.5 py-1 rounded-md w-[180px]">
              <span className="text-[10px] text-[var(--accent)]">🏏</span>
              <span className="text-[10px] font-black text-[var(--accent)] uppercase tracking-widest truncate max-w-[150px]">
                {strikerName}
              </span>
            </span>
          )}
        </div>

        {/* TOP ROW: SINGLES & DOTS (Neutral, High Contrast) */}
        <div className="grid grid-cols-4 gap-2 sm:gap-3 mb-2 sm:mb-3">
          {[0, 1, 2, 3].map((runs) => (
            <button
              key={runs}
              onClick={() => handleRecordBall(runs)}
              disabled={engine.isSubmittingBall}
              className="min-h-[56px] sm:min-h-[64px] bg-[var(--surface-2)] border border-[var(--border-1)] hover:bg-[var(--border-1)] disabled:opacity-50 text-[var(--foreground)] font-black text-2xl sm:text-3xl rounded-xl sm:rounded-xl transition-all active:scale-95 flex items-center justify-center shadow-sm"
            >
              {runs}
            </button>
          ))}
        </div>

        {/* MIDDLE ROW: BOUNDARIES & ACTIONS (Semantic Colors) */}
        <div className="grid grid-cols-4 gap-2 sm:gap-3 mb-3 sm:mb-6">
          {/* The '4' Button - Striking Amber */}
          <button
            onClick={() => handleRecordBall(4)}
            disabled={engine.isSubmittingBall}
            className="min-h-[56px] sm:min-h-[64px] bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-black text-2xl sm:text-3xl rounded-xl sm:rounded-xl transition-all active:scale-95 flex items-center justify-center shadow-[0_4px_12px_rgba(245,158,11,0.3)] border border-amber-400"
          >
            4
          </button>

          {/* The '6' Button - Accent/Emerald */}
          <button
            onClick={() => handleRecordBall(6)}
            disabled={engine.isSubmittingBall}
            className="min-h-[56px] sm:min-h-[64px] bg-[var(--accent)] hover:brightness-110 disabled:opacity-50 text-[var(--background)] font-black text-2xl sm:text-3xl rounded-xl sm:rounded-xl transition-all active:scale-95 flex items-center justify-center shadow-[0_4px_12px_var(--accent-glow,rgba(0,0,0,0.2))] border border-[var(--accent)]/50"
          >
            6
          </button>

          {/* WIDE "MORE ACTIONS" BUTTON */}
          <button
            onClick={() => {
              setMoreActionType("penalty-add");
              setShowMoreModal(true);
            }}
            className="col-span-2 min-h-[56px] sm:min-h-[64px] bg-[var(--surface-2)] border border-[var(--border-1)] hover:bg-[var(--border-1)] text-[var(--foreground)] font-black text-xs sm:text-sm uppercase tracking-widest rounded-xl sm:rounded-xl transition-all active:scale-95 flex flex-col items-center justify-center shadow-sm"
          >
            <span className="text-[16px] sm:text-[20px] leading-none mb-0.5">
              ⚙️
            </span>
            <span>More</span>
          </button>
        </div>

        <hr className="border-[var(--border-1)] hidden sm:block mb-4" />

        {/* BOTTOM ROW: EXTRAS & OUT (Color Coded Risk) */}
        <div className="grid grid-cols-5 gap-1.5 sm:gap-3">
          <button
            onClick={() => {
              setPendingExtraType("wide");
              setShowExtrasModal(true);
            }}
            className="min-h-[52px] sm:min-h-[60px] bg-orange-500/10 border border-orange-500/30 text-orange-500 font-black text-xs sm:text-sm uppercase rounded-xl active:scale-95 transition-all flex items-center justify-center shadow-sm"
          >
            WD
          </button>
          <button
            onClick={() => {
              setPendingExtraType("no-ball");
              setShowExtrasModal(true);
            }}
            className="min-h-[52px] sm:min-h-[60px] bg-orange-500/10 border border-orange-500/30 text-orange-500 font-black text-xs sm:text-sm uppercase rounded-xl active:scale-95 transition-all flex items-center justify-center shadow-sm"
          >
            NB
          </button>
          <button
            onClick={() => {
              setPendingExtraType("leg-bye");
              setShowExtrasModal(true);
            }}
            className="min-h-[52px] sm:min-h-[60px] bg-[var(--surface-2)] border border-[var(--border-1)] text-[var(--text-muted)] hover:text-[var(--foreground)] font-black text-xs sm:text-sm uppercase rounded-xl active:scale-95 transition-all flex items-center justify-center shadow-sm"
          >
            LB
          </button>
          <button
            onClick={() => {
              setPendingExtraType("bye");
              setShowExtrasModal(true);
            }}
            className="min-h-[52px] sm:min-h-[60px] bg-[var(--surface-2)] border border-[var(--border-1)] text-[var(--text-muted)] hover:text-[var(--foreground)] font-black text-xs sm:text-sm uppercase rounded-xl active:scale-95 transition-all flex items-center justify-center shadow-sm"
          >
            B
          </button>

          {/* THE OUT BUTTON - Maximum Danger Weight */}
          <button
            onClick={() => {
              setPlayerOutId(engine.match!.live_striker_id);
              setShowWicketModal(true);
            }}
            className="min-h-[52px] sm:min-h-[60px] bg-red-500 hover:bg-red-600 text-white font-black text-xs sm:text-sm uppercase rounded-xl active:scale-95 transition-all flex items-center justify-center shadow-[0_4px_12px_rgba(239,68,68,0.4)] border border-red-600"
          >
            OUT
          </button>
        </div>
      </div>
      {/* <VoiceManualModal /> */}
    </div>
  );
}
