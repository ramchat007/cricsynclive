"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Swords,
  Zap,
  Calendar,
  CheckCircle2,
  Trophy,
  User,
  Loader2,
  ArrowRight,
  PlusCircle,
} from "lucide-react";

export default function MyMatchesPage() {
  const router = useRouter();
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"live" | "completed">(
    "live",
  );

  useEffect(() => {
    fetchMyMatches();
  }, []);

  const fetchMyMatches = async () => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    // Query matches created by current user
    const { data, error } = await supabase
      .from("matches")
      .select(
        `
        *,
        team1:teams!team1_id(name, short_name),
        team2:teams!team2_id(name, short_name)
      `,
      )
      .eq("created_by", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching matches:", error);
    } else if (data) {
      setMatches(data);
    }
    setLoading(false);
  };

  const filteredMatches = matches.filter((m) => {
    if (filter === "live") return m.status === "live";
    if (filter === "completed") return m.status === "completed";
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto p-6 font-sans pb-24">
      {/* TOP NAVIGATION TABS */}
      <div className="flex items-center gap-2 mb-8 bg-slate-100 p-1.5 rounded-2xl w-fit">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-xs font-black uppercase tracking-wider px-5 py-2.5 rounded-xl text-slate-500 hover:text-slate-900 transition-all">
          <Trophy size={15} /> Tournaments
        </Link>
        <Link
          href="/my-matches"
          className="flex items-center gap-2 text-xs font-black uppercase tracking-wider px-5 py-2.5 rounded-xl bg-white text-slate-900 shadow-sm transition-all">
          <Swords size={15} className="text-red-500" /> My Matches
        </Link>
        <Link
          href="/profile/edit"
          className="flex items-center gap-2 text-xs font-black uppercase tracking-wider px-5 py-2.5 rounded-xl text-slate-500 hover:text-slate-900 transition-all">
          <User size={15} /> Edit Profile
        </Link>
      </div>

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-widest text-slate-900">
            My Matches
          </h1>
          <p className="text-slate-500 font-bold text-xs mt-1">
            View and manage all quick matches & official matches scored by you.
          </p>
        </div>

        <Link
          href="/quick-match"
          className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 font-black uppercase tracking-widest text-xs py-3 px-6 rounded-xl flex items-center justify-center gap-2 hover:bg-emerald-500 hover:text-white transition-all shadow-sm">
          <Zap size={16} /> Launch Quick Match
        </Link>
      </div>

      {/* FILTER PILLS */}
      <div className="flex flex-wrap gap-2 mb-8">
        {[
          { key: "live", label: "Live Now" },
          { key: "completed", label: "Completed" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key as any)}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
              filter === tab.key
                ? "bg-slate-900 shadow-md"
                : "bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-900"
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* LOADING */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-slate-400">
          <Loader2 size={32} className="animate-spin mb-3" />
          <p className="font-bold text-xs uppercase tracking-widest">
            Loading your matches...
          </p>
        </div>
      ) : (
        /* MATCHES GRID */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMatches.map((m) => {
            const teamA = m.team1?.name || m.team1_name || "Team A";
            const teamB = m.team2?.name || m.team2_name || "Team B";
            const isQuick = m.tournament_id === null;
            const targetUrl = isQuick
              ? `/t/QUICK_MATCH/m/${m.id}`
              : `/t/${m.tournament_id}/m/${m.id}`;

            return (
              <div
                key={m.id}
                className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col justify-between">
                <div>
                  {/* BADGES */}
                  <div className="flex items-center justify-between mb-4">
                    {isQuick ? (
                      <span className="bg-amber-500/10 text-amber-600 border border-amber-500/20 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md flex items-center gap-1">
                        <Zap size={10} /> Quick Match
                      </span>
                    ) : (
                      <span className="bg-blue-500/10 text-blue-600 border border-blue-500/20 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md flex items-center gap-1">
                        <Trophy size={10} /> Tournament
                      </span>
                    )}

                    {m.status === "live" ? (
                      <span className="bg-red-500/10 text-red-500 border border-red-500/20 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />{" "}
                        Live
                      </span>
                    ) : (
                      <span className="bg-slate-100 text-slate-500 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md">
                        {m.status || "Upcoming"}
                      </span>
                    )}
                  </div>

                  {/* TEAMS VS */}
                  <div className="my-6 text-center bg-slate-50 rounded-2xl p-4 border border-slate-100">
                    <div className="text-lg font-black text-slate-900 uppercase tracking-tight truncate">
                      {teamA}
                    </div>
                    <div className="text-[10px] font-black text-red-500 uppercase tracking-widest my-1">
                      VS
                    </div>
                    <div className="text-lg font-black text-slate-900 uppercase tracking-tight truncate">
                      {teamB}
                    </div>
                  </div>

                  {/* METADATA */}
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 px-1 mb-6">
                    <span>Overs: {m.overs_count || 12}</span>
                    <span>Ball: {m.ball_type || "Tennis"}</span>
                  </div>
                </div>

                {/* SCORER LINK */}
                <Link href={targetUrl} className="block">
                  <button className="w-full bg-slate-900 hover:bg-slate-800 font-black uppercase tracking-widest text-[10px] py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 active:scale-95 shadow-md">
                    Open Scorer Pad <ArrowRight size={14} />
                  </button>
                </Link>
              </div>
            );
          })}

          {/* EMPTY STATE */}
          {filteredMatches.length === 0 && (
            <div className="col-span-full text-center py-20 border-2 border-dashed border-slate-200 rounded-[2rem] bg-slate-50">
              <Swords size={40} className="mx-auto text-slate-300 mb-4" />
              <h3 className="text-xl font-black uppercase tracking-widest text-slate-900">
                No Matches Found
              </h3>
              <p className="text-slate-500 font-bold mt-2">
                Start a Quick Match to populate your match registry.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
