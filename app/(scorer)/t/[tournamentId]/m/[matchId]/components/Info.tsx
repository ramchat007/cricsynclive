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
        <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-3xl mx-auto mb-6 animate-pulse">
          ℹ️
        </div>
        <h3 className="font-black text-slate-400 uppercase tracking-widest text-lg">
          Match Information
        </h3>
        <p className="text-base font-bold text-slate-500 mt-2">
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
    <div className="flex flex-col lg:flex-row gap-6 w-full animate-in fade-in pb-10">
      {/* LEFT COLUMN: MATCH DETAILS */}
      <div className="flex-1 space-y-6">
        <h3 className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-400 px-2">
          Match Details
        </h3>

        <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden p-6 sm:p-8 space-y-6">
          {/* Series / Stage */}
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0 border border-teal-100 dark:border-teal-500/20">
              <Trophy size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                Stage / Format
              </p>
              <p className="font-bold text-slate-900 dark:text-white text-lg">
                {match.stage || "League Match"}{" "}
                <span className="text-slate-400 font-medium mx-1">•</span>{" "}
                {match.overs_count || 20} Overs
              </p>
            </div>
          </div>

          {/* Toss */}
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-100 dark:border-amber-500/20">
              <Coins size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                Toss
              </p>
              <p className="font-bold text-slate-900 dark:text-white text-lg">
                {tossText}
              </p>
            </div>
          </div>

          {/* Venue */}
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-100 dark:border-indigo-500/20">
              <MapPin size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                Venue
              </p>
              <p className="font-bold text-slate-900 dark:text-white text-lg">
                {match.venue || "Stadium TBD"}
              </p>
            </div>
          </div>

          {/* Date */}
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-100 dark:border-rose-500/20">
              <Calendar size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                Date
              </p>
              <p className="font-bold text-slate-900 dark:text-white text-lg">
                {matchDate}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: SQUADS */}
      <div className="flex-1 space-y-6">
        <div className="flex justify-between items-end px-2">
          <h3 className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-400">
            Playing Squads
          </h3>
          <div className="flex items-center gap-1 text-slate-400 text-[10px] font-black uppercase tracking-widest">
            <Users size={12} /> {activeSquad.length} Players
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          {/* Squad Toggle Tabs */}
          <div className="flex p-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
            <button
              onClick={() => setActiveSquadTab(1)}
              className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                activeSquadTab === 1
                  ? "bg-white dark:bg-slate-900 shadow-sm text-teal-600 dark:text-teal-400"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
              }`}
            >
              {t1Short}
            </button>
            <button
              onClick={() => setActiveSquadTab(2)}
              className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                activeSquadTab === 2
                  ? "bg-white dark:bg-slate-900 shadow-sm text-teal-600 dark:text-teal-400"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
              }`}
            >
              {t2Short}
            </button>
          </div>

          {/* Player List */}
          <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[500px] overflow-y-auto custom-scrollbar">
            {activeSquad.length === 0 ? (
              <div className="p-10 text-center text-sm font-bold text-slate-400">
                Squad hasn't been announced yet.
              </div>
            ) : (
              activeSquad.map((player: any, idx: number) => (
                <div
                  key={player.id || idx}
                  className="p-4 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-black text-slate-400 text-xs shrink-0 border border-slate-200 dark:border-slate-700">
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-slate-900 dark:text-white text-base">
                      {player.full_name}
                      {player.id === match.team1_captain_id ||
                      player.id === match.team2_captain_id ? (
                        <span className="ml-2 text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 px-2 py-0.5 rounded-full font-black tracking-widest align-middle">
                          (C)
                        </span>
                      ) : null}
                    </p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
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
