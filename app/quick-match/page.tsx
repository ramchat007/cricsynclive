"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Swords, Zap, Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function QuickMatchStarter() {
  const router = useRouter();

  // Presets with Tennis Cricket defaults
  const [teamA, setTeamA] = useState("Team A");
  const [teamB, setTeamB] = useState("Team B");
  const [tossWinner, setTossWinner] = useState<"A" | "B">("A");
  const [decision, setDecision] = useState<"bat" | "bowl">("bat");

  const [overs, setOvers] = useState(12);
  const [squadSize, setSquadSize] = useState(9);
  // FIX: Changed "tennis" to "Hard Tennis" to match the exact button text below
  const [ballType, setBallType] = useState("Hard Tennis");

  const [isLoading, setIsLoading] = useState(false);

  const handleStartMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    const QUICK_MATCH_TOURNAMENT_ID = "00000000-0000-0000-0000-000000000000";

    try {
      // 1. Create Team A
      const { data: team1, error: err1 } = await supabase
        .from("teams")
        .insert({
          name: teamA,
          short_name: teamA.substring(0, 3).toUpperCase(),
          tournament_id: QUICK_MATCH_TOURNAMENT_ID,
        })
        .select("id")
        .single();

      // 2. Create Team B
      const { data: team2, error: err2 } = await supabase
        .from("teams")
        .insert({
          name: teamB,
          short_name: teamB.substring(0, 3).toUpperCase(),
          tournament_id: QUICK_MATCH_TOURNAMENT_ID,
        })
        .select("id")
        .single();

      if (err1 || err2) throw new Error("Failed to generate teams.");

      // 🌟 NEW: AUTO-GENERATE DUMMY PLAYERS FOR BOTH TEAMS
      const dummyPlayers = [];
      for (let i = 1; i <= squadSize; i++) {
        dummyPlayers.push({
          full_name: `${teamA} Player ${i}`,
          team_id: team1.id,
          tournament_id: QUICK_MATCH_TOURNAMENT_ID,
          role: "batter", // generic role
          status: "active",
        });
        dummyPlayers.push({
          full_name: `${teamB} Player ${i}`,
          team_id: team2.id,
          tournament_id: QUICK_MATCH_TOURNAMENT_ID,
          role: "batter",
          status: "active",
        });
      }

      // Insert all players at once
      const { error: playersErr } = await supabase
        .from("players")
        .insert(dummyPlayers);
      if (playersErr)
        console.error("Dummy player insertion failed", playersErr);
      // 🌟 END NEW

      // 3. Resolve Toss Winner ID
      const winningTeamId = tossWinner === "A" ? team1.id : team2.id;

      // 4. Create the Match
      const { data: newMatch, error: matchError } = await supabase
        .from("matches")
        .insert({
          tournament_id: QUICK_MATCH_TOURNAMENT_ID,
          team1_id: team1.id,
          team2_id: team2.id,
          overs_count: overs,
          players_per_team: squadSize,
          ball_type: ballType,
          toss_winner_id: winningTeamId,
          toss_decision: decision,
          status: "live",
          current_innings: 1,
          created_by: user ? user.id : null,
        })
        .select("id")
        .single();

      if (matchError) throw matchError;

      // 5. Store guest session
      if (!user) {
        localStorage.setItem(`guest_match_owner_${newMatch.id}`, "true");
      }

      router.push(`/t/QUICK_MATCH/m/${newMatch.id}`);
    } catch (error: any) {
      alert("Error starting quick match: " + (error.details || error.message));
      setIsLoading(false);
    }
  };

  const winnerName = tossWinner === "A" ? teamA : teamB;

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-24 selection:bg-red-500 selection:text-white">
      {/* TOP NAVIGATION */}
      <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 px-4 h-16 flex items-center justify-between">
        <Link
          href="/"
          className="p-2 -ml-2 text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={22} />
        </Link>
        <span className="font-black uppercase tracking-widest text-xs flex items-center gap-1.5 text-slate-200">
          <Zap size={14} className="text-red-500 fill-red-500" /> Quick Match
          Setup
        </span>
        <div className="w-8" />
      </header>

      <form
        onSubmit={handleStartMatch}
        className="max-w-xl mx-auto px-4 pt-6 space-y-8 animate-in fade-in duration-300"
      >
        {/* --- SECTION 1: THE TEAMS --- */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 relative overflow-hidden shadow-xl">
          <div className="absolute top-0 right-0 bg-red-500/10 text-red-400 text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-bl-2xl">
            Step 01
          </div>

          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">
            Playing XIs (Editable Later)
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase ml-3 mb-1 block">
                Team 1
              </span>
              <input
                type="text"
                required
                value={teamA}
                onChange={(e) => setTeamA(e.target.value)}
                onFocus={(e) => e.target.select()}
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 font-black text-center text-lg text-blue-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 outline-none transition-all"
              />
            </div>

            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 hidden sm:flex w-9 h-9 rounded-full bg-red-600 border-4 border-slate-900 items-center justify-center font-black text-[10px] italic shadow-lg">
              VS
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase ml-3 mb-1 block sm:text-right">
                Team 2
              </span>
              <input
                type="text"
                required
                value={teamB}
                onChange={(e) => setTeamB(e.target.value)}
                onFocus={(e) => e.target.select()}
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 font-black text-center text-lg text-emerald-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 outline-none transition-all"
              />
            </div>
          </div>
        </div>

        {/* --- SECTION 2: THE TOSS --- */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 relative shadow-xl space-y-6">
          <div className="absolute top-0 right-0 bg-red-500/10 text-red-400 text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-bl-2xl">
            Step 02
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">
              Who won the toss?
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTossWinner("A")}
                className={`py-3.5 px-4 rounded-2xl font-black text-sm truncate border transition-all ${tossWinner === "A" ? "bg-blue-600/20 border-blue-500 text-blue-300 shadow-lg shadow-blue-500/10" : "bg-slate-950 border-slate-800/80 text-slate-500 hover:border-slate-700"}`}
              >
                {teamA || "Team 1"}
              </button>
              <button
                type="button"
                onClick={() => setTossWinner("B")}
                className={`py-3.5 px-4 rounded-2xl font-black text-sm truncate border transition-all ${tossWinner === "B" ? "bg-emerald-600/20 border-emerald-500 text-emerald-300 shadow-lg shadow-emerald-500/10" : "bg-slate-950 border-slate-800/80 text-slate-500 hover:border-slate-700"}`}
              >
                {teamB || "Team 2"}
              </button>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">
              Elected to:
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setDecision("bat")}
                className={`py-3.5 rounded-2xl font-black uppercase text-xs tracking-wider border flex items-center justify-center gap-2 transition-all ${decision === "bat" ? "bg-red-600 border-red-500 text-white shadow-lg shadow-red-600/20" : "bg-slate-950 border-slate-800/80 text-slate-500 hover:border-slate-700"}`}
              >
                🏏 Bat First
              </button>
              <button
                type="button"
                onClick={() => setDecision("bowl")}
                className={`py-3.5 rounded-2xl font-black uppercase text-xs tracking-wider border flex items-center justify-center gap-2 transition-all ${decision === "bowl" ? "bg-red-600 border-red-500 text-white shadow-lg shadow-red-600/20" : "bg-slate-950 border-slate-800/80 text-slate-500 hover:border-slate-700"}`}
              >
                🥎 Bowl First
              </button>
            </div>
          </div>

          <div className="p-3.5 bg-slate-950 border border-slate-800/80 rounded-2xl flex items-center gap-2.5">
            <Sparkles size={16} className="text-amber-400 shrink-0" />
            <p className="text-xs text-slate-500 font-bold truncate">
              <span className="uppercase text-red-400 font-black underline decoration-red-500 underline-offset-2">
                {winnerName}
              </span>{" "}
              elected to{" "}
              <span className="uppercase text-red-400 font-black">
                {decision}
              </span>
            </p>
          </div>
        </div>

        {/* --- SECTION 3: RULES PRESETS --- */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-xl relative">
          <div className="absolute top-0 right-0 bg-slate-800 text-slate-400 text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-bl-2xl">
            Defaults
          </div>

          {/* Overs */}
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2.5 flex items-center justify-between">
              <span>Total Overs</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {[5, 10, 15, 20].map((ov) => (
                <button
                  key={ov}
                  type="button"
                  onClick={() => setOvers(ov)}
                  className={`flex-1 min-w-[50px] py-2.5 rounded-xl font-black text-xs border transition-all ${overs === ov ? "bg-white text-slate-950 border-white shadow-md" : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"}`}
                >
                  {ov}
                </button>
              ))}
            </div>
            <div className="flex items-center justify-between bg-slate-950 border border-slate-800 rounded-xl mt-3 p-1">
              <button
                type="button"
                onClick={() => setOvers((prev) => Math.max(1, prev - 1))}
                className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors font-black text-lg"
              >
                -
              </button>
              {/* UI FIX: text-white instead of text-slate-900 */}
              <span className="font-black text-white text-sm uppercase tracking-widest">
                {overs}
              </span>
              <button
                type="button"
                onClick={() => setOvers((prev) => prev + 1)}
                className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors font-black text-lg"
              >
                +
              </button>
            </div>
          </div>

          {/* Squad Size & Ball */}
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                Players / Team
              </label>
              <div className="flex gap-1.5">
                {[7, 9, 11].map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => setSquadSize(sz)}
                    className={`flex-1 py-2 rounded-xl font-black text-xs border transition-all ${squadSize === sz ? "bg-slate-700 text-white border-slate-500" : "bg-slate-950 border-slate-800 text-slate-500"}`}
                  >
                    {sz}
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-between bg-slate-950 border border-slate-800 rounded-xl mt-3 p-1">
                <button
                  type="button"
                  onClick={() => setSquadSize((prev) => Math.max(1, prev - 1))}
                  className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors font-black text-lg"
                >
                  -
                </button>
                {/* UI FIX: text-white instead of text-slate-900 */}
                <span className="font-black text-white text-sm uppercase tracking-widest">
                  {squadSize}
                </span>
                <button
                  type="button"
                  onClick={() => setSquadSize((prev) => prev + 1)}
                  className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors font-black text-lg"
                >
                  +
                </button>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                Ball Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                {["Leather", "Hard Tennis", "Soft Tennis", "Rubber"].map(
                  (type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setBallType(type)}
                      className={`w-full py-3.5 px-1 rounded-xl font-black uppercase text-[10px] border tracking-wider transition-all truncate ${ballType === type ? "bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm" : "bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700"}`}
                    >
                      {type}
                    </button>
                  ),
                )}
              </div>
            </div>
          </div>
        </div>

        {/* --- SUBMIT CTA --- */}
        <div className="fixed sm:static bottom-0 left-0 right-0 p-4 sm:p-0 bg-slate-950/90 sm:bg-transparent backdrop-blur-lg border-t border-slate-800 sm:border-0 z-40">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black uppercase tracking-[0.2em] py-5 rounded-2xl shadow-[0_0_40px_rgba(220,38,38,0.3)] active:scale-[0.98] transition-all flex items-center justify-center gap-3 text-sm disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />{" "}
                Generating Matchpad...
              </>
            ) : (
              <>
                <Swords size={18} /> Launch Live Scoring
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
