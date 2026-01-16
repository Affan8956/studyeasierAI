
import { User } from '../types';
import { supabase, isSupabaseConfigured } from './supabaseClient';

const mapSupabaseUserToAppUser = (supabaseUser: any, profile: any): User => {
  return {
    id: supabaseUser.id,
    email: supabaseUser.email || '',
    name: profile?.name || supabaseUser.user_metadata?.full_name || 'Student',
    preferences: profile?.preferences || {
      theme: 'dark',
      defaultMode: 'study'
    }
  };
};

/**
 * Creates a mock local user for offline mode or when backend is unreachable
 */
const createLocalUser = (email: string, name?: string): User => ({
  id: 'local_user_' + Math.random().toString(36).substr(2, 9),
  email: email,
  name: name || email.split('@')[0] || 'Local Student',
  preferences: { theme: 'dark', defaultMode: 'study' }
});

/**
 * Robust wrapper for Supabase calls with timeout protection.
 * Ensures that if a timeout wins, the original promise's rejection is caught silently
 * to prevent "signal is aborted" or "unhandled rejection" errors.
 */
const withTimeout = <T>(promise: Promise<T>, ms: number = 8000): Promise<T> => {
  let timeoutId: any;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('CONNECTION_TIMEOUT')), ms);
  });

  return Promise.race([
    promise.then(val => {
      clearTimeout(timeoutId);
      return val;
    }),
    timeoutPromise
  ]).catch(err => {
    // If it's a timeout, we let the original promise fail silently in the background
    // if it eventually finishes or aborts.
    if (err.message === 'CONNECTION_TIMEOUT') {
      promise.catch(() => {}); // Sink the original promise's error
      throw err;
    }
    clearTimeout(timeoutId);
    throw err;
  });
};

export const login = async (email: string, password: string) => {
  // Immediate Local Fallback if no backend configured
  if (!isSupabaseConfigured) {
    console.warn("Supabase not configured. Logging in as Local User.");
    return { user: createLocalUser(email), token: 'local-token' };
  }

  try {
    const { data, error } = await (withTimeout(supabase.auth.signInWithPassword({
      email,
      password,
    })) as any);

    if (error) throw error;

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .maybeSingle();

    return { 
      user: mapSupabaseUserToAppUser(data.user, profile), 
      token: data.session?.access_token 
    };
  } catch (err: any) {
    const errorMsg = (err.message || "").toLowerCase();
    
    // Graceful Fallback for Network/Config Errors
    if (
      err.message === 'CONNECTION_TIMEOUT' || 
      errorMsg.includes('failed to fetch') || 
      errorMsg.includes('invalid api key') ||
      errorMsg.includes('abort') ||
      errorMsg.includes('signal')
    ) {
      console.warn("Backend unreachable or request aborted. Falling back to Local Mode.", err.message);
      return { user: createLocalUser(email), token: 'local-offline-token' };
    }

    if (errorMsg.includes('email not confirmed')) {
      throw new Error('EMAIL_NOT_CONFIRMED');
    }
    throw err;
  }
};

export const signup = async (name: string, email: string, password: string) => {
  if (!isSupabaseConfigured) {
    return createLocalUser(email, name);
  }

  try {
    const { data, error } = await (withTimeout(supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
        emailRedirectTo: window.location.origin
      }
    })) as any);

    if (error) throw error;
    return data.user;
  } catch (err: any) {
    const errorMsg = (err.message || "").toLowerCase();

    if (
      err.message === 'CONNECTION_TIMEOUT' || 
      errorMsg.includes('failed to fetch') || 
      errorMsg.includes('invalid api key') ||
      errorMsg.includes('abort') ||
      errorMsg.includes('signal')
    ) {
      console.warn("Backend unreachable during signup. Creating Local User.");
      return createLocalUser(email, name);
    }

    if (errorMsg.includes('user already registered')) {
      throw new Error('USER_ALREADY_EXISTS');
    }
    throw err;
  }
};

export const resendConfirmationEmail = async (email: string) => {
  if (!isSupabaseConfigured) return; 
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: email,
    options: {
      emailRedirectTo: window.location.origin
    }
  });
  if (error) throw error;
};

export const sendPasswordResetEmail = async (email: string) => {
  if (!isSupabaseConfigured) throw new Error("Cloud backend unavailable");
  
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin,
  });
  
  if (error) throw error;
};

export const updatePassword = async (password: string) => {
  if (!isSupabaseConfigured) throw new Error("Cloud backend unavailable");
  
  const { data, error } = await supabase.auth.updateUser({
    password: password
  });

  if (error) throw error;
  return data.user;
};

export const logout = async () => {
  if (isSupabaseConfigured) {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      // Ignore network errors on logout
    }
  }
};

export const getCurrentSession = async () => {
  if (!isSupabaseConfigured) return null;

  try {
    const { data: { session }, error: sessionError } = await (withTimeout(supabase.auth.getSession(), 3000) as any);
    if (sessionError || !session) return null;
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .maybeSingle();

    return { 
      user: mapSupabaseUserToAppUser(session.user, profile), 
      token: session.access_token 
    };
  } catch (e) {
    return null;
  }
};
