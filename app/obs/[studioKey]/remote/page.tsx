"use client";
import { use, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useSearchParams } from "next/navigation";

export default function StudioRemotePage({
  params,
}: {
  params: Promise<{ studioKey: string }>;
}) {
  const { studioKey } = use(params);
  const searchParams = useSearchParams();
  const camId = searchParams.get("cam");

  const [config, setConfig] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 1. Fetch initial configuration
    const fetchConfig = async () => {
      const { data } = await supabase
        .from("studio_configs")
        .select("*")
        .eq("studio_key", studioKey)
        .single();

      if (data) setConfig(data);
      setIsLoading(false);
    };

    fetchConfig();

    // 2. Real-time listener: Auto-reloads the camera if admin changes the match!
    const sub = supabase
      .channel(`remote_monitor_${studioKey}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "studio_configs",
          filter: `studio_key=eq.${studioKey}`,
        },
        (payload) => {
          console.log(
            `Master Controller updated ${studioKey}! Swapping match...`,
          );
          setConfig(payload.new);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(sub);
    };
  }, [studioKey]);

  if (isLoading) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-slate-950">
        <div className="text-white font-black tracking-widest text-sm animate-pulse">
          CONNECTING TO STUDIO...
        </div>
      </div>
    );
  }

  // If there is no active match, show a waiting screen for the camera operator
  if (!config?.active_tournament_id || !config?.active_match_id) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-slate-950 p-6 text-center">
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2rem] max-w-sm w-full shadow-2xl">
          <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse mx-auto mb-6 shadow-[0_0_20px_rgba(239,68,68,0.5)]" />
          <h2 className="text-2xl font-black text-white uppercase tracking-widest mb-2">
            Studio Offline
          </h2>
          <p className="text-slate-400 font-bold text-sm">
            Waiting for the Master Controller to push a match to{" "}
            {studioKey.toUpperCase()}...
          </p>
        </div>
      </div>
    );
  }

  const camQuery = camId ? `&cam=${camId}` : "";

  // 3. The Seamless Load with Camera Permissions
  return (
    <div className="w-screen h-screen bg-black overflow-hidden relative">
      <iframe
        src={`/t/${config.active_tournament_id}/remote?match=${config.active_match_id}${camQuery}`}
        className="w-full h-full border-none"
        allow="camera; microphone; fullscreen; display-capture"
      />
    </div>
  );
}
