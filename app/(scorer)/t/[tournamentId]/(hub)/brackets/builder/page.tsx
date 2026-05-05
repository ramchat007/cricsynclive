"use client";
import React, { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  Settings,
  Save,
  ArrowLeft,
  GripVertical,
  Shield,
  Calendar,
  Plus,
  Link as LinkIcon,
  Users,
  Trash2,
  Clock,
  MapPin,
  Edit3,
  Wand2,
  ListOrdered,
  Activity,
} from "lucide-react";

// Helper for Auto-Scheduling
const calculateNextTime = (
  baseDate: string,
  baseTime: string,
  duration: number,
  gap: number,
) => {
  if (!baseTime) return { date: baseDate, time: "" };
  const safeDate = baseDate || "2026-01-01";
  const dt = new Date(`${safeDate}T${baseTime}`);
  if (isNaN(dt.getTime())) return { date: baseDate, time: baseTime };

  dt.setMinutes(
    dt.getMinutes() +
      parseInt(String(duration || 0)) +
      parseInt(String(gap || 0)),
  );

  const year = dt.getFullYear();
  const month = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  const nextDate = `${year}-${month}-${day}`;

  const hours = String(dt.getHours()).padStart(2, "0");
  const mins = String(dt.getMinutes()).padStart(2, "0");
  const nextTime = `${hours}:${mins}`;

  return { date: baseDate ? nextDate : "", time: nextTime };
};

