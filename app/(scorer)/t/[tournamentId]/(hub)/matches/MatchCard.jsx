import Link from "next/link";
import { Trash2, Calendar, Clock, ChevronRight } from "lucide-react";

export default function MatchCard({ match, isAdmin, deleteMatch }) {
  
  // 🧠 1. FIGURE OUT WHO ACTUALLY BATTED FIRST
  // If the toss hasn't happened, we just default to true.
  const choseBat = String(match?.toss_decision || "").toLowerCase().includes("bat");
  const t1WonToss = match?.toss_winner_id === match?.team1_id;
  const actualT1BattedFirst = match?.toss_winner_id ? (choseBat ? t1WonToss : !t1WonToss) : true;

  // 🧠 2. MAP SCORES TO THE CORRECT TEAM
  // If the DB saves Innings 1 into team1_score, this routes it to the team that ACTUALLY batted first.
  const t1ActualScore = actualT1BattedFirst ? (match.team1_score ?? 0) : (match.team2_score ?? 0);
  const t1ActualWickets = actualT1BattedFirst ? (match.team1_wickets ?? 0) : (match.team2_wickets ?? 0);
  const t1ActualOvers = actualT1BattedFirst ? (match.team1_overs ?? 0) : (match.team2_overs ?? 0);

  const t2ActualScore = actualT1BattedFirst ? (match.team2_score ?? 0) : (match.team1_score ?? 0);
  const t2ActualWickets = actualT1BattedFirst ? (match.team2_wickets ?? 0) : (match.team1_wickets ?? 0);
  const t2ActualOvers = actualT1BattedFirst ? (match.team2_overs ?? 0) : (match.team1_overs ?? 0);

  // 🧠 3. OVERRIDE WINNER LOGIC
  // We use the corrected actual scores to calculate the winner securely.
  let actualWinnerId = match.winner_id;
  if (match.status === "completed") {
    if (t1ActualScore > t2ActualScore) {
      actualWinnerId = match.team1?.id;
    } else if (t2ActualScore > t1ActualScore) {
      actualWinnerId = match.team2?.id;
    }
  }

  // Visual emphasis variables based on our corrected winner
  const isTeam1Winner = match.status === "completed" && actualWinnerId === match.team1?.id;
  const isTeam2Winner = match.status === "completed" && actualWinnerId === match.team2?.id;

  return (
    <div
      key={match.id}
      className="bg-[var(--surface-1)] rounded-xl p-4 md:p-5 border border-[var(--border-1)] relative group transition-all duration-300 hover:border-[var(--accent)]/40 hover:shadow-xl flex flex-col justify-between gap-4 overflow-hidden h-full"
    >
      {/* 1. TOP HEADER: Meta Info & Admin Actions */}
      <div className="flex items-center justify-between gap-2 border-b border-[var(--border-1)]/60 pb-3">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          {/* Match Number Chip */}
          <span className="text-[13px] font-black uppercase tracking-wider text-[var(--accent)] bg-[var(--accent)]/10 border border-[var(--accent)]/20 px-2.5 py-0.5 rounded-lg shrink-0">
            M#{match.match_no || "TBA"}
          </span>

          {/* Stage Chip */}
          {match.stage && (
            <span className="text-[13px] font-bold uppercase tracking-wider text-[var(--text-muted)] bg-[var(--surface-2)] border border-[var(--border-1)] px-2.5 py-0.5 rounded-lg truncate max-w-[120px] md:max-w-[180px]">
              {match.stage}
            </span>
          )}

          {/* Overs Badge */}
          <span className="text-[13px] font-bold text-[var(--text-muted)] bg-[var(--surface-2)] px-2 py-0.5 rounded-md shrink-0">
            {match.overs_count} OV
          </span>
        </div>

        {/* Live / Status Badge + Admin Delete Button */}
        <div className="flex items-center gap-2 shrink-0">
          {match.status === "live" ? (
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 bg-red-500/10 border border-red-500/30 rounded-full text-[13px] font-black text-red-500 tracking-widest animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              LIVE
            </span>
          ) : match.status === "completed" ? (
            <span className="px-2.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[13px] font-bold text-emerald-500 tracking-wider">
              ENDED
            </span>
          ) : (
            <span className="px-2.5 py-0.5 bg-[var(--surface-2)] border border-[var(--border-1)] rounded-full text-[13px] font-bold text-[var(--text-muted)] tracking-wider">
              UPCOMING
            </span>
          )}

          {/* Admin Delete Action (Safe Slot) */}
          {isAdmin && (
            <button
              onClick={(e) => {
                e.preventDefault();
                deleteMatch(match.id);
              }}
              title="Delete Match"
              className="text-[var(--text-muted)] hover:text-red-500 p-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </div>

      {/* 2. MAIN TEAMS & SCORES PANEL (Vertical Stack = 0 Collisions) */}
      <div className="bg-[var(--surface-2)]/40 border border-[var(--border-1)]/80 rounded-xl p-3 md:p-4 flex flex-col gap-3">
        
        {/* TEAM 1 ROW */}
        <div
          className={`flex items-center justify-between gap-3 min-w-0 ${isTeam2Winner ? "opacity-60" : "opacity-100"}`}
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {/* Logo */}
            <div className="w-9 h-9 md:w-10 md:h-10 shrink-0 rounded-xl bg-[var(--surface-1)] border border-[var(--border-1)] shadow-sm p-1 flex items-center justify-center overflow-hidden">
              {match.team1?.logo_url ? (
                <img
                  src={match.team1.logo_url}
                  alt=""
                  className="w-full h-full object-contain"
                />
              ) : (
                <span className="text-xs font-black text-[var(--text-muted)] uppercase">
                  {match.team1?.short_name?.[0] || "T1"}
                </span>
              )}
            </div>

            {/* Team Name */}
            <div className="flex flex-col min-w-0 flex-1">
              <span
                className={`text-sm md:text-base leading-tight truncate ${isTeam1Winner ? "font-black text-[var(--foreground)]" : "font-bold text-[var(--foreground)]"}`}
              >
                {match.team1?.name || match.team1?.short_name || "TBD"}
              </span>
              <span className="text-[13px] text-[var(--text-muted)] font-bold uppercase tracking-wider">
                {match.team1?.short_name}
              </span>
            </div>
          </div>

          {/* Team 1 Score (Now securely mapped!) */}
          {match.status === "live" || match.status === "completed" ? (
            <div className="text-right shrink-0">
              <div className="text-base md:text-lg font-black tracking-tight text-[var(--foreground)]">
                {t1ActualScore}/{t1ActualWickets}
              </div>
              <div className="text-[13px] font-bold text-[var(--text-muted)]">
                ({t1ActualOvers} ov)
              </div>
            </div>
          ) : (
            <span className="text-xs font-bold text-[var(--text-muted)] uppercase shrink-0">
              Yet to bat
            </span>
          )}
        </div>

        {/* Subtle Divider */}
        <div className="h-[1px] bg-[var(--border-1)]/50 w-full" />

        {/* TEAM 2 ROW */}
        <div
          className={`flex items-center justify-between gap-3 min-w-0 ${isTeam1Winner ? "opacity-60" : "opacity-100"}`}
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {/* Logo */}
            <div className="w-9 h-9 md:w-10 md:h-10 shrink-0 rounded-xl bg-[var(--surface-1)] border border-[var(--border-1)] shadow-sm p-1 flex items-center justify-center overflow-hidden">
              {match.team2?.logo_url ? (
                <img
                  src={match.team2.logo_url}
                  alt=""
                  className="w-full h-full object-contain"
                />
              ) : (
                <span className="text-xs font-black text-[var(--text-muted)] uppercase">
                  {match.team2?.short_name?.[0] || "T2"}
                </span>
              )}
            </div>

            {/* Team Name */}
            <div className="flex flex-col min-w-0 flex-1">
              <span
                className={`text-sm md:text-base leading-tight truncate ${isTeam2Winner ? "font-black text-[var(--foreground)]" : "font-bold text-[var(--foreground)]"}`}
              >
                {match.team2?.name || match.team2?.short_name || "TBD"}
              </span>
              <span className="text-[13px] text-[var(--text-muted)] font-bold uppercase tracking-wider">
                {match.team2?.short_name}
              </span>
            </div>
          </div>

          {/* Team 2 Score (Now securely mapped!) */}
          {match.status === "live" || match.status === "completed" ? (
            <div className="text-right shrink-0">
              <div className="text-base md:text-lg font-black tracking-tight text-[var(--foreground)]">
                {t2ActualScore}/{t2ActualWickets}
              </div>
              <div className="text-[13px] font-bold text-[var(--text-muted)]">
                ({t2ActualOvers} ov)
              </div>
            </div>
          ) : (
            <span className="text-xs font-bold text-[var(--text-muted)] uppercase shrink-0">
              Yet to bat
            </span>
          )}
        </div>
      </div>

      {/* 3. FOOTER: Match Result / Schedule & Dynamic Action Button */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
        {/* Left Side: Result or Timing Info */}
        <div className="flex-1 min-w-0">
          {match.status === "completed" ? (
            <p className="text-xs font-bold text-amber-500 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl truncate">
              🏆 {match.result_margin || "Match Ended"}
            </p>
          ) : match.status === "scheduled" ? (
            <div className="flex items-center gap-3 text-xs font-bold text-[var(--text-muted)]">
              <span className="flex items-center gap-1">
                <Calendar size={13} className="text-[var(--accent)]" />
                {match.match_date
                  ? new Date(match.match_date).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                    })
                  : "Date TBD"}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock size={13} className="text-[var(--accent)]" />
                {match.match_time ? match.match_time.substring(0, 5) : "--:--"}
              </span>
            </div>
          ) : (
            <p className="text-xs font-black text-red-500 animate-pulse bg-red-500/10 px-3 py-1.5 rounded-xl truncate">
              ⚡ Live Action in Progress
            </p>
          )}
        </div>

        {/* Right Side: Action Link / Button */}
        <Link
          href={`/t/${match.tournament_id || match.tournamentId}/m/${match.id}`}
          className="bg-[var(--accent)] text-[var(--background)] hover:opacity-95 font-black text-xs uppercase tracking-wider px-4 py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md shrink-0 active:scale-95"
        >
          <span>
            {isAdmin
              ? match.status === "scheduled"
                ? "Start Match"
                : match.status === "live"
                  ? "Resume Scoring"
                  : "Edit Scorecard"
              : "Scorecard"}
          </span>
          <ChevronRight size={14} />
        </Link>
      </div>
    </div>
  );
}