"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { CldUploadWidget } from "next-cloudinary";
import { PlusCircle, Image as ImageIcon, MapPin } from "lucide-react";
import Link from "next/link";

export default function DashboardHub() {
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTournamentName, setNewTournamentName] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [newStartDate, setNewStartDate] = useState("");
  const [newEndDate, setNewEndDate] = useState("");

  // NEW: Added format and squad limit states
  const [newFormat, setNewFormat] = useState("T20");
  const [newSquadLimit, setNewSquadLimit] = useState(15);

  useEffect(() => {
    fetchMyTournaments();
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
      format: newFormat, // NEW
      squad_limit: newSquadLimit, // NEW
      status: "upcoming",
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

  return (
    <div className="max-w-7xl mx-auto p-6 font-sans">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-black uppercase tracking-widest text-slate-900 dark:text-white">
          My Tournaments
        </h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-teal-600 hover:bg-teal-500 text-white font-bold py-3 px-6 rounded-xl flex items-center gap-2 transition-all">
          <PlusCircle size={20} /> Create New
        </button>
      </div>

      {/* TOURNAMENT GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {tournaments.map((t) => (
          <div
            key={t.id}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xl hover:scale-[1.02] transition-transform flex flex-col">
            {/* Banner Image */}
            <div
              className="h-32 bg-slate-800 bg-cover bg-center shrink-0"
              style={{
                backgroundImage: `url(${t.banner_url || "https://placehold.co/400x200/1e293b/a1a1aa?text=No+Banner"})`,
              }}
            />
            <div className="p-6 flex-1 flex flex-col">
              <span
                className={`w-max text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded border ${
                  t.status === "live"
                    ? "bg-red-500/10 text-red-500 border-red-500/20"
                    : "bg-teal-500/10 text-teal-500 border-teal-500/20"
                }`}>
                {t.status}
              </span>
              <h2 className="text-xl font-bold mt-3 mb-1 text-slate-900 dark:text-white truncate">
                {t.name}
              </h2>

              {/* UPGRADED CARD INFO */}
              {t.location && (
                <p className="text-xs font-bold text-slate-500 flex items-center gap-1 mb-3 truncate">
                  <MapPin size={12} /> {t.location}
                </p>
              )}
              <div className="flex gap-2 mt-auto">
                <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded">
                  Format: {t.format || "T20"}
                </span>
                <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded">
                  Squad: {t.squad_limit || 15}
                </span>
              </div>

              <Link href={`/t/${t.id}`} className="mt-6 block">
                <button className="w-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-bold py-3 rounded-lg transition-colors">
                  Manage Console ➔
                </button>
              </Link>
            </div>
          </div>
        ))}
        {tournaments.length === 0 && (
          <div className="col-span-full text-center py-20 text-slate-500 font-bold border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
            No tournaments yet. Click "Create New" to start your legacy.
          </div>
        )}
      </div>

      {/* CREATE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 max-w-lg w-full rounded-[2rem] p-8 border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <h2 className="text-2xl font-black uppercase mb-6 text-slate-900 dark:text-white">
              New Tournament
            </h2>

            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 mb-1 block">
              Tournament Name
            </label>
            <input
              value={newTournamentName}
              onChange={(e) => setNewTournamentName(e.target.value)}
              className="w-full mb-4 bg-slate-50 dark:bg-black border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm font-bold outline-none focus:border-teal-500"
              placeholder="e.g. Friends League 2026"
            />

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 mb-1 block">
                  Format
                </label>
                <select
                  value={newFormat}
                  onChange={(e) => setNewFormat(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm font-bold outline-none focus:border-teal-500">
                  <option value="T10">T10</option>
                  <option value="T20">T20</option>
                  <option value="ODI">ODI (50 Over)</option>
                  <option value="Test">Test Match</option>
                  <option value="Box Cricket">Box Cricket</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 mb-1 block">
                  Max Squad Size
                </label>
                <input
                  type="number"
                  value={newSquadLimit}
                  onChange={(e) =>
                    setNewSquadLimit(parseInt(e.target.value) || 15)
                  }
                  className="w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm font-bold outline-none focus:border-teal-500"
                />
              </div>
            </div>

            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 mb-1 block">
              Location / Ground
            </label>
            <input
              value={newLocation}
              onChange={(e) => setNewLocation(e.target.value)}
              className="w-full mb-4 bg-slate-50 dark:bg-black border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm font-bold outline-none focus:border-teal-500"
              placeholder="e.g. Shivaji Park, Mumbai"
            />

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 mb-1 block">
                  Start Date
                </label>
                <input
                  type="date"
                  value={newStartDate}
                  onChange={(e) => setNewStartDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm font-bold outline-none focus:border-teal-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 mb-1 block">
                  End Date
                </label>
                <input
                  type="date"
                  value={newEndDate}
                  onChange={(e) => setNewEndDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm font-bold outline-none focus:border-teal-500"
                />
              </div>
            </div>

            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 mb-1 block">
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
                }}
                onSuccess={(result: any) =>
                  setBannerUrl(result.info.secure_url)
                }>
                {({ open }) => (
                  <button
                    onClick={() => open()}
                    className="w-full border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-teal-500 text-slate-500 py-6 rounded-xl font-bold flex flex-col items-center justify-center gap-2 transition-colors">
                    {bannerUrl ? (
                      <span className="text-teal-500">
                        ✅ Banner Uploaded! Click to replace.
                      </span>
                    ) : (
                      <>
                        <ImageIcon size={24} /> Upload Custom Banner
                      </>
                    )}
                  </button>
                )}
              </CldUploadWidget>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold py-3 rounded-xl hover:opacity-80 transition-opacity">
                Cancel
              </button>
              <button
                onClick={createTournament}
                className="flex-1 bg-teal-600 hover:bg-teal-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-teal-500/20 transition-all">
                Launch Setup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
