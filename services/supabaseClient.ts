
import { createClient } from '@supabase/supabase-js';

// Robust environment variable accessor that checks multiple common prefixes
const getEnvVar = (possibleKeys: string[]) => {
  // 1. Check import.meta.env (Vite standard)
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      for (const key of possibleKeys) {
        // @ts-ignore
        if (import.meta.env[key]) return import.meta.env[key];
      }
    }
  } catch (e) {}
  
  // 2. Check process.env (Node.js/System standard)
  try {
    // @ts-ignore
    if (typeof process !== 'undefined' && process.env) {
      for (const key of possibleKeys) {
        // @ts-ignore
        if (process.env[key]) return process.env[key];
      }
    }
  } catch (e) {}
  
  return undefined;
};

const rawSupabaseUrl = getEnvVar(['VITE_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_URL']);
const rawSupabaseKey = getEnvVar(['VITE_SUPABASE_KEY', 'VITE_SUPABASE_ANON_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_ANON_KEY', 'SUPABASE_KEY']);

// Check for all common naming conventions
const supabaseUrl = rawSupabaseUrl || 'https://placeholder-project.supabase.co';
const supabaseAnonKey = rawSupabaseKey || 'placeholder-key';

export const isSupabaseConfigured = !!(rawSupabaseUrl && rawSupabaseKey && !rawSupabaseUrl.includes('placeholder'));

// Create client with autoRefreshToken disabled to prevent aggressive retries on bad keys
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
});
