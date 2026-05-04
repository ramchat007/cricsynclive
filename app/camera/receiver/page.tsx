"use client";
import { useEffect, useRef, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

// 1. We moved your existing logic into this "Content" component
function ReceiverContent() {
  const searchParams = useSearchParams();
  const camId = searchParams.get("cam");

  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState("Waiting for Camera...");

  useEffect(() => {
    if (!camId) {
      setStatus("Error: No Camera ID provided in URL.");
      return;
    }

    let pc: RTCPeerConnection | null = null;
    let waitChannel: any = null;

    const initReceiver = async () => {
      try {
        pc = new RTCPeerConnection({
          iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
        });

        pc.ontrack = (event) => {
          if (videoRef.current) {
            videoRef.current.srcObject = event.streams[0];
            setStatus("");
          }
        };

        pc.onconnectionstatechange = () => {
          if (
            pc?.connectionState === "disconnected" ||
            pc?.connectionState === "failed"
          ) {
            setStatus("Connection lost. Reconnecting...");
          }
        };

        const { data, error } = await supabase
          .from("webrtc_signals")
          .select("offer")
          .eq("match_id", camId)
          .single();

        if (error || !data?.offer) {
          setStatus("Waiting for Camera to go Live...");
          waitChannel = supabase
            .channel(`wait_offer_${camId}`)
            .on(
              "postgres_changes",
              {
                event: "*",
                schema: "public",
                table: "webrtc_signals",
                filter: `match_id=eq.${camId}`,
              },
              async (payload) => {
                const newRow = payload.new as any;
                if (newRow.offer && pc?.signalingState === "stable") {
                  await processOffer(pc!, newRow.offer);
                  supabase.removeChannel(waitChannel);
                }
              },
            )
            .subscribe();
          return;
        }

        await processOffer(pc, (data as any).offer);
      } catch (err: any) {
        setStatus("Error: " + err.message);
      }
    };

    const processOffer = async (peer: RTCPeerConnection, offer: any) => {
      setStatus("Connecting to Camera...");
      await peer.setRemoteDescription(new RTCSessionDescription(offer));

      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);

      await new Promise<void>((resolve) => {
        if (peer.iceGatheringState === "complete") resolve();
        else {
          const checkState = () => {
            if (peer.iceGatheringState === "complete") {
              peer.removeEventListener("icegatheringstatechange", checkState);
              resolve();
            }
          };
          peer.addEventListener("icegatheringstatechange", checkState);
          setTimeout(resolve, 3000);
        }
      });

      await supabase
        .from("webrtc_signals")
        .update({ answer: JSON.parse(JSON.stringify(peer.localDescription)) })
        .eq("match_id", camId);
    };

    initReceiver();

    return () => {
      pc?.close();
      if (waitChannel) supabase.removeChannel(waitChannel);
    };
  }, [camId]);

  return (
    <>
      {status && (
        <div className="absolute top-4 left-4 z-50 bg-black/60 backdrop-blur-md text-white px-4 py-2 rounded-xl font-bold uppercase tracking-widest text-xs border border-white/10 animate-pulse">
          {status}
        </div>
      )}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
      />
    </>
  );
}

// 2. This is the main page export. It wraps the logic in a Suspense boundary!
export default function CameraReceiverPage() {
  return (
    <div className="w-screen h-screen bg-transparent overflow-hidden relative flex items-center justify-center">
      <style>{`body { background: transparent !important; margin: 0; overflow: hidden; }`}</style>
      <Suspense
        fallback={
          <div className="text-white bg-black/50 p-4 rounded">
            Loading Receiver...
          </div>
        }
      >
        <ReceiverContent />
      </Suspense>
    </div>
  );
}
