"use client";
import React, { useEffect, useState, use } from "react";
import { supabase } from "@/lib/supabase";
import {
  Shield,
  Zap,
  Star,
  CheckCircle2,
  ArrowLeft,
  Loader2,
  Tag,
} from "lucide-react";
import Link from "next/link";

export default function TournamentBillingPage({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const { tournamentId } = use(params);
  const [currentTier, setCurrentTier] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [displayFeatures, setDisplayFeatures] = useState<{
    free: string[];
    pro: string[];
    broadcast: string[];
  }>({
    free: [],
    pro: [],
    broadcast: [],
  });

  // Dynamic Pricing State
  const [prices, setPrices] = useState({
    pro: 999,
    pro_original: 1499,
    broadcast: 2499,
    broadcast_original: 3499,
  });

  // Coupon State
  const [couponInput, setCouponInput] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState<number>(0);
  const [couponStatus, setCouponStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");

  useEffect(() => {
    const fetchData = async () => {
      // Fetch user's current tier
      const { data: tData } = await supabase
        .from("tournaments")
        .select("subscription_tier")
        .eq("id", tournamentId)
        .single();
      if (tData) setCurrentTier(tData.subscription_tier || "free");

      // Fetch dynamic pricing & features from Super Admin settings
      const { data: sData } = await supabase
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
        setDisplayFeatures({
          free: sData.free_features || [],
          pro: sData.pro_features || [],
          broadcast: sData.broadcast_features || [],
        });
      }

      setIsLoading(false);
    };
    fetchData();
  }, [tournamentId]);

  const applyCoupon = async () => {
    if (!couponInput) return;
    setCouponStatus("loading");

    const { data, error } = await supabase
      .from("coupons")
      .select("discount_percentage, is_active, expires_at")
      .eq("code", couponInput.toUpperCase().trim())
      .single();

    if (!error && data && data.is_active) {
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        setAppliedDiscount(0);
        setCouponStatus("error"); // Expired!
      } else {
        setAppliedDiscount(data.discount_percentage);
        setCouponStatus("success");
      }
    } else {
      setAppliedDiscount(0);
      setCouponStatus("error");
    }
  };

  const handleUpgradeClick = (planName: string, basePrice: number) => {
    const finalPrice = Math.round(
      basePrice - basePrice * (appliedDiscount / 100),
    );
    alert(
      `Payment Gateway (Stripe/Razorpay) will charge ₹${finalPrice} for the ${planName} plan.\n\n(Discount applied: ${appliedDiscount}%)`,
    );
  };

  if (isLoading)
    return (
      <div className="w-full h-[50vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-[var(--accent)]" size={40} />
      </div>
    );

  const getFinalPrice = (price: number) =>
    Math.round(price - price * (appliedDiscount / 100));

  return (
    // FIX: Changed min-h-screen to w-full h-auto, added pb-32 for heavy mobile scrolling clearance
    <div className="w-full h-auto bg-transparent p-4 md:p-8 font-sans text-[var(--foreground)] pb-32">
      <Link
        href={`/t/${tournamentId}/teams`}
        className="flex items-center gap-2 text-[var(--text-muted)] font-bold mb-10 hover:text-[var(--accent)] w-max transition-colors"
      >
        <ArrowLeft size={16} /> Back to Dashboard
      </Link>

      <div className="max-w-5xl mx-auto text-center mb-10 animate-in fade-in slide-in-from-bottom-4">
        <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter mb-4">
          Upgrade Your Tournament
        </h1>
        <p className="text-lg text-[var(--text-muted)] font-bold max-w-2xl mx-auto">
          Unlock professional broadcasting tools, advanced analytics, and
          automated fan engagement.
        </p>
      </div>

      {/* Coupon Code Section */}
      <div className="max-w-md mx-auto mb-16 animate-in fade-in">
        <div className="flex gap-2 p-2 bg-[var(--surface-1)] border border-[var(--border-1)] rounded-2xl">
          <div className="flex items-center pl-4 text-[var(--text-muted)]">
            <Tag size={20} />
          </div>
          <input
            type="text"
            placeholder="Have a Promo Code?"
            value={couponInput}
            onChange={(e) => {
              setCouponInput(e.target.value);
              setCouponStatus("idle");
            }}
            className="flex-1 w-full bg-transparent text-[var(--foreground)] font-bold uppercase outline-none placeholder:capitalize"
          />
          <button
            onClick={applyCoupon}
            disabled={!couponInput || couponStatus === "loading"}
            className="bg-[var(--foreground)] text-[var(--background)] px-6 py-3 rounded-xl font-black uppercase text-xs tracking-widest hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {couponStatus === "loading" ? (
              <Loader2 className="animate-spin" size={16} />
            ) : (
              "Apply"
            )}
          </button>
        </div>
        {couponStatus === "success" && (
          <p className="text-emerald-500 text-xs font-black uppercase tracking-widest text-center mt-3 animate-in slide-in-from-top-2">
            ✅ {appliedDiscount}% Discount Applied!
          </p>
        )}
        {couponStatus === "error" && (
          <p className="text-red-500 text-xs font-black uppercase tracking-widest text-center mt-3 animate-in slide-in-from-top-2">
            ❌ Invalid or Expired Code
          </p>
        )}
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* FREE TIER */}
        <div
          className={`relative bg-[var(--surface-1)] rounded-[2.5rem] p-8 border-2 transition-all ${currentTier === "free" ? "border-zinc-500 shadow-xl scale-105 z-10" : "border-[var(--border-1)] opacity-70 hover:opacity-100"}`}
        >
          {currentTier === "free" && (
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-zinc-500 text-white text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full">
              Current Plan
            </div>
          )}
          <Shield className="text-zinc-500 mb-6" size={40} />
          <h2 className="text-2xl font-black uppercase tracking-widest mb-2">
            Basic
          </h2>
          <div className="flex items-baseline gap-1 mb-8">
            <span className="text-5xl font-black">₹0</span>
          </div>
          <ul className="space-y-4 mb-8">
            {displayFeatures.free.map((f, i) => (
              <li
                key={i}
                className="flex items-center gap-3 text-sm font-bold text-[var(--text-muted)]"
              >
                <CheckCircle2 className="text-zinc-500 shrink-0" size={18} />{" "}
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* PRO TIER */}
        <div
          className={`relative bg-[var(--surface-1)] rounded-[2.5rem] p-8 border-2 transition-all ${currentTier === "pro" ? "border-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.15)] scale-105 z-10" : "border-[var(--border-1)] hover:border-emerald-500/50"}`}
        >
          {currentTier === "pro" && (
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full">
              Current Plan
            </div>
          )}
          <Zap className="text-emerald-500 mb-6" size={40} />
          <h2 className="text-2xl font-black uppercase tracking-widest mb-2 text-emerald-500">
            Pro
          </h2>

          <div className="mb-8">
            {prices.pro_original > prices.pro && appliedDiscount === 0 && (
              <p className="text-zinc-500 font-bold line-through text-lg">
                ₹{prices.pro_original}
              </p>
            )}
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-black">
                {appliedDiscount > 0 ? (
                  <span className="text-emerald-500">
                    ₹{getFinalPrice(prices.pro)}
                  </span>
                ) : (
                  `₹${prices.pro}`
                )}
              </span>
            </div>
          </div>

          <ul className="space-y-4 mb-8">
            {displayFeatures.pro.map((f, i) => (
              <li
                key={i}
                className="flex items-center gap-3 text-sm font-bold text-[var(--text-muted)]"
              >
                <CheckCircle2 className="text-emerald-500 shrink-0" size={18} />{" "}
                {f}
              </li>
            ))}
          </ul>
          {currentTier !== "pro" && currentTier !== "broadcast" && (
            <button
              onClick={() => handleUpgradeClick("Pro", prices.pro)}
              className="w-full bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-colors font-black uppercase tracking-widest py-4 rounded-xl text-sm border border-emerald-500/30"
            >
              Upgrade to Pro
            </button>
          )}
        </div>

        {/* BROADCAST TIER */}
        <div
          className={`relative bg-gradient-to-br from-purple-500/10 to-[var(--surface-1)] rounded-[2.5rem] p-8 border-2 transition-all ${currentTier === "broadcast" ? "border-purple-500 shadow-[0_0_40px_rgba(168,85,247,0.2)] scale-105 z-10" : "border-purple-500/30 hover:border-purple-500/80"}`}
        >
          {currentTier === "broadcast" && (
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-purple-500 text-white text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full shadow-lg shadow-purple-500/30">
              Current Plan
            </div>
          )}
          <Star className="text-purple-500 mb-6" size={40} />
          <h2 className="text-2xl font-black uppercase tracking-widest mb-2 text-purple-500">
            Broadcast
          </h2>

          <div className="mb-8">
            {prices.broadcast_original > prices.broadcast &&
              appliedDiscount === 0 && (
                <p className="text-zinc-500/60 font-bold line-through text-lg">
                  ₹{prices.broadcast_original}
                </p>
              )}
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-black">
                {appliedDiscount > 0 ? (
                  <span className="text-purple-500">
                    ₹{getFinalPrice(prices.broadcast)}
                  </span>
                ) : (
                  `₹${prices.broadcast}`
                )}
              </span>
            </div>
          </div>

          <ul className="space-y-4 mb-8">
            {displayFeatures.broadcast.map((f, i) => (
              <li
                key={i}
                className="flex items-start gap-3 text-sm font-bold text-[var(--foreground)]"
              >
                <CheckCircle2
                  className="text-purple-500 shrink-0 mt-0.5"
                  size={18}
                />{" "}
                {f}
              </li>
            ))}
          </ul>
          {currentTier !== "broadcast" && (
            <button
              onClick={() => handleUpgradeClick("Broadcast", prices.broadcast)}
              className="w-full bg-purple-500 text-white hover:bg-purple-400 transition-colors font-black uppercase tracking-widest py-4 rounded-xl text-sm shadow-lg shadow-purple-500/20"
            >
              Unlock Broadcasting
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
