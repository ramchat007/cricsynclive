"use client";
import { useEffect, useState, use } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import {
  Trash2,
  Edit3,
  CalendarClock,
  PlayCircle,
  CheckCircle2,
} from "lucide-react";

export default function MatchesPage({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const { tournamentId } = use(params);

  const [matches, setMatches] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showMatchForm, setShowMatchForm] = useState(false);
  const [isSubmittingMatch, setIsSubmittingMatch] = useState(false);

  // New UI State for Sub-Tabs
  const [matchView, setMatchView] = useState("scheduled"); // 'scheduled', 'live', 'completed'

  // Upgraded Match State
  const [newMatch, setNewMatch] = useState({
    team1_id: "",
    team2_id: "",
    match_date: "",
    match_time: "",
    overs_count: 20,
    stage: "league",
  });

  useEffect(() => {
    checkAdminAndFetch();
  }, [tournamentId]);

  const checkAdminAndFetch = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session) {
      const { data: tData } = await supabase
        .from("tournaments")
        .select("owner_id")
        .eq("id", tournamentId)
        .single();
      const { data: pData } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single();
      if (tData?.owner_id === session.user.id || pData?.role === "super_admin")
        setIsAdmin(true);
    }

    const { data: tData } = await supabase
      .from("teams")
      .select("*")
      .eq("tournament_id", tournamentId);
    if (tData) setTeams(tData);

    const { data: mData } = await supabase
      .from("matches")
      .select("*, team1:team1_id(*), team2:team2_id(*)")
      .eq("tournament_id", tournamentId)
      .order("match_date", { ascending: true })
      .order("match_time", { ascending: true });
    if (mData) setMatches(mData);
  };

  const createMatch = async () => {
    if (
      !newMatch.team1_id ||
      !newMatch.team2_id ||
      !newMatch.match_date ||
      !newMatch.match_time
    )
      return alert("Fill all details.");
    if (newMatch.team1_id === newMatch.team2_id)
      return alert("Cannot play against itself.");

    setIsSubmittingMatch(true);
    const { error } = await supabase
      .from("matches")
      .insert({ tournament_id: tournamentId, ...newMatch });
    setIsSubmittingMatch(false);

    if (!error) {
      setShowMatchForm(false);
      // Reset form
      setNewMatch({
        team1_id: "",
        team2_id: "",
        match_date: "",
        match_time: "",
        overs_count: 20,
        stage: "league",
      });
      checkAdminAndFetch();
    }
  };

  const deleteMatch = async (matchId: string) => {
    if (!confirm("Are you sure you want to delete this match?")) return;
    const { error } = await supabase.from("matches").delete().eq("id", matchId);
    if (!error) checkAdminAndFetch();
  };

  // Filter matches based on the active sub-tab
  const filteredMatches = matches.filter((m) => m.status === matchView);

  return (
    <div className="animate-in fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 mb-6 gap-4">
        <h2 className="text-2xl font-black uppercase text-slate-900 dark:text-white">
          Match Schedule
        </h2>

        {/* SUB-TABS (Upcoming, Live, Completed) */}
        <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
          <button
            onClick={() => setMatchView("scheduled")}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-all ${matchView === "scheduled" ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
            <CalendarClock size={14} /> Upcoming
          </button>
          <button
            onClick={() => setMatchView("live")}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-all ${matchView === "live" ? "bg-red-500 text-white shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
            <PlayCircle size={14} /> Live
          </button>
          <button
            onClick={() => setMatchView("completed")}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-all ${matchView === "completed" ? "bg-teal-500 text-white shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
            <CheckCircle2 size={14} /> Completed
          </button>
        </div>

        {isAdmin && (
          <button
            onClick={() => setShowMatchForm(!showMatchForm)}
            className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-bold px-4 py-2 rounded-lg">
            {showMatchForm ? "Cancel" : "+ Schedule Match"}
          </button>
        )}
      </div>

      {/* CREATE MATCH FORM */}
      {showMatchForm && isAdmin && (
        <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 mb-1 block">
                Team 1
              </label>
              <select
                value={newMatch.team1_id}
                onChange={(e) =>
                  setNewMatch({ ...newMatch, team1_id: e.target.value })
                }
                className="w-full bg-white dark:bg-black border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm font-bold outline-none">
                <option value="">Select Team</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="hidden md:flex items-center justify-center pt-6">
              <span className="text-xs font-black text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
                VS
              </span>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 mb-1 block">
                Team 2
              </label>
              <select
                value={newMatch.team2_id}
                onChange={(e) =>
                  setNewMatch({ ...newMatch, team2_id: e.target.value })
                }
                className="w-full bg-white dark:bg-black border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm font-bold outline-none">
                <option value="">Select Team</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 mb-1 block">
                Overs & Stage
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={newMatch.overs_count}
                  onChange={(e) =>
                    setNewMatch({
                      ...newMatch,
                      overs_count: parseInt(e.target.value),
                    })
                  }
                  className="w-20 bg-white dark:bg-black border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm font-bold outline-none text-center"
                />
                <select
                  value={newMatch.stage}
                  onChange={(e) =>
                    setNewMatch({ ...newMatch, stage: e.target.value })
                  }
                  className="w-full bg-white dark:bg-black border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm font-bold outline-none capitalize">
                  <option value="league">League</option>
                  <option value="quarter-final">Quarter Final</option>
                  <option value="semi-final">Semi Final</option>
                  <option value="final">Final</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 mb-1 block">
                Date & Time
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={newMatch.match_date}
                  onChange={(e) =>
                    setNewMatch({ ...newMatch, match_date: e.target.value })
                  }
                  className="w-full bg-white dark:bg-black border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm font-bold outline-none"
                />
                <input
                  type="time"
                  value={newMatch.match_time}
                  onChange={(e) =>
                    setNewMatch({ ...newMatch, match_time: e.target.value })
                  }
                  className="w-full bg-white dark:bg-black border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm font-bold outline-none"
                />
              </div>
            </div>
            <button
              onClick={createMatch}
              disabled={isSubmittingMatch}
              className="bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-bold px-8 py-3 rounded-xl transition-all h-[46px] w-full md:w-auto shrink-0">
              {isSubmittingMatch ? "Saving..." : "Save Match"}
            </button>
          </div>
        </div>
      )}

      {/* MATCH LIST (Filtered by View) */}
      <div className="space-y-4">
        {filteredMatches.length === 0 ? (
          <div className="text-center py-20 text-slate-500 font-bold border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
            No {matchView} matches found.
          </div>
        ) : (
          filteredMatches.map((match) => (
            <div
              key={match.id}
              className="bg-white dark:bg-black rounded-2xl p-1 flex flex-col md:flex-row items-center border border-slate-200 dark:border-slate-800 relative group transition-all hover:border-teal-500/50">
              {/* Admin Quick Actions (Hidden until hover) */}
              {isAdmin && (
                <div className="absolute -top-3 -right-3 hidden group-hover:flex gap-1 z-20">
                  <button
                    onClick={() => deleteMatch(match.id)}
                    className="bg-red-100 text-red-600 p-2 rounded-full shadow-lg hover:bg-red-500 hover:text-white transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              )}

              <div className="px-6 py-4 text-center md:border-r border-slate-100 dark:border-slate-800 w-full md:w-32 shrink-0">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  {new Date(match.match_date).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                  })}
                </p>
                <p className="text-xl font-black mt-1 text-slate-900 dark:text-white">
                  {match.match_time.substring(0, 5)}
                </p>
                <div className="mt-2 flex items-center justify-center gap-1">
                  <span className="text-[9px] font-black uppercase tracking-widest bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded text-slate-500">
                    {match.overs_count} OV
                  </span>
                </div>
              </div>

              <div className="flex-1 flex flex-col justify-center px-4 md:px-8 py-4 w-full relative">
                <div className="absolute top-2 left-1/2 -translate-x-1/2">
                  <span className="text-[9px] font-black uppercase tracking-widest text-teal-500 bg-teal-500/10 px-3 py-1 rounded-full">
                    {match.stage}
                  </span>
                </div>

                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center gap-3 w-[40%]">
                    <div
                      className="w-10 h-10 md:w-14 md:h-14 rounded-2xl bg-slate-100 dark:bg-slate-900 bg-contain bg-center border border-slate-200 dark:border-slate-800"
                      style={{
                        backgroundImage: `url(${match.team1?.logo_url})`,
                      }}
                    />
                    <span className="font-black text-sm md:text-xl text-slate-900 dark:text-white">
                      {match.team1?.short_name || "TBD"}
                    </span>
                  </div>
                  <div className="px-3 py-1 bg-slate-100 dark:bg-slate-900 rounded-full text-[10px] font-black text-slate-400">
                    VS
                  </div>
                  <div className="flex items-center justify-end gap-3 w-[40%]">
                    <span className="font-black text-sm md:text-xl text-slate-900 dark:text-white">
                      {match.team2?.short_name || "TBD"}
                    </span>
                    <div
                      className="w-10 h-10 md:w-14 md:h-14 rounded-2xl bg-slate-100 dark:bg-slate-900 bg-contain bg-center border border-slate-200 dark:border-slate-800"
                      style={{
                        backgroundImage: `url(${match.team2?.logo_url})`,
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 w-full md:w-48 text-center md:border-l border-slate-100 dark:border-slate-800 shrink-0">
                {isAdmin ? (
                  <Link
                    href={`/t/${tournamentId}/m/${match.id}`}
                    className="w-full block bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400 font-bold py-3 rounded-xl text-xs uppercase tracking-widest text-center hover:bg-teal-500 hover:text-white transition-colors shadow-sm">
                    {match.status === "scheduled"
                      ? "Start Match"
                      : match.status === "live"
                        ? "Resume Scoring"
                        : "View Scorecard"}
                  </Link>
                ) : (
                  <span className="w-full block bg-slate-100 dark:bg-slate-900 text-slate-500 font-bold py-3 rounded-xl text-xs uppercase tracking-widest text-center">
                    {match.status}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
