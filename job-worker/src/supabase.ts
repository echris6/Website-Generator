/**
 * Supabase client for job worker
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

let supabaseInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "Missing Supabase environment variables: SUPABASE_URL, SUPABASE_SERVICE_KEY"
    );
  }

  supabaseInstance = createClient(supabaseUrl, supabaseKey);
  console.log("✅ Supabase client initialized");
  return supabaseInstance;
}
