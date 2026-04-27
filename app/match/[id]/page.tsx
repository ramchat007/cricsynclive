"use client";
import { useEffect, useState, use } from "react";
import { supabase } from "@/lib/supabase";
import { deriveMatchStats } from "../../utils/cricketMath";

// REUSE YOUR COMPONENTS!
import Scoreboard from "../../(scorer)/t/[tournamentId]/m/[matchId]/components/Scoreboard";
import FullScorecard from "../../(scorer)/t/[tournamentId]/m/[matchId]/components/FullScorecard";
import { ArrowLeft, Trophy } from "lucide-react";
import Link from "next/link";

export default function PublicMatchCenter({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: matchId } = use(params);

  const [match, setMatch] = useState<any>(null);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [team1Players, setTeam1Players] = useState<any[]>([]);
  const [team2Players, setTeam2Players] = useState<any[]>([]);

  // Fetch the data just like the engine does (Read-Only)
  useEffect(() => {
    const fetchPublicData = async () => {
      const { data: mData } = await supabase
        .from("matches")
        .select("*, team1:team1_id(*), team2:team2_id(*)")
        .eq("id", matchId)
        .single();
      if (mData) {
        setMatch(mData);
        const { data: s1 } = await supabase
          .from("players")
          .select("*")
          .eq("team_id", mData.team1_id);
        const { data: s2 } = await supabase
          .from("players")
          .select("*")
          .eq("team_id", mData.team2_id);
        const { data: dls } = await supabase
          .from("deliveries")
          .select("*")
          .eq("match_id", matchId)
          .order("created_at", { ascending: true });
        if (s1) setTeam1Players(s1);
        if (s2) setTeam2Players(s2);
        if (dls) setDeliveries(dls);
      }
    };

    fetchPublicData();

    // OPTIONAL PRO FEATURE: Add Supabase Realtime here later so the public page auto-updates!
  }, [matchId]);

  if (!match)
    return (
      <div className="p-20 text-center font-black animate-pulse text-slate-400 uppercase tracking-widest">
        LOADING LIVE SCORE...
      </div>
    );

  // RUN THE EXACT SAME MATH ENGINE!
  const stats = deriveMatchStats(match, deliveries, team1Players, team2Players);
  if (!stats) return null;

  // Check if the match is officially over
  const isCompleted =
    match.status === "completed" || match.stage === "completed";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 font-sans max-w-4xl mx-auto pb-20">
      <Link
        href={`/`}
        className="flex items-center gap-2 text-slate-500 font-bold mb-8 hover:text-teal-500 w-max transition-colors">
        <ArrowLeft size={16} /> Back to Home
      </Link>

      {/* PUBLIC HEADER */}
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 text-center mb-6 shadow-sm border border-slate-200 dark:border-slate-800">
        <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
          {match.team1.name}{" "}
          <span className="text-slate-400 mx-2 text-lg">VS</span>{" "}
          {match.team2.name}
        </h1>
        <p className="text-teal-500 font-bold text-xs tracking-[0.2em] uppercase mt-2">
          Match Center
        </p>
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-4">
        {/* 🔥 THE FIX: Conditional Rendering for Completed Matches 🔥 */}
        {isCompleted ? (
          <div className="mb-6 bg-gradient-to-br from-teal-900 via-slate-900 to-teal-950 rounded-[2rem] p-8 text-center shadow-xl border border-teal-500/20 relative overflow-hidden">
            <div className="absolute inset-0 bg-teal-500/5 blur-3xl rounded-full scale-150 pointer-events-none"></div>
            <div className="relative z-10">
              <div className="w-16 h-16 bg-yellow-500/20 text-yellow-400 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl border border-yellow-500/30 shadow-[0_0_15px_rgba(234,179,8,0.2)]">
                <Trophy size={32} />
              </div>
              <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-teal-400 mb-2">
                Match Completed
              </h2>
              <p className="text-2xl md:text-3xl font-black uppercase tracking-tighter text-white drop-shadow-md leading-tight">
                {match.result_margin || "Result Processing..."}
              </p>
            </div>
          </div>
        ) : (
          <div className="mb-6">
            <Scoreboard
              battingTeam={stats.battingTeam}
              currentScore={stats.currentScore}
              currentWickets={stats.currentWickets}
              currentOvers={stats.currentOvers}
              match={match}
              runRate={stats.runRate}
              targetScore={stats.targetScore}
              rrr={stats.rrr}
              remainingRuns={stats.remainingRuns}
              remainingBalls={stats.remainingBalls}
              extras={stats.extrasBreakdown}
              openSettings={() => alert("Scorer only!")}
            />
          </div>
        )}

        <FullScorecard
          deliveries={deliveries}
          battingSquad={stats.battingSquad}
          bowlingSquad={stats.bowlingSquad}
          match={match}
        />
      </div>
    </div>
  );
}
