"use client";
import React from "react";

export default function StandaloneBugOverlay() {
  return (
    <div className="fixed inset-0 w-[1920px] h-[1080px] bg-transparent pointer-events-none z-[9999] overflow-hidden origin-top-left">
      <style>{`
        /* Strip all backgrounds for OBS transparency */
        html, body { 
          background: transparent !important; 
          margin: 0; 
          padding: 0; 
          overflow: hidden; 
        }
        
        /* The 3D Coin Spin Animation */
        @keyframes spin3D_Coin { 
          0% { transform: rotateY(0deg); } 
          10% { transform: rotateY(360deg); } 
          100% { transform: rotateY(360deg); } 
        }
        
        @keyframes fade-in { 
          from { opacity: 0; transform: translateY(0px); } 
          to { opacity: 1; transform: translateY(0); } 
        }
        .animate-fade-in { animation: fade-in 0.8s ease-out forwards; }
      `}</style>

      {/* TOP RIGHT WATERMARK */}
      <div className="absolute top-8 right-8 z-[100] animate-fade-in flex flex-col items-center">
        <div
          className="relative bg-cyan-100 rounded-full p-2.5 border-[3px] border-white ring-2 ring-black/20 flex items-center justify-center shadow-lg"
          style={{ animation: "spin3D_Coin 10s ease-in-out infinite" }}>
          <img
            src="/cricsync-light-logo.png"
            className="h-16 w-auto drop-shadow-md"
            alt="CricSync Logo"
          />
        </div>

        {/* Optional: The LIVE badge tucked underneath */}
        <div className="relative z-10 -mt-3 bg-slate-950 border-2 border-slate-700 px-3 py-0.5 rounded-full flex items-center gap-1.5 shadow-xl">
          <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_#ef4444]" />
          <span className="text-[9px] font-black text-red-500 uppercase tracking-[0.4em]">
            LIVE
          </span>
        </div>
      </div>
    </div>
  );
}
