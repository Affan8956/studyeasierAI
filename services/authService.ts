
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
 * Robust wrapper for Supabase calls with timeout protection
 */
const withTimeout = <T>(promise: Promise<T>, ms: number = 8000): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('CONNECTION_TIMEOUT')), ms))
  ]);
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
    // Graceful Fallback for Network/Config Errors
    if (
      err.message === 'CONNECTION_TIMEOUT' || 
      err.message?.includes('Failed to fetch') || 
      err.message?.includes('Invalid API key')
    ) {
      console.warn("Backend unreachable. Falling back to Local Mode.", err.message);
      return { user: createLocalUser(email), token: 'local-offline-token' };
    }

    if (err.message.toLowerCase().includes('email not confirmed')) {
      throw new Error('EMAIL_NOT_CONFIRMED');
    }
    throw err;
  }
};

export const signup = async (name: string, email: string, password: string) => {
  // Immediate Local Fallback
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
    // Graceful Fallback
    if (
      err.message === 'CONNECTION_TIMEOUT' || 
      err.message?.includes('Failed to fetch') || 
      err.message?.includes('Invalid API key')
    ) {
      console.warn("Backend unreachable. Creating Local User.");
      return createLocalUser(email, name);
    }

    if (err.message.toLowerCase().includes('user already registered')) {
      throw new Error('USER_ALREADY_EXISTS');
    }
    throw err;
  }
};

export const resendConfirmationEmail = async (email: string) => {
  if (!isSupabaseConfigured) return; // No-op in local mode
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: email,
    options: {
      emailRedirectTo: window.location.origin
    }
  });
  if (error) throw error;
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
    // If backend check fails, assume no session rather than crashing
    return null;
  }
};
