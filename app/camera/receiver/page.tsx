"use client";
import React, { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Video, AlertCircle, RefreshCw } from "lucide-react";

function ReceiverContent() {
  const searchParams = useSearchParams();
  const camId = searchParams.get("cam");

  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState("Initializing Receiver...");
  const [isConnected, setIsConnected] = useState(false);

  // We use this to ensure we don't process the exact same WebRTC offer twice (prevent infinite loops)
  const lastOfferRef = useRef<string | null>(null);
  // Store the active connection so we can aggressively tear it down on disconnects
  const pcRef = useRef<RTCPeerConnection | null>(null);

  useEffect(() => {
    if (!camId) {
      setStatus("Error: No Camera ID provided in URL.");
      return;
    }

    setStatus("Waiting for Camera to go Live...");

    const cleanupConnection = () => {
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      setIsConnected(false);
    };

    const processOffer = async (offer: any) => {
      try {
        cleanupConnection(); // Always start fresh for a new offer
        setStatus("Connecting to Camera...");

        const pc = new RTCPeerConnection({
          iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
        });
        pcRef.current = pc;

        pc.ontrack = (event) => {
          if (videoRef.current) {
            videoRef.current.srcObject = event.streams[0];
            setStatus("");
            setIsConnected(true);
          }
        };

        pc.onconnectionstatechange = () => {
          if (
            pc.connectionState === "disconnected" ||
            pc.connectionState === "failed"
          ) {
            setStatus("Connection lost. Waiting for camera to reconnect...");
            setIsConnected(false);
            // We do NOT cleanup here. We wait for the broadcaster to hit "Start Camera"
            // again, which will push a new offer and trigger the auto-reconnect logic.
          } else if (pc.connectionState === "connected") {
            setStatus("");
            setIsConnected(true);
          }
        };

        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        // Wait for ICE candidates to gather completely before sending answer back
        await new Promise<void>((resolve) => {
          if (pc.iceGatheringState === "complete") resolve();
          else {
            const checkState = () => {
              if (pc.iceGatheringState === "complete") {
                pc.removeEventListener("icegatheringstatechange", checkState);
                resolve();
              }
            };
            pc.addEventListener("icegatheringstatechange", checkState);
            setTimeout(resolve, 3000); // 3-second safety timeout
          }
        });

        // Send answer back to the Broadcaster device
        await supabase
          .from("webrtc_signals")
          .update({ answer: JSON.parse(JSON.stringify(pc.localDescription)) })
          .eq("match_id", camId);
      } catch (err: any) {
        setStatus("Error: " + err.message);
        cleanupConnection();
      }
    };

    // 1. Initial Check: Is the camera already live when we open OBS?
    supabase
      .from("webrtc_signals")
      .select("offer")
      .eq("match_id", camId)
      .single()
      .then(({ data }) => {
        if (data?.offer) {
          lastOfferRef.current = JSON.stringify(data.offer);
          processOffer(data.offer);
        }
      });

    // 2. Continuous Reconnection Engine (Listens for network drops/restarts)
    const monitorChannel = supabase
      .channel(`obs_monitor_${camId}_${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "webrtc_signals",
          filter: `match_id=eq.${camId}`,
        },
        async (payload) => {
          if (payload.eventType === "DELETE") {
            cleanupConnection();
          } else if (
            payload.eventType === "INSERT" ||
            payload.eventType === "UPDATE"
          ) {
            const newRow = payload.new as any;

            // ONLY process if there is an offer AND the answer is null (the reset signal)
            if (newRow.offer && !newRow.answer) {
              const offerStr = JSON.stringify(newRow.offer);

              // Prevent processing the exact same offer multiple times
              if (lastOfferRef.current !== offerStr) {
                lastOfferRef.current = offerStr;
                await processOffer(newRow.offer);
              }
            }
          }
        },
      )
      .subscribe();

    return () => {
      cleanupConnection();
      supabase.removeChannel(monitorChannel);
    };
  }, [camId]);

  return (
    <>
      {status && !isConnected && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md z-50">
          <div className="bg-slate-900/80 border border-slate-700 p-8 rounded-3xl flex flex-col items-center shadow-2xl text-center">
            {status.includes("Waiting") || status.includes("Reconnecting") ? (
              <RefreshCw
                size={48}
                className="text-blue-500 animate-spin mb-6"
              />
            ) : status.includes("Error") || status.includes("lost") ? (
              <AlertCircle size={48} className="text-red-500 mb-6" />
            ) : (
              <Video
                size={48}
                className="text-emerald-500 mb-6 animate-pulse"
              />
            )}

            <h2 className="text-white font-black uppercase tracking-widest text-xl mb-2">
              Broadcast Link Active
            </h2>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">
              {status}
            </p>
            <p className="text-slate-600 font-mono text-[10px] mt-6">
              ID: {camId}
            </p>
          </div>
        </div>
      )}

      {/* 
        CRITICAL FIX: Removed "muted". 
        OBS will respect the "muted" tag and kill audio before it reaches the mixer.
        Without it, OBS can capture the raw WebRTC audio stream perfectly!
      */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className={`w-full h-full object-cover transition-opacity duration-700 ${isConnected ? "opacity-100" : "opacity-0"}`}
      />
    </>
  );
}

// 2. Wrap it in a Suspense boundary for Next.js App Router rules
export default function CameraReceiverPage() {
  return (
    <div className="w-screen h-screen bg-transparent overflow-hidden relative flex items-center justify-center font-sans">
      <style>{`
        body { background: transparent !important; margin: 0; overflow: hidden; }
        ::-webkit-scrollbar { display: none; }
      `}</style>
      <Suspense
        fallback={
          <div className="text-white bg-black/80 px-6 py-4 rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl border border-white/10">
            Loading Receiver Engine...
          </div>
        }>
        <ReceiverContent />
      </Suspense>
    </div>
  );
}
