"use client";
import { useEffect, useState, use } from "react";
import { supabase } from "@/lib/supabase";
import {
  Tv,
  Zap,
  LayoutTemplate,
  Radio,
  Check,
  Eye,
  EyeOff,
  RotateCw,
  MessageSquare,
  List,
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
  });
  const [isStudioConnected, setIsStudioConnected] = useState(false);
  const studioChannelRef = useRef<any>(null);

  // --- INITIALIZATION ---
  useEffect(() => {
    const channel = supabase.channel(`broadcast-${tournamentId}`);
    studioChannelRef.current = channel;

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        setIsStudioConnected(true);
        console.log("Studio Link Active");
      } else if (
        status === "CHANNEL_ERROR" ||
        status === "TIMED_OUT" ||
        status === "CLOSED"
      ) {
        setIsStudioConnected(false);
      }
    });

    fetchMatches();

    return () => {
      setIsStudioConnected(false);
      studioChannelRef.current = null;
      supabase.removeChannel(channel);
    };
    init();
  }, [tournamentId]);

  const fetchMatches = async () => {
    const { data } = await supabase
      .from("matches")
      .select(
        "id, team1_id, team2_id, team1:team1_id(short_name), team2:team2_id(short_name)",
      )
      .eq("tournament_id", tournamentId)
      .eq("status", "live");
    if (data) setMatches(data);
  };

  useEffect(() => {
    if (!activeMatchId) {
      setTeamASquad([]);
      setTeamBSquad([]);
      return;
    }
    const fetchSquads = async () => {
      const match = matches.find((m) => m.id === activeMatchId);
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
  }, [activeMatchId, matches]);

  // --- REALTIME SYNC ENGINE ---
  const syncToOverlay = (updates: any) => {
    setConfig((prev) => {
      const newConfig = { ...prev, ...updates };

      if (isStudioConnected && studioChannelRef.current) {
        studioChannelRef.current.send({
          type: "broadcast",
          event: "overlay-sync",
          payload: newConfig,
        });
      }

      return newConfig;
    });
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
              V1 Broadcast Studio
            </h1>
          </div>
          <select
            value={config.activeMatchId || ""}
            onChange={(e) => updateDB({ activeMatchId: e.target.value })}
            className="bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white outline-none focus:ring-2 ring-blue-500">
            <option value="">-- Connect Live Match Feed --</option>
            {matches.map((m) => (
              <option key={m.id} value={m.id}>
                {m.team1?.short_name} vs {m.team2?.short_name}
              </option>
            ))}
          </select>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* COLUMN 1: MAIN VIEWS */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4 shadow-xl">
            <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] flex items-center gap-2 mb-2">
              <Tv size={14} /> Overlay Controls
            </h3>
            {[
              {
                id: "SCOREBUG",
                label: "Main Scorebug",
                icon: <LayoutTemplate size={16} />,
              },
              {
                id: "PARTNERSHIP",
                label: "Partnership Card",
                icon: <Users size={16} />,
              },
              {
                id: "MATCH_INTRO",
                label: "Match Intro",
                icon: <List size={16} />,
              },
              {
                id: "SUMMARY",
                label: "Match Summary",
                icon: <Trophy size={16} />,
              },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => toggleView(item.id)}
                className={`w-full py-4 rounded-xl font-black text-xs uppercase flex justify-between px-4 border transition-all ${config.activeViews?.includes(item.id) ? "bg-blue-600 border-transparent text-white shadow-lg" : "bg-slate-950 border-slate-800 text-slate-500"}`}>
                <span className="flex items-center gap-2">
                  {item.icon} {item.label}
                </span>
                {config.activeViews?.includes(item.id) ? (
                  <Check size={16} />
                ) : (
                  <EyeOff size={16} />
                )}
              </button>
            ))}
          </div>

          {/* COLUMN 2: LIVE TRIGGERS (Jio Style) */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4 shadow-xl">
            <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] flex items-center gap-2 mb-2">
              <Zap size={14} /> Quick Triggers
            </h3>
            <div className="grid grid-cols-1 gap-3">
              <button
                onClick={() =>
                  updateDB({ event: "FOUR", eventTime: Date.now() })
                }
                className="bg-emerald-600 hover:bg-emerald-500 py-5 rounded-xl text-white font-black text-sm shadow-lg active:scale-95 transition-all">
                BOUNDARY 4
              </button>
              <button
                onClick={() =>
                  updateDB({ event: "SIX", eventTime: Date.now() })
                }
                className="bg-amber-500 hover:bg-amber-400 py-5 rounded-xl text-white font-black text-sm shadow-lg active:scale-95 transition-all">
                MAXIMUM 6
              </button>
              <button
                onClick={() =>
                  updateDB({ event: "WICKET", eventTime: Date.now() })
                }
                className="bg-rose-600 hover:bg-rose-500 py-5 rounded-xl text-white font-black text-sm shadow-lg active:scale-95 transition-all">
                WICKET OUT
              </button>
            </div>
          </div>

          {/* COLUMN 3: BRANDING & UTILS */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4 shadow-xl">
            <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] flex items-center gap-2 mb-2">
              <RotateCw size={14} /> Settings
            </h3>
            <button
              onClick={() => updateDB({ showAppLogo: !config.showAppLogo })}
              className={`w-full py-4 rounded-xl font-black text-xs uppercase flex justify-between px-4 border ${config.showAppLogo ? "bg-indigo-600 text-white" : "bg-slate-950 text-slate-600"}`}>
              Rotating Logo{" "}
              {config.showAppLogo ? (
                <RotateCw size={16} className="animate-spin" />
              ) : (
                <EyeOff size={16} />
              )}
            </button>
            <div className="pt-4 space-y-2">
              <p className="text-[10px] font-bold text-slate-500 uppercase px-1">
                Ticker Message
              </p>
              <input
                type="text"
                placeholder="Custom news ticker text..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-blue-500"
                onBlur={(e) => updateDB({ tickerText: e.target.value })}
              />
            </div>
            <button
              onClick={() => updateDB({ activeViews: [], event: null })}
              className="w-full mt-4 py-4 bg-red-600/10 text-red-500 font-black border border-red-600/20 rounded-xl hover:bg-red-600 hover:text-white transition-all uppercase text-xs tracking-widest">
              Kill Overlay
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
