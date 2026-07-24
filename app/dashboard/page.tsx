"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { CldUploadWidget } from "next-cloudinary";
import {
  PlusCircle,
  Image as ImageIcon,
  MapPin,
  Activity,
  CalendarDays,
  CheckCircle2,
  Zap,
  Loader2,
  Swords,
  Trophy,
  User,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function DashboardHub() {
  const router = useRouter();
  const [tournaments, setTournaments] = useState<any[]>([]);

  // Standard Tournament State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTournamentName, setNewTournamentName] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [newStartDate, setNewStartDate] = useState("");
  const [newEndDate, setNewEndDate] = useState("");
  const [newFormat, setNewFormat] = useState("T20");
  const [newSquadLimit, setNewSquadLimit] = useState(15);

  // Quick Match State
  const [showQuickMatchModal, setShowQuickMatchModal] = useState(false);
  const [qmTeamA, setQmTeamA] = useState("");
  const [qmTeamB, setQmTeamB] = useState("");
  const [qmOvers, setQmOvers] = useState(5);
  const [isStartingQM, setIsStartingQM] = useState(false);

  useEffect(() => {
    fetchMyTournaments();

    const channel = supabase
      .channel("tournament-updates")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "tournaments" },
        (payload) => {
          setTournaments((currentTournaments) =>
            currentTournaments.map((t) =>
              t.id === payload.new.id
                ? { ...t, status: payload.new.status }
                : t,
            ),
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchMyTournaments = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("tournaments")
      .select("*")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false });

    if (data) setTournaments(data);
  };

  const handleOpenCreateModal = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    // --- SAAS GUARD: 1 TOURNAMENT LIMIT FOR FREE TIER ---
    const { count } = await supabase
      .from("tournaments")
      .select("*", { count: "exact", head: true })
      .eq("owner_id", user.id);

    if (count && count >= 1) {
      const { data: proData } = await supabase
        .from("tournaments")
        .select("id")
        .eq("owner_id", user.id)
        .in("subscription_tier", ["pro", "broadcast"])
        .limit(1);

      if (!proData || proData.length === 0) {
        alert(
          "🔒 Free Tier Limit Reached!\n\nYou can only manage 1 active tournament on the Basic plan. Please upgrade your existing tournament to Pro to unlock unlimited creations.",
        );
        return;
      }
    }
    setShowCreateModal(true);
  };

  const createTournament = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("tournaments").insert({
      owner_id: user.id,
      name: newTournamentName,
      location: newLocation,
      start_date: newStartDate || null,
      end_date: newEndDate || null,
      banner_url: bannerUrl,
      format: newFormat,
      squad_limit: newSquadLimit,
      status: "upcoming",
      subscription_tier: "free",
    });

    if (!error) {
      setShowCreateModal(false);
      setNewTournamentName("");
      setNewLocation("");
      setNewStartDate("");
      setNewEndDate("");
      setBannerUrl("");
      setNewFormat("T20");
      setNewSquadLimit(15);
      fetchMyTournaments();
    } else {
      alert("Error creating tournament: " + error.message);
    }
  };

  const renderStatusBadge = (status: string) => {
    const s = status?.toLowerCase() || "upcoming";

    if (s === "live")
      return (
        <span className="w-max flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded bg-red-500/10 text-red-500 border border-red-500/20 shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>{" "}
          Live Now
        </span>
      );
    if (s === "completed")
      return (
        <span className="w-max flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded bg-slate-500/10 text-slate-500 border border-slate-500/20">
          <CheckCircle2 size={10} /> Completed
        </span>
      );
    return (
      <span className="w-max flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded bg-amber-500/10 text-amber-600 border border-amber-500/20">
        <CalendarDays size={10} /> Upcoming
      </span>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-24 font-sans w-full">
      {/* TOP NAVIGATION TABS */}
      <div className="flex items-center gap-1.5 sm:gap-2 mb-8 bg-slate-100 p-1.5 rounded-2xl w-full sm:w-fit overflow-x-auto custom-scrollbar">
        <Link
          href="/dashboard"
          className="flex items-center justify-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs font-black uppercase tracking-wider px-4 sm:px-5 py-2.5 rounded-xl bg-white text-slate-900 shadow-sm transition-all whitespace-nowrap shrink-0 flex-1 sm:flex-none">
          <Trophy size={14} className="text-amber-500 shrink-0" /> Tournaments
        </Link>
        <Link
          href="/my-matches"
          className="flex items-center justify-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs font-black uppercase tracking-wider px-4 sm:px-5 py-2.5 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-200/50 transition-all whitespace-nowrap shrink-0 flex-1 sm:flex-none">
          <Swords size={14} className="shrink-0" /> My Matches
        </Link>
        <Link
          href="/profile/edit"
          className="flex items-center justify-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs font-black uppercase tracking-wider px-4 sm:px-5 py-2.5 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-200/50 transition-all whitespace-nowrap shrink-0 flex-1 sm:flex-none">
          <User size={14} className="shrink-0" /> Edit Profile
        </Link>
      </div>

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-widest text-slate-900">
            My Tournaments
          </h1>
          <p className="text-slate-500 font-bold text-xs mt-1">
            Manage your leagues, schedules, and live scoring.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <Link
            href="/quick-match"
            className="flex-1 md:flex-none bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 font-black uppercase tracking-widest text-xs py-3 px-6 rounded-xl flex items-center justify-center gap-2 hover:bg-emerald-500 hover:text-white transition-all shadow-sm">
            <Zap size={16} /> Quick Match
          </Link>

          <button
            onClick={handleOpenCreateModal}
            className="flex-1 md:flex-none bg-slate-900 font-black uppercase tracking-widest text-xs py-3 px-6 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-800 active:scale-95 transition-all shadow-lg">
            <PlusCircle size={16} /> Create New
          </button>
        </div>
      </div>

      {/* TOURNAMENT GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {tournaments.map((t) => (
          <div
            key={t.id}
            className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col group">
            <div
              className="h-32 bg-slate-100 bg-cover bg-center shrink-0 relative"
              style={{
                backgroundImage: `url(${t.banner_url || "https://placehold.co/400x200/e2e8f0/64748b?text=No+Banner"})`,
              }}>
              {t.subscription_tier === "pro" && (
                <div className="absolute top-3 right-3 bg-emerald-500 text-white text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md shadow-lg">
                  PRO
                </div>
              )}
              {t.subscription_tier === "broadcast" && (
                <div className="absolute top-3 right-3 bg-purple-500 text-white text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md shadow-lg">
                  BROADCAST
                </div>
              )}
            </div>

            <div className="p-6 flex-1 flex flex-col">
              {renderStatusBadge(t.status)}
              <h2 className="text-xl font-black uppercase tracking-tight mt-3 mb-1 text-slate-900 truncate group-hover:text-red-500 transition-colors">
                {t.name}
              </h2>
              {t.location && (
                <p className="text-xs font-bold text-slate-500 flex items-center gap-1.5 mb-4 truncate">
                  <MapPin size={14} className="opacity-50" /> {t.location}
                </p>
              )}

              <div className="flex gap-2 mt-auto">
                <span className="bg-slate-100 text-slate-600 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded">
                  Format: {t.format || "T20"}
                </span>
                <span className="bg-slate-100 text-slate-600 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded">
                  Squad: {t.squad_limit || 15}
                </span>
              </div>

              <Link href={`/t/${t.id}/matches`} className="mt-6 block">
                <button className="w-full bg-slate-100 hover:bg-slate-200 text-slate-900 font-black uppercase tracking-widest text-[10px] py-4 rounded-xl transition-colors active:scale-95">
                  Manage Console ➔
                </button>
              </Link>
            </div>
          </div>
        ))}

        {/* EMPTY STATE */}
        {tournaments.length === 0 && (
          <div className="col-span-full text-center py-20 border-2 border-dashed border-slate-200 rounded-[2rem] bg-slate-50">
            <Activity size={40} className="mx-auto text-slate-300 mb-4" />
            <h3 className="text-xl font-black uppercase tracking-widest text-slate-900">
              No Tournaments Yet
            </h3>
            <p className="text-slate-500 font-bold mt-2">
              Click "Create New" to start your legacy.
            </p>
          </div>
        )}
      </div>

      {/* CREATE TOURNAMENT MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white max-w-lg w-full rounded-[2rem] p-8 border border-slate-200 shadow-2xl animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <h2 className="text-2xl font-black uppercase tracking-tighter mb-6 text-slate-900">
              New <span className="text-red-500">Tournament</span>
            </h2>

            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">
              Tournament Name
            </label>
            <input
              value={newTournamentName}
              onChange={(e) => setNewTournamentName(e.target.value)}
              className="w-full mb-5 bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none focus:border-red-500 transition-colors text-slate-900 placeholder:text-slate-400"
              placeholder="e.g. Friends League 2026"
            />

            <div className="grid grid-cols-2 gap-4 mb-5">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">
                  Format
                </label>
                <select
                  value={newFormat}
                  onChange={(e) => setNewFormat(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none focus:border-red-500 transition-colors text-slate-900">
                  <option value="T10">T10</option>
                  <option value="T20">T20</option>
                  <option value="ODI">ODI (50 Over)</option>
                  <option value="Test">Test Match</option>
                  <option value="Box Cricket">Box Cricket</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">
                  Max Squad Size
                </label>
                <input
                  type="number"
                  value={newSquadLimit}
                  onChange={(e) =>
                    setNewSquadLimit(parseInt(e.target.value) || 15)
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none focus:border-red-500 transition-colors text-slate-900"
                />
              </div>
            </div>

            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">
              Location / Ground
            </label>
            <input
              value={newLocation}
              onChange={(e) => setNewLocation(e.target.value)}
              className="w-full mb-5 bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none focus:border-red-500 transition-colors text-slate-900 placeholder:text-slate-400"
              placeholder="e.g. Shivaji Park, Mumbai"
            />

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">
                  Start Date
                </label>
                <input
                  type="date"
                  value={newStartDate}
                  onChange={(e) => setNewStartDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none focus:border-red-500 transition-colors text-slate-900"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">
                  End Date
                </label>
                <input
                  type="date"
                  value={newEndDate}
                  onChange={(e) => setNewEndDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none focus:border-red-500 transition-colors text-slate-900"
                />
              </div>
            </div>

            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">
              Cover Banner
            </label>
            <div className="mb-8">
              <CldUploadWidget
                uploadPreset={String(
                  process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
                )}
                options={{
                  sources: ["local", "url", "camera"],
                  multiple: false,
                  cropping: true,
                  showSkipCropButton: false,
                  showCompletedButton: true,
                }}
                onSuccess={(result: any) => {
                  let url = result.info.secure_url;
                  if (
                    result.info.coordinates &&
                    result.info.coordinates.custom
                  ) {
                    url = url.replace("/upload/", "/upload/c_crop,g_custom/");
                  }
                  setBannerUrl(url);
                }}>
                {({ open }) => (
                  <button
                    type="button"
                    onClick={() => open()}
                    className="w-full bg-slate-50 border-2 border-dashed border-slate-200 hover:border-red-500 text-slate-500 py-6 rounded-xl font-bold flex flex-col items-center justify-center gap-2 transition-colors focus:outline-none">
                    {bannerUrl ? (
                      <span className="text-red-500 flex flex-col items-center gap-1">
                        <CheckCircle2 size={24} /> Banner Uploaded! Click to
                        replace.
                      </span>
                    ) : (
                      <>
                        <ImageIcon size={24} className="opacity-50" />
                        <span className="text-[11px] uppercase tracking-widest">
                          Upload Custom Banner
                        </span>
                      </>
                    )}
                  </button>
                )}
              </CldUploadWidget>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-900 font-black uppercase tracking-widest text-[10px] py-4 rounded-xl transition-colors active:scale-95">
                Cancel
              </button>
              <button
                type="button"
                onClick={createTournament}
                className="flex-1 bg-slate-900 text-white font-black uppercase tracking-widest text-[10px] py-4 rounded-xl shadow-lg hover:bg-slate-800 transition-all active:scale-95">
                Launch Setup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
