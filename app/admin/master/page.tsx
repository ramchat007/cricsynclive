"use client";
import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  Shield,
  Zap,
  Star,
  Settings,
  LayoutDashboard,
  Save,
  ToggleLeft,
  ToggleRight,
  DollarSign,
  Tag,
  Plus,
  Trash2,
} from "lucide-react";

export default function MasterAdminPage() {
  const [activeTab, setActiveTab] = useState<
    "tournaments" | "settings" | "coupons"
  >("tournaments");

  // States
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Settings & Features State
  const [prices, setPrices] = useState({
    pro: 0,
    pro_original: 0,
    broadcast: 0,
    broadcast_original: 0,
  });
  const [features, setFeatures] = useState({
    auctions: true,
    obsOverlays: true,
    youtubeSync: true,
    whatsappAlerts: false,
  });

  const [tierFeatures, setTierFeatures] = useState<{
    free: string[];
    pro: string[];
    broadcast: string[];
  }>({
    free: [],
    pro: [],
    broadcast: [],
  });

  // New Coupon Form State
  const [newCouponCode, setNewCouponCode] = useState("");
  const [newCouponDiscount, setNewCouponDiscount] = useState(10);
  const [newCouponExpiry, setNewCouponExpiry] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);

    // Fetch Tournaments
    const { data: tData } = await supabase
      .from("tournaments")
      .select("id, name, owner_id, subscription_tier, created_at")
      .order("created_at", { ascending: false });

    if (tData) {
      setTournaments(
        tData.map((t) => ({
          ...t,
          subscription_tier: t.subscription_tier || "free",
        })),
      );
    }

    // Fetch Settings & Features
    const { data: sData, error: sError } = await supabase
      .from("platform_settings")
      .select("*")
      .eq("id", 1)
      .single();

    if (sData) {
      setPrices({
        pro: sData.pro_price || 0,
        pro_original: sData.pro_price_original || 0,
        broadcast: sData.broadcast_price || 0,
        broadcast_original: sData.broadcast_price_original || 0,
      });
      setFeatures({
        auctions: sData.auctions_enabled ?? true,
        obsOverlays: sData.obs_overlays_enabled ?? true,
        youtubeSync: sData.youtube_sync_enabled ?? true,
        whatsappAlerts: sData.whatsapp_alerts_enabled ?? false,
      });
      setTierFeatures({
        free: sData.free_features || [],
        pro: sData.pro_features || [],
        broadcast: sData.broadcast_features || [],
      });
    }

    // Fetch Coupons
    const { data: cData } = await supabase
      .from("coupons")
      .select("*")
      .order("created_at", { ascending: false });

    if (cData) setCoupons(cData);

    setIsLoading(false);
  };

  const handleTierChange = async (id: string, tier: string) => {
    await supabase
      .from("tournaments")
      .update({ subscription_tier: tier })
      .eq("id", id);
    setTournaments((prev) =>
      prev.map((t) => (t.id === id ? { ...t, subscription_tier: tier } : t)),
    );
  };

  const toggleFeature = (key: keyof typeof features) => {
    setFeatures((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const saveSettings = async () => {
    if (prices.pro === 0 || prices.broadcast === 0)
      return alert(
        "Error: Prices cannot be zero. Database sync may have failed.",
      );

    await supabase
      .from("platform_settings")
      .update({
        pro_price: prices.pro,
        pro_price_original: prices.pro_original,
        broadcast_price: prices.broadcast,
        broadcast_price_original: prices.broadcast_original,
        auctions_enabled: features.auctions,
        obs_overlays_enabled: features.obsOverlays,
        youtube_sync_enabled: features.youtubeSync,
        whatsapp_alerts_enabled: features.whatsappAlerts,
        free_features: tierFeatures.free.filter((f) => f.trim() !== ""),
        pro_features: tierFeatures.pro.filter((f) => f.trim() !== ""),
        broadcast_features: tierFeatures.broadcast.filter(
          (f) => f.trim() !== "",
        ),
      })
      .eq("id", 1);

    alert("✅ Settings & Feature Flags Saved Successfully!");
  };

  const createCoupon = async () => {
    if (!newCouponCode) return;
    const expiryDate = newCouponExpiry
      ? new Date(newCouponExpiry).toISOString()
      : null;

    const { data, error } = await supabase
      .from("coupons")
      .insert({
        code: newCouponCode.toUpperCase().trim(),
        discount_percentage: newCouponDiscount,
        expires_at: expiryDate,
      })
      .select()
      .single();

    if (error)
      return alert("Failed to create coupon. Make sure the code is unique.");
    if (data) setCoupons([data, ...coupons]);
    setNewCouponCode("");
    setNewCouponExpiry("");
  };

  const toggleCoupon = async (id: string, currentState: boolean) => {
    await supabase
      .from("coupons")
      .update({ is_active: !currentState })
      .eq("id", id);
    setCoupons((prev) =>
      prev.map((c) => (c.id === id ? { ...c, is_active: !currentState } : c)),
    );
  };

  const deleteCoupon = async (id: string) => {
    if (!confirm("Are you sure you want to permanently delete this coupon?"))
      return;
    await supabase.from("coupons").delete().eq("id", id);
    setCoupons((prev) => prev.filter((c) => c.id !== id));
  };

  const handleFeatureChange = (
    tier: "free" | "pro" | "broadcast",
    index: number,
    value: string,
  ) => {
    const newFeatures = [...tierFeatures[tier]];
    newFeatures[index] = value;
    setTierFeatures({ ...tierFeatures, [tier]: newFeatures });
  };

  const addFeatureRow = (tier: "free" | "pro" | "broadcast") => {
    setTierFeatures({ ...tierFeatures, [tier]: [...tierFeatures[tier], ""] });
  };

  const removeFeatureRow = (
    tier: "free" | "pro" | "broadcast",
    index: number,
  ) => {
    const newFeatures = [...tierFeatures[tier]];
    newFeatures.splice(index, 1);
    setTierFeatures({ ...tierFeatures, [tier]: newFeatures });
  };

  if (isLoading)
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="animate-pulse text-[var(--accent)] font-black uppercase tracking-widest">
          Loading...
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-[var(--background)] p-4 md:p-8 font-sans text-[var(--foreground)] pb-20 overflow-x-hidden">
      {/* Header & Tabs */}
      <div className="max-w-6xl mx-auto mb-10 mt-6">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="text-[var(--accent)]" size={32} />
          <h1 className="text-3xl font-black uppercase tracking-tighter">
            Super Admin
          </h1>
        </div>

        {/* 📱 UI FIX: Added horizontal scrolling for tabs on mobile */}
        <div className="flex gap-4 border-b border-[var(--border-1)] mt-8 overflow-x-auto whitespace-nowrap scrollbar-hide pb-1">
          <button
            onClick={() => setActiveTab("tournaments")}
            className={`flex items-center gap-2 px-6 py-4 font-black uppercase tracking-widest text-sm transition-colors border-b-2 ${activeTab === "tournaments" ? "border-[var(--accent)] text-[var(--accent)]" : "border-transparent text-[var(--text-muted)]"}`}>
            <LayoutDashboard size={18} /> Clients
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`flex items-center gap-2 px-6 py-4 font-black uppercase tracking-widest text-sm transition-colors border-b-2 ${activeTab === "settings" ? "border-[var(--accent)] text-[var(--accent)]" : "border-transparent text-[var(--text-muted)]"}`}>
            <Settings size={18} /> Settings
          </button>
          <button
            onClick={() => setActiveTab("coupons")}
            className={`flex items-center gap-2 px-6 py-4 font-black uppercase tracking-widest text-sm transition-colors border-b-2 ${activeTab === "coupons" ? "border-[var(--accent)] text-[var(--accent)]" : "border-transparent text-[var(--text-muted)]"}`}>
            <Tag size={18} /> Promos
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto">
        {/* TAB 1: TOURNAMENTS */}
        {activeTab === "tournaments" && (
          <div className="bg-[var(--surface-1)] rounded-[2rem] border border-[var(--border-1)] overflow-hidden animate-in fade-in">
            {/* 📱 UI FIX: Horizontal scroll wrapper for the table */}
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="bg-[var(--surface-2)] border-b border-[var(--border-1)] text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                    <th className="p-4 pl-6">Tournament Name</th>
                    <th className="p-4">Owner ID</th>
                    <th className="p-4 pr-6">Access Tier</th>
                  </tr>
                </thead>
                <tbody>
                  {tournaments.map((t) => (
                    <tr
                      key={t.id}
                      className="border-b border-[var(--border-1)]">
                      <td className="p-4 pl-6 font-bold text-sm">{t.name}</td>
                      <td className="p-4 text-xs font-mono text-[var(--text-muted)]">
                        {t.owner_id?.substring(0, 10)}...
                      </td>
                      <td className="p-4 pr-6">
                        <select
                          value={t.subscription_tier}
                          onChange={(e) =>
                            handleTierChange(t.id, e.target.value)
                          }
                          className="bg-[var(--surface-1)] border border-[var(--border-1)] text-[var(--foreground)] text-xs font-bold rounded-lg px-3 py-2 outline-none">
                          <option value="free">Free Tier</option>
                          <option value="pro">Pro Tier</option>
                          <option value="broadcast">Broadcast</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: SETTINGS (PRICING & FEATURES) */}
        {activeTab === "settings" && (
          <div className="animate-in fade-in max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column: Pricing */}
            <div className="bg-[var(--surface-1)] p-6 md:p-8 rounded-[2.5rem] border border-[var(--border-1)] shadow-sm">
              <h2 className="text-xl font-black uppercase tracking-widest mb-8 flex items-center gap-2">
                <DollarSign className="text-emerald-500" /> Pricing Strategy
              </h2>
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-black text-[var(--text-muted)] uppercase mb-2 block">
                      Pro Tier (Sale)
                    </label>
                    <input
                      type="number"
                      value={prices.pro}
                      onChange={(e) =>
                        setPrices({ ...prices, pro: Number(e.target.value) })
                      }
                      className="w-full bg-[var(--surface-2)] border border-[var(--border-1)] text-emerald-500 text-xl font-black rounded-xl p-4 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-black text-[var(--text-muted)] uppercase mb-2 block">
                      Pro (Original)
                    </label>
                    <input
                      type="number"
                      value={prices.pro_original}
                      onChange={(e) =>
                        setPrices({
                          ...prices,
                          pro_original: Number(e.target.value),
                        })
                      }
                      className="w-full bg-[var(--surface-2)] border border-[var(--border-1)] text-zinc-500 line-through text-xl font-black rounded-xl p-4 outline-none"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6 border-t border-[var(--border-1)]">
                  <div>
                    <label className="text-xs font-black text-[var(--text-muted)] uppercase mb-2 block">
                      Broadcast (Sale)
                    </label>
                    <input
                      type="number"
                      value={prices.broadcast}
                      onChange={(e) =>
                        setPrices({
                          ...prices,
                          broadcast: Number(e.target.value),
                        })
                      }
                      className="w-full bg-[var(--surface-2)] border border-[var(--border-1)] text-purple-500 text-xl font-black rounded-xl p-4 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-black text-[var(--text-muted)] uppercase mb-2 block">
                      Broadcast (Original)
                    </label>
                    <input
                      type="number"
                      value={prices.broadcast_original}
                      onChange={(e) =>
                        setPrices({
                          ...prices,
                          broadcast_original: Number(e.target.value),
                        })
                      }
                      className="w-full bg-[var(--surface-2)] border border-[var(--border-1)] text-zinc-500 line-through text-xl font-black rounded-xl p-4 outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Feature Toggles */}
            <div className="bg-[var(--surface-1)] p-6 md:p-8 rounded-[2.5rem] border border-[var(--border-1)] shadow-sm flex flex-col">
              <div className="flex items-center gap-3 mb-8">
                <Settings className="text-[var(--accent)]" size={24} />
                <h2 className="text-xl font-black uppercase tracking-widest">
                  Master Kill-Switches
                </h2>
              </div>
              <p className="text-sm font-bold text-[var(--text-muted)] mb-8">
                Disable a feature here to hide it globally, overriding all user
                subscriptions.
              </p>
              <div className="space-y-4 flex-1">
                {[
                  { key: "auctions", label: "Player Auctions Module" },
                  { key: "obsOverlays", label: "OBS Studio Overlays" },
                  { key: "youtubeSync", label: "YouTube Viewers Sync" },
                  { key: "whatsappAlerts", label: "WhatsApp Automated Alerts" },
                ].map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between p-4 bg-[var(--surface-2)] rounded-2xl border border-[var(--border-1)]">
                    <span className="font-bold text-sm">{item.label}</span>
                    <button
                      onClick={() =>
                        toggleFeature(item.key as keyof typeof features)
                      }
                      className="transition-transform active:scale-95">
                      {features[item.key as keyof typeof features] ? (
                        <ToggleRight className="text-emerald-500" size={32} />
                      ) : (
                        <ToggleLeft className="text-zinc-500" size={32} />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Dynamic Merchandising (Feature Lists) */}
            <div className="bg-[var(--surface-1)] p-6 md:p-8 rounded-[2.5rem] border border-[var(--border-1)] shadow-sm col-span-1 lg:col-span-2">
              <h2 className="text-xl font-black uppercase tracking-widest mb-2">
                Storefront Display Features
              </h2>
              <p className="text-sm font-bold text-[var(--text-muted)] mb-8">
                Manage the exact bullet points displayed live on the upgrade
                page.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* FREE TIER LIST BUILDER */}
                <div>
                  <label className="text-xs font-black text-zinc-500 uppercase mb-4 block">
                    Basic Tier Copy
                  </label>
                  <div className="space-y-3">
                    {tierFeatures.free.map((feature, index) => (
                      <div key={index} className="flex gap-2 group">
                        <input
                          type="text"
                          value={feature}
                          onChange={(e) =>
                            handleFeatureChange("free", index, e.target.value)
                          }
                          className="flex-1 bg-[var(--surface-2)] border border-[var(--border-1)] text-sm font-bold rounded-xl p-3 outline-none focus:border-[var(--accent)] min-w-0"
                          placeholder="e.g. 16 Teams Maximum"
                        />
                        <button
                          onClick={() => removeFeatureRow("free", index)}
                          className="p-3 text-red-500/50 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-colors shrink-0">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => addFeatureRow("free")}
                      className="w-full py-3 border border-dashed border-[var(--border-1)] hover:border-zinc-400 text-zinc-500 rounded-xl text-sm font-bold flex justify-center items-center gap-2 transition-colors">
                      <Plus size={16} /> Add Feature
                    </button>
                  </div>
                </div>

                {/* PRO TIER LIST BUILDER */}
                <div>
                  <label className="text-xs font-black text-emerald-500 uppercase mb-4 block">
                    Pro Tier Copy
                  </label>
                  <div className="space-y-3">
                    {tierFeatures.pro.map((feature, index) => (
                      <div key={index} className="flex gap-2 group">
                        <input
                          type="text"
                          value={feature}
                          onChange={(e) =>
                            handleFeatureChange("pro", index, e.target.value)
                          }
                          className="flex-1 bg-[var(--surface-2)] border border-[var(--border-1)] text-sm font-bold rounded-xl p-3 outline-none focus:border-emerald-500 min-w-0"
                          placeholder="e.g. Player Auctions"
                        />
                        <button
                          onClick={() => removeFeatureRow("pro", index)}
                          className="p-3 text-red-500/50 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-colors shrink-0">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => addFeatureRow("pro")}
                      className="w-full py-3 border border-dashed border-[var(--border-1)] hover:border-emerald-500 text-emerald-500 rounded-xl text-sm font-bold flex justify-center items-center gap-2 transition-colors">
                      <Plus size={16} /> Add Feature
                    </button>
                  </div>
                </div>

                {/* BROADCAST TIER LIST BUILDER */}
                <div>
                  <label className="text-xs font-black text-purple-500 uppercase mb-4 block">
                    Broadcast Tier Copy
                  </label>
                  <div className="space-y-3">
                    {tierFeatures.broadcast.map((feature, index) => (
                      <div key={index} className="flex gap-2 group">
                        <input
                          type="text"
                          value={feature}
                          onChange={(e) =>
                            handleFeatureChange(
                              "broadcast",
                              index,
                              e.target.value,
                            )
                          }
                          className="flex-1 bg-[var(--surface-2)] border border-[var(--border-1)] text-sm font-bold rounded-xl p-3 outline-none focus:border-purple-500 min-w-0"
                          placeholder="e.g. OBS Overlays"
                        />
                        <button
                          onClick={() => removeFeatureRow("broadcast", index)}
                          className="p-3 text-red-500/50 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-colors shrink-0">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => addFeatureRow("broadcast")}
                      className="w-full py-3 border border-dashed border-[var(--border-1)] hover:border-purple-500 text-purple-500 rounded-xl text-sm font-bold flex justify-center items-center gap-2 transition-colors">
                      <Plus size={16} /> Add Feature
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={saveSettings}
              className="col-span-1 lg:col-span-2 mt-4 w-full bg-[var(--foreground)] text-[var(--background)] py-5 rounded-2xl font-black uppercase tracking-widest text-lg transition-transform active:scale-[0.99] shadow-xl">
              <Save className="inline mr-2 mb-1" size={20} /> Save Pricing &
              Features
            </button>
          </div>
        )}

        {/* TAB 3: COUPONS */}
        {activeTab === "coupons" && (
          <div className="animate-in fade-in max-w-5xl">
            {/* 📱 UI FIX: Flex-col on mobile, flex-row on desktop so inputs don't squash */}
            <div className="flex flex-col md:flex-row gap-4 mb-8">
              <input
                type="text"
                placeholder="e.g. SUMMER20"
                value={newCouponCode}
                onChange={(e) => setNewCouponCode(e.target.value)}
                className="flex-[2] bg-[var(--surface-1)] border border-[var(--border-1)] rounded-2xl p-4 font-black text-xl uppercase outline-none focus:border-[var(--accent)] placeholder:text-[var(--text-muted)] placeholder:font-normal"
              />
              <div className="flex-1 relative">
                <input
                  type="number"
                  placeholder="Discount %"
                  value={newCouponDiscount}
                  onChange={(e) => setNewCouponDiscount(Number(e.target.value))}
                  className="w-full bg-[var(--surface-1)] border border-[var(--border-1)] rounded-2xl p-4 pl-12 font-black text-xl outline-none focus:border-[var(--accent)]"
                />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-[var(--text-muted)]">
                  %
                </span>
              </div>
              <div className="flex-1 relative">
                <input
                  type="date"
                  value={newCouponExpiry}
                  onChange={(e) => setNewCouponExpiry(e.target.value)}
                  className="w-full bg-[var(--surface-1)] border border-[var(--border-1)] rounded-2xl p-4 font-bold outline-none focus:border-[var(--accent)] text-sm text-[var(--text-muted)]"
                />
              </div>
              <button
                onClick={createCoupon}
                className="bg-[var(--accent)] text-[var(--background)] py-4 md:px-8 rounded-2xl font-black uppercase tracking-widest hover:opacity-90 flex justify-center items-center">
                <Plus size={24} />
              </button>
            </div>

            {/* 📱 UI FIX: Horizontal scroll wrapper for the table */}
            <div className="bg-[var(--surface-1)] rounded-[2rem] border border-[var(--border-1)] overflow-hidden shadow-sm">
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead>
                    <tr className="bg-[var(--surface-2)] border-b border-[var(--border-1)] text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                      <th className="p-4 pl-6">Promo Code</th>
                      <th className="p-4">Discount</th>
                      <th className="p-4">Expires</th>
                      <th className="p-4 pr-6 text-right">Manage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {coupons.map((c) => {
                      const isExpired =
                        c.expires_at && new Date(c.expires_at) < new Date();
                      return (
                        <tr
                          key={c.id}
                          className="border-b border-[var(--border-1)]">
                          <td className="p-4 pl-6 font-black text-lg tracking-widest text-[var(--accent)]">
                            {c.code}
                          </td>
                          <td className="p-4 font-bold">
                            {c.discount_percentage}% OFF
                          </td>
                          <td className="p-4 font-bold text-xs text-[var(--text-muted)]">
                            {c.expires_at ? (
                              isExpired ? (
                                <span className="text-red-500">Expired</span>
                              ) : (
                                new Date(c.expires_at).toLocaleDateString()
                              )
                            ) : (
                              "Never"
                            )}
                          </td>
                          <td className="p-4 pr-6 flex items-center justify-end gap-4">
                            <button
                              onClick={() => toggleCoupon(c.id, c.is_active)}>
                              {c.is_active ? (
                                <ToggleRight
                                  className="text-emerald-500"
                                  size={32}
                                />
                              ) : (
                                <ToggleLeft
                                  className="text-zinc-500"
                                  size={32}
                                />
                              )}
                            </button>
                            <button
                              onClick={() => deleteCoupon(c.id)}
                              className="text-red-500/50 hover:text-red-500 transition-colors p-2 rounded-full hover:bg-red-500/10">
                              <Trash2 size={18} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {coupons.length === 0 && (
                      <tr>
                        <td
                          colSpan={4}
                          className="p-8 text-center text-[var(--text-muted)] font-bold">
                          No coupons created yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
