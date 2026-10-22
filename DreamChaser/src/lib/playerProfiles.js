import { supabase } from "./supabase.js";

const TABLE = "dreamchaser_player_profiles";

export async function loadPlayerProfile(userId) {
  const { data, error } = await supabase
    .from(TABLE)
    .select("profile")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data?.profile || null;
}

export async function savePlayerProfile(userId, profile) {
  const { error } = await supabase.from(TABLE).upsert(
    { user_id: userId, profile, updated_at: new Date().toISOString() },
    { onConflict: "user_id" },
  );
  if (error) throw error;
}
