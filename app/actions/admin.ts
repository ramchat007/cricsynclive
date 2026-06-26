"use server";
import { createClient } from "@supabase/supabase-js";

// This client uses the SECRET service role key.
// It has God-Mode access to Postgres.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // <-- Put this in your .env.local
);

export async function forceUpdateTier(tournamentId: string, newTier: string) {
  const { error } = await supabaseAdmin
    .from("tournaments")
    .update({ subscription_tier: newTier })
    .eq("id", tournamentId);

  if (error) {
    console.error("Admin Override Failed:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}
