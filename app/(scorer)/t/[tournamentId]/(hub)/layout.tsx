"use client";
import { useEffect, useState, use } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Users,
  CalendarDays,
  Shirt,
  ListOrdered,
  Medal,
  Settings,
  Copy,
  CheckCircle2,
  Camera,
  X,
  Trash2,
  Video,
  MonitorPlay,
  ShieldAlert,
  Brackets,
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
    strict_mom_rule: false,
    live_stream_url: "",
  });

  useEffect(() => {
    fetchLayoutData();
  }, [tournamentId]);

  const fetchLayoutData = async () => {
    const { data: tData } = await supabase
      .from("tournaments")
      .select(
        "id, name, location, banner_url, owner_id, format, squad_limit, is_auction_enabled, strict_mom_rule, live_stream_url",
      )
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
        strict_mom_rule: tData.strict_mom_rule ?? false,
        live_stream_url: tData.live_stream_url || "",
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

  const copyLink = (text: string) => {
    navigator.clipboard.writeText(text);
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

  const deleteTournament = async () => {
    const confirmDelete = window.confirm(
      "WARNING: Are you absolutely sure you want to delete this tournament? This will erase all matches, teams, and stats forever.",
    );
    if (confirmDelete) {
      const { error } = await supabase
        .from("tournaments")
        .delete()
        .eq("id", tournamentId);
      if (!error) {
        window.location.href = "/";
      } else {
        alert("Failed to delete tournament.");
      }
    }
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
      icon: CalendarDays,
    },
    {
      name: "Brackets & Fixtures",
      href: `/t/${tournamentId}/brackets`,
      icon: Brackets,
    },
    { name: "Player Roster", href: `/t/${tournamentId}/players`, icon: Shirt },
    {
      name: "Points Table",
      href: `/t/${tournamentId}/standings`,
      icon: ListOrdered,
    },
    {
      name: "Leaderboards",
      href: `/t/${tournamentId}/leaderboards`,
      icon: Medal,
    },
  ];

  if (isAdmin) {
    tabs.push({
      name: "Admin & Scorers",
      href: `/t/${tournamentId}/admin`,
      icon: ShieldAlert,
    });
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans pb-20 relative">
      {/* 1. RESPONSIVE BANNER */}
      <div
        className="w-full bg-slate-900 bg-cover bg-center relative group min-h-[18rem] md:min-h-[22rem] flex flex-col justify-end"
        style={{
          backgroundImage: tournament.banner_url
            ? `url(${tournament.banner_url})`
            : "none",
        }}>
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />

        {isAdmin && (
          <div className="absolute top-4 right-4 md:opacity-0 md:group-hover:opacity-100 transition-opacity z-20">
            <CldUploadWidget
              uploadPreset={String(
                process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
              )}
              onSuccess={(result: any) => updateBanner(result.info.secure_url)}>
              {({ open }) => (
                <button
                  onClick={() => open()}
                  className="bg-black/50 hover:bg-black/80 backdrop-blur-md text-white p-3 rounded-full border border-white/20 transition-all shadow-lg">
                  <Camera size={20} />
                </button>
              )}
            </CldUploadWidget>
          </div>
        )}

        {/* Changed from absolute to relative to allow natural growth on mobile */}
        <div className="relative z-10 w-full p-4 sm:p-6 md:p-12">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="flex flex-wrap gap-2 mb-3 md:mb-4">
                <span className="bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-lg">
                  {tournament.format || "T20"}
                </span>
                {tournament.live_stream_url && (
                  <a
                    href={tournament.live_stream_url}
                    target="_blank"
                    rel="noreferrer"
                    className="bg-red-500 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-lg flex items-center gap-1 animate-pulse">
                    <Video size={12} /> LIVE
                  </a>
                )}
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-6xl font-black text-white uppercase tracking-tighter drop-shadow-2xl leading-tight">
                {tournament.name}
              </h1>
              <p className="text-slate-300 font-bold uppercase tracking-widest text-xs sm:text-sm mt-2 flex items-center gap-2">
                📍 {tournament.location}
              </p>
            </div>

            <div className="flex flex-wrap gap-2 sm:gap-3 w-full md:w-auto mt-2 md:mt-0">
              {/* <button
                onClick={() =>
                  copyLink(`${window.location.origin}/register/${tournamentId}`)
                }
                className="flex-1 md:flex-none justify-center bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 text-white text-xs font-bold px-4 py-3 rounded-xl flex items-center gap-2 transition-all">
                {copied ? (
                  <CheckCircle2 size={16} className="text-teal-400" />
                ) : (
                  <Copy size={16} />
                )}{" "}
                Register Link
              </button> */}
              <button
                onClick={() =>
                  copyLink(`${window.location.origin}/t/${tournamentId}/broadcast`)
                }
                className="flex-1 md:flex-none justify-center bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 text-white text-xs font-bold px-4 py-3 rounded-xl flex items-center gap-2 transition-all">
                {copied ? (
                  <CheckCircle2 size={16} className="text-teal-400" />
                ) : (
                  <Copy size={16} />
                )}{" "}
                Broadcast
              </button>

              {isAdmin && (
                <button
                  onClick={() => setShowSettings(true)}
                  className="flex-1 md:flex-none justify-center bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-4 py-3 rounded-xl flex items-center gap-2 transition-all">
                  <Settings size={16} /> Settings
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* TOURNAMENT SETTINGS MODAL */}
      {showSettings && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          {/* Added slide-in-from-bottom for mobile app feel */}
          <div className="bg-white dark:bg-slate-900 w-full sm:rounded-[2rem] rounded-t-[2rem] max-w-xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] sm:max-h-[85vh] animate-in slide-in-from-bottom-8 sm:slide-in-from-bottom-0 sm:zoom-in-95">
            <div className="p-5 sm:p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center shrink-0">
              <h2 className="text-lg sm:text-xl font-black uppercase tracking-widest">
                Tournament Settings
              </h2>
              <button
                onClick={() => setShowSettings(false)}
                className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors bg-slate-100 dark:bg-slate-800 rounded-full p-2">
                <X size={20} />
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-8 overflow-y-auto custom-scrollbar flex-1">
              <div className="space-y-4">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-2">
                  Basic Info
                </h3>
                <div>
                  <label className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest">
                    Tournament Name
                  </label>
                  <input
                    value={editForm.name}
                    onChange={(e) =>
                      setEditForm({ ...editForm, name: e.target.value })
                    }
                    className="w-full mt-1 bg-slate-50 dark:bg-black border border-slate-200 dark:border-slate-800 rounded-xl p-3 sm:p-4 text-sm font-bold outline-none focus:border-teal-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest">
                    Location
                  </label>
                  <input
                    value={editForm.location}
                    onChange={(e) =>
                      setEditForm({ ...editForm, location: e.target.value })
                    }
                    className="w-full mt-1 bg-slate-50 dark:bg-black border border-slate-200 dark:border-slate-800 rounded-xl p-3 sm:p-4 text-sm font-bold outline-none focus:border-teal-500 transition-colors"
                  />
                </div>
                {/* Fixed Grid for Mobile */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest">
                      Format
                    </label>
                    <select
                      value={editForm.format}
                      onChange={(e) =>
                        setEditForm({ ...editForm, format: e.target.value })
                      }
                      className="w-full mt-1 bg-slate-50 dark:bg-black border border-slate-200 dark:border-slate-800 rounded-xl p-3 sm:p-4 text-sm font-bold outline-none">
                      <option value="T10">T10</option>
                      <option value="T20">T20</option>
                      <option value="ODI">ODI (50 Over)</option>
                      <option value="Test">Test Match</option>
                      <option value="Box Cricket">Box Cricket</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest">
                      Squad Size
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
                      className="w-full mt-1 bg-slate-50 dark:bg-black border border-slate-200 dark:border-slate-800 rounded-xl p-3 sm:p-4 text-sm font-bold outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-2">
                  Tournament Rules
                </h3>
                <div className="flex items-center justify-between bg-slate-50 dark:bg-black border border-slate-200 dark:border-slate-800 rounded-xl p-4 gap-4">
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                      Enable Franchise Auction
                    </h4>
                    <p className="text-[9px] sm:text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                      Tracks budgets & bidding.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
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
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-500"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-900/30 rounded-xl p-4 gap-4">
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-yellow-800 dark:text-yellow-500">
                      Strict Player of the Match
                    </h4>
                    <p className="text-[9px] sm:text-[10px] text-yellow-600/70 dark:text-yellow-500/70 font-bold uppercase tracking-widest mt-1">
                      Must be from winning team.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={editForm.strict_mom_rule}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          strict_mom_rule: e.target.checked,
                        })
                      }
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-500"></div>
                  </label>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-2">
                  Broadcast Studio
                </h3>
                <div>
                  <label className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
                    <Video size={14} /> Live Stream URL
                  </label>
                  <input
                    placeholder="https://youtube.com/live/..."
                    value={editForm.live_stream_url}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        live_stream_url: e.target.value,
                      })
                    }
                    className="w-full mt-1 bg-slate-50 dark:bg-black border border-slate-200 dark:border-slate-800 rounded-xl p-3 sm:p-4 text-sm font-bold outline-none focus:border-red-500 transition-colors"
                  />
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                  <div className="flex justify-between items-center gap-4">
                    <div className="min-w-0">
                      <p className="text-[10px] sm:text-xs font-black text-slate-900 uppercase truncate">
                        OBS Overlay Link
                      </p>
                      <p className="text-[9px] sm:text-[10px] text-slate-500 font-bold truncate">
                        Browser Source (1920x1080)
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        copyLink(
                          `${window.location.origin}/t/${tournamentId}/overlay`,
                        )
                      }
                      className="bg-white border border-slate-200 text-slate-500 hover:text-slate-900 p-2.5 rounded-xl transition-colors shrink-0 shadow-sm">
                      <Copy size={16} />
                    </button>
                  </div>

                  <hr className="border-slate-200" />

                  <div className="flex justify-between items-center gap-4">
                    <div className="min-w-0">
                      <p className="text-[10px] sm:text-xs font-black text-slate-900 uppercase flex items-center gap-1 truncate">
                        <MonitorPlay size={14} /> Controller
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        window.open(`/t/${tournamentId}/controller`, "_blank")
                      }
                      className="bg-teal-50 text-teal-600 font-black text-[10px] uppercase tracking-widest px-4 py-2 rounded-xl hover:bg-teal-100 transition-colors shrink-0">
                      Open
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-4">
                <h3 className="text-[10px] font-black text-red-500 uppercase tracking-widest border-b border-red-100 dark:border-red-900/30 pb-2">
                  Danger Zone
                </h3>
                <button
                  onClick={deleteTournament}
                  className="w-full flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 dark:bg-red-900/10 dark:hover:bg-red-900/20 text-red-600 font-black text-xs uppercase tracking-widest py-4 rounded-xl transition-colors border border-red-100 dark:border-red-900/30">
                  <Trash2 size={16} /> Delete Tournament
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 shrink-0">
              {/* Full width button on mobile, auto width on desktop */}
              <button
                onClick={saveSettings}
                className="w-full sm:w-auto sm:float-right bg-teal-600 hover:bg-teal-500 text-white font-black uppercase tracking-widest text-xs py-4 px-8 rounded-xl transition-all shadow-lg shadow-teal-500/20">
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TABS & CHILDREN */}
      <div className="max-w-[1400px] mx-auto px-0 md:px-6 mt-6">
        {/* Added px-4 so horizontal scrolling starts from the edge but content aligns */}
        <div className="flex overflow-x-auto gap-2 pb-4 mb-4 md:mb-8 border-b border-slate-200 dark:border-slate-800 px-4 md:px-0 [&::-webkit-scrollbar]:hidden">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = pathname.includes(tab.href);
            return (
              <Link
                key={tab.name}
                href={tab.href}
                className={`flex items-center gap-2 px-5 py-3 md:px-6 md:py-4 rounded-xl md:rounded-2xl font-bold text-xs md:text-sm transition-all whitespace-nowrap ${isActive ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-lg" : "bg-white dark:bg-slate-900 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800"}`}>
                <Icon size={16} className={isActive ? "" : "opacity-50"} />{" "}
                {tab.name}
              </Link>
            );
          })}
        </div>

        {/* Added px-4 back here for the inner page content */}
        <div className="px-4 md:px-0">{children}</div>
      </div>
    </div>
  );
}
