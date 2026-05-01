"use client";
import { use, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useSearchParams } from "next/navigation";

export default function StudioBroadcastPage({
  params,
}: {
  params: Promise<{ studioKey: string }>;
}) {
  const { studioKey } = use(params);
  const searchParams = useSearchParams();
  const camId = searchParams.get("cam") || "studio-main";
  const [config, setConfig] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 1. Fetch initial configuration when OBS first loads this URL
    const fetchConfig = async () => {
      const { data, error } = await supabase
        .from("studio_configs")
        .select("*")
        .eq("studio_key", studioKey)
        .single();

      if (data) setConfig(data);
      setIsLoading(false);
    };

    fetchConfig();

    // 2. The Magic: Listen for Master Controller updates in real-time!
    const sub = supabase
      .channel(`studio_monitor_${studioKey}`)
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
            `Studio ${studioKey} updated! Swapping graphics...`,
            payload.new,
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
      <div className="w-full h-full flex items-center justify-center bg-transparent">
        <div className="bg-black/80 text-white px-6 py-3 rounded-full font-black tracking-widest text-sm backdrop-blur-md border border-white/10">
          CONNECTING TO STUDIO: {studioKey.toUpperCase()}...
        </div>
      </div>
    );
  }

  // If there is no active match assigned to this studio, stay completely transparent
  if (!config?.active_tournament_id || !config?.active_match_id) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-transparent">
        <div className="bg-black/50 text-white/50 px-6 py-2 rounded-full font-bold tracking-widest text-xs backdrop-blur-md animate-pulse">
          STUDIO {studioKey.toUpperCase()} IDLE - WAITING FOR MASTER CONTROLLER
        </div>
      </div>
    );
  }

  // 3. The Seamless Load
  // We use an iframe to load your existing broadcast page. This means you don't have to
  // rewrite ANY of your existing broadcast code. The iframe just points to the new active match.
  const camQuery = camId ? `&cam=${camId}` : "";
  return (
    <div className="w-full h-full bg-transparent overflow-hidden relative">
      {/* Optional: A tiny indicator for your OBS operator to know which studio is active */}
      <div className="absolute top-4 left-4 bg-red-600 text-white px-3 py-1 rounded font-black text-[10px] uppercase tracking-widest z-[100] shadow-lg opacity-50">
        STUDIO: {studioKey}
      </div>

      <iframe
        // Notice I changed /broadcast to /obs based on your URL!
        src={`/t/${config.active_tournament_id}/obs?match=${config.active_match_id}${camQuery}`}
        className="w-full h-full border-none bg-transparent"
      />
    </div>
  );
}
