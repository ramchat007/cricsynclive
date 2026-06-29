"use server";
import { createClient } from "@supabase/supabase-js";

// Uses the God-Mode key to completely bypass CORS and RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function updateMatchScore(matchId: string, payload: any) {
  const { data, error } = await supabaseAdmin
    .from("matches")
    .update(payload)
    .eq("id", matchId)
    .select(); // Ask Supabase to return the updated row

  if (error) {
    console.error("Match Update Failed:", error);
    return { success: false, error: error.message };
  }

  return { success: true, data };
}
