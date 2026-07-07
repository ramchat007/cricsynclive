"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const [recentTournaments, setRecentTournaments] = useState<any[]>([]);

  // Fetch the 3 most recent tournaments on component mount
  useEffect(() => {
    const fetchRecentTournaments = async () => {
      const { data } = await supabase
        .from("tournaments")
        .select("id, name")
        .order("created_at", { ascending: false })
        .limit(6);

      if (data) {
        setRecentTournaments(data);
      }
    };

    fetchRecentTournaments();
  }, []);

  return (
    <footer className="relative w-full bg-[var(--surface-1)] border-t border-[var(--border-1)] mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-12">
          
          {/* Column 1: Brand */}
          <div className="space-y-4 md:col-span-1">
            <Link
              href="/"
              className="flex items-center gap-3 group"
            >
              <div className="flex flex-col justify-center">
                
                {/* Main Logo Text */}
                <div className="text-2xl md:text-3xl font-black italic tracking-tighter text-[var(--foreground)] leading-none mb-1">
                  CricSync<span className="text-[var(--accent)]">Live</span>
                </div>
                
                {/* Tagline */}
                <span className="text-[9px] md:text-[9.5px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">
                  Score, Stream, Synchronize
                </span>
                
              </div>
            </Link>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed">
              Broadcast-grade tournament management and real-time streaming overlays.
            </p>
          </div>

          {/* Column 2: Active Leagues (DYNAMIC DATA) */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--foreground)] mb-4">
              Active Leagues
            </h3>
            <ul className="space-y-2.5 text-sm">
              {recentTournaments && recentTournaments.length > 0 ? (
                recentTournaments.map((tournament) => (
                  <li key={tournament.id}>
                    <Link 
                      href={`/tournament/${tournament.id}`} 
                      className="text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors line-clamp-1"
                    >
                      {tournament.name || "Community Tournament"}
                    </Link>
                  </li>
                ))
              ) : (
                <li className="text-[var(--text-muted)] opacity-50">Loading leagues...</li>
              )}
            </ul>
          </div>

          {/* Column 3: Platform & Content */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--foreground)] mb-4">
              Platform
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/about" className="text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/blogs" className="text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors">
                  Insights & Guides
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors">
                  Book a Broadcast
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Legal & Trust */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--foreground)] mb-4">
              Legal
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/privacy" className="text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors">
                  Terms & Conditions
                </Link>
              </li>
              {/* <li>
                <Link href="/sitemap.xml" className="text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors">
                  Sitemap
                </Link>
              </li> */}
            </ul>
          </div>

        </div>
      </div>
    </footer>
  );
}