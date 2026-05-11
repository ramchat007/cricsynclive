"use client";
import { useEffect, useState, use } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Users,
  CalendarDays,
  Shirt,
  ListOrdered,
  Medal,
  Settings,
  Copy,
  PersonStanding,
  Camera,
  X,
  Trash2,
  Video,
  MonitorPlay,
  ShieldAlert,
  Brackets,
  Flag,
  Gavel,
  Menu,
  ChevronRight,
  LogOut,
  Sparkles,
  Activity,
  LayoutDashboard,
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
  const router = useRouter();

  const [tournament, setTournament] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
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

  const finalizeTournament = async () => {
    const confirmFinalize = window.confirm("Mark tournament as completed?");
    if (confirmFinalize) {
      const { error } = await supabase
        .from("tournaments")
        .update({ status: "completed" })
        .eq("id", tournamentId);
      if (!error) {
        alert("Completed!");
        setShowSettings(false);
        fetchLayoutData();
      }
    }
  };

  const deleteTournament = async () => {
    if (window.confirm("Delete this tournament forever?")) {
      const { error } = await supabase
        .from("tournaments")
        .delete()
        .eq("id", tournamentId);
      if (!error) router.push("/");
    }
  };

  if (!tournament)
    return (
      <div className="min-h-screen bg-[var(--background)] flex flex-col items-center justify-center font-black text-[var(--text-muted)]">
        <Activity
          className="animate-spin text-[var(--accent)] mb-4"
          size={40}
        />
        <p className="uppercase tracking-widest text-xs">
          Loading Tournament Hub...
        </p>
      </div>
    );

  const navItems = [
    { name: "Teams & Squads", href: `/t/${tournamentId}/teams`, icon: Users },
    { name: "Matches", href: `/t/${tournamentId}/matches`, icon: CalendarDays },
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
    navItems.push({
      name: "Admin & Scorers",
      href: `/t/${tournamentId}/admin`,
      icon: ShieldAlert,
    });
  }

  return (
    <div className="min-h-screen bg-[var(--background)] flex overflow-hidden">
      {/* --- ASIDE NAVIGATION (LEFT) --- */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-49 w-72 bg-[var(--surface-1)] border-r border-[var(--border-1)] transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0
          ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="h-full flex flex-col p-6 mt-[65px] lg:mt-0">
          {/* Nav Links */}
          <nav className="flex-1 space-y-1 overflow-y-auto hide-scrollbar">
            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-4 px-3">
              Tournament Menu
            </p>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsSidebarOpen(false)}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all
                    ${
                      isActive
                        ? "bg-[var(--accent)] text-white shadow-lg shadow-[var(--accent)]/20"
                        : "text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
                    }
                  `}
                >
                  <Icon
                    size={18}
                    className={isActive ? "text-white" : "opacity-70"}
                  />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Sidebar Footer Area */}
          <div className="mt-auto pt-6 space-y-6">
            {/* Upgrade Plan Card */}
            {/* <div className="bg-gradient-to-br from-indigo-600 to-cyan-500 rounded-3xl p-5 text-white shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:scale-110 transition-transform">
                <Sparkles size={40} />
              </div>
              <h4 className="font-black text-sm uppercase tracking-tight mb-1">
                Upgrade Plan
              </h4>
              <p className="text-[10px] font-medium opacity-80 leading-relaxed mb-4">
                Unlock premium features and custom overlays.
              </p>
              <button className="w-full py-2 bg-white text-indigo-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:opacity-90 transition-all">
                Upgrade Now
              </button>
            </div> */}

            <div className="space-y-1">
              {isAdmin && (
                <button
                  onClick={() => {
                    setShowSettings(true);
                    setIsSidebarOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-[var(--text-muted)] font-bold text-sm hover:text-[var(--foreground)] transition-colors"
                >
                  <Settings size={18} /> Settings
                </button>
              )}
              <Link
                href="/"
                className="w-full flex items-center gap-3 px-4 py-3 text-red-500 font-bold text-sm hover:bg-red-500/5 transition-all rounded-xl"
              >
                <LogOut size={18} /> Exit Console
              </Link>
            </div>
          </div>
        </div>
      </aside>

      {/* --- MAIN CONTENT (RIGHT) --- */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto custom-scrollbar">
        {/* Mobile Header Toggle */}
        <header className="lg:hidden h-16 bg-[var(--surface-1)] border-b border-[var(--border-1)] flex items-center justify-between px-4 shrink-0">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 text-[var(--foreground)]"
          >
            <Menu size={24} />
          </button>
          <span className="font-black uppercase italic tracking-tighter text-sm">
            Tournament Console
          </span>
          <div className="w-8 h-8 "></div>
        </header>

        {/* 1. HERO BANNER AREA */}
        <div
          className="relative w-full min-h-[18rem] md:min-h-[22rem] flex flex-col justify-end p-6 md:p-12 transition-all bg-slate-900"
          style={{
            backgroundImage: tournament?.banner_url
              ? `url(${tournament.banner_url})`
              : "none",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--background)] via-[var(--background)]/60 to-transparent" />

          <div className="relative z-10 max-w-7xl w-full mx-auto flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="animate-in fade-in slide-in-from-left-4 duration-500">
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="bg-[var(--accent)]/10 backdrop-blur-md border border-[var(--accent)]/20 text-[var(--accent)] text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-sm">
                  {tournament.format || "T20"}
                </span>
                {tournament.live_stream_url && (
                  <a
                    href={tournament.live_stream_url}
                    target="_blank"
                    rel="noreferrer"
                    className="bg-red-500 text-white text-[10px] font-black uppercase px-3 py-1 rounded-full flex items-center gap-1 animate-pulse shadow-lg"
                  >
                    <Video size={12} /> LIVE
                  </a>
                )}
              </div>
              <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-[var(--foreground)] drop-shadow-sm">
                {tournament.name}
              </h1>
              <p className="text-[var(--text-muted)] font-bold uppercase tracking-widest text-xs mt-2 flex items-center gap-2">
                📍 {tournament.location}
              </p>
            </div>

            <div className="flex flex-wrap gap-2 animate-in fade-in slide-in-from-right-4 duration-500">
              <Link
                href={`/t/${tournamentId}/auction`}
                className="bg-[var(--surface-1)]/80 backdrop-blur-md border border-[var(--border-1)] px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-[var(--surface-1)] transition-all flex items-center gap-2"
              >
                <Gavel size={14} /> Auction
              </Link>
              <a
                href={`${window.location.origin}/register/${tournamentId}/`}
                className="bg-[var(--surface-1)]/80 backdrop-blur-md border border-[var(--border-1)] px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-[var(--surface-1)] transition-all flex items-center gap-2 text-[var(--foreground)]"
              >
                <PersonStanding size={14} /> Registration
              </a>
              {isAdmin && (
                <CldUploadWidget
                  uploadPreset={String(
                    process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
                  )}
                  onSuccess={(result: any) =>
                    updateBanner(result.info.secure_url)
                  }
                >
                  {({ open }) => (
                    <button
                      onClick={() => open()}
                      className="bg-[var(--surface-1)]/80 backdrop-blur-md border border-[var(--border-1)] p-3 rounded-2xl hover:bg-[var(--surface-1)] transition-all text-[var(--foreground)]"
                    >
                      <Camera size={18} />
                    </button>
                  )}
                </CldUploadWidget>
              )}
            </div>
          </div>
        </div>

        {/* 2. PAGE CONTENT */}
        <div className="p-6 md:p-12 max-w-7xl w-full mx-auto animate-in fade-in duration-700">
          {children}
        </div>
      </main>

      {/* MOBILE OVERLAY */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* TOURNAMENT SETTINGS MODAL (RESTORED) */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="bg-[var(--surface-1)] w-full sm:rounded-[2.5rem] rounded-t-[2.5rem] max-w-xl border border-[var(--border-1)] flex flex-col max-h-[90vh] sm:max-h-[85vh] shadow-2xl animate-in slide-in-from-bottom-8">
            <div className="p-6 border-b border-[var(--border-1)] flex justify-between items-center bg-[var(--surface-2)]/50">
              <h2 className="text-xl font-black uppercase text-[var(--foreground)] tracking-tight">
                Tournament Settings
              </h2>
              <button
                onClick={() => setShowSettings(false)}
                className="p-2 rounded-full hover:bg-[var(--border-1)] text-[var(--text-muted)] hover:text-[var(--foreground)]"
              >
                <X />
              </button>
            </div>

            <div className="p-8 overflow-y-auto custom-scrollbar flex-1 space-y-10">
              {/* Basic Info */}
              <div className="space-y-4">
                <h3 className="text-[10px] font-black text-[var(--accent)] uppercase tracking-widest border-b border-[var(--border-1)] pb-2">
                  Basic Info
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest ml-1 mb-1 block">
                      Name
                    </label>
                    <input
                      value={editForm.name}
                      onChange={(e) =>
                        setEditForm({ ...editForm, name: e.target.value })
                      }
                      className="w-full bg-[var(--surface-2)] border border-[var(--border-1)] rounded-xl p-4 text-sm font-bold text-[var(--foreground)] outline-none focus:border-[var(--accent)] transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest ml-1 mb-1 block">
                      Location
                    </label>
                    <input
                      value={editForm.location}
                      onChange={(e) =>
                        setEditForm({ ...editForm, location: e.target.value })
                      }
                      className="w-full bg-[var(--surface-2)] border border-[var(--border-1)] rounded-xl p-4 text-sm font-bold text-[var(--foreground)] outline-none focus:border-[var(--accent)] transition-all"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest ml-1 mb-1 block">
                        Format
                      </label>
                      <select
                        value={editForm.format}
                        onChange={(e) =>
                          setEditForm({ ...editForm, format: e.target.value })
                        }
                        className="w-full bg-[var(--surface-2)] border border-[var(--border-1)] rounded-xl p-3 text-sm font-bold text-[var(--foreground)] outline-none"
                      >
                        <option value="T10">T10</option>
                        <option value="T20">T20</option>
                        <option value="ODI">ODI</option>
                        <option value="Box Cricket">Box Cricket</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest ml-1 mb-1 block">
                        Squad Limit
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
                        className="w-full bg-[var(--surface-2)] border border-[var(--border-1)] rounded-xl p-4 text-sm font-bold text-[var(--foreground)] outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Rules Section (RESTORED COLORS) */}
              <div className="space-y-4">
                <h3 className="text-[10px] font-black text-[var(--accent)] uppercase tracking-widest border-b border-[var(--border-1)] pb-2">
                  Tournament Rules
                </h3>
                <div className="flex items-center justify-between bg-[var(--surface-2)] border border-[var(--border-1)] rounded-2xl p-5">
                  <div>
                    <h4 className="text-sm font-bold text-[var(--foreground)]">
                      Franchise Auction
                    </h4>
                    <p className="text-[10px] text-[var(--text-muted)] font-medium uppercase mt-1">
                      Track bidding & team budgets.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={editForm.is_auction_enabled}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        is_auction_enabled: e.target.checked,
                      })
                    }
                    className="w-6 h-6 accent-[var(--accent)] cursor-pointer"
                  />
                </div>
                <div className="flex items-center justify-between bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5">
                  <div>
                    <h4 className="text-sm font-bold text-amber-600">
                      Strict POTM Rule
                    </h4>
                    <p className="text-[10px] text-amber-600/70 font-medium uppercase mt-1">
                      Must be from winning team.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={editForm.strict_mom_rule}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        strict_mom_rule: e.target.checked,
                      })
                    }
                    className="w-6 h-6 accent-amber-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* Broadcast Studio */}
              <div className="space-y-4">
                <h3 className="text-[10px] font-black text-[var(--accent)] uppercase tracking-widest border-b border-[var(--border-1)] pb-2">
                  Broadcast Studio
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1 block">
                      Live Stream URL
                    </label>
                    <input
                      value={editForm.live_stream_url}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          live_stream_url: e.target.value,
                        })
                      }
                      placeholder="https://youtube.com/live/..."
                      className="w-full bg-[var(--surface-2)] border border-[var(--border-1)] rounded-xl p-4 text-sm font-bold text-[var(--foreground)] outline-none focus:border-red-500 transition-all"
                    />
                  </div>
                  <div className="bg-[var(--surface-2)] border border-[var(--border-1)] rounded-2xl p-5 flex justify-between items-center">
                    <div>
                      <p className="text-xs font-bold text-[var(--foreground)]">
                        OBS Overlay Link
                      </p>
                      <p className="text-[10px] text-[var(--text-muted)] uppercase font-black tracking-widest mt-1">
                        Browser Source (1920x1080)
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        copyLink(
                          `${window.location.origin}/t/${tournamentId}/overlay`,
                        )
                      }
                      className="p-3 bg-[var(--surface-1)] border border-[var(--border-1)] rounded-xl hover:text-[var(--accent)] transition-colors"
                    >
                      <Copy size={18} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Danger Zone (RESTORED) */}
              <div className="space-y-4">
                <h3 className="text-[10px] font-black text-red-500 uppercase tracking-widest border-b border-red-500/20 pb-2">
                  Danger Zone
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={finalizeTournament}
                    className="bg-[var(--surface-2)] hover:bg-[var(--border-1)] text-[var(--foreground)] font-bold py-4 rounded-xl text-xs uppercase flex items-center justify-center gap-2 border border-[var(--border-1)] transition-all"
                  >
                    <Flag size={16} /> Complete
                  </button>
                  <button
                    onClick={deleteTournament}
                    className="bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold py-4 rounded-xl text-xs uppercase flex items-center justify-center gap-2 border border-red-500/30 transition-all"
                  >
                    <Trash2 size={16} /> Delete
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-[var(--border-1)] bg-[var(--surface-2)]/50 flex justify-end gap-3">
              <button
                onClick={() => setShowSettings(false)}
                className="px-6 py-3 font-bold text-[var(--text-muted)] hover:text-[var(--foreground)] text-xs uppercase"
              >
                Cancel
              </button>
              <button
                onClick={saveSettings}
                className="px-8 py-3 bg-[var(--foreground)] text-[var(--background)] font-black uppercase text-xs rounded-xl shadow-lg hover:opacity-90 transition-all"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Small helper for header
function User({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="lucide lucide-user"
    >
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
