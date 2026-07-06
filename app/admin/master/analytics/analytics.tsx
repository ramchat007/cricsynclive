"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

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

  // Supabase Core Quantities
  const [supabaseMetrics, setSupabaseMetrics] = useState({
    tournaments: 0,
    totalMatches: 0,
    liveMatches: 0,
  });

  // Segmented User Statistics
  const [userDemographics, setUserDemographics] = useState({
    totalSignups: 0,
    admins: 0,
    scorers: 0,
  });

  const [playerMetrics, setPlayerMetrics] = useState({
    total: 0,
    rhb: 0,
    lhb: 0,
    laf: 0,
    raf: 0,
  });

  // Monetization Data
  const [tierMetrics, setTierMetrics] = useState({
    free: 0,
    broadcast: 0,
    pro: 0,
  });

  const [topTournaments, setTopTournaments] = useState<any[]>([]);

  // GA4 API streams
  const [gaPages, setGaPages] = useState<PageMetric[]>([]);
  const [gaDevices, setGaDevices] = useState<DeviceMetric[]>([]);
  const [gaError, setGaError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAllMetrics = async () => {
      setLoading(true);
      setGaError(null);

      try {
        const [
          { count: tCount },
          { count: mCount },
          { count: liveCount },
          tournamentsRes,
          { count: totalUsers },
          { count: adminUsers },
          { count: scorerUsers },
          { count: freeTiers },
          { count: broadcastTiers },
          { count: proTiers },
          { count: totalPlayersCount },
          { count: rhbCount },
          { count: lhbCount },
          { count: lafCount },
          { count: rafCount },
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

          supabase.from("profiles").select("*", { count: "exact", head: true }),
          supabase
            .from("profiles")
            .select("*", { count: "exact", head: true })
            .eq("role", "admin"),
          supabase
            .from("profiles")
            .select("*", { count: "exact", head: true })
            .eq("role", "scorer"),

          supabase
            .from("tournaments")
            .select("*", { count: "exact", head: true })
            .eq("subscription_tier", "free"),
          supabase
            .from("tournaments")
            .select("*", { count: "exact", head: true })
            .eq("subscription_tier", "broadcast"),
          supabase
            .from("tournaments")
            .select("*", { count: "exact", head: true })
            .eq("subscription_tier", "pro"),

          supabase.from("players").select("*", { count: "exact", head: true }),
          supabase.from("players").select("*", { count: "exact", head: true }).eq("batting_hand", "Right Hand"),
          supabase.from("players").select("*", { count: "exact", head: true }).eq("batting_hand", "Left Hand"),
          supabase.from("players").select("*", { count: "exact", head: true }).eq("bowling_style", "Left Arm Fast"),
          supabase.from("players").select("*", { count: "exact", head: true }).eq("bowling_style", "Right Arm Fast"),

          fetch("/api/analytics").then((res) => res.json()),
        ]);

        setSupabaseMetrics({
          tournaments: tCount || 0,
          totalMatches: mCount || 0,
          liveMatches: liveCount || 0,
        });

        setUserDemographics({
          totalSignups: totalUsers || 0,
          admins: adminUsers || 0,
          scorers: scorerUsers || 0,
        });

        setPlayerMetrics({
          total: totalPlayersCount || 0,
          rhb: rhbCount || 0,
          lhb: lhbCount || 0,
          laf: lafCount || 0,
          raf: rafCount || 0,
        });

        setTierMetrics({
          free: freeTiers || 0,
          broadcast: broadcastTiers || 0,
          pro: proTiers || 0,
        });

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

        if (gaResponse && gaResponse.success) {
          setGaPages(gaResponse.data.topPages || []);
          setGaDevices(gaResponse.data.deviceData || []);
        } else if (gaResponse && !gaResponse.success) {
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
          {/* --- ROW 1: USER SIGNUPS & CONCURRENT QUANTITIES --- */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[var(--surface-1)] p-6 rounded-[2rem] border border-[var(--border-1)] shadow-sm">
              <p className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">
                Total Signups (Profiles)
              </p>
              <p className="text-4xl font-black text-[var(--foreground)]">
                {userDemographics.totalSignups}
              </p>
            </div>
            <div className="bg-[var(--surface-1)] p-6 rounded-[2rem] border border-[var(--border-1)] shadow-sm">
              <p className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">
                System Administrators
              </p>
              <p className="text-4xl font-black text-blue-500">
                {userDemographics.admins}
              </p>
            </div>
            <div className="bg-[var(--surface-1)] p-6 rounded-[2rem] border border-[var(--border-1)] shadow-sm">
              <p className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">
                Authorized Scorers
              </p>
              <p className="text-4xl font-black text-amber-500">
                {userDemographics.scorers}
              </p>
            </div>
            <div className="bg-[var(--surface-1)] p-6 rounded-[2rem] border border-[var(--border-1)] shadow-sm border-l-4 border-l-green-500">
              <p className="text-[11px] font-black text-green-500 uppercase tracking-widest mb-2">
                Matches Live Now
              </p>
              <p className="text-4xl font-black text-[var(--foreground)]">
                {supabaseMetrics.liveMatches}
                <span className="text-xs font-medium text-[var(--text-muted)] ml-2">
                  LIVE
                </span>
              </p>
            </div>
          </div>

          {/* --- ROW 2: TOURNAMENTS & DEMOGRAPHICS --- */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Top Tournaments */}
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
                        className="border-b border-[var(--border-1)] last:border-0 hover:bg-[var(--surface-2)]/40 transition-all">
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

            {/* Device Demographics */}
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
            </div>
          </div>

          {/* --- ROW 3: TOURNAMENT PLANS & TRAFFIC --- */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Side: Combined Package and Player Matrix */}
            <div className="space-y-6">
              {/* Active Tournament Packages */}
              <div className="bg-[var(--surface-1)] p-6 rounded-[2.5rem] border border-[var(--border-1)] shadow-sm">
                <h3 className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest mb-4">
                  Tournament Packages
                </h3>
                <div className="flex flex-col space-y-3">
                  <div className="flex justify-between items-center p-3 bg-[var(--surface-2)] rounded-xl border border-[var(--border-1)]">
                    <span className="font-bold text-xs uppercase tracking-wider">Free Tiers</span>
                    <span className="font-mono font-black text-sm">{tierMetrics.free}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                    <span className="font-bold text-xs uppercase tracking-wider text-blue-500">Broadcast Packages</span>
                    <span className="font-mono font-black text-sm text-blue-500">{tierMetrics.broadcast}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                    <span className="font-bold text-xs uppercase tracking-wider text-amber-500">Pro Features</span>
                    <span className="font-mono font-black text-sm text-amber-500">{tierMetrics.pro}</span>
                  </div>
                </div>
              </div>

              {/* 🔥 NEW: Registered Player Breakdown Matrix */}
              <div className="bg-[var(--surface-1)] p-6 rounded-[2.5rem] border border-[var(--border-1)] shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest">
                    Registered Ecosystem Players
                  </h3>
                  <span className="text-xs font-black bg-[var(--surface-2)] px-2.5 py-1 rounded-full text-[var(--accent)]">
                    {playerMetrics.total} Total
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-[var(--surface-2)] rounded-xl border border-[var(--border-1)]">
                    <span className="text-[10px] text-[var(--text-muted)] block uppercase tracking-wider font-bold">Right Hand Bat</span>
                    <span className="text-lg font-black block mt-0.5">{playerMetrics.rhb}</span>
                  </div>
                  <div className="p-3 bg-[var(--surface-2)] rounded-xl border border-[var(--border-1)]">
                    <span className="text-[10px] text-[var(--text-muted)] block uppercase tracking-wider font-bold">Left Hand Bat</span>
                    <span className="text-lg font-black block mt-0.5">{playerMetrics.lhb}</span>
                  </div>
                  <div className="p-3 bg-red-500/5 border border-red-500/10 rounded-xl">
                    <span className="text-[10px] text-red-500/70 block uppercase tracking-wider font-bold">Left Arm Fast</span>
                    <span className="text-lg font-black text-red-500 block mt-0.5">{playerMetrics.laf}</span>
                  </div>
                  <div className="p-3 bg-blue-500/5 border border-blue-500/10 rounded-xl">
                    <span className="text-[10px] text-blue-500/70 block uppercase tracking-wider font-bold">Right Arm Fast</span>
                    <span className="text-lg font-black text-blue-500 block mt-0.5">{playerMetrics.raf}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Traffic Performance */}
            <div className="lg:col-span-2 bg-[var(--surface-1)] p-6 sm:p-8 rounded-[2.5rem] border border-[var(--border-1)] shadow-sm">
              <div className="mb-6">
                <h3 className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest">
                  Traffic & Conversion Optimization
                </h3>
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
                        <th className="pb-3 font-black text-right">
                          Page Views
                        </th>
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
          </div>
        </>
      )}
    </div>
  );
}
