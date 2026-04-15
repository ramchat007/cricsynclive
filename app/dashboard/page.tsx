"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { CldUploadWidget } from "next-cloudinary";
import { PlusCircle, Image as ImageIcon } from "lucide-react";
import Link from "next/link";

export default function DashboardHub() {
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTournamentName, setNewTournamentName] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [newStartDate, setNewStartDate] = useState("");
  const [newEndDate, setNewEndDate] = useState("");

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
      location: newLocation, // NEW
      start_date: newStartDate || null, // NEW
      end_date: newEndDate || null, // NEW
      banner_url: bannerUrl,
      status: "upcoming",
    });

    if (!error) {
      setShowCreateModal(false);
      setNewTournamentName("");
      setNewLocation("");
      setNewStartDate("");
      setNewEndDate("");
      setBannerUrl("");
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
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xl hover:scale-[1.02] transition-transform">
            {/* Banner Image */}
            <div
              className="h-32 bg-slate-800 bg-cover bg-center"
              style={{
                backgroundImage: `url(${t.banner_url || "https://placehold.co/400x200/1e293b/a1a1aa?text=No+Banner"})`,
              }}
            />
            <div className="p-6">
              <span
                className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded border ${
                  t.status === "live"
                    ? "bg-red-500/10 text-red-500 border-red-500/20"
                    : "bg-teal-500/10 text-teal-500 border-teal-500/20"
                }`}>
                {t.status}
              </span>
              <h2 className="text-xl font-bold mt-3 mb-1 text-slate-900 dark:text-white">
                {t.name}
              </h2>
              <p className="text-sm text-slate-500">
                {t.overs_limit} Overs per match
              </p>

              <Link href={`/t/${t.id}`}>
                <button className="w-full mt-6 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-bold py-3 rounded-lg transition-colors">
                  Manage Console ➔
                </button>
              </Link>
            </div>
          </div>
        ))}
        {tournaments.length === 0 && (
          <div className="col-span-3 text-center py-20 text-slate-500 font-bold">
            No tournaments yet. Click "Create New" to start your legacy.
          </div>
        )}
      </div>

      {/* CREATE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 max-w-md w-full rounded-3xl p-8 border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95">
            <h2 className="text-2xl font-black uppercase mb-6 text-slate-900 dark:text-white">
              New Tournament
            </h2>

            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
              Tournament Name
            </label>
            <input
              value={newTournamentName}
              onChange={(e) => setNewTournamentName(e.target.value)}
              className="w-full mt-1 mb-6 bg-slate-100 dark:bg-black border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-slate-900 dark:text-white outline-none focus:border-teal-500"
              placeholder="e.g. Friends League 2026"
            />

            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
              Cover Banner
            </label>
            <div className="mt-1 mb-8">
              <CldUploadWidget
                uploadPreset={String(
                  process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
                )}
                options={{
                  sources: ["local", "url", "camera"],
                  multiple: false,
                  cropping: true, // Optional: gives a nice UI for logos/banners
                }}
                onSuccess={(result: any) =>
                  setBannerUrl(result.info.secure_url)
                }>
                {({ open }) => (
                  <button
                    onClick={() => open()}
                    className="w-full border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-teal-500 text-slate-500 py-8 rounded-xl font-bold flex flex-col items-center justify-center gap-2 transition-colors">
                    {bannerUrl ? (
                      <span className="text-teal-500">
                        ✅ Image Uploaded! Click to change.
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
            <div className="grid grid-cols-1 gap-4 mb-6">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Location / Ground
                </label>
                <input
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  className="w-full mt-1 bg-slate-100 dark:bg-black border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm font-bold outline-none focus:border-teal-500"
                  placeholder="e.g. Shivaji Park, Mumbai"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={newStartDate}
                    onChange={(e) => setNewStartDate(e.target.value)}
                    className="w-full mt-1 bg-slate-100 dark:bg-black border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm font-bold outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={newEndDate}
                    onChange={(e) => setNewEndDate(e.target.value)}
                    className="w-full mt-1 bg-slate-100 dark:bg-black border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm font-bold outline-none focus:border-teal-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold py-3 rounded-xl hover:opacity-80">
                Cancel
              </button>
              <button
                onClick={createTournament}
                className="flex-1 bg-teal-600 hover:bg-teal-500 text-white font-bold py-3 rounded-xl">
                Launch Setup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
