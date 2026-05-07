"use client";
import React, { useState } from "react";
import { Calendar, MapPin, Coins, Users, Trophy, Flag } from "lucide-react";

export default function Info({
  match,
  team1Players = [],
  team2Players = [],
}: any) {
  const [activeSquadTab, setActiveSquadTab] = useState<1 | 2>(1);

  if (!match) {
    return (
      <div className="text-center py-20 animate-in fade-in">
        <div className="w-20 h-20 bg-[var(--surface-2)] border border-[var(--border-1)] rounded-full flex items-center justify-center text-3xl mx-auto mb-6 animate-pulse">
          ℹ️
        </div>
        <h3 className="font-black text-[var(--text-muted)] uppercase tracking-widest text-lg">
          Match Information
        </h3>
        <p className="text-base font-bold text-[var(--text-muted)] mt-2 opacity-80">
          Awaiting match data...
        </p>
      </div>
    );
  }

  // Derived Info
  const t1Name = match.team1?.name || "Team 1";
  const t2Name = match.team2?.name || "Team 2";
  const t1Short = match.team1?.short_name || "T1";
  const t2Short = match.team2?.short_name || "T2";

  let tossText = "Toss not yet decided";
  if (match.toss_winner_id && match.toss_decision) {
    const tossWinnerName =
      match.toss_winner_id === match.team1_id ? t1Name : t2Name;
    tossText = `${tossWinnerName} won the toss and elected to ${match.toss_decision} first.`;
  }

  const matchDate = match.created_at
    ? new Date(match.created_at).toLocaleDateString("en-US", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "Date TBD";

  const activeSquad = activeSquadTab === 1 ? team1Players : team2Players;

  return (
    <div className="flex flex-col lg:flex-row gap-6 w-full animate-in fade-in pb-10 transition-colors duration-300">
      {/* LEFT COLUMN: MATCH DETAILS */}
      <div className="flex-1 space-y-6">
        <h3 className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-[var(--text-muted)] px-2">
          Match Details
        </h3>

        <div className="bg-[var(--surface-1)] rounded-[2rem] border border-[var(--border-1)] shadow-sm overflow-hidden p-6 sm:p-8 space-y-6 transition-colors">
          {/* Series / Stage */}
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center shrink-0 border border-[var(--accent)]/20">
              <Trophy size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">
                Stage / Format
              </p>
              <p className="font-bold text-[var(--foreground)] text-lg">
                {match.stage || "League Match"}{" "}
                <span className="text-[var(--text-muted)] font-medium mx-1 opacity-50">
                  •
                </span>{" "}
                {match.overs_count || 20} Overs
              </p>
            </div>
          </div>

          {/* Toss */}
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 border border-amber-500/20">
              <Coins size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">
                Toss
              </p>
              <p className="font-bold text-[var(--foreground)] text-lg">
                {tossText}
              </p>
            </div>
          </div>

          {/* Venue */}
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0 border border-indigo-500/20">
              <MapPin size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">
                Venue
              </p>
              <p className="font-bold text-[var(--foreground)] text-lg">
                {match.venue || "Stadium TBD"}
              </p>
            </div>
          </div>

          {/* Date */}
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0 border border-rose-500/20">
              <Calendar size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">
                Date
              </p>
              <p className="font-bold text-[var(--foreground)] text-lg">
                {matchDate}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: SQUADS */}
      <div className="flex-1 space-y-6">
        <div className="flex justify-between items-end px-2">
          <h3 className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-[var(--text-muted)]">
            Playing Squads
          </h3>
          <div className="flex items-center gap-1 text-[var(--text-muted)] text-[10px] font-black uppercase tracking-widest">
            <Users size={12} /> {activeSquad.length} Players
          </div>
        </div>

        <div className="bg-[var(--surface-1)] rounded-[2rem] border border-[var(--border-1)] shadow-sm overflow-hidden transition-colors">
          {/* Squad Toggle Tabs */}
          <div className="flex p-2 border-b border-[var(--border-1)] bg-[var(--surface-2)]">
            <button
              onClick={() => setActiveSquadTab(1)}
              className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                activeSquadTab === 1
                  ? "bg-[var(--surface-1)] shadow-sm text-[var(--accent)]"
                  : "text-[var(--text-muted)] hover:text-[var(--foreground)]"
              }`}
            >
              {t1Short}
            </button>
            <button
              onClick={() => setActiveSquadTab(2)}
              className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                activeSquadTab === 2
                  ? "bg-[var(--surface-1)] shadow-sm text-[var(--accent)]"
                  : "text-[var(--text-muted)] hover:text-[var(--foreground)]"
              }`}
            >
              {t2Short}
            </button>
          </div>

          {/* Player List */}
          <div className="divide-y divide-[var(--border-1)] max-h-[500px] overflow-y-auto custom-scrollbar">
            {activeSquad.length === 0 ? (
              <div className="p-10 text-center text-sm font-bold text-[var(--text-muted)]">
                Squad hasn't been announced yet.
              </div>
            ) : (
              activeSquad.map((player: any, idx: number) => (
                <div
                  key={player.id || idx}
                  className="p-4 flex items-center gap-4 hover:bg-[var(--surface-2)] transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-[var(--surface-2)] flex items-center justify-center font-black text-[var(--text-muted)] text-xs shrink-0 border border-[var(--border-1)]">
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-[var(--foreground)] text-base">
                      {player.full_name}
                      {player.id === match.team1_captain_id ||
                      player.id === match.team2_captain_id ? (
                        <span className="ml-2 text-[10px] bg-amber-500/20 text-amber-500 px-2 py-0.5 rounded-full font-black tracking-widest align-middle">
                          (C)
                        </span>
                      ) : null}
                    </p>
                    <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mt-0.5">
                      {player.role || "Player"}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
