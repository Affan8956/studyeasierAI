
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

// 2. Fallback to the NEW hardcoded keys provided by the user
const supabaseUrl = envUrl || 'https://gotwrqmftdrbbziarsnc.supabase.co';
const supabaseAnonKey = envKey || 'sb_publishable_6DDCvXWdYDvluzsx59Hq2Q_Rp65n1Xn';

// Check if the configuration is valid (not empty, not placeholder)
export const isSupabaseConfigured = !!(
  supabaseUrl && 
  supabaseAnonKey && 
  !supabaseUrl.includes('placeholder') &&
  supabaseUrl.startsWith('http')
);

// Create client only if configured, otherwise create a dummy client that fails gracefully
export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  : createClient('https://placeholder.supabase.co', 'placeholder', { auth: { persistSession: false, autoRefreshToken: false } });
