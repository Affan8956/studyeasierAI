
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

// 1. Try to get keys from Environment Variables first
const envUrl = getEnvVar(['VITE_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_URL']);
const envKey = getEnvVar(['VITE_SUPABASE_KEY', 'VITE_SUPABASE_ANON_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_ANON_KEY', 'SUPABASE_KEY']);

// 2. Fallback to the hardcoded keys provided by the user
// NOTE: Ideally these should be in a .env file, but this ensures it works immediately for you.
const supabaseUrl = envUrl || 'https://brldjshkavgwtsismdtl.supabase.co';
const supabaseAnonKey = envKey || 'sb_publishable_6AF-Ac1KTu94s5l5AJBXQw_m_9ZDoIk';

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('placeholder'));

// Create client with autoRefreshToken disabled to prevent aggressive retries on bad keys
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true, // Enable refresh for better UX
    detectSessionInUrl: true
  }
});
