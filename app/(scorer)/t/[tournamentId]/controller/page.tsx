"use client";
import { useEffect, useRef, useState, use } from "react";
import { supabase } from "@/lib/supabase";
import {
  Radio,
  Tv,
  Zap,
  Check,
  EyeOff,
  RotateCw,
  Trophy,
  Users,
  LayoutTemplate,
} from "lucide-react";

export default function MasterController({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const { tournamentId } = use(params);
  const [matches, setMatches] = useState<any[]>([]);
  const [teamASquad, setTeamASquad] = useState<any[]>([]);
  const [teamBSquad, setTeamBSquad] = useState<any[]>([]);

  const [config, setConfig] = useState<any>({
    activeViews: [],
    activeMatchId: "",
    showAppLogo: true,
    event: null,
    tickerText: "",
  });

  // --- INITIALIZATION & DATA FETCHING ---
  useEffect(() => {
    if (!tournamentId) return;

    const init = async () => {
      // 1. Fetch initial broadcast state from tournament
      const { data: tData } = await supabase
        .from("tournaments")
        .select("broadcast_state")
        .eq("id", tournamentId)
        .single();

      if (tData?.broadcast_state) {
        setConfig(tData.broadcast_state);
      }

      // 2. Fetch live matches
      const { data: mData } = await supabase
        .from("matches")
        .select(
          "id, team1_id, team2_id, team1:team1_id(short_name), team2:team2_id(short_name)",
        )
        .eq("tournament_id", tournamentId)
        .eq("status", "live");

      if (mData) setMatches(mData);
    };

    init();
  }, [tournamentId]);

  // --- FETCH SQUADS WHEN MATCH CHANGES ---
  useEffect(() => {
    const matchId = config.activeMatchId;
    if (!matchId || matches.length === 0) return;

    const fetchSquads = async () => {
      const match = matches.find((m) => m.id === matchId);
      if (!match) return;

      const { data: squadA } = await supabase
        .from("players")
        .select("id, full_name")
        .eq("team_id", match.team1_id);

      const { data: squadB } = await supabase
        .from("players")
        .select("id, full_name")
        .eq("team_id", match.team2_id);

      if (squadA) setTeamASquad(squadA);
      if (squadB) setTeamBSquad(squadB);
    };

    fetchSquads();
  }, [config.activeMatchId, matches]);

  // --- DATABASE UPDATE ENGINE (Triggers Real-time Replication) ---
  const updateDB = async (updates: any) => {
    const newConfig = { ...config, ...updates };

    // Update local state for instant UI feedback
    setConfig(newConfig);

    // Persist to DB -> This triggers the Overlay's Real-time listener
    const { error } = await supabase
      .from("tournaments")
      .update({ broadcast_state: newConfig })
      .eq("id", tournamentId);

    if (error) console.error("❌ Failed to update broadcast state:", error);
  };

  const toggleView = (view: string) => {
    const views = config.activeViews || [];
    const newViews = views.includes(view)
      ? views.filter((v: any) => v !== view)
      : [...views, view];

    updateDB({ activeViews: newViews });
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 p-6 font-sans">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* HEADER */}
        <header className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex justify-between items-center shadow-2xl">
          <div className="flex items-center gap-3">
            <Radio className="text-emerald-500 animate-pulse" size={24} />
            <h1 className="text-white font-black uppercase tracking-tighter text-xl">
              Studio V2 Control
            </h1>
          </div>
          <select
            value={config.activeMatchId || ""}
            onChange={(e) => updateDB({ activeMatchId: e.target.value })}
            className="bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white outline-none focus:ring-2 ring-blue-500">
            <option value="">-- Select Active Feed --</option>
            {matches.map((m) => (
              <option key={m.id} value={m.id}>
                {m.team1?.short_name} vs {m.team2?.short_name}
              </option>
            ))}
          </select>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* COLUMN 1: GRAPHICS TOGGLES */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4 shadow-xl">
            <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] flex items-center gap-2 mb-2">
              <Tv size={14} /> Graphics
            </h3>
            <button
              onClick={() => toggleView("SCOREBUG")}
              className={`w-full py-4 rounded-xl font-black text-xs uppercase flex justify-between px-4 border transition-all ${
                config.activeViews?.includes("SCOREBUG")
                  ? "bg-blue-600 border-transparent text-white shadow-lg"
                  : "bg-slate-950 border-slate-800 text-slate-500"
              }`}>
              ScoreTicker
              {config.activeViews?.includes("SCOREBUG") ? (
                <Check size={16} />
              ) : (
                <EyeOff size={16} />
              )}
            </button>

            <button
              onClick={() => updateDB({ showAppLogo: !config.showAppLogo })}
              className={`w-full py-4 rounded-xl font-black text-xs uppercase flex justify-between px-4 border transition-all ${
                config.showAppLogo
                  ? "bg-indigo-600 text-white shadow-lg"
                  : "bg-slate-950 text-slate-500"
              }`}>
              App Logo
              {config.showAppLogo ? (
                <RotateCw size={16} className="animate-spin" />
              ) : (
                <EyeOff size={16} />
              )}
            </button>
          </div>

          {/* COLUMN 2: RAPID EVENTS */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4 shadow-xl">
            <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] flex items-center gap-2 mb-2">
              <Zap size={14} /> Events
            </h3>
            <button
              onClick={() => updateDB({ event: "FOUR", eventTime: Date.now() })}
              className="w-full bg-emerald-600 hover:bg-emerald-500 py-5 rounded-xl text-white font-black text-sm active:scale-95 transition-all shadow-lg">
              BOUNDARY 4
            </button>
            <button
              onClick={() => updateDB({ event: "SIX", eventTime: Date.now() })}
              className="w-full bg-amber-500 hover:bg-amber-400 py-5 rounded-xl text-white font-black text-sm active:scale-95 transition-all shadow-lg">
              MAXIMUM 6
            </button>
            <button
              onClick={() =>
                updateDB({ event: "WICKET", eventTime: Date.now() })
              }
              className="w-full bg-rose-600 hover:bg-rose-500 py-5 rounded-xl text-white font-black text-sm active:scale-95 transition-all shadow-lg">
              WICKET OUT
            </button>
          </div>

          {/* COLUMN 3: SETTINGS & INFO */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4 shadow-xl">
            <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] mb-2">
              <RotateCw size={14} /> Match Info
            </h3>
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-500 uppercase px-1">
                Ticker Message
              </p>
              <input
                type="text"
                placeholder="Type here..."
                defaultValue={config.tickerText || ""}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:ring-1 ring-blue-500 outline-none"
                onBlur={(e) => updateDB({ tickerText: e.target.value })}
              />
            </div>

            <div className="pt-4">
              <button
                onClick={() => updateDB({ activeViews: [], event: null })}
                className="w-full py-4 bg-red-600/10 text-red-500 font-black border border-red-600/20 rounded-xl hover:bg-red-600 hover:text-white transition-all uppercase text-xs tracking-widest">
                Kill All Graphics
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
