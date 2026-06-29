"use client";
import React from "react";

export default function OverlayLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // This wrapper ensures absolutely nothing but your overlay renders
    <div className="w-screen h-screen bg-transparent overflow-hidden">
      <style>{`
        /* Force the entire HTML/Body to be transparent for OBS */
        html, body {
          background-color: transparent !important;
          margin: 0;
          padding: 0;
          overflow: hidden;
        }
        /* Hide any global navigation bars that might exist in your root layout */
        header, nav, aside {
          display: none !important;
        }
      `}</style>

      {children}
    </div>
  );
}
