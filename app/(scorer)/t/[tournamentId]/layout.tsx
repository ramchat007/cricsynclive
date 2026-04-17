"use client";
import { useEffect, useState, use } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Trophy,
  Users,
  Calendar,
  Gavel,
  Settings,
  Copy,
  CheckCircle2,
  Camera,
  X,
} from "lucide-react";
import { CldUploadWidget } from "next-cloudinary";

export default function TournamentLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tournamentId: string }>;
}) {
  const { tournamentId } = use(params);
  const pathname = usePathname();

  const [tournament, setTournament] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [copied, setCopied] = useState(false);

  // Settings Modal State
  const [showSettings, setShowSettings] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    location: "",
    format: "T20",
    squad_limit: 15,
    is_auction_enabled: true,
  });

  useEffect(() => {
    fetchLayoutData();
  }, [tournamentId]);

  const fetchLayoutData = async () => {
    const { data: tData } = await supabase
      .from("tournaments")
      .select("*")
      .eq("id", tournamentId)
      .single();
    if (tData) {
      setTournament(tData);
      setEditForm({
        name: tData.name,
        location: tData.location,
        format: tData.format || "T20",
        squad_limit: tData.squad_limit || 15,
        is_auction_enabled: tData.is_auction_enabled ?? true,
      });
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session) {
      if (session.user.id === tData?.owner_id) setIsAdmin(true);
      else {
        const { data: pData } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .single();
        if (pData?.role === "super_admin") setIsAdmin(true);
      }
    }
  };

  const copyRegLink = () => {
    navigator.clipboard.writeText(
      `${window.location.origin}/register/${tournamentId}`,
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const updateBanner = async (url: string) => {
    const { error } = await supabase
      .from("tournaments")
      .update({ banner_url: url })
      .eq("id", tournamentId);
    if (!error) fetchLayoutData();
  };

  const saveSettings = async () => {
    const { error } = await supabase
      .from("tournaments")
      .update(editForm)
      .eq("id", tournamentId);
    if (!error) {
      setShowSettings(false);
      fetchLayoutData();
    } else alert("Error saving details");
  };

  if (!tournament)
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center animate-pulse font-black text-slate-400">
        LOADING HUB...
      </div>
    );

  const tabs = [
    { name: "Teams & Squads", href: `/t/${tournamentId}/teams`, icon: Users },
    {
      name: "Match Schedule",
      href: `/t/${tournamentId}/matches`,
      icon: Calendar,
    },
    { name: "Player Roster", href: `/t/${tournamentId}/players`, icon: Trophy },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans pb-20 relative">
      {/* BANNER & HEADER */}
      <div
        className="h-64 md:h-80 w-full bg-slate-900 bg-cover bg-center relative group"
        style={{ backgroundImage: tournament.banner_url ? `url(${tournament.banner_url})` : 'none' }}>
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />

        {/* BANNER EDIT BUTTON (Admins Only) */}
        {isAdmin && (
          <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity z-20">
            <CldUploadWidget
              uploadPreset={String(
                process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
              )}
              onSuccess={(result: any) => updateBanner(result.info.secure_url)}>
              {({ open }) => (
                <button
                  onClick={() => open()}
                  className="bg-black/50 hover:bg-black/80 backdrop-blur-md text-white p-3 rounded-full border border-white/20 transition-all">
                  <Camera size={20} />
                </button>
              )}
            </CldUploadWidget>
          </div>
        )}

        <div className="absolute bottom-0 left-0 w-full p-6 md:p-12 z-10">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="flex gap-2 mb-4">
                {/* <span className="bg-teal-500 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-lg">
                  Season 1
                </span> */}
                <span className="bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-lg">
                  {tournament.format || "T20"}
                </span>
              </div>
              <h1 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tighter drop-shadow-2xl">
                {tournament.name}
              </h1>
              <p className="text-slate-300 font-bold uppercase tracking-widest text-sm mt-2 flex items-center gap-2">
                📍 {tournament.location}
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={copyRegLink}
                className="bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 text-white text-xs font-bold px-4 py-3 rounded-xl flex items-center gap-2 transition-all">
                {copied ? (
                  <CheckCircle2 size={16} className="text-teal-400" />
                ) : (
                  <Copy size={16} />
                )}{" "}
                Link
              </button>
              {isAdmin && (
                <>
                  {tournament.is_auction_enabled && (
                    <Link
                      href={`/t/${tournamentId}/auction`}
                      className="bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold px-4 py-3 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-teal-500/20">
                      <Gavel size={16} /> Auction
                    </Link>
                  )}
                  <button
                    onClick={() => setShowSettings(true)}
                    className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-4 py-3 rounded-xl flex items-center gap-2 transition-all">
                    <Settings size={16} /> Edit
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* TOURNAMENT SETTINGS MODAL */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <h2 className="text-xl font-black uppercase tracking-widest">
                Tournament Settings
              </h2>
              <button
                onClick={() => setShowSettings(false)}
                className="text-slate-400 hover:text-white">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                  Tournament Name
                </label>
                <input
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm({ ...editForm, name: e.target.value })
                  }
                  className="w-full mt-1 bg-slate-50 dark:bg-black border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm font-bold outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                  Location
                </label>
                <input
                  value={editForm.location}
                  onChange={(e) =>
                    setEditForm({ ...editForm, location: e.target.value })
                  }
                  className="w-full mt-1 bg-slate-50 dark:bg-black border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm font-bold outline-none"
                />
              </div>
              <div className="flex items-center justify-between bg-slate-50 dark:bg-black border border-slate-200 dark:border-slate-800 rounded-xl p-4 mt-4">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Enable Franchise Auction
                  </h4>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                    Tracks budgets, base prices, and bidding.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={editForm.is_auction_enabled}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        is_auction_enabled: e.target.checked,
                      })
                    }
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-teal-500"></div>
                </label>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                    Format
                  </label>
                  <select
                    value={editForm.format}
                    onChange={(e) =>
                      setEditForm({ ...editForm, format: e.target.value })
                    }
                    className="w-full mt-1 bg-slate-50 dark:bg-black border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm font-bold outline-none">
                    <option value="T10">T10</option>
                    <option value="T20">T20</option>
                    <option value="ODI">ODI (50 Over)</option>
                    <option value="Test">Test Match</option>
                    <option value="Box Cricket">Box Cricket</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                    Squad Size Limit
                  </label>
                  <input
                    type="number"
                    value={editForm.squad_limit}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        squad_limit: parseInt(e.target.value),
                      })
                    }
                    className="w-full mt-1 bg-slate-50 dark:bg-black border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm font-bold outline-none"
                  />
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-end">
              <button
                onClick={saveSettings}
                className="bg-teal-600 hover:bg-teal-500 text-white font-bold py-3 px-8 rounded-xl transition-all">
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 md:px-12 mt-8">
        <div className="flex overflow-x-auto gap-2 pb-4 mb-8 border-b border-slate-200 dark:border-slate-800 custom-scrollbar hide-scrollbar-on-mobile">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = pathname.includes(tab.href);
            return (
              <Link
                key={tab.name}
                href={tab.href}
                className={`flex items-center gap-2 px-6 py-4 rounded-2xl font-bold text-sm transition-all whitespace-nowrap ${isActive ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xl" : "bg-white dark:bg-slate-900 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800"}`}>
                <Icon size={18} className={isActive ? "" : "opacity-50"} />{" "}
                {tab.name}
              </Link>
            );
          })}
        </div>
        {children}
      </div>
    </div>
  );
}