export default function BracketBuilder() {
  const params = useParams();
  const id = params.tournamentId as string;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<any[]>([]);

  // Group teams for the sidebar
  const groupedTeams = useMemo(() => {
    const groups: Record<string, any[]> = { Unassigned: [] };
    teams.forEach((team) => {
      const groupName = team.group_name
        ? `Group ${team.group_name.replace("Group", "").trim()}`
        : "Unassigned";
      if (!groups[groupName]) groups[groupName] = [];
      groups[groupName].push(team);
    });
    if (groups["Unassigned"].length === 0) delete groups["Unassigned"];
    return groups;
  }, [teams]);

  const [rounds, setRounds] = useState([
    { id: "r1", name: "Round 1" },
    { id: "r2", name: "Quarter Finals" },
  ]);

  const [matches, setMatches] = useState<any[]>([]);
  const [matchCounter, setMatchCounter] = useState(1);

  const [activeConfigMatch, setActiveConfigMatch] = useState<string | null>(
    null,
  );
  const [tempMatchId, setTempMatchId] = useState("");

  const [showGlobalConfig, setShowGlobalConfig] = useState(false);
  const [showWizard, setShowWizard] = useState(false);

  const [wizardMode, setWizardMode] = useState("standard");
  const [wizardTeamsCount, setWizardTeamsCount] = useState(4);
  const [wizardGroupCount, setWizardGroupCount] = useState(4);
  const [wizardTeamsPerGroup, setWizardTeamsPerGroup] = useState(3);
  const [wizardAdvancing, setWizardAdvancing] = useState(2);
  const [wizardIncludeThirdPlace, setWizardIncludeThirdPlace] = useState(false);
  const [wizardInterleaveGroups, setWizardInterleaveGroups] = useState(false);
  const [wizardRoundRobinAdvancing, setWizardRoundRobinAdvancing] = useState(4);

  const [globalSettings, setGlobalSettings] = useState({
    overs: 4,
    date: "",
    time: "",
    venue: "",
    label: "",
    matchDuration: 45,
    matchGap: 10,
  });

  // --- SUPABASE FETCH ---
  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      try {
        setLoading(true);

        const [teamsRes, matchesRes, tourneyRes] = await Promise.all([
          supabase.from("teams").select("*").eq("tournament_id", id),
          supabase
            .from("matches")
            .select("*")
            .eq("tournament_id", id)
            .eq("is_bracket_match", true),
          supabase
            .from("tournaments")
            .select("bracket_layout")
            .eq("id", id)
            .single(),
        ]);

        if (teamsRes.data) setTeams(teamsRes.data);

        // Map existing database matches strictly by bracket_match_id (M1, M2, etc.)
        const activeDbMatchesMap = new Map(
          (matchesRes.data || []).map((d) => [d.bracket_match_id, d]),
        );

        if (tourneyRes.data?.bracket_layout) {
          const layout = tourneyRes.data.bracket_layout;
          const savedMatches = layout.matches || [];

          const validMatches = savedMatches.filter((m: any) =>
            activeDbMatchesMap.has(m.id),
          );

          const cleanedMatches = validMatches.map((m: any) => {
            let updatedMatch = { ...m };

            if (m.slotA.type === "link" || m.slotA.type === "loser_link") {
              if (
                !validMatches.find((v: any) => v.id === m.slotA.sourceMatchId)
              )
                updatedMatch.slotA = {
                  type: "team",
                  team: null,
                  sourceMatchId: "",
                };
            }
            if (m.slotB.type === "link" || m.slotB.type === "loser_link") {
              if (
                !validMatches.find((v: any) => v.id === m.slotB.sourceMatchId)
              )
                updatedMatch.slotB = {
                  type: "team",
                  team: null,
                  sourceMatchId: "",
                };
            }

            const dbMatch = activeDbMatchesMap.get(m.id);
            if (dbMatch) {
              updatedMatch.settings = {
                date: dbMatch.match_date || m.settings?.date || "",
                time: dbMatch.match_time || m.settings?.time || "",
                venue: dbMatch.venue || m.settings?.venue || "",
                overs: Number(dbMatch.overs_count || m.settings?.overs || 4),
              };
            }
            return updatedMatch;
          });

          const highestMatchNum = cleanedMatches.reduce(
            (max: number, m: any) => {
              const num = parseInt(m.id.replace("M", "")) || 0;
              return num > max ? num : max;
            },
            0,
          );

          setRounds(layout.rounds || []);
          setMatches(cleanedMatches);
          setMatchCounter(highestMatchNum + 1);
          if (layout.globalSettings) setGlobalSettings(layout.globalSettings);
        }
      } catch (e) {
        console.error("Error loading bracket data:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleMatchDrop = (
    e: React.DragEvent,
    targetMatchId: string,
    targetRoundId: string,
  ) => {
    e.preventDefault();
    e.stopPropagation();

    const dragType = e.dataTransfer.getData("type");
    if (dragType !== "match") return;

    const draggedMatchId = e.dataTransfer.getData("draggedMatchId");
    if (!draggedMatchId || draggedMatchId === targetMatchId) return;

    setMatches((prevMatches) => {
      let newMatches = [...prevMatches];
      const draggedIdx = newMatches.findIndex((m) => m.id === draggedMatchId);
      const targetIdx = newMatches.findIndex((m) => m.id === targetMatchId);

      if (draggedIdx === -1 || targetIdx === -1) return prevMatches;

      const [draggedMatch] = newMatches.splice(draggedIdx, 1);
      draggedMatch.roundId = targetRoundId;
      newMatches.splice(targetIdx, 0, draggedMatch);

      const idMapping: Record<string, string> = {};
      let counter = 1;

      const renumberedMatches = newMatches.map((m) => {
        const oldId = m.id;
        const newId = `M${counter}`;
        idMapping[oldId] = newId;
        counter++;

        let newTitle = m.title;
        if (newTitle.match(/M\d+/)) {
          newTitle = newTitle
            .replace(oldId, newId)
            .replace(`Match ${oldId.replace("M", "")}`, `Match ${counter - 1}`);
        }

        return { ...m, id: newId, title: newTitle };
      });

      const fullyFixedMatches = renumberedMatches.map((m) => {
        let updated = { ...m };
        if (
          (updated.slotA.type === "link" ||
            updated.slotA.type === "loser_link") &&
          idMapping[updated.slotA.sourceMatchId]
        ) {
          updated.slotA.sourceMatchId = idMapping[updated.slotA.sourceMatchId];
        }
        if (
          (updated.slotB.type === "link" ||
            updated.slotB.type === "loser_link") &&
          idMapping[updated.slotB.sourceMatchId]
        ) {
          updated.slotB.sourceMatchId = idMapping[updated.slotB.sourceMatchId];
        }
        return updated;
      });

      setMatchCounter(counter);
      return fullyFixedMatches;
    });
  };

  const handleGenerateWizard = () => {
    if (matches.length > 0) {
      if (
        !window.confirm(
          "This will clear your current board and generate a brand new blueprint. Continue?",
        )
      )
        return;
    }

    let newRounds: any[] = [];
    let newMatches: any[] = [];
    let mCounter = 1;

    if (wizardMode === "round_robin") {
      if (teams.length < 2)
        return alert("No teams found! Please add teams first.");

      newRounds.push({ id: "r1", name: "League Stage" });

      const teamsByGroup: Record<string, any[]> = {};
      teams.forEach((t) => {
        const gName = t.group_name
          ? t.group_name.replace("Group", "").trim()
          : "A";
        if (!teamsByGroup[gName]) teamsByGroup[gName] = [];
        teamsByGroup[gName].push(t);
      });

      const sortedGroupKeys = Object.keys(teamsByGroup).sort();
      let semisMatches: any[] = [];

      sortedGroupKeys.forEach((groupKey) => {
        const groupTeams = [...teamsByGroup[groupKey]];
        if (groupTeams.length % 2 !== 0)
          groupTeams.push({ id: "BYE", name: "BYE", isBye: true });

        const numTeams = groupTeams.length;
        const numRounds = numTeams - 1;
        const matchesPerRound = numTeams / 2;

        for (let r = 0; r < numRounds; r++) {
          for (let m = 0; m < matchesPerRound; m++) {
            const teamA = groupTeams[m];
            const teamB = groupTeams[numTeams - 1 - m];

            if (!teamA.isBye && !teamB.isBye) {
              newMatches.push({
                id: `M${mCounter}`,
                roundId: "r1",
                title:
                  sortedGroupKeys.length > 1
                    ? `Grp ${groupKey} - R${r + 1}`
                    : `Round ${r + 1}`,
                slotA: { type: "team", team: teamA, sourceMatchId: "" },
                slotB: { type: "team", team: teamB, sourceMatchId: "" },
                settings: {
                  date: globalSettings.date,
                  time: "",
                  venue: globalSettings.venue,
                  overs: globalSettings.overs,
                },
              });
              mCounter++;
            }
          }
          groupTeams.splice(1, 0, groupTeams.pop());
        }
      });

      let currentDateTime: Date | null = null;
      if (globalSettings.date && globalSettings.time) {
        currentDateTime = new Date(
          `${globalSettings.date}T${globalSettings.time}`,
        );
      }

      newMatches = newMatches.map((m) => {
        if (!currentDateTime || isNaN(currentDateTime.getTime())) return m;
        const timeStr = currentDateTime.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        });
        const dateStr = currentDateTime.toISOString().split("T")[0];

        const updatedMatch = {
          ...m,
          settings: { ...m.settings, date: dateStr, time: timeStr },
        };

        currentDateTime.setMinutes(
          currentDateTime.getMinutes() +
            parseInt(String(globalSettings.matchDuration || 45)) +
            parseInt(String(globalSettings.matchGap || 10)),
        );
        return updatedMatch;
      });

      const advancingCount = parseInt(String(wizardRoundRobinAdvancing));
      if (advancingCount >= 2) {
        const knockoutRounds = Math.ceil(Math.log2(advancingCount));
        const bracketSize = Math.pow(2, knockoutRounds);
        let previousRoundMatches: any[] = [];

        for (let r = 0; r < knockoutRounds; r++) {
          const roundId = `r${r + 2}`;
          const isFinal = r === knockoutRounds - 1;
          const isSemi = r === knockoutRounds - 2;
          const roundName = isFinal
            ? "Final"
            : isSemi
              ? "Semi-Finals"
              : `Knockouts R${r + 1}`;

          newRounds.push({ id: roundId, name: roundName });
          const matchesInThisRound = bracketSize / Math.pow(2, r + 1);
          const currentRoundMatchIds = [];

          for (let m = 0; m < matchesInThisRound; m++) {
            const matchId = `M${mCounter}`;
            let slotA, slotB;

            if (r === 0) {
              if (sortedGroupKeys.length === 1) {
                slotA = {
                  type: "standing",
                  team: null,
                  sourceMatchId: `STANDING_A_${m + 1}`,
                };
                slotB = {
                  type: "standing",
                  team: null,
                  sourceMatchId: `STANDING_A_${advancingCount - m}`,
                };
              } else {
                const g1 = sortedGroupKeys[m % sortedGroupKeys.length];
                const g2 = sortedGroupKeys[(m + 1) % sortedGroupKeys.length];
                slotA = {
                  type: "standing",
                  team: null,
                  sourceMatchId: `STANDING_${g1}_1`,
                };
                slotB = {
                  type: "standing",
                  team: null,
                  sourceMatchId: `STANDING_${g2}_2`,
                };
              }
            } else {
              slotA = {
                type: "link",
                team: null,
                sourceMatchId: previousRoundMatches[m * 2],
              };
              slotB = {
                type: "link",
                team: null,
                sourceMatchId: previousRoundMatches[m * 2 + 1],
              };
            }

            newMatches.push({
              id: matchId,
              roundId,
              title: isFinal
                ? "Final"
                : isSemi
                  ? `Semi-Final ${m + 1}`
                  : `Knockout M${m + 1}`,
              slotA,
              slotB,
              settings: {
                date: globalSettings.date,
                time: "",
                venue: globalSettings.venue,
                overs: globalSettings.overs,
              },
            });
            currentRoundMatchIds.push(matchId);
            if (isSemi) semisMatches.push(matchId);
            mCounter++;
          }
          previousRoundMatches = currentRoundMatchIds;
        }

        if (wizardIncludeThirdPlace && semisMatches.length === 2) {
          newMatches.push({
            id: `M${mCounter}`,
            roundId: `r${knockoutRounds + 1}`,
            title: "3rd Place Playoff",
            slotA: {
              type: "loser_link",
              team: null,
              sourceMatchId: semisMatches[0],
            },
            slotB: {
              type: "loser_link",
              team: null,
              sourceMatchId: semisMatches[1],
            },
            settings: {
              date: globalSettings.date,
              time: "",
              venue: globalSettings.venue,
              overs: globalSettings.overs,
            },
          });
          mCounter++;
        }
      }
    } else if (wizardMode === "groups_knockout") {
      const gCount = parseInt(String(wizardGroupCount));
      const tPerGroup = parseInt(String(wizardTeamsPerGroup));
      const advPerGroup = parseInt(String(wizardAdvancing));

      newRounds.push({ id: "r1", name: "Group Stage" });
      const matchesPerGroup = (tPerGroup * (tPerGroup - 1)) / 2;

      if (wizardInterleaveGroups) {
        for (let m = 1; m <= matchesPerGroup; m++) {
          for (let g = 1; g <= gCount; g++) {
            newMatches.push({
              id: `M${mCounter}`,
              roundId: "r1",
              title: `Grp ${String.fromCharCode(64 + g)} - M${m}`,
              slotA: { type: "team", team: null, sourceMatchId: "" },
              slotB: { type: "team", team: null, sourceMatchId: "" },
              settings: {
                date: globalSettings.date,
                time: "",
                venue: globalSettings.venue,
                overs: globalSettings.overs,
              },
            });
            mCounter++;
          }
        }
      } else {
        for (let g = 1; g <= gCount; g++) {
          for (let m = 1; m <= matchesPerGroup; m++) {
            newMatches.push({
              id: `M${mCounter}`,
              roundId: "r1",
              title: `Grp ${String.fromCharCode(64 + g)} - M${m}`,
              slotA: { type: "team", team: null, sourceMatchId: "" },
              slotB: { type: "team", team: null, sourceMatchId: "" },
              settings: {
                date: globalSettings.date,
                time: "",
                venue: globalSettings.venue,
                overs: globalSettings.overs,
              },
            });
            mCounter++;
          }
        }
      }

      const advancingTeams = gCount * advPerGroup;
      if (advancingTeams >= 2) {
        const knockoutRounds = Math.ceil(Math.log2(advancingTeams));
        const bracketSize = Math.pow(2, knockoutRounds);
        let previousRoundMatches: any[] = [];

        for (let r = 0; r < knockoutRounds; r++) {
          const roundId = `r${r + 2}`;
          const isFinal = r === knockoutRounds - 1;
          const isSemi = r === knockoutRounds - 2;
          const isQuarter = r === knockoutRounds - 3;
          const roundName = isFinal
            ? "Final"
            : isSemi
              ? "Semi-Finals"
              : isQuarter
                ? "Quarter Finals"
                : `Knockouts R${r + 1}`;

          newRounds.push({ id: roundId, name: roundName });
          const matchesInThisRound = bracketSize / Math.pow(2, r + 1);
          const currentRoundMatchIds = [];

          for (let m = 0; m < matchesInThisRound; m++) {
            const matchId = `M${mCounter}`;
            let slotA = { type: "team", team: null, sourceMatchId: "" };
            let slotB = { type: "team", team: null, sourceMatchId: "" };

            if (r === 0) {
              slotA = { type: "standing", team: null, sourceMatchId: "" };
              slotB = { type: "standing", team: null, sourceMatchId: "" };
            } else {
              const prev1 = previousRoundMatches[m * 2];
              const prev2 = previousRoundMatches[m * 2 + 1];
              slotA = { type: "link", team: null, sourceMatchId: prev1 };
              slotB = { type: "link", team: null, sourceMatchId: prev2 };
            }

            newMatches.push({
              id: matchId,
              roundId,
              title: isFinal ? "Final" : `Knockout M${m + 1}`,
              slotA,
              slotB,
              settings: {
                date: globalSettings.date,
                time: "",
                venue: globalSettings.venue,
                overs: globalSettings.overs,
              },
            });
            currentRoundMatchIds.push(matchId);
            mCounter++;
          }
          previousRoundMatches = currentRoundMatchIds;
        }

        if (wizardIncludeThirdPlace && knockoutRounds >= 2) {
          const semisMatches = newMatches.filter(
            (m) => m.roundId === `r${knockoutRounds}`,
          );
          if (semisMatches.length >= 2) {
            newMatches.push({
              id: `M${mCounter}`,
              roundId: `r${knockoutRounds + 1}`,
              title: "3rd Place Playoff",
              slotA: {
                type: "loser_link",
                team: null,
                sourceMatchId: semisMatches[0].id,
              },
              slotB: {
                type: "loser_link",
                team: null,
                sourceMatchId: semisMatches[1].id,
              },
              settings: {
                date: globalSettings.date,
                time: "",
                venue: globalSettings.venue,
                overs: globalSettings.overs,
              },
            });
            mCounter++;
          }
        }
      }
    } else {
      const count = parseInt(String(wizardTeamsCount));
      if (isNaN(count) || count < 2)
        return alert("You need at least 2 teams to generate a bracket.");

      const totalRounds = Math.ceil(Math.log2(count));
      const bracketSize = Math.pow(2, totalRounds);
      const byesNeeded = bracketSize - count;
      let previousRoundMatches: any[] = [];

      for (let r = 0; r < totalRounds; r++) {
        const roundId = `r${r + 1}`;
        const isFinal = r === totalRounds - 1;
        const isSemi = r === totalRounds - 2;
        const roundName = isFinal
          ? "Final"
          : isSemi
            ? "Semi-Finals"
            : `Round ${r + 1}`;
        newRounds.push({ id: roundId, name: roundName });

        const matchesInThisRound = bracketSize / Math.pow(2, r + 1);
        const currentRoundMatchIds = [];

        for (let m = 0; m < matchesInThisRound; m++) {
          const matchId = `M${mCounter}`;
          let slotA = { type: "team", team: null, sourceMatchId: "" };
          let slotB = { type: "team", team: null, sourceMatchId: "" };

          if (r === 0) {
            if (m >= matchesInThisRound - byesNeeded) {
              slotB = { type: "bye", team: null, sourceMatchId: "" };
            }
          } else {
            const prev1 = previousRoundMatches[m * 2];
            const prev2 = previousRoundMatches[m * 2 + 1];
            slotA = { type: "link", team: null, sourceMatchId: prev1 };
            slotB = { type: "link", team: null, sourceMatchId: prev2 };
          }

          newMatches.push({
            id: matchId,
            roundId,
            title: `Match ${mCounter}`,
            slotA,
            slotB,
            settings: {
              date: globalSettings.date,
              time: "",
              venue: globalSettings.venue,
              overs: globalSettings.overs,
            },
          });

          currentRoundMatchIds.push(matchId);
          mCounter++;
        }
        previousRoundMatches = currentRoundMatchIds;
      }

      if (wizardIncludeThirdPlace && totalRounds >= 2) {
        const semiFinal1 = previousRoundMatches[0];
        const semiFinal2 = previousRoundMatches[1];
        newMatches.push({
          id: `M${mCounter}`,
          roundId: `r${totalRounds}`,
          title: "3rd Place Playoff",
          slotA: { type: "loser_link", team: null, sourceMatchId: semiFinal1 },
          slotB: { type: "loser_link", team: null, sourceMatchId: semiFinal2 },
          settings: {
            date: globalSettings.date,
            time: "",
            venue: globalSettings.venue,
            overs: globalSettings.overs,
          },
        });
        mCounter++;
      }
    }

    setRounds(newRounds);
    setMatches(newMatches);
    setMatchCounter(mCounter);
    setShowWizard(false);
  };

  const addRound = () => {
    const newId = `r${rounds.length + 1}`;
    setRounds([...rounds, { id: newId, name: `Round ${rounds.length + 1}` }]);
  };

  const addMatchToRound = (roundId: string) => {
    const matchPrefix = globalSettings.label.trim()
      ? globalSettings.label
      : "Match";
    let nextDate = globalSettings.date;
    let nextTime = globalSettings.time;

    if (matches.length > 0) {
      const lastMatch = matches[matches.length - 1];
      const result = calculateNextTime(
        lastMatch.settings?.date || globalSettings.date,
        lastMatch.settings?.time || globalSettings.time,
        globalSettings.matchDuration,
        globalSettings.matchGap,
      );
      nextDate = result.date;
      nextTime = result.time;
    }

    const newMatch = {
      id: `M${matchCounter}`,
      roundId,
      title: `${matchPrefix} ${matchCounter}`,
      slotA: { type: "team", team: null, sourceMatchId: "" },
      slotB: { type: "team", team: null, sourceMatchId: "" },
      settings: {
        date: nextDate,
        time: nextTime,
        venue: globalSettings.venue,
        overs: globalSettings.overs,
      },
    };

    setMatches([...matches, newMatch]);
    setMatchCounter(matchCounter + 1);
  };

  const updateMatchTitle = (matchId: string, title: string) => {
    setMatches(matches.map((m) => (m.id === matchId ? { ...m, title } : m)));
  };

  const cycleSlotType = (matchId: string, slotKey: "slotA" | "slotB") => {
    setMatches(
      matches.map((m) => {
        if (m.id === matchId) {
          const currentType = m[slotKey].type;
          const nextType =
            currentType === "team"
              ? "link"
              : currentType === "link"
                ? "loser_link"
                : currentType === "loser_link"
                  ? "standing"
                  : currentType === "standing"
                    ? "bye"
                    : "team";
          return {
            ...m,
            [slotKey]: { type: nextType, team: null, sourceMatchId: "" },
          };
        }
        return m;
      }),
    );
  };

  const updateSlotLink = (
    matchId: string,
    slotKey: "slotA" | "slotB",
    sourceMatchId: string,
  ) => {
    setMatches(
      matches.map((m) =>
        m.id === matchId
          ? { ...m, [slotKey]: { ...m[slotKey], sourceMatchId } }
          : m,
      ),
    );
  };

  const handleDragStartTeam = (e: React.DragEvent, team: any) => {
    e.dataTransfer.setData("type", "team");
    e.dataTransfer.setData("teamObj", JSON.stringify(team));
  };

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  const handleDropSlot = (
    e: React.DragEvent,
    matchId: string,
    slotKey: "slotA" | "slotB",
  ) => {
    e.preventDefault();
    const dragType = e.dataTransfer.getData("type");
    if (dragType !== "team") return;

    const teamData = e.dataTransfer.getData("teamObj");
    if (!teamData) return;

    const team = JSON.parse(teamData);
    setMatches(
      matches.map((m) => {
        if (m.id === matchId && m[slotKey].type === "team")
          return { ...m, [slotKey]: { ...m[slotKey], team } };
        return m;
      }),
    );
  };

  const removeTeamFromSlot = (matchId: string, slotKey: "slotA" | "slotB") => {
    setMatches(
      matches.map((m) =>
        m.id === matchId
          ? { ...m, [slotKey]: { ...m[slotKey], team: null } }
          : m,
      ),
    );
  };

  const deleteMatch = (matchId: string) => {
    if (!window.confirm(`Are you sure you want to delete ${matchId}?`)) return;
    setMatches((prevMatches) => {
      const filteredMatches = prevMatches.filter((m) => m.id !== matchId);
      return filteredMatches.map((m) => {
        let updatedMatch = { ...m };
        if (
          (m.slotA.type === "link" || m.slotA.type === "loser_link") &&
          m.slotA.sourceMatchId === matchId
        )
          updatedMatch.slotA = { type: "team", team: null, sourceMatchId: "" };
        if (
          (m.slotB.type === "link" || m.slotB.type === "loser_link") &&
          m.slotB.sourceMatchId === matchId
        )
          updatedMatch.slotB = { type: "team", team: null, sourceMatchId: "" };
        return updatedMatch;
      });
    });
  };

  const handleCloseSettingsModal = () => {
    if (tempMatchId.trim() && tempMatchId !== activeConfigMatch) {
      const newId = tempMatchId.trim().toUpperCase();
      if (matches.some((m) => m.id === newId)) {
        alert(`Match ID "${newId}" already exists! Please choose a unique ID.`);
        return;
      }
      setMatches((prevMatches) =>
        prevMatches.map((m) => {
          if (m.id === activeConfigMatch) return { ...m, id: newId };
          let updatedMatch = { ...m };
          if (
            (updatedMatch.slotA.type === "link" ||
              updatedMatch.slotA.type === "loser_link") &&
            updatedMatch.slotA.sourceMatchId === activeConfigMatch
          )
            updatedMatch.slotA.sourceMatchId = newId;
          if (
            (updatedMatch.slotB.type === "link" ||
              updatedMatch.slotB.type === "loser_link") &&
            updatedMatch.slotB.sourceMatchId === activeConfigMatch
          )
            updatedMatch.slotB.sourceMatchId = newId;
          return updatedMatch;
        }),
      );
    }
    setActiveConfigMatch(null);
  };

  // --- SUPABASE BULK SAVE (FIXED FOR UUID) ---
  const handleSaveBracket = async () => {
    if (matches.length === 0) return alert("Add at least one match to save.");
    if (
      !window.confirm(
        "Save and schedule these matches? This will update your tournament schedule.",
      )
    )
      return;

    setLoading(true);
    try {
      const leanMatches = matches.map((m) => {
        const cleanSlot = (slot: any) => {
          if (slot.type === "team" && slot.team) {
            return {
              ...slot,
              team: { id: slot.team.id, name: slot.team.name },
            };
          }
          return slot;
        };
        return { ...m, slotA: cleanSlot(m.slotA), slotB: cleanSlot(m.slotB) };
      });

      // 1. Update the Tournament JSONB layout
      const { error: tourneyError } = await supabase
        .from("tournaments")
        .update({
          bracket_layout: {
            rounds,
            matches: leanMatches,
            matchCounter,
            globalSettings,
            lastUpdated: Date.now(),
          },
        })
        .eq("id", id);

      if (tourneyError) throw tourneyError;

      // 2. Fetch existing bracket matches so we know which ones to UPDATE vs INSERT
      const { data: existingMatches } = await supabase
        .from("matches")
        .select("id, bracket_match_id")
        .eq("tournament_id", id)
        .eq("is_bracket_match", true);

      // Map "M1", "M2" -> actual UUID in Postgres
      const existingMatchMap = new Map(
        existingMatches?.map((m) => [m.bracket_match_id, m.id]) || [],
      );

      // 3. Prepare bulk array for Matches table
      const matchPayloads = matches.map((m) => {
        let teamAName = "TBD";
        let teamAId = null;

        if (m.slotA.type === "team" && m.slotA.team) {
          teamAName = m.slotA.team.name;
          teamAId = m.slotA.team.id;
        } else if (m.slotA.type === "link" && m.slotA.sourceMatchId) {
          teamAName = `Winner of ${m.slotA.sourceMatchId}`;
        } else if (m.slotA.type === "loser_link" && m.slotA.sourceMatchId) {
          teamAName = `Loser of ${m.slotA.sourceMatchId}`;
        } else if (m.slotA.type === "standing" && m.slotA.sourceMatchId) {
          const parts = m.slotA.sourceMatchId.split("_");
          const posStr =
            parts[2] === "1"
              ? "1st"
              : parts[2] === "2"
                ? "2nd"
                : parts[2] === "3"
                  ? "3rd"
                  : "4th";
          teamAName = `${posStr} Group ${parts[1]}`;
        } else if (m.slotA.type === "bye") {
          teamAName = "BYE";
        }

        let teamBName = "TBD";
        let teamBId = null;

        if (m.slotB.type === "team" && m.slotB.team) {
          teamBName = m.slotB.team.name;
          teamBId = m.slotB.team.id;
        } else if (m.slotB.type === "link" && m.slotB.sourceMatchId) {
          teamBName = `Winner of ${m.slotB.sourceMatchId}`;
        } else if (m.slotB.type === "loser_link" && m.slotB.sourceMatchId) {
          teamBName = `Loser of ${m.slotB.sourceMatchId}`;
        } else if (m.slotB.type === "standing" && m.slotB.sourceMatchId) {
          const parts = m.slotB.sourceMatchId.split("_");
          const posStr =
            parts[2] === "1"
              ? "1st"
              : parts[2] === "2"
                ? "2nd"
                : parts[2] === "3"
                  ? "3rd"
                  : "4th";
          teamBName = `${posStr} Group ${parts[1]}`;
        } else if (m.slotB.type === "bye") {
          teamBName = "BYE";
        }

        // Build base payload (without ID so Postgres generates a UUID if new)
        const payload: any = {
          tournament_id: id,
          match_title: m.title,
          team1_name: teamAName,
          team2_name: teamBName,
          team1_id: teamAId,
          team2_id: teamBId,
          match_date: m.settings?.date || null,
          match_time: m.settings?.time || null,
          venue: m.settings?.venue || null,
          overs_count: Number(m.settings?.overs || 4),
          status: "scheduled",
          is_bracket_match: true,
          bracket_match_id: m.id,
          stage: rounds.find((r) => r.id === m.roundId)?.name || "Knockout",
        };

        // If this bracket match already exists in Postgres, attach its UUID to update it
        if (existingMatchMap.has(m.id)) {
          payload.id = existingMatchMap.get(m.id);
        }

        return payload;
      });

      // 4. Bulk Upsert
      const { error: matchesError } = await supabase
        .from("matches")
        .upsert(matchPayloads, { onConflict: "id" });

      if (matchesError) throw matchesError;

      alert("✅ Bracket Saved and Matches Scheduled safely!");
      router.push(`/t/${id}/brackets`);
    } catch (e: any) {
      console.error("Error saving bracket:", e);
      alert("Failed to save bracket: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  // --- SUPABASE BULK DELETE ---
  const handleClearEntireBracket = async () => {
    if (
      !window.confirm(
        "🚨 DANGER: This will permanently delete ALL bracket matches from the database. Are you absolutely sure?",
      )
    )
      return;

    setLoading(true);
    try {
      // 1. Wipe layout from Tournament
      await supabase
        .from("tournaments")
        .update({ bracket_layout: null })
        .eq("id", id);

      // 2. Delete all matches associated with this bracket
      await supabase
        .from("matches")
        .delete()
        .eq("tournament_id", id)
        .eq("is_bracket_match", true);

      setMatches([]);
      setRounds([{ id: "r1", name: "Round 1" }]);
      setMatchCounter(1);
      setShowGlobalConfig(false);

      alert("🗑️ Bracket completely wiped!");
    } catch (e: any) {
      console.error("Error clearing bracket:", e);
      alert("Failed to clear bracket: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const applyChronologicalSettings = () => {
    if (
      !window.confirm(
        "Auto-Schedule ALL matches based on the Default Start Time, Duration, and Gap?",
      )
    )
      return;

    setMatches((prevMatches) => {
      let currentDateTime: Date | null = null;
      if (globalSettings.date && globalSettings.time)
        currentDateTime = new Date(
          `${globalSettings.date}T${globalSettings.time}`,
        );
      else if (globalSettings.time)
        currentDateTime = new Date(`2026-01-01T${globalSettings.time}`);

      return prevMatches.map((m) => {
        let calcDate = globalSettings.date;
        let calcTime = globalSettings.time;

        if (currentDateTime && !isNaN(currentDateTime.getTime())) {
          const year = currentDateTime.getFullYear();
          const month = String(currentDateTime.getMonth() + 1).padStart(2, "0");
          const day = String(currentDateTime.getDate()).padStart(2, "0");

          calcDate = globalSettings.date ? `${year}-${month}-${day}` : "";
          const hours = String(currentDateTime.getHours()).padStart(2, "0");
          const mins = String(currentDateTime.getMinutes()).padStart(2, "0");
          calcTime = `${hours}:${mins}`;

          currentDateTime.setMinutes(
            currentDateTime.getMinutes() +
              parseInt(String(globalSettings.matchDuration || 0)) +
              parseInt(String(globalSettings.matchGap || 0)),
          );
        }
        return {
          ...m,
          settings: { ...m.settings, date: calcDate, time: calcTime },
        };
      });
    });

    alert("✅ Matches chronologically scheduled!");
    setShowGlobalConfig(false);
  };

  const renderSlot = (match: any, slotKey: "slotA" | "slotB") => {
    const slot = match[slotKey];

    return (
      <div className="relative mb-2">
        <div className="flex justify-between items-center mb-1">
          <span className="text-[9px] font-black uppercase text-slate-500 dark:text-slate-400">
            {slotKey === "slotA" ? "Team 1" : "Team 2"}
          </span>
          <button
            onClick={() => cycleSlotType(match.id, slotKey)}
            className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase border transition-colors ${
              slot.type === "link"
                ? "bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-500/30"
                : slot.type === "loser_link"
                  ? "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-500/30"
                  : slot.type === "standing"
                    ? "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/30"
                    : slot.type === "bye"
                      ? "bg-gray-100 dark:bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-500/30"
                      : "bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-200 dark:border-teal-500/30"
            }`}
          >
            {slot.type === "link"
              ? "Winner Linked"
              : slot.type === "loser_link"
                ? "Loser Linked"
                : slot.type === "standing"
                  ? "Table Standing"
                  : slot.type === "bye"
                    ? "BYE / TBA"
                    : "Manual"}
          </button>
        </div>

        {slot.type === "bye" ? (
          <div className="h-10 rounded-lg border flex items-center justify-center bg-gray-50 border-gray-200 dark:bg-white/5 dark:border-white/10 transition-colors">
            <span className="text-[10px] font-black uppercase tracking-widest opacity-50 text-slate-500 dark:text-slate-400">
              BYE (Advances)
            </span>
          </div>
        ) : slot.type === "team" ? (
          <div
            onDrop={(e) => handleDropSlot(e, match.id, slotKey)}
            onDragOver={handleDragOver}
            className={`h-10 rounded-lg border flex items-center justify-center relative transition-colors ${
              slot.team
                ? "bg-white border-teal-300 shadow-sm dark:bg-teal-900/20 dark:border-teal-500/30"
                : "bg-gray-50 border-gray-200 border-dashed dark:bg-black/20 dark:border-white/10"
            }`}
          >
            {slot.team ? (
              <>
                <span className="font-bold text-xs text-slate-900 dark:text-white">
                  {slot.team.name}
                </span>
                <button
                  onClick={() => removeTeamFromSlot(match.id, slotKey)}
                  className="absolute right-2 text-red-500 text-[10px] font-bold hover:text-red-600"
                >
                  X
                </button>
              </>
            ) : (
              <span className="text-[10px] font-bold italic opacity-40 flex items-center gap-1 text-slate-900 dark:text-white">
                <Users size={12} /> Drag Team Here
              </span>
            )}
          </div>
        ) : slot.type === "standing" ? (
          <div className="flex items-center gap-2">
            <div className="h-10 px-3 rounded-lg border flex-1 flex items-center gap-2 bg-amber-50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-500/30 transition-colors">
              <ListOrdered size={12} className="text-amber-500" />
              <select
                value={slot.sourceMatchId}
                onChange={(e) =>
                  updateSlotLink(match.id, slotKey, e.target.value)
                }
                className="w-full bg-transparent text-xs font-bold outline-none text-amber-900 dark:text-amber-200"
              >
                <option value="">Select Table Placement</option>
                {["A", "B", "C", "D", "E", "F", "G", "H"].map((group) => (
                  <optgroup key={group} label={`Group ${group}`}>
                    {[1, 2, 3, 4].map((pos) => (
                      <option
                        key={`${group}-${pos}`}
                        value={`STANDING_${group}_${pos}`}
                      >
                        {pos}
                        {pos === 1
                          ? "st"
                          : pos === 2
                            ? "nd"
                            : pos === 3
                              ? "rd"
                              : "th"}{" "}
                        Place - Group {group}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="h-10 px-3 rounded-lg border flex-1 flex items-center gap-2 bg-purple-50 border-purple-200 dark:bg-purple-900/10 dark:border-purple-500/30 transition-colors">
              <LinkIcon
                size={12}
                className={
                  slot.type === "loser_link"
                    ? "text-rose-500"
                    : "text-purple-500"
                }
              />
              <select
                value={slot.sourceMatchId}
                onChange={(e) =>
                  updateSlotLink(match.id, slotKey, e.target.value)
                }
                className="w-full bg-transparent text-xs font-bold outline-none text-purple-900 dark:text-purple-200"
              >
                <option value="">
                  Select Match {slot.type === "loser_link" ? "Loser" : "Winner"}
                </option>
                {matches
                  .filter((m) => m.id !== match.id)
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {slot.type === "loser_link" ? "Loser" : "Winner"} of{" "}
                      {m.id} ({m.title})
                    </option>
                  ))}
              </select>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading)
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white transition-colors duration-300">
        <div className="text-center font-bold flex flex-col items-center gap-4">
          <Activity className="animate-spin text-cyan-500" size={32} />
          Loading Bracket Builder...
        </div>
      </div>
    );

  return (
    <div className="h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white overflow-hidden transition-colors duration-300">
      {/* HEADER */}
      <div className="p-4 border-b flex justify-between items-center shrink-0 shadow-sm z-10 bg-white/80 dark:bg-slate-900/90 backdrop-blur-md border-slate-200 dark:border-slate-800 transition-colors duration-300">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-lg font-black uppercase tracking-widest italic flex items-center gap-2">
            <Shield className="text-cyan-500" /> Bracket Setup
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowWizard(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-widest border transition-all bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:border-indigo-500/30 dark:text-indigo-400 dark:hover:bg-indigo-500/20"
          >
            <Wand2 size={16} /> Auto-Generate
          </button>
          <button
            onClick={() => setShowGlobalConfig(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-widest border transition-all bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100 dark:bg-white/5 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/10"
          >
            <Settings size={16} /> Global Defaults
          </button>
          <button
            onClick={handleSaveBracket}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-cyan-500 transition-all shadow-lg active:scale-95"
          >
            <Save size={16} /> Save Setup
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* SIDEBAR (Available Teams) */}
        <div className="w-64 border-r flex flex-col shrink-0 bg-slate-100/50 dark:bg-[#0F1115]/80 backdrop-blur-sm border-slate-200 dark:border-white/5 transition-colors duration-300">
          <div className="p-4 border-b z-10 shadow-sm border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-[#0F1115] transition-colors duration-300">
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
              Available Teams
            </h2>
          </div>

          <div className="p-4 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
            {Object.entries(groupedTeams)
              .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
              .map(([groupName, groupTeams]) => (
                <div key={groupName} className="space-y-2">
                  <div className="flex items-center gap-2 mb-1 border-b pb-1 border-slate-200 dark:border-white/10 transition-colors">
                    <Shield size={12} className="text-teal-500" />
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-white">
                      {groupName}
                    </h3>
                    <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-600 dark:bg-white/10 dark:text-slate-400 transition-colors">
                      {groupTeams.length}
                    </span>
                  </div>

                  {groupTeams.map((team) => (
                    <div
                      key={team.id}
                      draggable
                      onDragStart={(e) => handleDragStartTeam(e, team)}
                      className="p-2.5 rounded-lg border flex items-center gap-2 cursor-grab active:cursor-grabbing hover:-translate-y-0.5 transition-all shadow-sm bg-white border-slate-200 hover:border-cyan-400 dark:bg-[#1C2128] dark:border-white/5 dark:hover:border-cyan-500/50"
                    >
                      <GripVertical
                        size={14}
                        className="text-gray-400 opacity-50 shrink-0"
                      />
                      <span className="font-bold text-[11px] truncate leading-tight">
                        {team.name}
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            {teams.length === 0 && !loading && (
              <div className="text-center text-xs italic py-10 text-slate-500 dark:text-slate-400">
                No teams found.
              </div>
            )}
          </div>
        </div>

        {/* MAIN CANVAS (Rounds & Matches) */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden flex p-6 gap-6 custom-scrollbar bg-slate-200/30 dark:bg-black/20 transition-colors duration-300">
          {rounds.map((round) => (
            <div key={round.id} className="w-80 flex flex-col shrink-0 h-full">
              <div className="flex justify-between items-center mb-4 px-1 group relative">
                <input
                  value={round.name}
                  onChange={(e) =>
                    setRounds(
                      rounds.map((r) =>
                        r.id === round.id ? { ...r, name: e.target.value } : r,
                      ),
                    )
                  }
                  className="font-black uppercase tracking-widest text-sm outline-none bg-transparent border-b border-transparent focus:border-cyan-500 transition-colors w-full pb-1 text-slate-900 dark:text-white"
                  title="Click to edit round name"
                />
                <Edit3
                  size={14}
                  className="absolute right-2 opacity-30 group-hover:opacity-100 transition-opacity text-slate-500 dark:text-slate-400 pointer-events-none"
                />
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar pb-20">
                {matches
                  .filter((m) => m.roundId === round.id)
                  .map((match) => (
                    /* 🔥 THE DRAGGABLE MATCH CARD */
                    <div
                      key={match.id}
                      draggable
                      onDragStart={(e) => {
                        e.stopPropagation();
                        e.dataTransfer.setData("type", "match");
                        e.dataTransfer.setData("draggedMatchId", match.id);
                      }}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleMatchDrop(e, match.id, round.id)}
                      className="p-3 rounded-xl border shadow-sm cursor-grab active:cursor-grabbing hover:border-indigo-400 transition-all bg-white border-slate-200 dark:bg-[#1C2128] dark:border-white/10"
                    >
                      <div className="flex justify-between items-center border-b pb-2 mb-2 border-slate-100 dark:border-white/10 transition-colors">
                        <div className="flex items-center gap-2">
                          <GripVertical
                            size={14}
                            className="text-gray-400 opacity-50 shrink-0"
                          />
                          <span className="bg-cyan-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded">
                            {match.id}
                          </span>
                          <input
                            value={match.title}
                            onChange={(e) =>
                              updateMatchTitle(match.id, e.target.value)
                            }
                            className="text-xs font-bold outline-none bg-transparent w-24 text-slate-900 dark:text-white"
                            placeholder="Match Title"
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setActiveConfigMatch(match.id);
                              setTempMatchId(match.id);
                            }}
                            title="Match Settings"
                            className="p-1.5 rounded-md transition-colors bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-white/5 dark:hover:bg-white/10 dark:text-gray-400"
                          >
                            <Settings size={14} />
                          </button>
                          <button
                            onClick={() => deleteMatch(match.id)}
                            title="Delete Match"
                            className="p-1.5 rounded-md transition-colors bg-red-50 hover:bg-red-100 text-red-500 dark:bg-red-500/10 dark:hover:bg-red-500/20 dark:text-red-400"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      {renderSlot(match, "slotA")}
                      <div className="text-center text-[8px] font-black italic opacity-30 my-0.5 text-slate-900 dark:text-white">
                        VS
                      </div>
                      {renderSlot(match, "slotB")}
                    </div>
                  ))}
                <button
                  onClick={() => addMatchToRound(round.id)}
                  className="w-full py-3 rounded-xl border border-dashed flex items-center justify-center gap-2 text-xs font-bold uppercase transition-colors border-slate-300 text-slate-500 hover:bg-slate-50 hover:text-cyan-600 hover:border-cyan-300 dark:border-white/20 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-cyan-400 dark:hover:border-cyan-500/50"
                >
                  <Plus size={14} /> Add Match Here
                </button>
              </div>
            </div>
          ))}
          <div className="w-80 shrink-0 h-full">
            <button
              onClick={addRound}
              className="w-full h-24 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 text-xs font-black uppercase tracking-widest transition-colors border-slate-300 text-slate-400 hover:bg-slate-50 hover:text-cyan-600 dark:border-white/10 dark:text-gray-500 dark:hover:bg-white/5 dark:hover:text-cyan-400"
            >
              <Plus size={20} /> Add Next Round
            </button>
          </div>
        </div>
      </div>

      {/* 🔥 WIZARD MODAL */}
      {showWizard && (
        <div className="fixed inset-0 z-50 bg-black/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-[420px] p-6 rounded-3xl border shadow-2xl bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-800 transition-colors">
            <h3 className="text-lg font-black uppercase mb-4 text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
              <Wand2 size={18} /> Bracket Wizard
            </h3>

            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setWizardMode("standard")}
                className={`flex-1 py-2 rounded-lg font-bold text-[9px] sm:text-[10px] uppercase tracking-wider transition-all border ${
                  wizardMode === "standard"
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                }`}
              >
                Knockout
              </button>
              <button
                onClick={() => setWizardMode("groups_knockout")}
                className={`flex-1 py-2 rounded-lg font-bold text-[9px] sm:text-[10px] uppercase tracking-wider transition-all border ${
                  wizardMode === "groups_knockout"
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                }`}
              >
                Groups + KO
              </button>
              <button
                onClick={() => setWizardMode("round_robin")}
                className={`flex-1 py-2 rounded-lg font-bold text-[9px] sm:text-[10px] uppercase tracking-wider transition-all border ${
                  wizardMode === "round_robin"
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                }`}
              >
                Round Robin
              </button>
            </div>

            {wizardMode === "round_robin" ? (
              <>
                <p className="text-[11px] leading-relaxed mb-4 font-bold text-slate-500 dark:text-slate-400">
                  Generates a pure league schedule followed by Knockouts
                  (Semis/Finals).
                </p>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase mb-2 block text-slate-500 dark:text-slate-400">
                      Total Teams
                    </label>
                    <input
                      type="number"
                      min="2"
                      value={wizardTeamsCount}
                      onChange={(e) =>
                        setWizardTeamsCount(Number(e.target.value))
                      }
                      className="w-full p-3 rounded-xl border outline-none font-black text-sm bg-slate-50 border-slate-200 dark:bg-black/40 dark:border-white/10 dark:text-white transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase mb-2 block text-slate-500 dark:text-slate-400">
                      Top Teams Advance
                    </label>
                    <select
                      value={wizardRoundRobinAdvancing}
                      onChange={(e) =>
                        setWizardRoundRobinAdvancing(Number(e.target.value))
                      }
                      className="w-full p-3 rounded-xl border outline-none font-black text-sm bg-slate-50 border-slate-200 dark:bg-black/40 dark:border-white/10 dark:text-white transition-colors"
                    >
                      <option value={2}>Top 2 (Direct to Final)</option>
                      <option value={4}>Top 4 (Semi-Finals)</option>
                      <option value={8}>Top 8 (Quarter-Finals)</option>
                    </select>
                  </div>
                </div>
              </>
            ) : wizardMode === "standard" ? (
              <>
                <p className="text-xs mb-4 text-slate-500 dark:text-slate-400">
                  Enter the number of teams. The wizard will automatically map
                  perfect powers of 2 and place Byes where necessary.
                </p>
                <label className="text-[10px] font-bold uppercase mb-2 block text-slate-500 dark:text-slate-400">
                  Total Teams
                </label>
                <input
                  type="number"
                  min="2"
                  value={wizardTeamsCount}
                  onChange={(e) => setWizardTeamsCount(Number(e.target.value))}
                  className="w-full p-4 rounded-xl border outline-none font-black text-xl mb-4 bg-slate-50 border-slate-200 text-indigo-600 dark:bg-black/40 dark:border-white/10 dark:text-indigo-400 transition-colors"
                />
              </>
            ) : (
              <>
                <p className="text-[11px] leading-relaxed mb-4 font-bold text-slate-500 dark:text-slate-400">
                  Generates an interleaved Round Robin Stage followed by a
                  Knockout bracket.
                </p>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase mb-1 block text-slate-500 dark:text-slate-400">
                      Number of Groups
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={wizardGroupCount}
                      onChange={(e) =>
                        setWizardGroupCount(Number(e.target.value))
                      }
                      className="w-full p-3 rounded-xl border outline-none font-black text-sm bg-slate-50 border-slate-200 dark:bg-black/40 dark:border-white/10 dark:text-white transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase mb-1 block text-slate-500 dark:text-slate-400">
                      Teams Per Group
                    </label>
                    <input
                      type="number"
                      min="2"
                      value={wizardTeamsPerGroup}
                      onChange={(e) =>
                        setWizardTeamsPerGroup(Number(e.target.value))
                      }
                      className="w-full p-3 rounded-xl border outline-none font-black text-sm bg-slate-50 border-slate-200 dark:bg-black/40 dark:border-white/10 dark:text-white transition-colors"
                    />
                  </div>
                </div>
                <div className="mb-4">
                  <label className="text-[10px] font-bold uppercase mb-1 block text-slate-500 dark:text-slate-400">
                    Advancing (Per Group)
                  </label>
                  <select
                    value={wizardAdvancing}
                    onChange={(e) => setWizardAdvancing(Number(e.target.value))}
                    className="w-full p-3 rounded-xl border outline-none font-black text-sm bg-slate-50 border-slate-200 dark:bg-black/40 dark:border-white/10 dark:text-white transition-colors"
                  >
                    <option value={1}>
                      Top 1 (Total {wizardGroupCount * 1} advance)
                    </option>
                    <option value={2}>
                      Top 2 (Total {wizardGroupCount * 2} advance)
                    </option>
                    <option value={3}>
                      Top 3 (Total {wizardGroupCount * 3} advance)
                    </option>
                    <option value={4}>
                      Top 4 (Total {wizardGroupCount * 4} advance)
                    </option>
                  </select>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-xl border mb-3 bg-indigo-50 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-500/30 transition-colors">
                  <input
                    type="checkbox"
                    id="interleaveToggle"
                    checked={wizardInterleaveGroups}
                    onChange={(e) =>
                      setWizardInterleaveGroups(e.target.checked)
                    }
                    className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
                  />
                  <label
                    htmlFor="interleaveToggle"
                    className="text-[10px] font-bold uppercase tracking-widest cursor-pointer text-slate-900 dark:text-white"
                  >
                    Interleave Group Matches
                  </label>
                </div>
              </>
            )}

            <div className="flex items-center gap-3 p-3 rounded-xl border mb-6 bg-indigo-50 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-500/30 transition-colors">
              <input
                type="checkbox"
                id="thirdPlaceToggle"
                checked={wizardIncludeThirdPlace}
                onChange={(e) => setWizardIncludeThirdPlace(e.target.checked)}
                className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
              />
              <label
                htmlFor="thirdPlaceToggle"
                className="text-[10px] font-bold uppercase tracking-widest cursor-pointer text-slate-900 dark:text-white"
              >
                Generate 3rd Place Match
              </label>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowWizard(false)}
                className="flex-1 py-3 rounded-xl font-bold uppercase tracking-widest text-[10px] transition-all bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateWizard}
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold uppercase tracking-widest text-[10px] transition-all active:scale-95 shadow-lg shadow-indigo-500/30"
              >
                Generate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🔴 MATCH-LEVEL SETTINGS MODAL */}
      {activeConfigMatch && (
        <div className="fixed inset-0 z-50 bg-black/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-sm p-6 rounded-3xl border shadow-2xl bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-800 transition-colors">
            <h3 className="text-lg font-black uppercase mb-4 text-cyan-600 dark:text-cyan-400 flex items-center gap-2">
              <Calendar size={18} /> Match Settings
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase mb-1 block text-slate-500 dark:text-slate-400">
                  Match ID (Code)
                </label>
                <input
                  type="text"
                  value={tempMatchId}
                  onChange={(e) => setTempMatchId(e.target.value.toUpperCase())}
                  className="w-full p-2.5 rounded-xl border outline-none font-black text-sm uppercase tracking-wider bg-cyan-50 border-cyan-200 text-cyan-800 dark:bg-cyan-900/20 dark:border-cyan-500/30 dark:text-cyan-400 transition-colors"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase mb-1 block text-slate-500 dark:text-slate-400">
                    Overs
                  </label>
                  <input
                    type="number"
                    value={
                      matches.find((m) => m.id === activeConfigMatch)?.settings
                        ?.overs || ""
                    }
                    onChange={(e) =>
                      setMatches(
                        matches.map((m) =>
                          m.id === activeConfigMatch
                            ? {
                                ...m,
                                settings: {
                                  ...m.settings,
                                  overs: e.target.value,
                                },
                              }
                            : m,
                        ),
                      )
                    }
                    className="w-full p-2.5 rounded-xl border outline-none font-bold text-sm bg-slate-50 border-slate-200 dark:bg-black/40 dark:border-white/10 dark:text-white transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase mb-1 block text-slate-500 dark:text-slate-400">
                    Time
                  </label>
                  <input
                    type="time"
                    value={
                      matches.find((m) => m.id === activeConfigMatch)?.settings
                        ?.time || ""
                    }
                    onChange={(e) =>
                      setMatches(
                        matches.map((m) =>
                          m.id === activeConfigMatch
                            ? {
                                ...m,
                                settings: {
                                  ...m.settings,
                                  time: e.target.value,
                                },
                              }
                            : m,
                        ),
                      )
                    }
                    className="w-full p-2.5 rounded-xl border outline-none font-bold text-sm bg-slate-50 border-slate-200 dark:bg-black/40 dark:border-white/10 dark:text-white transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase mb-1 flex items-center gap-1 text-slate-500 dark:text-slate-400">
                  <Calendar size={10} /> Date
                </label>
                <input
                  type="date"
                  value={
                    matches.find((m) => m.id === activeConfigMatch)?.settings
                      ?.date || ""
                  }
                  onChange={(e) =>
                    setMatches(
                      matches.map((m) =>
                        m.id === activeConfigMatch
                          ? {
                              ...m,
                              settings: { ...m.settings, date: e.target.value },
                            }
                          : m,
                      ),
                    )
                  }
                  className="w-full p-2.5 rounded-xl border outline-none font-bold text-sm bg-slate-50 border-slate-200 dark:bg-black/40 dark:border-white/10 dark:text-white transition-colors"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase mb-1 flex items-center gap-1 text-slate-500 dark:text-slate-400">
                  <MapPin size={10} /> Venue
                </label>
                <input
                  type="text"
                  placeholder="e.g. Center Court"
                  value={
                    matches.find((m) => m.id === activeConfigMatch)?.settings
                      ?.venue || ""
                  }
                  onChange={(e) =>
                    setMatches(
                      matches.map((m) =>
                        m.id === activeConfigMatch
                          ? {
                              ...m,
                              settings: {
                                ...m.settings,
                                venue: e.target.value,
                              },
                            }
                          : m,
                      ),
                    )
                  }
                  className="w-full p-2.5 rounded-xl border outline-none font-bold text-sm bg-slate-50 border-slate-200 dark:bg-black/40 dark:border-white/10 dark:text-white transition-colors"
                />
              </div>
            </div>
            <button
              onClick={handleCloseSettingsModal}
              className="w-full mt-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold uppercase tracking-widest text-xs transition-all active:scale-95"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* 🟢 GLOBAL SETTINGS MODAL */}
      {showGlobalConfig && (
        <div className="fixed inset-0 z-50 bg-black/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-md p-6 rounded-3xl border shadow-2xl bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-800 transition-colors">
            <h3 className="text-lg font-black uppercase mb-1 text-cyan-600 dark:text-cyan-500 flex items-center gap-2">
              <Settings size={18} /> Global Match Settings
            </h3>
            <p className="text-[10px] uppercase font-bold mb-4 text-slate-500 dark:text-slate-400">
              These defaults apply to all NEW matches and Auto-Schedules.
            </p>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase mb-1 flex items-center gap-1 text-slate-500 dark:text-slate-400">
                    <Calendar size={10} /> Starting Date
                  </label>
                  <input
                    type="date"
                    value={globalSettings.date}
                    onChange={(e) =>
                      setGlobalSettings({
                        ...globalSettings,
                        date: e.target.value,
                      })
                    }
                    className="w-full p-2.5 rounded-xl border outline-none text-sm font-bold bg-slate-50 border-slate-200 dark:bg-black/40 dark:border-white/10 dark:text-white transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase mb-1 flex items-center gap-1 text-slate-500 dark:text-slate-400">
                    <Clock size={10} /> Start Time
                  </label>
                  <input
                    type="time"
                    value={globalSettings.time}
                    onChange={(e) =>
                      setGlobalSettings({
                        ...globalSettings,
                        time: e.target.value,
                      })
                    }
                    className="w-full p-2.5 rounded-xl border outline-none text-sm font-bold bg-slate-50 border-slate-200 dark:bg-black/40 dark:border-white/10 dark:text-white transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase mb-1 block text-slate-500 dark:text-slate-400">
                  Default Venue
                </label>
                <input
                  type="text"
                  placeholder="e.g. Wankhede Stadium"
                  value={globalSettings.venue}
                  onChange={(e) =>
                    setGlobalSettings({
                      ...globalSettings,
                      venue: e.target.value,
                    })
                  }
                  className="w-full p-2.5 rounded-xl border outline-none text-sm font-bold bg-slate-50 border-slate-200 dark:bg-black/40 dark:border-white/10 dark:text-white transition-colors"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="text-[10px] font-bold uppercase mb-1 block text-slate-500 dark:text-slate-400">
                    Overs
                  </label>
                  <input
                    type="number"
                    value={globalSettings.overs}
                    onChange={(e) =>
                      setGlobalSettings({
                        ...globalSettings,
                        overs: Number(e.target.value),
                      })
                    }
                    className="w-full p-2.5 rounded-xl border outline-none text-sm font-bold bg-slate-50 border-slate-200 dark:bg-black/40 dark:border-white/10 dark:text-white transition-colors"
                  />
                </div>
                <div className="col-span-1">
                  <label className="text-[10px] font-bold uppercase mb-1 block text-slate-500 dark:text-slate-400">
                    Duration (m)
                  </label>
                  <input
                    type="number"
                    value={globalSettings.matchDuration}
                    onChange={(e) =>
                      setGlobalSettings({
                        ...globalSettings,
                        matchDuration: Number(e.target.value),
                      })
                    }
                    className="w-full p-2.5 rounded-xl border outline-none text-sm font-bold bg-slate-50 border-slate-200 dark:bg-black/40 dark:border-white/10 dark:text-white transition-colors"
                  />
                </div>
                <div className="col-span-1">
                  <label className="text-[10px] font-bold uppercase mb-1 block text-slate-500 dark:text-slate-400">
                    Gap (m)
                  </label>
                  <input
                    type="number"
                    value={globalSettings.matchGap}
                    onChange={(e) =>
                      setGlobalSettings({
                        ...globalSettings,
                        matchGap: Number(e.target.value),
                      })
                    }
                    className="w-full p-2.5 rounded-xl border outline-none text-sm font-bold bg-slate-50 border-slate-200 dark:bg-black/40 dark:border-white/10 dark:text-white transition-colors"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 mt-6">
              <button
                onClick={handleClearEntireBracket}
                className="w-full py-3 mb-2 rounded-xl font-black uppercase tracking-widest text-[10px] border transition-all flex justify-center items-center gap-2 shadow-sm bg-red-50 text-red-600 border-red-200 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-500 dark:border-red-500/30 dark:hover:bg-red-900/40"
              >
                <Trash2 size={14} /> Clear Entire Bracket
              </button>
              <button
                onClick={applyChronologicalSettings}
                className="w-full py-3 rounded-xl font-bold uppercase tracking-widest text-[10px] border transition-all bg-purple-50 text-purple-600 border-purple-200 hover:bg-purple-100 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-500/30 dark:hover:bg-purple-900/40"
              >
                Auto-Schedule Current Matches
              </button>
              <button
                onClick={() => setShowGlobalConfig(false)}
                className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold uppercase tracking-widest text-xs transition-all active:scale-95"
              >
                Save Defaults & Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
