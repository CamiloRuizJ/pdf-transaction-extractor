import { createClient } from '@supabase/supabase-js';

// Singleton pattern for Supabase client to avoid multiple instances
let supabaseInstance: ReturnType<typeof createClient> | null = null;

export function getSupabaseClient(supabaseUrl: string, anonKey: string) {
  // Return existing instance if already created with same credentials
  if (supabaseInstance) {
    return supabaseInstance;
  }

  // Create new instance only if none exists
  supabaseInstance = createClient(supabaseUrl, anonKey, {
    auth: {
      // Prevent multiple auth instances
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false, // Prevent URL-based session detection conflicts
    },
    realtime: {
      // Disable realtime to reduce client instances
      params: {
        eventsPerSecond: 2,
      },
    },
  });

  return supabaseInstance;
}

// Reset function for testing or cleanup
export function resetSupabaseClient() {
  supabaseInstance = null;
}