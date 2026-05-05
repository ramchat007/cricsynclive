"use client";
import { useEffect, useState, use } from "react";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";

export default function TournamentAnimationsOverlay({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const { tournamentId } = use(params);

  const [activeEvent, setActiveEvent] = useState<string | null>(null);
  const [eventKey, setEventKey] = useState<number>(0);

  useEffect(() => {
    if (!tournamentId) return;

    // Trigger 1: Manual Override
    const manualChannel = supabase.channel(`studio_graphics_${tournamentId}`);
    manualChannel
      .on("broadcast", { event: "sync_graphics" }, (message) => {
        const { event, eventTime } = message.payload;
        if (event && eventTime !== eventKey) {
          setActiveEvent(event);
          setEventKey(eventTime);
          setTimeout(() => setActiveEvent(null), 3500);
        }
      })
      .subscribe();

    // Trigger 2: Auto-Trigger from Scorer
    const dbSub = supabase
      .channel(`auto_animator_${tournamentId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "deliveries" },
        (payload) => {
          const newBall = payload.new as any;
          const now = Date.now();
          if (newBall.is_wicket) {
            setActiveEvent("WICKET");
            setEventKey(now);
            setTimeout(() => setActiveEvent(null), 3500);
          } else if (newBall.runs_off_bat === 6) {
            setActiveEvent("SIX");
            setEventKey(now);
            setTimeout(() => setActiveEvent(null), 3500);
          } else if (newBall.runs_off_bat === 4) {
            setActiveEvent("FOUR");
            setEventKey(now);
            setTimeout(() => setActiveEvent(null), 3500);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(manualChannel);
      supabase.removeChannel(dbSub);
    };
  }, [tournamentId, eventKey]);

  return (
    // Align to the BOTTOM CENTER.
    // IMPORTANT: Change pb-28 below to match the exact height of your scorebug!
    <div className="w-screen h-screen bg-transparent overflow-hidden flex items-end justify-center pb-28 pointer-events-none">
      <style>{`
        body { background: transparent !important; margin: 0; overflow: hidden; }
        nav, header, footer, aside { display: none !important; }
      `}</style>

      <AnimatePresence mode="wait">
        {activeEvent === "SIX" && (
          <motion.div
            key={`six-${eventKey}`}
            // Shoots straight up from underneath the scorebug
            initial={{ y: 100, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 100, opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", damping: 15, stiffness: 150 }}
            className="bg-gradient-to-t from-amber-600 to-amber-400 px-12 py-3 rounded-t-2xl shadow-[0_-10px_30px_rgba(245,158,11,0.4)] border-t-4 border-x-4 border-amber-200"
          >
            <h1 className="text-5xl font-black uppercase tracking-widest text-white drop-shadow-md leading-none">
              SIX RUNS
            </h1>
          </motion.div>
        )}

        {activeEvent === "FOUR" && (
          <motion.div
            key={`four-${eventKey}`}
            initial={{ y: 100, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 100, opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", damping: 15, stiffness: 150 }}
            className="bg-gradient-to-t from-cyan-700 to-cyan-500 px-12 py-3 rounded-t-2xl shadow-[0_-10px_30px_rgba(6,182,212,0.4)] border-t-4 border-x-4 border-cyan-200"
          >
            <h1 className="text-5xl font-black uppercase tracking-widest text-white drop-shadow-md leading-none">
              FOUR
            </h1>
          </motion.div>
        )}

        {activeEvent === "WICKET" && (
          <motion.div
            key={`wicket-${eventKey}`}
            initial={{ y: 100, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 100, opacity: 0, scale: 0.9 }}
            // Wicket is slightly faster and more aggressive
            transition={{ type: "spring", damping: 12, stiffness: 200 }}
            className="bg-gradient-to-t from-red-800 to-red-600 px-16 py-4 rounded-t-[2rem] shadow-[0_-10px_40px_rgba(220,38,38,0.6)] border-t-4 border-x-4 border-white"
          >
            <h1 className="text-6xl font-black uppercase tracking-widest text-white drop-shadow-lg leading-none">
              WICKET
            </h1>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
