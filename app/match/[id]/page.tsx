"use client";
import { useEffect, useState, use } from "react";
import { supabase } from "@/lib/supabase";
import { deriveMatchStats } from "../../utils/cricketMath";

// REUSE YOUR COMPONENTS!
import Scoreboard from "../../(scorer)/t/[tournamentId]/m/[matchId]/components/Scoreboard";
import FullScorecard from "../../(scorer)/t/[tournamentId]/m/[matchId]/components/FullScorecard";
import { ArrowLeft, Trophy, Activity } from "lucide-react";
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
      <div className="min-h-screen bg-[var(--background)] flex flex-col items-center justify-center text-[var(--text-muted)] p-4 transition-colors duration-300">
        <Activity
          className="animate-spin text-[var(--accent)] mb-4"
          size={40}
        />
        <p className="font-black uppercase tracking-widest text-xs">
          Loading Live Score...
        </p>
      </div>
    );

  // RUN THE EXACT SAME MATH ENGINE!
  const stats = deriveMatchStats(match, deliveries, team1Players, team2Players);
  if (!stats) return null;

  // Check if the match is officially over
  const isCompleted =
    match.status === "completed" || match.stage === "completed";

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] p-4 font-sans max-w-4xl mx-auto pb-20 transition-colors duration-300">
      <Link
        href={`/`}
        className="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--foreground)] font-bold mb-8 w-max transition-colors">
        <ArrowLeft size={16} /> Back to Home
      </Link>

      {/* PUBLIC HEADER */}
      <div className="bg-[var(--surface-1)] rounded-[2rem] p-6 text-center mb-6 shadow-sm border border-[var(--border-1)] transition-colors">
        <h1 className="text-2xl font-black uppercase tracking-tight text-[var(--foreground)]">
          {match.team1.name}{" "}
          <span className="text-[var(--text-muted)] opacity-50 mx-2 text-lg">
            VS
          </span>{" "}
          {match.team2.name}
        </h1>
        <p className="text-[var(--accent)] font-bold text-xs tracking-[0.2em] uppercase mt-2">
          Match Center
        </p>
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-4">
        {/* Conditional Rendering for Completed Matches */}
        {isCompleted ? (
          <div className="mb-6 bg-[var(--foreground)] rounded-[2rem] p-8 text-center shadow-xl border border-[var(--border-1)] relative overflow-hidden transition-colors">
            <div className="absolute inset-0 bg-[var(--accent)]/10 blur-3xl rounded-full scale-150 pointer-events-none"></div>
            <div className="relative z-10">
              <div className="w-16 h-16 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl border border-amber-500/20 shadow-sm">
                <Trophy size={32} />
              </div>
              <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--background)] opacity-80 mb-2">
                Match Completed
              </h2>
              <p className="text-2xl md:text-3xl font-black uppercase tracking-tighter text-[var(--background)] drop-shadow-md leading-tight">
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
              openSettings={() =>
                alert("Scoring settings are locked for spectators.")
              }
            />
          </div>
        )}

        <div className="bg-[var(--surface-1)] rounded-[2.5rem] p-4 sm:p-8 shadow-sm border border-[var(--border-1)] transition-colors">
          <FullScorecard
            deliveries={deliveries}
            battingSquad={stats.battingSquad}
            bowlingSquad={stats.bowlingSquad}
            match={match}
          />
        </div>
      </div>
    </div>
  );
}
