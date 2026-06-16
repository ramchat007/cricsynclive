"use client";
import React, { useEffect, useState, use } from "react";
import { supabase } from "@/lib/supabase";
import DigitalAssetHub from "../../../../../components/DigitalAssetHub";
import { Image as ImageIcon, Wand2 } from "lucide-react";

export default function UnifiedMediaStudio({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const { tournamentId } = use(params);

  // Studio Selection States
  const [graphicType, setGraphicType] = useState<
    "MATCH" | "TEAM" | "PLAYER" | "AWARD" | ""
  >("");
  const [selectedId, setSelectedId] = useState<string>("");

  // Database States
  const [matches, setMatches] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [players, setPlayers] = useState<any[]>([]);

  useEffect(() => {
    if (!tournamentId) return;

    const fetchData = async () => {
      const { data: mData } = await supabase
        .from("matches")
        .select(
          "id, match_date, venue, status, match_result, team1:team1_id(id, name, short_name, logo_url), team2:team2_id(id, name, short_name, logo_url)",
        )
        .eq("tournament_id", tournamentId)
        .order("match_date", { ascending: true });
      if (mData) setMatches(mData);

      const { data: tData } = await supabase
        .from("teams")
        .select("*")
        .eq("tournament_id", tournamentId);
      if (tData) setTeams(tData);

      const { data: pData } = await supabase
        .from("players")
        .select("*, team:team_id(name)")
        .eq("tournament_id", tournamentId);
      if (pData) setPlayers(pData);
    };

    fetchData();
  }, [tournamentId]);

  // Reset target selection when changing graphic type
  useEffect(() => {
    setSelectedId("");
  }, [graphicType]);

  // Find the exact object based on the selected dropdown ID
  const getSelectedData = () => {
    if (!selectedId) return null;
    if (graphicType === "MATCH")
      return matches.find((m) => m.id === selectedId);
    if (graphicType === "TEAM") return teams.find((t) => t.id === selectedId);
    if (graphicType === "PLAYER" || graphicType === "AWARD")
      return players.find((p) => p.id === selectedId);
    return null;
  };

  const selectedItem = getSelectedData();

  // Route the selected data into the proper Canvas formatting
  const renderCanvasStudio = () => {
    if (!selectedItem)
      return (
        <div className="h-64 flex flex-col items-center justify-center text-[var(--muted-foreground)] bg-[var(--background)] border-2 border-dashed border-[var(--border)] rounded-3xl p-12 uppercase font-black text-sm tracking-widest mt-8">
          Select a target to launch studio
        </div>
      );

    if (graphicType === "MATCH") {
      const matchData = {
        id: selectedItem.id,
        status: selectedItem.status,
        resultText: selectedItem.match_result,
        teamAName: selectedItem.team1?.name,
        teamBName: selectedItem.team2?.name,
        teamALogo: selectedItem.team1?.logo_url,
        teamBLogo: selectedItem.team2?.logo_url,
        matchDate: selectedItem.match_date,
        venue: selectedItem.venue,
      };
      const isCompleted = selectedItem.status === "completed";
      return (
        <DigitalAssetHub
          type="MATCH"
          data={matchData}
          title={isCompleted ? "Match Result Graphic" : "Match Promo Graphic"}
          description="Generates a customized 1920x1080 Match Day poster."
          shareText={
            isCompleted
              ? `🏆 RESULT: ${selectedItem.match_result}`
              : `🔥 Upcoming Clash: ${selectedItem.team1?.name} vs ${selectedItem.team2?.name}!`
          }
          fileName={`Match_${selectedItem.team1?.short_name}_vs_${selectedItem.team2?.short_name}`}
        />
      );
    }

    if (graphicType === "TEAM") {
      const teamData = {
        id: selectedItem.id,
        teamName: selectedItem.name,
        shortName: selectedItem.short_name,
        teamLogo: selectedItem.logo_url,
      };
      return (
        <DigitalAssetHub
          type="TEAM"
          data={teamData}
          title="Team Roster Graphic"
          description="Generates an official team announcement poster."
          shareText={`🏆 Support ${selectedItem.name} this season!`}
          fileName={`Team_${selectedItem.name}`}
        />
      );
    }

    if (graphicType === "PLAYER") {
      const playerData = {
        id: selectedItem.id,
        playerName: selectedItem.full_name,
        role: selectedItem.role,
        teamName: selectedItem.team?.name || "Independent",
        playerImage: selectedItem.profile_url,
      };
      return (
        <DigitalAssetHub
          type="PLAYER"
          data={playerData}
          title="Player Profile Graphic"
          description="Generates a high-res player profile card."
          shareText={`⭐ Introducing ${selectedItem.full_name}, playing for ${selectedItem.team?.name || "the team"}!`}
          fileName={`Player_${selectedItem.full_name}`}
        />
      );
    }

    if (graphicType === "AWARD") {
      const awardData = {
        id: selectedItem.id,
        playerName: selectedItem.full_name,
        teamName: selectedItem.team?.name || "Independent",
        playerImage: selectedItem.profile_url,
      };
      return (
        <DigitalAssetHub
          type="AWARD"
          data={awardData}
          title="Custom Award Graphic"
          description="Generates a fully customized achievement poster."
          shareText={`🏆 Congratulations to ${selectedItem.full_name} for the incredible performance!`}
          fileName={`Award_${selectedItem.full_name}`}
        />
      );
    }

    return null;
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8 animate-fade-in bg-[var(--background)] text-[var(--foreground)] min-h-screen">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="bg-[var(--primary)]/10 p-3 rounded-xl text-[var(--primary)]">
          <Wand2 size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tighter text-[var(--foreground)]">
            Media Studio
          </h1>
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--muted-foreground)]">
            Custom Broadcast & Promo Graphics
          </p>
        </div>
      </div>

      {/* Control Panel */}
      <div className="bg-[var(--card)] border border-[var(--border)] p-6 rounded-2xl shadow-sm flex flex-col md:flex-row gap-6">
        {/* Step 1: Pick Type */}
        <div className="flex-1 space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-[var(--muted-foreground)]">
            1. Select Graphic Type
          </label>
          <select
            value={graphicType}
            onChange={(e) => setGraphicType(e.target.value as any)}
            className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm font-bold uppercase outline-none focus:border-[var(--primary)] text-[var(--foreground)] cursor-pointer"
          >
            <option value="">-- Choose Template --</option>
            <option value="AWARD">🏆 Custom Award</option>
            <option value="MATCH">🏟️ Match Promo / Result</option>
            <option value="PLAYER">👤 Player Profile</option>
            <option value="TEAM">🛡️ Team Poster</option>
          </select>
        </div>

        {/* Step 2: Pick Target */}
        <div className="flex-1 space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-[var(--muted-foreground)]">
            2. Select Target
          </label>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            disabled={!graphicType}
            className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm font-bold uppercase outline-none focus:border-[var(--primary)] text-[var(--foreground)] cursor-pointer disabled:opacity-50"
          >
            <option value="">-- Choose Target --</option>
            {graphicType === "MATCH" &&
              matches.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.team1?.short_name} vs {m.team2?.short_name} (
                  {new Date(m.match_date).toLocaleDateString()})
                </option>
              ))}
            {graphicType === "TEAM" &&
              teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            {(graphicType === "PLAYER" || graphicType === "AWARD") &&
              players.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name} ({p.team?.name || "Free Agent"})
                </option>
              ))}
          </select>
        </div>
      </div>

      {/* The Canvas Studio Workspace */}
      <div className="pt-4">{renderCanvasStudio()}</div>
    </div>
  );
}
