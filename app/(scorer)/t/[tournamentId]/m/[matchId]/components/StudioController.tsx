"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { MonitorPlay, PowerOff, Radio } from "lucide-react";

export default function StudioController({
  tournamentId,
  matchId,
}: {
  tournamentId: string;
  matchId: string;
}) {
  const [studios, setStudios] = useState<any[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);

  // 1. Fetch all available studios
  const fetchStudios = async () => {
    const { data } = await supabase.from("studio_configs").select("*");
    if (data) setStudios(data);
  };

  useEffect(() => {
    fetchStudios();
  }, []);

  // 2. Push the current match to OBS
  const pushToStudio = async (studioKey: string) => {
    setIsUpdating(true);
    const { error } = await supabase
      .from("studio_configs")
      .update({
        active_tournament_id: tournamentId,
        active_match_id: matchId,
        updated_at: new Date().toISOString(),
      })
      .eq("studio_key", studioKey);

    if (!error) {
      alert(`✅ Successfully pushed to ${studioKey.toUpperCase()}!`);
      fetchStudios();
    } else {
      alert("Failed to push to studio: " + error.message);
    }
    setIsUpdating(false);
  };

  // 3. Clear the OBS screen (Take Offline)
  const takeOffline = async (studioKey: string) => {
    setIsUpdating(true);
    const { error } = await supabase
      .from("studio_configs")
      .update({
        active_tournament_id: null,
        active_match_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq("studio_key", studioKey);

    if (!error) {
      fetchStudios();
    }
    setIsUpdating(false);
  };

  return (
    <div className="bg-slate-900 text-white p-6 rounded-[2rem] border border-slate-800 shadow-xl">
      <div className="flex items-center gap-3 mb-6">
        <Radio className="text-teal-400 animate-pulse" size={24} />
        <h3 className="text-xl font-black uppercase tracking-widest">
          Broadcast Control
        </h3>
      </div>

      <div className="space-y-4">
        {studios.map((studio) => {
          // Check if THIS specific match is currently live on this studio
          const isLiveHere =
            studio.active_tournament_id === tournamentId &&
            studio.active_match_id === matchId;

          return (
            <div
              key={studio.studio_key}
              className={`p-4 rounded-2xl border-2 flex items-center justify-between ${
                isLiveHere
                  ? "border-teal-500 bg-teal-500/10"
                  : "border-slate-700 bg-slate-800"
              }`}
            >
              <div>
                <p className="font-black uppercase tracking-widest text-lg">
                  {studio.studio_key}
                </p>
                <p className="text-xs font-bold text-slate-400 mt-1 uppercase">
                  {isLiveHere
                    ? "🟢 Currently Live"
                    : "🔴 Offline / Other Match"}
                </p>
              </div>

              <div className="flex gap-2">
                {isLiveHere ? (
                  <button
                    onClick={() => takeOffline(studio.studio_key)}
                    disabled={isUpdating}
                    className="flex items-center gap-2 bg-red-500 hover:bg-red-400 text-white px-4 py-3 rounded-xl font-black text-sm uppercase transition-colors"
                  >
                    <PowerOff size={16} /> Take Offline
                  </button>
                ) : (
                  <button
                    onClick={() => pushToStudio(studio.studio_key)}
                    disabled={isUpdating}
                    className="flex items-center gap-2 bg-teal-500 hover:bg-teal-400 text-white px-4 py-3 rounded-xl font-black text-sm uppercase shadow-lg shadow-teal-500/20 transition-colors"
                  >
                    <MonitorPlay size={16} /> Push to OBS
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
