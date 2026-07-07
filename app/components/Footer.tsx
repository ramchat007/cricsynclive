import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default async function Footer() {
  const currentYear = new Date().getFullYear();

  // Fetch the 3 most recent tournaments directly in the footer
  const { data: recentTournaments } = await supabase
    .from("tournaments")
    .select("id, name")
    .order("created_at", { ascending: false })
    .limit(3);

  return (
    <footer className="w-full bg-[var(--surface-1)] border-t border-[var(--border-1)] mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-12 mb-12">
          {/* Column 1: Brand */}
          <div className="space-y-4 md:col-span-1">
            <Link
              href="/"
              className="text-xl font-black uppercase italic tracking-tighter text-[var(--foreground)]"
            >
              CricSync<span className="text-[var(--accent)]">Live</span>
            </Link>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed">
              Broadcast-grade tournament management and real-time streaming
              overlays.
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
                <li className="text-[var(--text-muted)] opacity-50">
                  No active leagues
                </li>
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
                <Link
                  href="/about"
                  className="text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
                >
                  About Us
                </Link>
              </li>
              <li>
                <Link
                  href="/blogs"
                  className="text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
                >
                  Insights & Guides
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
                >
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
                <Link
                  href="/privacy"
                  className="text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
                >
                  Terms & Conditions
                </Link>
              </li>
              <li>
                <Link
                  href="/sitemap"
                  className="text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
                >
                  Sitemap
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-[var(--border-1)] pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--text-muted)] font-medium">
          <p>© {currentYear} CricSyncLive. All rights reserved.</p>
          <p className="flex items-center gap-1">
            Powered by event-driven real-time architecture
          </p>
        </div>
      </div>
    </footer>
  );
}
