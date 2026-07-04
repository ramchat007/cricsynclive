"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase"; // Adjust if your setup is in utils/

interface PageMetric {
  path: string;
  views: string;
  users: string;
}

interface DeviceMetric {
  device: string;
  users: string;
}

export default function AnalyticsDashboard() {
  const [loading, setLoading] = useState(true);
  const [supabaseMetrics, setSupabaseMetrics] = useState({
    tournaments: 0,
    totalMatches: 0,
    liveMatches: 0,
    users: 0,
  });
  const [topTournaments, setTopTournaments] = useState<any[]>([]);

  // GA4 API state
  const [gaPages, setGaPages] = useState<PageMetric[]>([]);
  const [gaDevices, setGaDevices] = useState<DeviceMetric[]>([]);
  const [gaError, setGaError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAllMetrics = async () => {
      setLoading(true);
      setGaError(null);

      try {
        // 1. Fetch Supabase Data & GA4 Data in parallel for optimal load times
        const [
          { count: tCount },
          { count: mCount },
          { count: liveCount },
          tournamentsRes,
          gaResponse,
        ] = await Promise.all([
          supabase
            .from("tournaments")
            .select("*", { count: "exact", head: true }),
          supabase.from("matches").select("*", { count: "exact", head: true }),
          supabase
            .from("matches")
            .select("*", { count: "exact", head: true })
            .eq("status", "live"),
          supabase.from("tournaments").select("id, name, status, matches (id)"),
          fetch("/api/analytics").then((res) => res.json()),
        ]);

        // 2. Map Supabase Counts
        setSupabaseMetrics({
          tournaments: tCount || 0,
          totalMatches: mCount || 0,
          liveMatches: liveCount || 0,
          users: 0, // Placeholder until user profile syncing is configured
        });

        // 3. Process Active Tournaments
        if (tournamentsRes.data) {
          const sorted = tournamentsRes.data
            .map((t: any) => ({
              id: t.id,
              name: t.name,
              status: t.status,
              matchCount: t.matches ? t.matches.length : 0,
            }))
            .sort((a, b) => b.matchCount - a.matchCount)
            .slice(0, 5);
          setTopTournaments(sorted);
        }

        // 4. Process GA4 API Response
        if (gaResponse.success) {
          setGaPages(gaResponse.data.topPages);
          setGaDevices(gaResponse.data.deviceData);
        } else {
          setGaError(gaResponse.error || "Failed to load traffic metrics.");
        }
      } catch (error) {
        console.error("Dashboard calculation error:", error);
        setGaError("Network error fetching live metrics framework.");
      } finally {
        setLoading(false);
      }
    };

    fetchAllMetrics();
  }, []);

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-black text-[var(--foreground)] tracking-tight">
          System Control & Analytics
        </h1>
        <p className="text-[var(--text-muted)] mt-1">
          Consolidated business records paired with custom API behavioral
          streams.
        </p>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="h-32 bg-[var(--surface-1)] animate-pulse rounded-3xl w-full"></div>
          <div className="h-64 bg-[var(--surface-1)] animate-pulse rounded-3xl w-full"></div>
        </div>
      ) : (
        <>
          {/* --- ROW 1: PLATFORM QUANTITY METRICS (SUPABASE) --- */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[var(--surface-1)] p-6 rounded-[2rem] border border-[var(--border-1)] shadow-sm">
              <p className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">
                Tournaments Managed
              </p>
              <p className="text-4xl font-black text-[var(--foreground)]">
                {supabaseMetrics.tournaments}
              </p>
            </div>
            <div className="bg-[var(--surface-1)] p-6 rounded-[2rem] border border-[var(--border-1)] shadow-sm">
              <p className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">
                Total Matches
              </p>
              <p className="text-4xl font-black text-[var(--foreground)]">
                {supabaseMetrics.totalMatches}
              </p>
            </div>
            <div className="bg-[var(--surface-1)] p-6 rounded-[2rem] border border-[var(--border-1)] shadow-sm border-l-4 border-l-green-500">
              <p className="text-[11px] font-black text-green-500 uppercase tracking-widest mb-2">
                Active Concurrently
              </p>
              <p className="text-4xl font-black text-[var(--foreground)]">
                {supabaseMetrics.liveMatches}
                <span className="text-xs font-medium text-[var(--text-muted)] ml-2">
                  LIVE
                </span>
              </p>
            </div>
            <div className="bg-[var(--surface-1)] p-6 rounded-[2rem] border border-[var(--border-1)] shadow-sm">
              <p className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">
                Scorer Accounts
              </p>
              <p className="text-4xl font-black text-[var(--foreground)]">
                {supabaseMetrics.users}
              </p>
            </div>
          </div>

          {/* --- ROW 2: CORE BUSINESS DRIVERS VS TRAFFIC SPLIT --- */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Top Tournaments (Supabase) */}
            <div className="lg:col-span-2 bg-[var(--surface-1)] p-6 sm:p-8 rounded-[2.5rem] border border-[var(--border-1)] shadow-sm">
              <h3 className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest mb-6">
                Most Active Tournaments
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--border-1)] text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
                      <th className="pb-3 font-black">Tournament</th>
                      <th className="pb-3 font-black">Status</th>
                      <th className="pb-3 font-black text-right">Matches</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topTournaments.map((t) => (
                      <tr
                        key={t.id}
                        className="border-b border-[var(--border-1)] last:border-0">
                        <td className="py-4 font-bold text-[var(--foreground)]">
                          {t.name}
                        </td>
                        <td className="py-4">
                          <span
                            className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${
                              t.status === "active"
                                ? "bg-green-500/10 text-green-500"
                                : "bg-[var(--surface-2)] text-[var(--text-muted)]"
                            }`}>
                            {t.status}
                          </span>
                        </td>
                        <td className="py-4 font-black text-right text-[var(--accent)]">
                          {t.matchCount}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Device Demographics for Revenue Strategy (GA4 API) */}
            <div className="bg-[var(--surface-1)] p-6 sm:p-8 rounded-[2.5rem] border border-[var(--border-1)] shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">
                  Device Revenue Context
                </h3>
                <p className="text-xs text-[var(--text-muted)] mb-6">
                  Identifies sizing profiles to target your primary AdSense real
                  estate.
                </p>

                {gaError ? (
                  <p className="text-xs text-red-500 font-mono p-3 bg-red-500/5 rounded-xl">
                    {gaError}
                  </p>
                ) : (
                  <div className="space-y-4">
                    {gaDevices.map((d) => (
                      <div
                        key={d.device}
                        className="bg-[var(--surface-2)] p-4 rounded-2xl border border-[var(--border-1)]">
                        <div className="flex justify-between items-center">
                          <span className="font-black text-sm uppercase tracking-wider text-[var(--foreground)]">
                            {d.device === "mobile"
                              ? "📱 Mobile Fanbase"
                              : d.device === "desktop"
                                ? "💻 Desktop Viewers"
                                : `🖥️ ${d.device}`}
                          </span>
                          <span className="text-sm font-black text-[var(--accent)]">
                            {d.users} users
                          </span>
                        </div>
                        <p className="text-[10px] text-[var(--text-muted)] mt-1.5">
                          {d.device === "mobile"
                            ? "Prioritize bottom anchors and responsive rectangle units."
                            : "Optimal for high-impact side pillar banner configurations."}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="mt-4 pt-4 border-t border-[var(--border-1)] text-[11px] font-bold text-[var(--text-muted)]">
                💡 Target local corporate tournament sponsorships based on high
                mobile split.
              </div>
            </div>
          </div>

          {/* --- ROW 3: TRAFFIC PERFORMANCE & CONVERSION OPPORTUNITIES (GA4 API) --- */}
          <div className="bg-[var(--surface-1)] p-6 sm:p-8 rounded-[2.5rem] border border-[var(--border-1)] shadow-sm">
            <div className="mb-6">
              <h3 className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest">
                Traffic & Conversion Optimization
              </h3>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Raw real-time page hits directly from the Google API stream.
              </p>
            </div>

            {gaError ? (
              <div className="text-center py-8 text-sm text-[var(--text-muted)]">
                {gaError}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--border-1)] text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
                      <th className="pb-3 font-black">Identified URL Path</th>
                      <th className="pb-3 font-black text-right">
                        Unique Users
                      </th>
                      <th className="pb-3 font-black text-right">Page Views</th>
                      <th className="pb-3 font-black text-right">
                        Revenue Assessment
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {gaPages.map((page) => {
                      const isScorecard =
                        page.path.includes("match") ||
                        page.path.includes("scorecard");
                      const isHome = page.path === "/";

                      return (
                        <tr
                          key={page.path}
                          className="border-b border-[var(--border-1)] last:border-0 hover:bg-[var(--surface-2)]/40 transition-all">
                          <td className="py-4 font-mono text-xs text-[var(--foreground)] truncate max-w-xs sm:max-w-md">
                            {page.path}
                          </td>
                          <td className="py-4 font-bold text-right text-sm">
                            {page.users}
                          </td>
                          <td className="py-4 font-black text-right text-sm text-[var(--foreground)]">
                            {page.views}
                          </td>
                          <td className="py-4 text-right">
                            <span
                              className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${
                                isScorecard
                                  ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                                  : isHome
                                    ? "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                                    : "bg-[var(--surface-2)] text-[var(--text-muted)]"
                              }`}>
                              {isScorecard
                                ? "🔥 Premium Ad Hub"
                                : isHome
                                  ? "🚀 Conversion Landing"
                                  : "Standard Asset"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
