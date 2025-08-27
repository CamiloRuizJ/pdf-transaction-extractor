import { createClient } from '@supabase/supabase-js';
import { supabaseConfig } from '../utils/supabaseConfig';

// Singleton pattern for Supabase client to avoid multiple instances
let supabaseInstance: ReturnType<typeof createClient> | null = null;
let currentCredentials: { url: string; key: string } | null = null;

export function getSupabaseClient(supabaseUrl: string, anonKey: string) {
  // Check if we need to create a new instance with different credentials
  if (currentCredentials && 
      (currentCredentials.url !== supabaseUrl || currentCredentials.key !== anonKey)) {
    // Reset instance if credentials changed
    supabaseInstance = null;
    currentCredentials = null;
  }

  // Return existing instance if already created with same credentials
  if (supabaseInstance && currentCredentials) {
    return supabaseInstance;
  }

  // Create new instance with optimized configuration
  supabaseInstance = createClient(supabaseUrl, anonKey, supabaseConfig);
  currentCredentials = { url: supabaseUrl, key: anonKey };

  return supabaseInstance;
}

// Reset function for testing or cleanup
export function resetSupabaseClient() {
  supabaseInstance = null;
}