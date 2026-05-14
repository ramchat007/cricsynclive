"use client";
import { useEffect, useState, use } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import {
  Shield,
  GitMerge,
  Activity,
  Wand2,
  MapPin,
  Clock,
  Trophy,
} from "lucide-react";
import FeatureGate from "@/app/components/FeatureGate";

export default function BracketsViewPage({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const { tournamentId } = use(params);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [bracketData, setBracketData] = useState<any>(null);
  const [liveMatchesMap, setLiveMatchesMap] = useState<Map<string, any>>(
    new Map(),
  );

  useEffect(() => {
    const fetchBracketData = async () => {
      if (!tournamentId) return;

      const {
        data: { session },
      } = await supabase.auth.getSession();

      // 1. Fetch Tournament Layout & Check Admin
      const { data: tData } = await supabase
        .from("tournaments")
        .select("owner_id, bracket_layout")
        .eq("id", tournamentId)
        .single();

      if (session) {
        const { data: pData } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .single();

        if (
          tData?.owner_id === session.user.id ||
          pData?.role === "super_admin" ||
          pData?.role === "scorer"
        ) {
          setIsAdmin(true);
        }
      }

      if (tData?.bracket_layout) {
        setBracketData(tData.bracket_layout);

        // 2. Fetch Live Match Data for this Bracket
        const { data: matchesData } = await supabase
          .from("matches")
          .select(
            "*, team1:team1_id(name, short_name), team2:team2_id(name, short_name)",
          )
          .eq("tournament_id", tournamentId)
          .eq("is_bracket_match", true);

        // 3. Map actual DB matches by their bracket ID (e.g., "M1", "M2")
        const map = new Map<string, any>();
        matchesData?.forEach((m) => {
          if (m.bracket_match_id) map.set(m.bracket_match_id, m);
        });
        setLiveMatchesMap(map);
      }

      setLoading(false);
    };

    fetchBracketData();
  }, [tournamentId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-[var(--text-muted)] transition-colors">
        <Activity
          className="animate-spin text-[var(--accent)] mb-4"
          size={32}
        />
        <p className="font-bold uppercase tracking-widest text-xs">
          Syncing Live Bracket...
        </p>
      </div>
    );
  }

  // --- EMPTY STATE ---
  if (!bracketData) {
    return (
      <div className="animate-in fade-in transition-colors duration-300">
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[var(--border-1)] pb-4 mb-6 gap-4">
          <h2 className="text-2xl font-black uppercase text-[var(--foreground)]">
            Tournament Bracket
          </h2>
        </div>
        <div className="text-center py-20 border-2 border-dashed border-[var(--border-1)] rounded-[2rem] bg-[var(--surface-1)] transition-colors">
          <GitMerge
            size={40}
            className="mx-auto text-[var(--text-muted)] mb-4"
          />
          <h3 className="text-lg font-black text-[var(--foreground)] uppercase tracking-widest mb-1">
            No Bracket Generated
          </h3>
          <p className="text-sm font-bold text-[var(--text-muted)] mb-6">
            {isAdmin
              ? "Use the Bracket Builder to create knockouts and auto-schedule matches."
              : "Check back later when the organizers publish the bracket."}
          </p>
          {isAdmin && (
            <Link
              href={`/t/${tournamentId}/brackets/builder`}
              className="inline-flex items-center gap-2 bg-[var(--foreground)] hover:opacity-90 text-[var(--background)] font-black text-xs uppercase tracking-widest px-6 py-4 rounded-xl shadow-lg transition-all active:scale-95"
            >
              <Wand2 size={16} /> Launch Bracket Builder
            </Link>
          )}
        </div>
      </div>
    );
  }

  // --- HELPER TO RENDER TEAM ROWS WITH SCORES ---
  const renderTeamRow = (
    matchNodeId: string,
    teamNum: 1 | 2,
    slotData: any,
    isWinner: boolean,
  ) => {
    const liveMatch = liveMatchesMap.get(matchNodeId);

    // Fallback names if match hasn't pulled relationships yet
    const teamObj = teamNum === 1 ? liveMatch?.team1 : liveMatch?.team2;
    const placeholderName =
      teamNum === 1 ? liveMatch?.team1_name : liveMatch?.team2_name;
    const name =
      teamObj?.name ||
      teamObj?.short_name ||
      placeholderName ||
      slotData?.team?.name ||
      "TBD";

    // Scores
    const score =
      teamNum === 1 ? liveMatch?.team1_score : liveMatch?.team2_score;
    const wickets =
      teamNum === 1 ? liveMatch?.team1_wickets : liveMatch?.team2_wickets;
    const overs =
      teamNum === 1 ? liveMatch?.team1_overs : liveMatch?.team2_overs;

    const hasScore = score !== undefined && score !== null;
    const isBye = slotData?.type === "bye";

    return (
      <div
        className={`flex items-center justify-between p-2.5 rounded-lg border transition-all ${
          isWinner
            ? "bg-[var(--accent)]/10 border-[var(--accent)]/30"
            : "bg-[var(--surface-2)] border-[var(--border-1)]"
        }`}
      >
        <span
          className={`font-bold text-xs truncate max-w-[140px] ${
            isWinner ? "text-[var(--accent)]" : "text-[var(--foreground)]"
          } ${isBye ? "opacity-50 italic" : ""}`}
        >
          {isBye ? "BYE" : name}
        </span>

        {hasScore && !isBye && (
          <div className="flex items-baseline gap-1">
            <span
              className={`font-black text-sm ${isWinner ? "text-[var(--accent)]" : "text-[var(--foreground)]"}`}
            >
              {score}/{wickets || 0}
            </span>
            <span className="text-[9px] font-bold text-[var(--text-muted)]">
              ({overs || "0.0"})
            </span>
          </div>
        )}
      </div>
    );
  };

  // --- RENDER THE BRACKET TREE ---
  return (
    <FeatureGate
      tournamentId={tournamentId}
      requiredTier="pro"
      featureKey="brackets_enabled" // Maps to global Pro toggle for now
      featureName="Advanced Knockout Brackets"
    >
      <div className="animate-in fade-in transition-colors duration-300">
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[var(--border-1)] pb-4 mb-6 gap-4">
          <h2 className="text-2xl font-black uppercase text-[var(--foreground)]">
            Tournament Bracket
          </h2>
          {isAdmin && (
            <Link
              href={`/t/${tournamentId}/brackets/builder`}
              className="flex items-center gap-2 bg-[var(--foreground)] hover:opacity-90 text-[var(--background)] font-black text-xs uppercase tracking-widest px-5 py-3 rounded-xl shadow-md transition-all active:scale-95 shrink-0"
            >
              <Shield size={16} /> Edit Blueprint
            </Link>
          )}
        </div>

        <div className="flex overflow-x-auto overflow-y-hidden p-6 gap-6 bg-[var(--surface-1)] border border-[var(--border-1)] rounded-[2rem] shadow-sm custom-scrollbar min-h-[60vh] transition-colors">
          {bracketData.rounds?.map((round: any) => (
            <div
              key={round.id}
              className="w-[320px] flex flex-col shrink-0 h-full"
            >
              <h3 className="font-black uppercase tracking-widest text-sm text-[var(--foreground)] border-b border-[var(--border-1)] pb-2 mb-4">
                {round.name}
              </h3>
              <div className="flex-1 overflow-y-auto space-y-5 pr-2 custom-scrollbar">
                {bracketData.matches
                  ?.filter((m: any) => m.roundId === round.id)
                  .map((matchNode: any) => {
                    const liveMatch = liveMatchesMap.get(matchNode.id);
                    const isCompleted = liveMatch?.status === "completed";
                    const isLive = liveMatch?.status === "live";
                    const team1Winner =
                      isCompleted &&
                      liveMatch?.match_winner_id &&
                      liveMatch.match_winner_id === liveMatch.team1_id;
                    const team2Winner =
                      isCompleted &&
                      liveMatch?.match_winner_id &&
                      liveMatch.match_winner_id === liveMatch.team2_id;

                    // Format Time
                    const matchTime = liveMatch?.match_time
                      ? liveMatch.match_time.substring(0, 5)
                      : "TBD";

                    return (
                      <div
                        key={matchNode.id}
                        className={`relative p-1 rounded-2xl border shadow-sm transition-all ${
                          isLive
                            ? "bg-red-500/10 border-red-500/30"
                            : "bg-[var(--surface-1)] border-[var(--border-1)]"
                        }`}
                      >
                        {/* Live Badge */}
                        {isLive && (
                          <div className="absolute -top-2.5 right-4 bg-red-500 text-white text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full shadow-sm animate-pulse">
                            Live Now
                          </div>
                        )}

                        <div className="p-3">
                          <div className="flex justify-between items-center border-b border-[var(--border-1)] pb-2 mb-3">
                            <span className="bg-[var(--surface-2)] text-[var(--text-muted)] text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-widest transition-colors">
                              {matchNode.id}
                            </span>
                            <span className="text-xs font-bold text-[var(--text-muted)] truncate w-36 text-right transition-colors">
                              {matchNode.title}
                            </span>
                          </div>

                          <div className="space-y-1">
                            {renderTeamRow(
                              matchNode.id,
                              1,
                              matchNode.slotA,
                              team1Winner,
                            )}
                            {renderTeamRow(
                              matchNode.id,
                              2,
                              matchNode.slotB,
                              team2Winner,
                            )}
                          </div>
                        </div>

                        {/* Footer: Venue & Time */}
                        <div className="bg-[var(--surface-2)] rounded-b-[1.2rem] p-3 border-t border-[var(--border-1)] flex items-center justify-between text-[10px] font-bold text-[var(--text-muted)] transition-colors">
                          <div className="flex items-center gap-1.5 truncate max-w-[150px]">
                            <MapPin
                              size={12}
                              className="shrink-0 text-[var(--accent)]"
                            />
                            <span className="truncate">
                              {liveMatch?.venue ||
                                matchNode.settings?.venue ||
                                "TBD"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Clock
                              size={12}
                              className="text-[var(--text-muted)]"
                            />
                            <span>{matchTime}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </FeatureGate>
  );
}
