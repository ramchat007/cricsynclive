"use client";

import React, { useEffect, useState, useRef } from "react";

const playBeep = (type: string) => {
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();

  let freq = 440;
  switch (type) {
    case "FOOT FAULT":
      freq = 880;
      break;
    case "WK NO BALL":
      freq = 600;
      break;
    case "WIDE":
      freq = 300;
      break;
    default:
      freq = 500;
      break;
  }

  osc.type = "square";
  osc.frequency.setValueAtTime(freq, ctx.currentTime);

  gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

  osc.connect(gainNode);
  gainNode.connect(ctx.destination);

  osc.start();
  osc.stop(ctx.currentTime + 0.5);
};

export default function AIUmpireOverlay() {
  const [activeAlert, setActiveAlert] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // FIX: Use Chroma Green instead of transparent
    document.body.style.backgroundColor = "#00FF00";

    const channel = new BroadcastChannel("cricsync-ai-channel");

    channel.onmessage = (event) => {
      if (event.data.type === "ALERT") {
        const payload = event.data.payload;
        setActiveAlert(payload);
        playBeep(payload);

        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        timeoutRef.current = setTimeout(() => {
          setActiveAlert(null);
        }, 3000);
      }
    };

    return () => {
      channel.close();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      document.body.style.backgroundColor = "";
    };
  }, []);

  const getAlertColor = (alert: string) => {
    if (alert.includes("NO BALL") || alert === "FOOT FAULT")
      return "text-red-500 border-red-500 shadow-red-500/50";
    if (alert.includes("WIDE") || alert === "PITCH OUTSIDE")
      return "text-blue-400 border-blue-400 shadow-blue-400/50";
    return "text-yellow-400 border-yellow-400 shadow-yellow-400/50";
  };

  return (
    <div className="w-screen h-screen flex items-center justify-center overflow-hidden pointer-events-none relative">
      <div className="absolute top-4 right-4 flex items-center gap-2 bg-black/60 px-3 py-1 rounded-full backdrop-blur-sm">
        <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
        <span className="text-white text-xs font-bold tracking-widest font-sans">
          AI: ACTIVE
        </span>
      </div>

      {activeAlert && (
        <div
          className={`
            transform transition-all duration-300 animate-bounce
            px-12 py-6 rounded-2xl border-4 bg-black/80 backdrop-blur-md
            shadow-[0_0_40px_rgba(0,0,0,0.8)]
            ${getAlertColor(activeAlert)}
          `}
        >
          <h1 className="text-7xl font-black tracking-tighter uppercase text-center font-sans">
            {activeAlert}
          </h1>
        </div>
      )}
    </div>
  );
}
