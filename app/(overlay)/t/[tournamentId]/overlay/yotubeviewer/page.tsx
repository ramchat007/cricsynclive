"use client";
import React, { useState, useEffect, use } from "react";
import { Eye, AlertCircle, Clock, Video } from "lucide-react";
import { supabase } from "@/lib/supabase";

// 🛠 THE BULLETPROOF DECODER
const extractYouTubeId = (rawUrl: string | null) => {
  if (!rawUrl) return null;
  try {
    const cleanUrl = String(rawUrl).replace(/['"]/g, "").trim();
    if (cleanUrl.includes("youtube.com/watch")) {
      const urlObj = new URL(cleanUrl);
      return urlObj.searchParams.get("v")?.substring(0, 11) || null;
    }
    if (cleanUrl.includes("youtu.be/")) {
      return cleanUrl.split("youtu.be/")[1].split(/[?#]/)[0].substring(0, 11);
    }
    if (cleanUrl.includes("/live/")) {
      return cleanUrl.split("/live/")[1].split(/[?#]/)[0].substring(0, 11);
    }
    const regExp =
      /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|live\/)([^#&?]*).*/;
    const match = cleanUrl.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  } catch (error) {
    console.error("🔴 Failed to parse URL:", error);
    return null;
  }
};

export default function YouTubeViewersOverlay({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const { tournamentId } = use(params);
  const apiKey = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;

  // Local State
  const [liveStreamUrl, setLiveStreamUrl] = useState<string | null>(null);
  const [liveViewers, setLiveViewers] = useState("0");
  const [totalViews, setTotalViews] = useState("0");

  // 🔥 NEW: Track the actual broadcast status
  const [streamStatus, setStreamStatus] = useState<
    "live" | "upcoming" | "none" | null
  >(null);

  const activeVideoId = extractYouTubeId(liveStreamUrl);

  // 1. SUPABASE SYNC
  useEffect(() => {
    if (!tournamentId) return;

    const fetchTournamentUrl = async () => {
      const { data, error } = await supabase
        .from("tournaments")
        .select("live_stream_url")
        .eq("id", tournamentId)
        .single();

      if (!error && data) {
        setLiveStreamUrl(data.live_stream_url || null);
      }
    };

    fetchTournamentUrl();

    const tournamentSub = supabase
      .channel(`tournament_overlay_${tournamentId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "tournaments",
          filter: `id=eq.${tournamentId}`,
        },
        (payload) => {
          if (payload.new.live_stream_url !== undefined) {
            setLiveStreamUrl(payload.new.live_stream_url);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(tournamentSub);
    };
  }, [tournamentId]);

  // 2. YOUTUBE API
  useEffect(() => {
    if (!apiKey || !activeVideoId) return;

    const fetchViewerData = async () => {
      // 🔥 NEW: Added "snippet" to the part requested so we can check if it's upcoming
      const apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,liveStreamingDetails,statistics&id=${activeVideoId}&key=${apiKey}`;
      try {
        const response = await fetch(apiUrl);
        const data = await response.json();

        if (!response.ok) {
          console.error("🔴 YouTube API Error:", data.error?.message);
          return;
        }

        if (data.items && data.items.length > 0) {
          const videoInfo = data.items[0];

          // 🔥 NEW: Extract the broadcast status
          const status = videoInfo.snippet?.liveBroadcastContent;
          setStreamStatus(status);

          // Only set concurrent viewers if it is actually live
          if (status === "live") {
            const live = videoInfo.liveStreamingDetails?.concurrentViewers;
            setLiveViewers(live ? Number(live).toLocaleString() : "0");
          }

          const total = videoInfo.statistics?.viewCount;
          setTotalViews(total ? Number(total).toLocaleString() : "0");
        }
      } catch (error) {
        console.error("Network error fetching viewer data:", error);
      }
    };

    fetchViewerData();
    const intervalId = setInterval(fetchViewerData, 15000);
    return () => clearInterval(intervalId);
  }, [activeVideoId, apiKey]);

  // 3. RENDER
  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
          html, body {
            background-color: transparent !important;
            background: transparent !important;
            margin: 0; 
            padding: 0; 
            overflow: hidden;
          }
        `,
        }}
      />

      <div className="w-screen h-screen relative bg-transparent pointer-events-none font-sans">
        <div className="absolute top-10 right-10 z-[100] flex flex-col items-end">
          {!activeVideoId ? (
            <div className="inline-flex items-center gap-3 bg-zinc-900/90 border border-amber-500/50 rounded-lg px-4 py-2 shadow-lg backdrop-blur-sm animate-pulse">
              <AlertCircle className="text-amber-500" size={18} />
              <span className="text-amber-500 text-[10px] font-bold uppercase tracking-widest">
                Waiting for Stream URL...
              </span>
            </div>
          ) : (
            <div className="inline-flex items-stretch rounded-lg shadow-[0_12px_30px_rgba(0,0,0,0.6)] border-2 border-white/10 overflow-hidden animate-in fade-in slide-in-from-right-8 duration-500">
              {/* 🔥 DYNAMIC STATUS BADGE 🔥 */}
              {streamStatus === "live" ? (
                <div className="flex items-center gap-4 px-4 py-3 bg-[#e50914]">
                  <div className="relative flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-white shadow-[0_0_8px_white]"></span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-white/90 text-[10px] font-bold uppercase tracking-wider mb-0.5">
                      Live Now
                    </span>
                    <span className="text-white text-3xl font-black leading-none drop-shadow-md">
                      {liveViewers}
                    </span>
                  </div>
                </div>
              ) : streamStatus === "upcoming" ? (
                <div className="flex items-center gap-3 px-4 py-3 bg-amber-500">
                  <Clock className="text-amber-950 shrink-0" size={24} />
                  <div className="flex flex-col">
                    <span className="text-amber-950/80 text-[10px] font-bold uppercase tracking-wider mb-0.5">
                      Scheduled
                    </span>
                    <span className="text-amber-950 text-2xl font-black leading-none drop-shadow-md">
                      Waiting...
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 px-4 py-3 bg-zinc-700">
                  <Video className="text-white shrink-0" size={24} />
                  <div className="flex flex-col">
                    <span className="text-white/70 text-[10px] font-bold uppercase tracking-wider mb-0.5">
                      Offline
                    </span>
                    <span className="text-white text-2xl font-black leading-none drop-shadow-md">
                      Ended
                    </span>
                  </div>
                </div>
              )}

              {/* TOTAL VIEWS BADGE */}
              <div className="flex items-center gap-4 px-4 py-3 bg-zinc-900 border-l border-zinc-700">
                <Eye className="text-gray-400 shrink-0" size={20} />
                <div className="flex flex-col">
                  <span className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-0.5">
                    Total Views
                  </span>
                  <span className="text-white text-3xl font-black leading-none drop-shadow-md">
                    {totalViews}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
