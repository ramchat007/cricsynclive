import { useMemo, useState } from "react";

export default function RosterSummaryModal({
  isOpen,
  initialTab,
  onClose,
  players,
  teams,
}: {
  isOpen: boolean;
  initialTab: any;
  onClose: () => void;
  players: any[];
  teams: any[];
}) {
  const [tab, setTab] = useState<"sold" | "unsold" | "pending">(
    initialTab || "sold",
  );

  const filtered = useMemo(() => {
    if (tab === "sold")
      return players.filter((p) => p.auction_status === "sold");
    if (tab === "unsold")
      return players.filter((p) => p.auction_status === "unsold");
    return players.filter(
      (p) => !p.auction_status || p.auction_status === "pending",
    );
  }, [players, tab]);

  const teamMap = useMemo(() => {
    return new Map(teams.map((t) => [t.id, t]));
  }, [teams]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[90] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-[var(--surface-1)] border border-[var(--border-1)] w-full max-w-4xl rounded-3xl shadow-2xl flex flex-col h-[80vh] overflow-hidden animate-in zoom-in-95">
        {/* Modal Header & Tabs */}
        <div className="p-6 bg-[var(--surface-2)] border-b border-[var(--border-1)] flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>
            <h2 className="text-xl font-black uppercase tracking-wider text-[var(--foreground)]">
              Player Roster Directory
            </h2>
            <p className="text-xs font-bold text-[var(--text-muted)]">
              Live snapshot of all auction participants
            </p>
          </div>

          <div className="flex bg-[var(--surface-1)] p-1 rounded-xl border border-[var(--border-1)]">
            {(["sold", "unsold", "pending"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${tab === t ? "bg-[var(--accent)] text-[var(--background)] shadow" : "text-[var(--text-muted)] hover:text-[var(--foreground)]"}`}
              >
                {t} (
                {
                  players.filter((p) =>
                    t === "pending"
                      ? !p.auction_status || p.auction_status === "pending"
                      : p.auction_status === t,
                  ).length
                }
                )
              </button>
            ))}
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[var(--surface-3)] flex items-center justify-center font-bold hover:bg-red-500/20 hover:text-red-400 absolute top-6 right-6 sm:static"
          >
            ✕
          </button>
        </div>

        {/* Modal List Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
          {filtered.map((player) => {
            const franchise = player.team_id
              ? teamMap.get(player.team_id)
              : null;

            return (
              <div
                key={player.id}
                className="bg-[var(--surface-2)] border border-[var(--border-1)] rounded-2xl p-4 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-xl bg-cover bg-center bg-[var(--surface-3)] border shrink-0"
                    style={{
                      backgroundImage: player.photo_url
                        ? `url(${player.photo_url})`
                        : "none",
                    }}
                  >
                    {!player.photo_url && (
                      <span className="flex items-center justify-center h-full font-black text-sm">
                        {player.full_name?.charAt(0)}
                      </span>
                    )}
                  </div>
                  <div>
                    <h4 className="font-black text-base uppercase text-[var(--foreground)]">
                      {player.full_name}
                    </h4>
                    <span className="text-xs font-bold text-[var(--accent)] uppercase tracking-widest">
                      {player.player_role}
                    </span>
                  </div>
                </div>

                <div className="text-right flex items-center gap-6">
                  {tab === "sold" && franchise ? (
                    <div className="text-right">
                      <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-md text-emerald-950 bg-emerald-400 inline-block mb-1">
                        Sold: ₹{player.sold_price?.toLocaleString("en-IN")}
                      </span>
                      <p className="text-xs font-black uppercase text-[var(--text-muted)]">
                        {franchise.short_name}
                      </p>
                    </div>
                  ) : (
                    <div>
                      <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase block">
                        Base Price
                      </span>
                      <span className="text-sm font-black text-[var(--foreground)]">
                        ₹{player.base_price?.toLocaleString("en-IN") || "1,000"}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="text-center py-20 text-[var(--text-muted)] font-black text-lg uppercase tracking-widest">
              No players found in this list
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
