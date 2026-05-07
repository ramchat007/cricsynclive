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
  const [stage, setStage] = useState("League");

  // Auto Schedule State (Chronological Rules)
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [startDate, setStartDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [startTime, setStartTime] = useState(getCurrentTime());
  const [defaultVenue, setDefaultVenue] = useState("");
  const [matchDuration, setMatchDuration] = useState(180);
  const [matchGap, setMatchGap] = useState(30);
  const [matchesPerDay, setMatchesPerDay] = useState(2);
  const [autoOvers, setAutoOvers] = useState(20);

  // --- WIZARD ENGINE STATES ---
  const [wizardMode, setWizardMode] = useState("round_robin");
  const [wizardRoundRobinAdvancing, setWizardRoundRobinAdvancing] = useState(4);
  const [wizardGroupCount, setWizardGroupCount] = useState(2);
  const [wizardAdvancing, setWizardAdvancing] = useState(2);
  const [wizardInterleaveGroups, setWizardInterleaveGroups] = useState(true);
  const [wizardIncludeThirdPlace, setWizardIncludeThirdPlace] = useState(false);
  const [wizardTeamsCount, setWizardTeamsCount] = useState(8);

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
        .select("owner_id, format, location")
        .eq("id", tournamentId)
        .single();
      const { data: pData } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single();

      if (
        tData?.owner_id === session.user.id ||
        pData?.role === "super_admin" ||
        pData?.role === "scorer"
      ) {
        setIsAdmin(true);
      }

      if (
        tData?.format === "T10" ||
        tData?.format?.toLowerCase().includes("box")
      ) {
        setOvers(10);
        setAutoOvers(10);
        setMatchDuration(90);
      }

      if (tData?.location) {
        setVenue(tData.location);
        setDefaultVenue(tData.location);
      }
    }

    const { data: teamData } = await supabase
      .from("teams")
      .select("*")
      .eq("tournament_id", tournamentId);
    if (teamData) {
      setTeams(teamData);
      setSelectedTeamIds(teamData.map((t) => t.id));
    }

    const { data: matchData } = await supabase
      .from("matches")
      .select("*, team1:team1_id(*), team2:team2_id(*)")
      .eq("tournament_id", tournamentId)
      .order("match_date", { ascending: true })
      .order("match_time", { ascending: true });
    if (matchData) setMatches(matchData);
  };

  const getNextMatchNo = () => {
    return matches.reduce((max, m) => Math.max(max, m.match_no || 0), 0) + 1;
  };

  // --- 1. CREATE SINGLE MATCH ---
  const handleCreateSingleMatch = async () => {
    if (!teamAId || !teamBId || !date || !time)
      return alert("Fill all details.");
    if (teamAId === teamBId) return alert("Cannot play against itself.");

    setIsSubmitting(true);
    const nextNo = getNextMatchNo();

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
      match_no: nextNo,
    });

    setIsSubmitting(false);
    if (!error) {
      setTeamAId("");
      setTeamBId("");
      checkAdminAndFetch();
      alert(`Match ${nextNo} Scheduled!`);
    } else alert("Error: " + error.message);
  };

  // --- 2. TIME CALCULATION ENGINE ---
  const generateTimeSlots = (generatedMatches: any[]) => {
    let currentDateTime = new Date(`${startDate}T${startTime}`);
    let matchesToday = 0;
    const finalizedMatches = [];
    let currentMatchNo = getNextMatchNo();

    for (let i = 0; i < generatedMatches.length; i++) {
      if (matchesToday >= matchesPerDay) {
        currentDateTime.setDate(currentDateTime.getDate() + 1);
        const [h, m] = startTime.split(":");
        currentDateTime.setHours(parseInt(h), parseInt(m), 0, 0);
        matchesToday = 0;
      }

      finalizedMatches.push({
        ...generatedMatches[i],
        match_no: currentMatchNo++,
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

  // --- 3. WIZARD ENGINE ---
  const handleGenerateWizard = async () => {
    const teamsToSchedule = teams.filter((t) => selectedTeamIds.includes(t.id));
    if (wizardMode !== "pure_knockout" && teamsToSchedule.length < 2) {
      return alert("Need at least 2 teams selected for Round Robin / Groups.");
    }

    if (!window.confirm("Generate schedule based on these settings?")) return;

    setIsSubmitting(true);
    let generatedMatches: any[] = [];

    // A. ROUND ROBIN LEAGUE + KNOCKOUTS
    if (wizardMode === "round_robin") {
      let pool = [...teamsToSchedule];
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
                stage: "League",
              });
            }
          }
        }
        pool.splice(1, 0, pool.pop());
      }

      const advancing = parseInt(wizardRoundRobinAdvancing as any);
      if (advancing === 4) {
        generatedMatches.push({
          team1_id: null,
          team2_id: null,
          stage: "Semi-Final 1",
        });
        generatedMatches.push({
          team1_id: null,
          team2_id: null,
          stage: "Semi-Final 2",
        });
      } else if (advancing === 8) {
        for (let i = 1; i <= 4; i++)
          generatedMatches.push({
            team1_id: null,
            team2_id: null,
            stage: `Quarter-Final ${i}`,
          });
        generatedMatches.push({
          team1_id: null,
          team2_id: null,
          stage: "Semi-Final 1",
        });
        generatedMatches.push({
          team1_id: null,
          team2_id: null,
          stage: "Semi-Final 2",
        });
      }
      if (advancing >= 4 && wizardIncludeThirdPlace) {
        generatedMatches.push({
          team1_id: null,
          team2_id: null,
          stage: "3rd Place Playoff",
        });
      }
      if (advancing >= 2) {
        generatedMatches.push({
          team1_id: null,
          team2_id: null,
          stage: "Final",
        });
      }
    }

    // B. GROUPS + KNOCKOUTS
    else if (wizardMode === "groups_knockout") {
      const groupedTeams: any = {};
      teamsToSchedule.forEach((team) => {
        const groupName = team.group_name || "Unassigned";
        if (!groupedTeams[groupName]) groupedTeams[groupName] = [];
        groupedTeams[groupName].push(team);
      });

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
                  stage: `Group ${groupName}`,
                  roundIndex: round,
                });
              }
            }
          }
          pool.splice(1, 0, pool.pop());
        }
      });

      if (wizardInterleaveGroups) {
        generatedMatches.sort((a, b) => a.roundIndex - b.roundIndex);
      }
      generatedMatches = generatedMatches.map((m) => {
        delete m.roundIndex;
        return m;
      });

      const advancingCount =
        parseInt(wizardGroupCount as any) * parseInt(wizardAdvancing as any);
      if (advancingCount >= 2) {
        const knockoutRounds = Math.ceil(Math.log2(advancingCount));
        const bracketSize = Math.pow(2, knockoutRounds);
        for (let r = 0; r < knockoutRounds; r++) {
          const isFinal = r === knockoutRounds - 1;
          const isSemi = r === knockoutRounds - 2;
          const isQuarter = r === knockoutRounds - 3;
          const matchesInThisRound = bracketSize / Math.pow(2, r + 1);

          for (let m = 0; m < matchesInThisRound; m++) {
            const stageName = isFinal
              ? "Final"
              : isSemi
                ? `Semi-Final ${m + 1}`
                : isQuarter
                  ? `Quarter-Final ${m + 1}`
                  : `Knockout R${r + 1} M${m + 1}`;
            generatedMatches.push({
              team1_id: null,
              team2_id: null,
              stage: stageName,
            });
          }
        }
        if (wizardIncludeThirdPlace && knockoutRounds >= 2) {
          generatedMatches.splice(generatedMatches.length - 1, 0, {
            team1_id: null,
            team2_id: null,
            stage: "3rd Place Playoff",
          });
        }
      }
    }

    // C. PURE KNOCKOUT
    else if (wizardMode === "pure_knockout") {
      const count = parseInt(wizardTeamsCount as any);
      const totalRounds = Math.ceil(Math.log2(count));
      const bracketSize = Math.pow(2, totalRounds);

      for (let r = 0; r < totalRounds; r++) {
        const isFinal = r === totalRounds - 1;
        const isSemi = r === totalRounds - 2;
        const isQuarter = r === totalRounds - 3;
        const matchesInThisRound = bracketSize / Math.pow(2, r + 1);

        for (let m = 0; m < matchesInThisRound; m++) {
          const stageName = isFinal
            ? "Final"
            : isSemi
              ? `Semi-Final ${m + 1}`
              : isQuarter
                ? `Quarter-Final ${m + 1}`
                : `Round ${r + 1} M${m + 1}`;
          generatedMatches.push({
            team1_id: null,
            team2_id: null,
            stage: stageName,
          });
        }
      }
      if (wizardIncludeThirdPlace && totalRounds >= 2) {
        generatedMatches.splice(generatedMatches.length - 1, 0, {
          team1_id: null,
          team2_id: null,
          stage: "3rd Place Playoff",
        });
      }
    }

    if (generatedMatches.length === 0) {
      setIsSubmitting(false);
      return alert("No new matches generated. Perhaps they already exist?");
    }

    const finalBatch = generateTimeSlots(generatedMatches);
    const { error } = await supabase.from("matches").insert(finalBatch);
    setIsSubmitting(false);

    if (!error) {
      checkAdminAndFetch();
      alert(`Successfully generated ${finalBatch.length} matches!`);
      setShowScheduler(false);
    } else alert("Error: " + error.message);
  };

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

  // THEME VARIABLES FOR REUSABILITY
  const labelClass =
    "block text-[10px] font-black uppercase tracking-widest mb-2 text-[var(--text-muted)]";
  const inputClass =
    "w-full rounded-xl px-4 py-3 border border-[var(--border-1)] bg-[var(--surface-1)] text-[var(--foreground)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/30 outline-none text-sm font-bold transition-all";

  return (
    <div className="animate-in fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[var(--border-1)] pb-4 mb-6 gap-4">
        <h2 className="text-2xl font-black uppercase text-[var(--foreground)]">
          Match Schedule
        </h2>

        {/* SUB-TABS */}
        <div className="flex bg-[var(--surface-2)] border border-[var(--border-1)] p-1 rounded-xl overflow-x-auto custom-scrollbar">
          <button
            onClick={() => setMatchView("scheduled")}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-all whitespace-nowrap ${matchView === "scheduled" ? "bg-[var(--surface-1)] text-[var(--foreground)] shadow-sm border border-[var(--border-1)]" : "text-[var(--text-muted)] hover:text-[var(--foreground)]"}`}
          >
            <CalendarClock size={14} /> Upcoming
          </button>
          <button
            onClick={() => setMatchView("live")}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-all whitespace-nowrap ${matchView === "live" ? "bg-red-500 text-white shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--foreground)]"}`}
          >
            <PlayCircle size={14} /> Live
          </button>
          <button
            onClick={() => setMatchView("completed")}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-all whitespace-nowrap ${matchView === "completed" ? "bg-[var(--accent)] text-[var(--background)] shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--foreground)]"}`}
          >
            <CheckCircle2 size={14} /> Completed
          </button>
        </div>

        {isAdmin && (
          <button
            onClick={() => setShowScheduler(!showScheduler)}
            className="flex items-center justify-center gap-2 bg-[var(--foreground)] text-[var(--background)] hover:opacity-90 text-xs font-bold px-5 py-3 rounded-xl transition-all shadow-md shrink-0"
          >
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
        <div className="bg-[var(--surface-2)] border border-[var(--border-1)] p-6 rounded-[2rem] mb-8 shadow-inner animate-in slide-in-from-top-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div className="flex bg-[var(--surface-1)] p-1 rounded-xl border border-[var(--border-1)] shadow-sm">
              <button
                onClick={() => setScheduleMode("single")}
                className={`px-6 py-2.5 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${scheduleMode === "single" ? "bg-[var(--accent)]/10 text-[var(--accent)] shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--foreground)]"}`}
              >
                Single Match
              </button>
              <button
                onClick={() => setScheduleMode("auto")}
                className={`px-6 py-2.5 text-xs font-black uppercase tracking-widest rounded-lg transition-all flex items-center gap-2 ${scheduleMode === "auto" ? "bg-[var(--foreground)] text-[var(--background)] shadow-md" : "text-[var(--text-muted)] hover:text-[var(--foreground)]"}`}
              >
                <Wand2 size={14} /> Auto Engine
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleResetSchedule}
                disabled={isSubmitting}
                className="text-[10px] font-black uppercase tracking-widest px-4 py-2.5 rounded-xl text-red-500 bg-red-500/10 border border-red-500/20 hover:bg-red-500 hover:text-white transition-colors"
              >
                🗑 Reset Upcoming
              </button>
            </div>
          </div>

          {scheduleMode === "single" ? (
            /* --- SINGLE MATCH FORM --- */
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5 bg-[var(--surface-1)] p-6 rounded-2xl border border-[var(--border-1)] shadow-sm">
              <div>
                <label className={labelClass}>Team 1</label>
                <select
                  value={teamAId}
                  onChange={(e) => setTeamAId(e.target.value)}
                  className={inputClass}
                >
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
                  className={inputClass}
                >
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
                className="w-full bg-[var(--accent)] hover:opacity-90 text-[var(--background)] font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg mt-5 md:mt-0"
              >
                Save Match
              </button>
            </div>
          ) : (
            /* --- WIZARD AUTO ENGINE --- */
            <div className="space-y-6 bg-[var(--surface-1)] p-6 rounded-2xl border border-[var(--border-1)] shadow-sm">
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between border-b border-[var(--border-1)] pb-6">
                <div>
                  <h3 className="font-black uppercase tracking-widest text-[var(--foreground)]">
                    Chronological Rules
                  </h3>
                  <p className="text-xs font-bold text-[var(--text-muted)] mt-1">
                    How dates, times, and venues apply to generated matches.
                  </p>
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

              {/* WIZARD MODES */}
              <div className="pt-6 border-t border-[var(--border-1)]">
                <h3 className="font-black uppercase tracking-widest text-[var(--foreground)] mb-4">
                  Tournament Structure
                </h3>
                <div className="flex gap-2 mb-6 bg-[var(--surface-2)] p-1 rounded-xl border border-[var(--border-1)]">
                  <button
                    onClick={() => setWizardMode("round_robin")}
                    className={`flex-1 py-2.5 rounded-lg font-bold text-[10px] uppercase tracking-wider transition-all ${wizardMode === "round_robin" ? "bg-[var(--accent)] text-[var(--background)] shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-1)]"}`}
                  >
                    Round Robin + KO
                  </button>
                  <button
                    onClick={() => setWizardMode("groups_knockout")}
                    className={`flex-1 py-2.5 rounded-lg font-bold text-[10px] uppercase tracking-wider transition-all ${wizardMode === "groups_knockout" ? "bg-[var(--accent)] text-[var(--background)] shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-1)]"}`}
                  >
                    Groups + KO
                  </button>
                  <button
                    onClick={() => setWizardMode("pure_knockout")}
                    className={`flex-1 py-2.5 rounded-lg font-bold text-[10px] uppercase tracking-wider transition-all ${wizardMode === "pure_knockout" ? "bg-[var(--accent)] text-[var(--background)] shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-1)]"}`}
                  >
                    Pure Knockout
                  </button>
                </div>

                {wizardMode === "round_robin" && (
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                      <label className={labelClass}>Top Teams Advance</label>
                      <select
                        value={wizardRoundRobinAdvancing}
                        onChange={(e) =>
                          setWizardRoundRobinAdvancing(parseInt(e.target.value))
                        }
                        className={inputClass}
                      >
                        <option value={2}>Top 2 (Direct to Final)</option>
                        <option value={4}>Top 4 (Semi-Finals)</option>
                        <option value={8}>Top 8 (Quarter-Finals)</option>
                      </select>
                    </div>
                  </div>
                )}

                {wizardMode === "groups_knockout" && (
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div>
                      <label className={labelClass}>Total Groups</label>
                      <input
                        type="number"
                        min="2"
                        value={wizardGroupCount}
                        onChange={(e) =>
                          setWizardGroupCount(parseInt(e.target.value))
                        }
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Advancing / Group</label>
                      <select
                        value={wizardAdvancing}
                        onChange={(e) =>
                          setWizardAdvancing(parseInt(e.target.value))
                        }
                        className={inputClass}
                      >
                        <option value={1}>Top 1</option>
                        <option value={2}>Top 2</option>
                        <option value={3}>Top 3</option>
                        <option value={4}>Top 4</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="interleave"
                        checked={wizardInterleaveGroups}
                        onChange={(e) =>
                          setWizardInterleaveGroups(e.target.checked)
                        }
                        className="w-5 h-5"
                      />
                      <label
                        htmlFor="interleave"
                        className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]"
                      >
                        Interleave Matches
                      </label>
                    </div>
                  </div>
                )}

                {wizardMode === "pure_knockout" && (
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                      <label className={labelClass}>Total Bracket Teams</label>
                      <input
                        type="number"
                        min="2"
                        value={wizardTeamsCount}
                        onChange={(e) =>
                          setWizardTeamsCount(parseInt(e.target.value))
                        }
                        className={inputClass}
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3 mb-6 bg-[var(--surface-2)] p-4 rounded-xl border border-[var(--border-1)]">
                  <input
                    type="checkbox"
                    id="thirdPlace"
                    checked={wizardIncludeThirdPlace}
                    onChange={(e) =>
                      setWizardIncludeThirdPlace(e.target.checked)
                    }
                    className="w-5 h-5"
                  />
                  <label
                    htmlFor="thirdPlace"
                    className="text-[10px] font-bold uppercase tracking-widest text-[var(--foreground)]"
                  >
                    Generate 3rd Place Playoff Match
                  </label>
                </div>
              </div>

              {/* POOL SELECTION */}
              {wizardMode !== "pure_knockout" && (
                <div className="pt-4 border-t border-[var(--border-1)]">
                  <div className="flex justify-between items-center mb-3">
                    <label className={labelClass}>
                      Participating Teams ({selectedTeamIds.length})
                    </label>
                    <button
                      onClick={() =>
                        setSelectedTeamIds(
                          selectedTeamIds.length === teams.length
                            ? []
                            : teams.map((t) => t.id),
                        )
                      }
                      className="text-[10px] font-bold text-[var(--accent)] uppercase hover:underline"
                    >
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
                          className={`p-3 rounded-xl border text-xs font-bold text-left flex items-center gap-3 transition-all ${isSelected ? "bg-[var(--accent)]/10 border-[var(--accent)] text-[var(--accent)]" : "bg-[var(--surface-2)] border-[var(--border-1)] text-[var(--text-muted)] hover:bg-[var(--surface-3)]"}`}
                        >
                          <div
                            className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${isSelected ? "bg-[var(--accent)] border-[var(--accent)]" : "border-[var(--border-1)]"}`}
                          >
                            {isSelected && (
                              <span className="text-[var(--background)] text-[10px]">
                                ✓
                              </span>
                            )}
                          </div>
                          <span className="truncate">{team.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <button
                onClick={handleGenerateWizard}
                disabled={isSubmitting}
                className="w-full bg-[var(--foreground)] hover:opacity-90 text-[var(--background)] font-black text-sm uppercase tracking-widest py-4 rounded-xl transition-all shadow-lg disabled:opacity-50"
              >
                {isSubmitting
                  ? "Generating Schedule..."
                  : "Run Generator Engine"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* --- MATCH LIST RENDERING --- */}
      <div className="space-y-4">
        {filteredMatches.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-[var(--border-1)] rounded-[2rem] bg-[var(--surface-1)]">
            <CalendarClock
              size={32}
              className="mx-auto text-[var(--text-muted)] mb-4"
            />
            <h3 className="text-lg font-black text-[var(--foreground)] uppercase tracking-widest mb-1">
              No {matchView} matches
            </h3>
            <p className="text-sm font-bold text-[var(--text-muted)]">
              {isAdmin && matchView === "scheduled"
                ? "Open the Configurator to auto-generate schedules."
                : "Check back later."}
            </p>
          </div>
        ) : (
          filteredMatches.map((match) => (
            <div
              key={match.id}
              className="bg-[var(--surface-1)] rounded-[2rem] p-1 flex flex-col md:flex-row items-center border border-[var(--border-1)] relative group transition-all hover:border-[var(--accent)]/50 hover:shadow-lg"
            >
              {/* THE MOBILE-READY DELETE BUTTON FIX */}
              {isAdmin && (
                <div className="absolute top-4 right-4 md:-top-3 md:-right-3 flex md:hidden group-hover:flex gap-1 z-20">
                  <button
                    onClick={() => deleteMatch(match.id)}
                    className="bg-red-500/10 text-red-500 p-2 md:p-2.5 rounded-xl shadow-sm border border-red-500/20 hover:bg-red-500 hover:text-[var(--background)] transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}

              {/* DATE / TIME */}
              <div className="px-6 py-4 text-center md:border-r border-[var(--border-1)] w-full md:w-36 shrink-0">
                <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
                  {match.match_date
                    ? new Date(match.match_date).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                      })
                    : "Date TBD"}
                </p>
                <p className="text-xl font-black mt-1 text-[var(--foreground)]">
                  {match.match_time
                    ? match.match_time.substring(0, 5)
                    : "--:--"}
                </p>
                <div className="mt-2 flex items-center justify-center gap-1">
                  <span className="text-[9px] font-black uppercase tracking-widest bg-[var(--surface-2)] px-2 py-0.5 rounded text-[var(--text-muted)]">
                    {match.overs_count} OV
                  </span>
                </div>
              </div>

              {/* TEAMS */}
              <div className="flex-1 flex flex-col justify-center px-4 md:px-8 py-6 w-full relative mt-4 md:mt-0">
                {/* MATCH NUMBER AND STAGE CHIP */}
                <div className="absolute -top-1 md:top-3 left-1/2 -translate-x-1/2 flex items-center gap-2 whitespace-nowrap">
                  <span className="text-[9px] font-black uppercase tracking-widest text-[var(--accent)] bg-[var(--accent)]/10 border border-[var(--accent)]/20 px-3 py-1 rounded-full shadow-sm">
                    Match {match.match_no || "TBA"}
                  </span>
                  <span className="text-[9px] font-black uppercase tracking-widest text-[var(--foreground)] bg-[var(--foreground)]/5 border border-[var(--border-1)] px-3 py-1 rounded-full shadow-sm">
                    {match.stage}
                  </span>
                </div>

                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center gap-3 w-[40%]">
                    <div
                      className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-[var(--surface-2)] bg-contain bg-center bg-no-repeat border border-[var(--border-1)] shadow-inner p-2 flex items-center justify-center text-[var(--text-muted)] font-bold text-[10px] text-center"
                      style={{
                        backgroundImage: match.team1?.logo_url
                          ? `url(${match.team1?.logo_url})`
                          : "none",
                      }}
                    >
                      {!match.team1?.logo_url && "TBD"}
                    </div>
                    <span className="font-black text-sm md:text-xl text-[var(--foreground)] truncate">
                      {match.team1?.short_name || "TBD"}
                    </span>
                  </div>
                  <div className="px-3 py-1 bg-[var(--surface-3)] rounded-full text-[10px] font-black text-[var(--text-muted)]">
                    VS
                  </div>
                  <div className="flex items-center justify-end gap-3 w-[40%]">
                    <span className="font-black text-sm md:text-xl text-[var(--foreground)] text-right truncate">
                      {match.team2?.short_name || "TBD"}
                    </span>
                    <div
                      className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-[var(--surface-2)] bg-contain bg-center bg-no-repeat border border-[var(--border-1)] shadow-inner p-2 flex items-center justify-center text-[var(--text-muted)] font-bold text-[10px] text-center"
                      style={{
                        backgroundImage: match.team2?.logo_url
                          ? `url(${match.team2?.logo_url})`
                          : "none",
                      }}
                    >
                      {!match.team2?.logo_url && "TBD"}
                    </div>
                  </div>
                </div>
              </div>

              {/* ACTIONS */}
              <div className="px-4 py-4 w-full md:w-48 text-center md:border-l border-[var(--border-1)] shrink-0">
                {isAdmin ? (
                  <Link
                    href={`/t/${tournamentId}/m/${match.id}`}
                    className="w-full block bg-[var(--accent)]/10 text-[var(--accent)] font-black py-4 rounded-xl text-[10px] uppercase tracking-widest text-center hover:bg-[var(--accent)] hover:text-[var(--background)] transition-all shadow-sm"
                  >
                    {match.status === "scheduled"
                      ? "Start Match"
                      : match.status === "live"
                        ? "Resume Scoring"
                        : "Edit Scorecard"}
                  </Link>
                ) : (
                  <Link
                    href={`/match/${match.id}`}
                    className="w-full block bg-[var(--accent)]/10 text-[var(--accent)] font-black py-4 rounded-xl text-[10px] uppercase tracking-widest text-center hover:bg-[var(--accent)] hover:text-[var(--background)] transition-all shadow-sm"
                  >
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
