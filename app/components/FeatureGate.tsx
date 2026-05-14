"use client";
import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Lock, Settings, Loader2, Star } from "lucide-react";
import Link from "next/link";

type FeatureKey =
  | "auctions_enabled"
  | "brackets_enabled"
  | "obs_overlays_enabled"
  | "youtube_sync_enabled"
  | "whatsapp_alerts_enabled";

interface FeatureGateProps {
  tournamentId: string;
  requiredTier: "pro" | "broadcast";
  featureKey: FeatureKey;
  featureName: string;
  children: React.ReactNode;
}

export default function FeatureGate({
  tournamentId,
  requiredTier,
  featureKey,
  featureName,
  children,
}: FeatureGateProps) {
  const [status, setStatus] = useState<
    "loading" | "allowed" | "locked" | "disabled"
  >("loading");

  useEffect(() => {
    const checkAccess = async () => {
      // 1. Check Global Platform Settings
      const { data: settingsData } = await supabase
        .from("platform_settings")
        .select(featureKey)
        .eq("id", 1)
        .single();
      const settings = settingsData as Record<FeatureKey, boolean> | null;

      if (settings && settings[featureKey] === false) {
        setStatus("disabled");
        return;
      }

      // 2. Check Tournament Subscription Tier
      const { data: tournament } = await supabase
        .from("tournaments")
        .select("subscription_tier")
        .eq("id", tournamentId)
        .single();
      const currentTier = tournament?.subscription_tier || "free";

      // 3. Evaluate Hierarchy (Broadcast > Pro > Free)
      if (requiredTier === "broadcast" && currentTier !== "broadcast") {
        setStatus("locked");
      } else if (requiredTier === "pro" && currentTier === "free") {
        setStatus("locked");
      } else {
        setStatus("allowed");
      }
    };

    if (tournamentId) checkAccess();
  }, [tournamentId, requiredTier, featureKey]);

  if (status === "loading") {
    return (
      <div className="w-full h-[60vh] flex flex-col items-center justify-center text-[var(--text-muted)] gap-4">
        <Loader2 className="animate-spin text-[var(--accent)]" size={32} />
        <p className="font-bold uppercase tracking-widest text-xs">
          Verifying Access...
        </p>
      </div>
    );
  }

  if (status === "disabled") {
    return (
      <div className="w-full h-[60vh] flex flex-col items-center justify-center text-center p-6">
        <Settings className="text-zinc-500 mb-4" size={48} />
        <h2 className="text-2xl font-black uppercase tracking-widest mb-2">
          Feature Disabled
        </h2>
        <p className="text-[var(--text-muted)] font-bold max-w-md">
          The {featureName} module is currently offline for maintenance or
          updates by the platform administrator.
        </p>
      </div>
    );
  }

  if (status === "locked") {
    // Determine the badge colors based on what plan they need
    const isPro = requiredTier === "pro";
    const badgeColor = isPro
      ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/20"
      : "text-purple-500 bg-purple-500/10 border-purple-500/20";
    const recommendedPlanName = isPro ? "Pro Tier" : "Broadcast Tier";

    return (
      <div className="w-full h-[70vh] flex flex-col items-center justify-center text-center p-6 animate-in fade-in zoom-in-95 duration-500">
        <div className="bg-[var(--surface-1)] p-10 rounded-[3rem] border border-[var(--border-1)] max-w-lg shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1/2 bg-[var(--accent)]/10 blur-3xl pointer-events-none rounded-full" />

          <Lock
            className="text-[var(--accent)] mb-6 mx-auto relative z-10"
            size={48}
          />

          {/* DYANMIC PLAN RECOMMENDATION BADGE */}
          <div className="relative z-10 flex justify-center mb-4">
            <span
              className={`px-4 py-1.5 rounded-full font-black uppercase tracking-widest text-[10px] border ${badgeColor}`}
            >
              Requires {recommendedPlanName}
            </span>
          </div>

          <h2 className="text-3xl font-black uppercase tracking-tighter mb-4 relative z-10">
            Premium Feature
          </h2>
          <p className="text-[var(--text-muted)] font-bold mb-8 relative z-10">
            The <b>{featureName}</b> module requires an upgrade. Unlock this and
            many other advanced tools by upgrading your tournament tier.
          </p>

          <Link
            href={`/t/${tournamentId}/billing`}
            className="inline-flex items-center gap-2 bg-[var(--foreground)] text-[var(--background)] px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-sm hover:opacity-90 transition-all shadow-lg hover:shadow-xl hover:-translate-y-1 relative z-10"
          >
            <Star size={18} /> View Upgrade Plans
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
