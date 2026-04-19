"use client";
import { useEffect, useState, use } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import {
  Trash2,
  CalendarClock,
  PlayCircle,
  CheckCircle2,
  Wand2,
  CalendarRange,
  X,
  Trophy,
} from "lucide-react";

const getCurrentTime = () => {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
};

export default function MatchesPage({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const { tournamentId } = use(params);

  // Core State
  const [matches, setMatches] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // UI State
  const [matchView, setMatchView] = useState("scheduled");
  const [showScheduler, setShowScheduler] = useState(false);
  const [scheduleMode, setScheduleMode] = useState("single"); // 'single' or 'auto'

  // Single Match State
  const [teamAId, setTeamAId] = useState("");
  const [teamBId, setTeamBId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState(getCurrentTime());
  const [venue, setVenue] = useState("");
  const [overs, setOvers] = useState(20);
  const [stage, setStage] = useState("league");

  // Auto Schedule State
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [startDate, setStartDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [startTime, setStartTime] = useState(getCurrentTime());
  const [defaultVenue, setDefaultVenue] = useState("");
  const [matchDuration, setMatchDuration] = useState(180); // 3 hours for T20
  const [matchGap, setMatchGap] = useState(30);
  const [matchesPerDay, setMatchesPerDay] = useState(2);
  const [autoOvers, setAutoOvers] = useState(20);
  const [leagueStageName, setLeagueStageName] = useState("League");

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
        .select("owner_id, format")
        .eq("id", tournamentId)
        .single();
      const { data: pData } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single();

      if (
        tData?.owner_id === session.user.id ||
        pData?.role === "super_admin"
      ) {
        setIsAdmin(true);
      }

      // Smart Defaults based on format
      if (
        tData?.format === "T10" ||
        tData?.format?.toLowerCase().includes("box")
      ) {
        setOvers(10);
        setAutoOvers(10);
        setMatchDuration(90);
      }
    }

    const { data: teamData } = await supabase
      .from("teams")
      .select("*")
      .eq("tournament_id", tournamentId);
    if (teamData) {
      setTeams(teamData);
      setSelectedTeamIds(teamData.map((t) => t.id)); // Auto-select all by default
    }

    const { data: matchData } = await supabase
      .from("matches")
      .select("*, team1:team1_id(*), team2:team2_id(*)")
      .eq("tournament_id", tournamentId)
      .order("match_date", { ascending: true })
      .order("match_time", { ascending: true });
    if (matchData) setMatches(matchData);
  };

  // --- 1. CREATE SINGLE MATCH ---
  const handleCreateSingleMatch = async () => {
    if (!teamAId || !teamBId || !date || !time)
      return alert("Fill all details.");
    if (teamAId === teamBId) return alert("Cannot play against itself.");

    setIsSubmitting(true);
    const { error } = await supabase.from("matches").insert({
      tournament_id: tournamentId,
      team1_id: teamAId,
      team2_id: teamBId,
      match_date: date,
      match_time: time,
      overs_count: overs,
      venue: venue || "TBA",
      stage: stage,
      status: "scheduled",
    });

    setIsSubmitting(false);
    if (!error) {
      setTeamAId("");
      setTeamBId("");
      checkAdminAndFetch();
      alert("Match Scheduled!");
    } else alert("Error: " + error.message);
  };

  // --- 2. TIME CALCULATION ENGINE ---
  const generateTimeSlots = (matchCount: number, generatedMatches: any[]) => {
    let currentDateTime = new Date(`${startDate}T${startTime}`);
    let matchesToday = 0;
    const finalizedMatches = [];

    for (let i = 0; i < generatedMatches.length; i++) {
      if (matchesToday >= matchesPerDay) {
        currentDateTime.setDate(currentDateTime.getDate() + 1);
        const [h, m] = startTime.split(":");
        currentDateTime.setHours(parseInt(h), parseInt(m), 0, 0);
        matchesToday = 0;
      }

      finalizedMatches.push({
        ...generatedMatches[i],
        match_date: currentDateTime.toISOString().slice(0, 10),
        match_time: currentDateTime.toTimeString().slice(0, 5),
        overs_count: autoOvers,
        venue: defaultVenue || "TBA",
        status: "scheduled",
        tournament_id: tournamentId,
      });

      matchesToday++;
      currentDateTime.setMinutes(
        currentDateTime.getMinutes() + Number(matchDuration) + Number(matchGap),
      );
    }
    return finalizedMatches;
  };

  // --- 3. AUTO SCHEDULE (Unified Pool) ---
  const handleAutoSchedule = async () => {
    const teamsToSchedule = teams.filter((t) => selectedTeamIds.includes(t.id));
    if (teamsToSchedule.length < 2)
      return alert("Need at least 2 teams selected.");
    if (
      !window.confirm(
        `Generate Round-Robin schedule for ${teamsToSchedule.length} teams?`,
      )
    )
      return;

    setIsSubmitting(true);
    let pool = [...teamsToSchedule];
    if (pool.length % 2 !== 0) pool.push({ id: "BYE", name: "BYE" }); // Unified logic prevents 3-team bug

    const numTeams = pool.length;
    const matchesPerRound = numTeams / 2;
    const generatedMatches = [];

    for (let round = 0; round < numTeams - 1; round++) {
      for (let match = 0; match < matchesPerRound; match++) {
        const t1 = pool[match];
        const t2 = pool[numTeams - 1 - match];

        // Skip matches involving the BYE placeholder and avoid duplicates
        if (t1.id !== "BYE" && t2.id !== "BYE") {
          const matchExists = matches.some(
            (m) =>
              (m.team1_id === t1.id && m.team2_id === t2.id) ||
              (m.team1_id === t2.id && m.team2_id === t1.id),
          );
          if (!matchExists) {
            generatedMatches.push({
              team1_id: t1.id,
              team2_id: t2.id,
              stage: leagueStageName,
            });
          }
        }
      }
      pool.splice(1, 0, pool.pop()); // Rotate array
    }

    if (generatedMatches.length === 0) {
      setIsSubmitting(false);
      return alert("All matches for these teams are already scheduled!");
    }

    const finalBatch = generateTimeSlots(
      generatedMatches.length,
      generatedMatches,
    );
    const { error } = await supabase.from("matches").insert(finalBatch);
    setIsSubmitting(false);

    if (!error) {
      checkAdminAndFetch();
      alert(`Successfully generated ${finalBatch.length} matches!`);
    } else alert("Error generating matches.");
  };

  // --- 4. AUTO SCHEDULE GROUPS (Respects DB Groups) ---
  const handleAutoScheduleGroups = async () => {
    if (teams.length < 2) return alert("Not enough teams.");
    if (
      !window.confirm(
        "Auto-generate Group Stage matches strictly within assigned groups?",
      )
    )
      return;

    setIsSubmitting(true);
    const groupedTeams: any = {};
    let hasGroups = false;

    teams.forEach((team) => {
      const groupName = team.group_name || "Unassigned";
      if (team.group_name) hasGroups = true;
      if (!groupedTeams[groupName]) groupedTeams[groupName] = [];
      groupedTeams[groupName].push(team);
    });

    if (!hasGroups) {
      setIsSubmitting(false);
      return alert(
        "No groups found! Please assign groups to your teams in the Team Manager first.",
      );
    }

    let generatedMatches: any[] = [];

    Object.entries(groupedTeams).forEach(([groupName, groupRoster]: any) => {
      let pool = [...groupRoster];
      if (pool.length < 2) return;
      if (pool.length % 2 !== 0) pool.push({ id: "BYE", name: "BYE" });

      const numTeams = pool.length;
      const matchesPerRound = numTeams / 2;

      for (let round = 0; round < numTeams - 1; round++) {
        for (let match = 0; match < matchesPerRound; match++) {
          const t1 = pool[match];
          const t2 = pool[numTeams - 1 - match];
          if (t1.id !== "BYE" && t2.id !== "BYE") {
            const matchExists = matches.some(
              (m) =>
                (m.team1_id === t1.id && m.team2_id === t2.id) ||
                (m.team1_id === t2.id && m.team2_id === t1.id),
            );
            if (!matchExists) {
              generatedMatches.push({
                team1_id: t1.id,
                team2_id: t2.id,
                stage: groupName,
                roundIndex: round,
              });
            }
          }
        }
        pool.splice(1, 0, pool.pop());
      }
    });

    // Interleave group matches (Match 1 Grp A, Match 1 Grp B, etc.)
    generatedMatches.sort((a, b) => a.roundIndex - b.roundIndex);

    if (generatedMatches.length === 0) {
      setIsSubmitting(false);
      return alert("All group matches are already scheduled!");
    }

    const finalBatch = generateTimeSlots(
      generatedMatches.length,
      generatedMatches,
    ).map((m) => {
      delete m.roundIndex; // Clean up before insert
      return m;
    });

    const { error } = await supabase.from("matches").insert(finalBatch);
    setIsSubmitting(false);
    if (!error) checkAdminAndFetch();
  };

  // --- 5. GENERATE KNOCKOUT PLACEHOLDERS ---
  const handleGenerateKnockouts = async () => {
    if (
      !window.confirm("Generate Knockout placeholders (Semi-Finals & Final)?")
    )
      return;
    setIsSubmitting(true);

    const knockoutMatches = [
      {
        tournament_id: tournamentId,
        stage: "Semi-Final 1",
        status: "scheduled",
        overs_count: autoOvers,
        venue: defaultVenue || "TBA",
      },
      {
        tournament_id: tournamentId,
        stage: "Semi-Final 2",
        status: "scheduled",
        overs_count: autoOvers,
        venue: defaultVenue || "TBA",
      },
      {
        tournament_id: tournamentId,
        stage: "Final",
        status: "scheduled",
        overs_count: autoOvers,
        venue: defaultVenue || "TBA",
      },
    ];

    // Note: team1_id and team2_id are left null/empty. The schema must allow nullable team IDs for TBD matches.
    const { error } = await supabase.from("matches").insert(knockoutMatches);
    setIsSubmitting(false);
    if (!error) checkAdminAndFetch();
  };

  // --- 6. RESET SCHEDULE ---
  const handleResetSchedule = async () => {
    if (
      !window.confirm(
        "⚠️ Are you sure? This will delete ALL upcoming/scheduled matches.",
      )
    )
      return;
    setIsSubmitting(true);
    const { error } = await supabase
      .from("matches")
      .delete()
      .eq("tournament_id", tournamentId)
      .eq("status", "scheduled");
    setIsSubmitting(false);
    if (!error) checkAdminAndFetch();
  };

  const deleteMatch = async (matchId: string) => {
    if (!confirm("Are you sure you want to delete this match?")) return;
    const { error } = await supabase.from("matches").delete().eq("id", matchId);
    if (!error) checkAdminAndFetch();
  };

  const filteredMatches = matches.filter((m) => m.status === matchView);

  const labelClass =
    "block text-[10px] font-black uppercase tracking-widest mb-2 text-slate-500";
  const inputClass =
    "w-full rounded-xl px-4 py-3 border border-slate-200 bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none text-sm font-bold transition-all";

  return (
    <div className="animate-in fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 pb-4 mb-6 gap-4">
        <h2 className="text-2xl font-black uppercase text-slate-900">
          Match Schedule
        </h2>

        {/* SUB-TABS */}
        <div className="flex bg-slate-100 p-1 rounded-xl overflow-x-auto custom-scrollbar">
          <button
            onClick={() => setMatchView("scheduled")}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-all whitespace-nowrap ${matchView === "scheduled" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
            <CalendarClock size={14} /> Upcoming
          </button>
          <button
            onClick={() => setMatchView("live")}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-all whitespace-nowrap ${matchView === "live" ? "bg-red-500 text-white shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
            <PlayCircle size={14} /> Live
          </button>
          <button
            onClick={() => setMatchView("completed")}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-all whitespace-nowrap ${matchView === "completed" ? "bg-teal-500 text-white shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
            <CheckCircle2 size={14} /> Completed
          </button>
        </div>

        {isAdmin && (
          <button
            onClick={() => setShowScheduler(!showScheduler)}
            className="flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-5 py-3 rounded-xl transition-all shadow-md shrink-0">
            {showScheduler ? (
              <>
                <X size={16} /> Close Configurator
              </>
            ) : (
              <>
                <CalendarRange size={16} /> Scheduler Config
              </>
            )}
          </button>
        )}
      </div>

      {/* --- MASTER SCHEDULER CONFIGURATOR --- */}
      {showScheduler && isAdmin && (
        <div className="bg-slate-50 border border-slate-200 p-6 rounded-[2rem] mb-8 shadow-inner animate-in slide-in-from-top-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
              <button
                onClick={() => setScheduleMode("single")}
                className={`px-6 py-2.5 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${scheduleMode === "single" ? "bg-slate-100 text-teal-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                Single Match
              </button>
              <button
                onClick={() => setScheduleMode("auto")}
                className={`px-6 py-2.5 text-xs font-black uppercase tracking-widest rounded-lg transition-all flex items-center gap-2 ${scheduleMode === "auto" ? "bg-slate-900 text-white shadow-md" : "text-slate-500 hover:text-slate-700"}`}>
                <Wand2 size={14} /> Auto Engine
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleResetSchedule}
                disabled={isSubmitting}
                className="text-[10px] font-black uppercase tracking-widest px-4 py-2.5 rounded-xl text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 transition-colors">
                🗑 Reset Upcoming
              </button>
            </div>
          </div>

          {scheduleMode === "single" ? (
            /* --- SINGLE MATCH FORM --- */
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div>
                <label className={labelClass}>Team 1</label>
                <select
                  value={teamAId}
                  onChange={(e) => setTeamAId(e.target.value)}
                  className={inputClass}>
                  <option value="">Select Team</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Team 2</label>
                <select
                  value={teamBId}
                  onChange={(e) => setTeamBId(e.target.value)}
                  className={inputClass}>
                  <option value="">Select Team</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Time</label>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Overs</label>
                  <input
                    type="number"
                    value={overs}
                    onChange={(e) => setOvers(parseInt(e.target.value))}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Stage</label>
                  <input
                    type="text"
                    value={stage}
                    onChange={(e) => setStage(e.target.value)}
                    placeholder="e.g. League"
                    className={inputClass}
                  />
                </div>
              </div>
              <div className="md:col-span-3">
                <label className={labelClass}>Venue</label>
                <input
                  type="text"
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  placeholder="Stadium Name"
                  className={inputClass}
                />
              </div>
              <button
                onClick={handleCreateSingleMatch}
                disabled={isSubmitting}
                className="w-full bg-teal-600 hover:bg-teal-500 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg mt-5 md:mt-0">
                Save Match
              </button>
            </div>
          ) : (
            /* --- AUTO SCHEDULE ENGINE --- */
            <div className="space-y-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between border-b border-slate-100 pb-6">
                <div>
                  <h3 className="font-black uppercase tracking-widest text-slate-900">
                    Algorithm Settings
                  </h3>
                  <p className="text-xs font-bold text-slate-500 mt-1">
                    Configure time slots and generation rules.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleAutoScheduleGroups}
                    className="px-4 py-2 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-colors">
                    Schedule By Groups
                  </button>
                  <button
                    onClick={handleGenerateKnockouts}
                    className="px-4 py-2 bg-amber-50 text-amber-600 border border-amber-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-100 transition-colors flex items-center gap-1">
                    <Trophy size={12} /> Add Knockouts
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                <div>
                  <label className={labelClass}>Start Date</label>
                  <input
                    type="date"
                    className={inputClass}
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelClass}>First Match</label>
                  <input
                    type="time"
                    className={inputClass}
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelClass}>Matches / Day</label>
                  <input
                    type="number"
                    className={inputClass}
                    value={matchesPerDay}
                    onChange={(e) => setMatchesPerDay(parseInt(e.target.value))}
                  />
                </div>
                <div>
                  <label className={labelClass}>Duration (Mins)</label>
                  <input
                    type="number"
                    className={inputClass}
                    value={matchDuration}
                    onChange={(e) => setMatchDuration(parseInt(e.target.value))}
                  />
                </div>
                <div>
                  <label className={labelClass}>Gap (Mins)</label>
                  <input
                    type="number"
                    className={inputClass}
                    value={matchGap}
                    onChange={(e) => setMatchGap(parseInt(e.target.value))}
                  />
                </div>
                <div>
                  <label className={labelClass}>Match Overs</label>
                  <input
                    type="number"
                    className={inputClass}
                    value={autoOvers}
                    onChange={(e) => setAutoOvers(parseInt(e.target.value))}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className={labelClass}>Default Venue</label>
                  <input
                    type="text"
                    className={inputClass}
                    value={defaultVenue}
                    onChange={(e) => setDefaultVenue(e.target.value)}
                    placeholder="TBA"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <div className="flex justify-between items-center mb-3">
                  <label className={labelClass}>
                    Pool Selection ({selectedTeamIds.length} Teams)
                  </label>
                  <button
                    onClick={() =>
                      setSelectedTeamIds(
                        selectedTeamIds.length === teams.length
                          ? []
                          : teams.map((t) => t.id),
                      )
                    }
                    className="text-[10px] font-bold text-teal-600 uppercase hover:underline">
                    {selectedTeamIds.length === teams.length
                      ? "Deselect All"
                      : "Select All"}
                  </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-h-40 overflow-y-auto custom-scrollbar">
                  {teams.map((team) => {
                    const isSelected = selectedTeamIds.includes(team.id);
                    return (
                      <button
                        key={team.id}
                        onClick={() =>
                          setSelectedTeamIds((prev) =>
                            isSelected
                              ? prev.filter((id) => id !== team.id)
                              : [...prev, team.id],
                          )
                        }
                        className={`p-3 rounded-xl border text-xs font-bold text-left flex items-center gap-3 transition-all ${isSelected ? "bg-teal-50 border-teal-500 text-teal-700" : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"}`}>
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${isSelected ? "bg-teal-500 border-teal-500" : "border-slate-300"}`}>
                          {isSelected && (
                            <span className="text-white text-[10px]">✓</span>
                          )}
                        </div>
                        <span className="truncate">{team.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={handleAutoSchedule}
                disabled={isSubmitting || selectedTeamIds.length < 2}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black text-sm uppercase tracking-widest py-4 rounded-xl transition-all shadow-lg disabled:opacity-50">
                {isSubmitting
                  ? "Generating Engine..."
                  : `Generate Unified Pool (${selectedTeamIds.length} Teams)`}
              </button>
            </div>
          )}
        </div>
      )}

      {/* --- MATCH LIST RENDERING --- */}
      <div className="space-y-4">
        {filteredMatches.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-[2rem] bg-white">
            <CalendarClock size={32} className="mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-widest mb-1">
              No {matchView} matches
            </h3>
            <p className="text-sm font-bold text-slate-500">
              {isAdmin && matchView === "scheduled"
                ? "Open the Configurator to auto-generate schedules."
                : "Check back later."}
            </p>
          </div>
        ) : (
          filteredMatches.map((match) => (
            <div
              key={match.id}
              className="bg-white rounded-[2rem] p-1 flex flex-col md:flex-row items-center border border-slate-200 relative group transition-all hover:border-teal-500/50 hover:shadow-lg">
              {isAdmin && (
                <div className="absolute -top-3 -right-3 hidden group-hover:flex gap-1 z-20">
                  <button
                    onClick={() => deleteMatch(match.id)}
                    className="bg-red-50 text-red-600 p-2.5 rounded-xl shadow-sm border border-red-100 hover:bg-red-500 hover:text-white transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              )}

              {/* DATE / TIME */}
              <div className="px-6 py-4 text-center md:border-r border-slate-100 w-full md:w-36 shrink-0">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  {match.match_date
                    ? new Date(match.match_date).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                      })
                    : "Date TBD"}
                </p>
                <p className="text-xl font-black mt-1 text-slate-900">
                  {match.match_time
                    ? match.match_time.substring(0, 5)
                    : "--:--"}
                </p>
                <div className="mt-2 flex items-center justify-center gap-1">
                  <span className="text-[9px] font-black uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded text-slate-500">
                    {match.overs_count} OV
                  </span>
                </div>
              </div>

              {/* TEAMS */}
              <div className="flex-1 flex flex-col justify-center px-4 md:px-8 py-6 w-full relative">
                <div className="absolute top-3 left-1/2 -translate-x-1/2">
                  <span className="text-[9px] font-black uppercase tracking-widest text-teal-600 bg-teal-50 border border-teal-100 px-3 py-1 rounded-full">
                    {match.stage}
                  </span>
                </div>

                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center gap-3 w-[40%]">
                    <div
                      className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-slate-50 bg-contain bg-center bg-no-repeat border border-slate-100 shadow-inner p-2 flex items-center justify-center text-slate-300 font-bold text-xs"
                      style={{
                        backgroundImage: match.team1?.logo_url
                          ? `url(${match.team1?.logo_url})`
                          : "none",
                      }}>
                      {!match.team1?.logo_url && "TBD"}
                    </div>
                    <span className="font-black text-sm md:text-xl text-slate-900 truncate">
                      {match.team1?.short_name || "TBD"}
                    </span>
                  </div>
                  <div className="px-3 py-1 bg-slate-100 rounded-full text-[10px] font-black text-slate-400">
                    VS
                  </div>
                  <div className="flex items-center justify-end gap-3 w-[40%]">
                    <span className="font-black text-sm md:text-xl text-slate-900 text-right truncate">
                      {match.team2?.short_name || "TBD"}
                    </span>
                    <div
                      className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-slate-50 bg-contain bg-center bg-no-repeat border border-slate-100 shadow-inner p-2 flex items-center justify-center text-slate-300 font-bold text-xs"
                      style={{
                        backgroundImage: match.team2?.logo_url
                          ? `url(${match.team2?.logo_url})`
                          : "none",
                      }}>
                      {!match.team2?.logo_url && "TBD"}
                    </div>
                  </div>
                </div>
              </div>

              {/* ACTIONS */}
              <div className="px-4 py-4 w-full md:w-48 text-center md:border-l border-slate-100 shrink-0">
                {isAdmin ? (
                  <Link
                    href={`/t/${tournamentId}/m/${match.id}`}
                    className="w-full block bg-teal-50 text-teal-600 font-black py-4 rounded-xl text-[10px] uppercase tracking-widest text-center hover:bg-teal-500 hover:text-white transition-all shadow-sm">
                    {match.status === "scheduled"
                      ? "Start Match"
                      : match.status === "live"
                        ? "Resume Scoring"
                        : "Edit Scorecard"}
                  </Link>
                ) : (
                  <Link
                    href={`/match/${match.id}`}
                    className="w-full block bg-teal-50 text-teal-600 font-black py-4 rounded-xl text-[10px] uppercase tracking-widest text-center hover:bg-teal-500 hover:text-white transition-all shadow-sm">
                    View Scorecard
                  </Link>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
