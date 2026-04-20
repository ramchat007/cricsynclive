"use client";
import { useEffect, useState, use } from "react";
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
} from "lucide-react";

export default function MasterController({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const { tournamentId } = use(params);
  const [matches, setMatches] = useState<any[]>([]);
  const [config, setConfig] = useState<any>({
    activeViews: [],
    activeMatchId: "",
    showAppLogo: true,
    event: null,
  });

  useEffect(() => {
    if (!tournamentId) return;
    const init = async () => {
      const { data } = await supabase
        .from("tournaments")
        .select("broadcast_state")
        .eq("id", tournamentId)
        .single();
      if (data?.broadcast_state) setConfig(data.broadcast_state);
      const { data: m } = await supabase
        .from("matches")
        .select("id, team1:team1_id(short_name), team2:team2_id(short_name)")
        .eq("tournament_id", tournamentId)
        .eq("status", "live");
      if (m) setMatches(m);
    };
    init();
  }, [tournamentId]);

  const updateDB = async (updates: any) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    await supabase
      .from("tournaments")
      .update({ broadcast_state: newConfig })
      .eq("id", tournamentId);
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
            className="bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white outline-none">
            <option value="">-- Select Active Feed --</option>
            {matches.map((m) => (
              <option key={m.id} value={m.id}>
                {m.team1?.short_name} vs {m.team2?.short_name}
              </option>
            ))}
          </select>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
            <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] flex items-center gap-2 mb-2">
              <Tv size={14} /> Graphics
            </h3>
            <button
              onClick={() => toggleView("SCOREBUG")}
              className={`w-full py-4 rounded-xl font-black text-xs uppercase flex justify-between px-4 border ${config.activeViews?.includes("SCOREBUG") ? "bg-blue-600 text-white" : "bg-slate-950 text-slate-500"}`}>
              ScoreTicker{" "}
              {config.activeViews?.includes("SCOREBUG") ? (
                <Check size={16} />
              ) : (
                <EyeOff size={16} />
              )}
            </button>
            <button
              onClick={() => updateDB({ showAppLogo: !config.showAppLogo })}
              className={`w-full py-4 rounded-xl font-black text-xs uppercase flex justify-between px-4 border ${config.showAppLogo ? "bg-indigo-600 text-white" : "bg-slate-950 text-slate-500"}`}>
              Logo{" "}
              {config.showAppLogo ? (
                <RotateCw size={16} className="animate-spin" />
              ) : (
                <EyeOff size={16} />
              )}
            </button>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
            <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] flex items-center gap-2 mb-2">
              <Zap size={14} /> Events
            </h3>
            <button
              onClick={() => updateDB({ event: "FOUR", eventTime: Date.now() })}
              className="w-full bg-emerald-600 py-5 rounded-xl text-white font-black text-sm active:scale-95 transition-all">
              BOUNDARY 4
            </button>
            <button
              onClick={() => updateDB({ event: "SIX", eventTime: Date.now() })}
              className="w-full bg-amber-500 py-5 rounded-xl text-white font-black text-sm active:scale-95 transition-all">
              MAXIMUM 6
            </button>
            <button
              onClick={() =>
                updateDB({ event: "WICKET", eventTime: Date.now() })
              }
              className="w-full bg-rose-600 py-5 rounded-xl text-white font-black text-sm active:scale-95 transition-all">
              WICKET OUT
            </button>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
            <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] mb-2">
              <RotateCw size={14} /> Info
            </h3>
            <input
              type="text"
              placeholder="Ticker Message..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white"
              onBlur={(e) => updateDB({ tickerText: e.target.value })}
            />
            <button
              onClick={() => updateDB({ activeViews: [], event: null })}
              className="w-full mt-4 py-4 bg-red-600/10 text-red-500 font-black border border-red-600/20 rounded-xl uppercase text-xs">
              Kill All
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
