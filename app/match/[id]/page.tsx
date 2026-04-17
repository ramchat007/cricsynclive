"use client";
import { useEffect, useState, use } from "react";
import { supabase } from "@/lib/supabase";
import { deriveMatchStats } from "../../utils/cricketMath";

// REUSE YOUR COMPONENTS!
import Scoreboard from "../../(scorer)/t/[tournamentId]/m/[matchId]/components/Scoreboard";
import FullScorecard from "../../(scorer)/t/[tournamentId]/m/[matchId]/components/FullScorecard";

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
  const [activeTab, setActiveTab] = useState<"scoreboard" | "scorecard">(
    "scoreboard",
  );

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
      <div className="p-20 text-center font-black animate-pulse">
        LOADING LIVE SCORE...
      </div>
    );

  // RUN THE EXACT SAME MATH ENGINE!
  const stats = deriveMatchStats(match, deliveries, team1Players, team2Players);
  if (!stats) return null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 font-sans max-w-4xl mx-auto">
      {/* PUBLIC HEADER */}
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 text-center mb-6 shadow-sm border border-slate-200 dark:border-slate-800">
        <h1 className="text-3xl font-black uppercase">
          {match.team1.short_name} vs {match.team2.short_name}
        </h1>
        <p className="text-teal-500 font-bold text-sm tracking-widest uppercase mt-1">
          Live Match Center
        </p>
      </div>

      {/* RENDER THE REUSABLE COMPONENTS */}
      <div className="animate-in fade-in slide-in-from-bottom-4">
        <div className="mb-5">
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
            openSettings={() => alert("Scorer only!")} // Disable settings for public
          />
        </div>
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
