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
} from "lucide-react";
import Link from "next/link";

export default function DashboardHub() {
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTournamentName, setNewTournamentName] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [newStartDate, setNewStartDate] = useState("");
  const [newEndDate, setNewEndDate] = useState("");
  const [newFormat, setNewFormat] = useState("T20");
  const [newSquadLimit, setNewSquadLimit] = useState(15);

  useEffect(() => {
    // 1. Fetch initial data on load
    fetchMyTournaments();

    // 2. MAGIC: Listen for background database trigger updates!
    const channel = supabase
      .channel("tournament-updates")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "tournaments",
        },
        (payload) => {
          // When the DB trigger fires, instantly update the UI badge without a reload!
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

    // Cleanup the listener when the user leaves the page
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
      status: "upcoming", // Defaults to upcoming
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

  // Helper function to render beautiful, dynamic status badges
  const renderStatusBadge = (status: string) => {
    const s = status?.toLowerCase() || "upcoming";

    if (s === "live") {
      return (
        <span className="w-max flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded bg-red-500/10 text-red-500 border border-red-500/20 shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
          Live Now
        </span>
      );
    }

    if (s === "completed") {
      return (
        <span className="w-max flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded bg-slate-500/10 text-slate-500 border border-slate-500/20">
          <CheckCircle2 size={10} />
          Completed
        </span>
      );
    }

    return (
      <span className="w-max flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded bg-amber-500/10 text-amber-600 border border-amber-500/20">
        <CalendarDays size={10} />
        Upcoming
      </span>
    );
  };

  return (
    <div className="max-w-7xl mx-auto p-6 font-sans">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-black uppercase tracking-widest text-slate-900">
          My Tournaments
        </h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="accent-bg text-[var(--background)] font-bold py-3 px-6 rounded-xl flex items-center gap-2 hover:opacity-90 active:scale-95 transition-all shadow-lg">
          <PlusCircle size={20} /> Create New
        </button>
      </div>

      {/* TOURNAMENT GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {tournaments.map((t) => (
          <div
            key={t.id}
            className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col group">
            {/* Banner Image - Replaced dark bg with slate-100 mapping */}
            <div
              className="h-32 bg-slate-100 bg-cover bg-center shrink-0"
              style={{
                backgroundImage: `url(${t.banner_url || "https://placehold.co/400x200/e2e8f0/64748b?text=No+Banner"})`,
              }}
            />
            <div className="p-6 flex-1 flex flex-col">
              {/* Dynamic Status Badge */}
              {renderStatusBadge(t.status)}

              <h2 className="text-xl font-black uppercase tracking-tight mt-3 mb-1 text-slate-900 truncate group-hover:accent-text transition-colors">
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

              <Link href={`/t/${t.id}`} className="mt-6 block">
                <button className="w-full bg-slate-100 hover:bg-slate-200 text-slate-900 font-black uppercase tracking-widest text-[10px] py-4 rounded-xl transition-colors active:scale-95">
                  Manage Console ➔
                </button>
              </Link>
            </div>
          </div>
        ))}

        {/* EMPTY STATE */}
        {tournaments.length === 0 && (
          <div className="col-span-full text-center py-20 border-2 border-dashed border-slate-200 rounded-[2rem] bg-[var(--glass-bg)] backdrop-blur-sm">
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

      {/* CREATE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-[var(--overlay-bg)] backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white max-w-lg w-full rounded-[2rem] p-8 border border-slate-200 shadow-2xl animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <h2 className="text-2xl font-black uppercase tracking-tighter mb-6 text-slate-900">
              New <span className="accent-text">Tournament</span>
            </h2>

            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">
              Tournament Name
            </label>
            <input
              value={newTournamentName}
              onChange={(e) => setNewTournamentName(e.target.value)}
              className="w-full mb-5 bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none focus:border-[var(--accent)] transition-colors text-slate-900 placeholder:text-slate-400"
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
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none focus:border-[var(--accent)] transition-colors text-slate-900">
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
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none focus:border-[var(--accent)] transition-colors text-slate-900"
                />
              </div>
            </div>

            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">
              Location / Ground
            </label>
            <input
              value={newLocation}
              onChange={(e) => setNewLocation(e.target.value)}
              className="w-full mb-5 bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none focus:border-[var(--accent)] transition-colors text-slate-900 placeholder:text-slate-400"
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
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none focus:border-[var(--accent)] transition-colors text-slate-900"
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
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none focus:border-[var(--accent)] transition-colors text-slate-900"
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
                  croppingAspectRatio: 1,
                  showCompletedButton: true,
                }}
                onSuccess={(result: any) =>
                  setBannerUrl(result.info.secure_url)
                }>
                {({ open }) => (
                  <button
                    onClick={() => open()}
                    className="w-full bg-slate-50 border-2 border-dashed border-slate-200 hover:border-[var(--accent)] text-slate-500 py-6 rounded-xl font-bold flex flex-col items-center justify-center gap-2 transition-colors focus:outline-none">
                    {bannerUrl ? (
                      <span className="accent-text flex flex-col items-center gap-1">
                        <CheckCircle2 size={24} />
                        Banner Uploaded! Click to replace.
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
                onClick={() => setShowCreateModal(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-900 font-black uppercase tracking-widest text-[10px] py-4 rounded-xl transition-colors active:scale-95">
                Cancel
              </button>
              <button
                onClick={createTournament}
                className="flex-1 accent-bg text-[var(--background)] font-black uppercase tracking-widest text-[10px] py-4 rounded-xl shadow-lg hover:opacity-90 transition-all active:scale-95">
                Launch Setup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
