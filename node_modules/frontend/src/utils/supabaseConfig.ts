import type { SupabaseClientOptions } from '@supabase/supabase-js';

// Optimized Supabase configuration to prevent multiple client issues
export const supabaseConfig: SupabaseClientOptions = {
  auth: {
    // Disable automatic session persistence to reduce conflicts
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
    // Use memory storage instead of localStorage to avoid conflicts
    storage: {
      getItem: (key: string) => {
        return null; // Use memory-only storage for file upload operations
      },
      setItem: (key: string, value: string) => {
        // No-op for upload-only operations
      },
      removeItem: (key: string) => {
        // No-op for upload-only operations
      },
    },
  },
  realtime: {
    // Disable realtime features for file upload use case
    params: {
      eventsPerSecond: 1,
    },
  },
  // Disable global configuration to prevent conflicts
  global: {
    headers: {},
  },
};