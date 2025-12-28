
import { User } from '../types';
import { supabase } from './supabaseClient';

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
 * Robust wrapper for Supabase calls with timeout protection
 */
const withTimeout = <T>(promise: Promise<T>, ms: number = 10000): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('CONNECTION_TIMEOUT')), ms))
  ]);
};

export const login = async (email: string, password: string) => {
  try {
    // Added 'as any' cast to bypass inference issue where result is seen as {}
    const { data, error } = await (withTimeout(supabase.auth.signInWithPassword({
      email,
      password,
    })) as any);

    if (error) {
      if (error.message.toLowerCase().includes('email not confirmed')) {
        throw new Error('EMAIL_NOT_CONFIRMED');
      }
      throw error;
    }

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
    if (err.message === 'CONNECTION_TIMEOUT') {
      throw new Error('Server connection timed out. Please check your internet or Supabase status.');
    }
    throw err;
  }
};

export const signup = async (name: string, email: string, password: string) => {
  // Added 'as any' cast to bypass inference issue where result is seen as {}
  const { data, error } = await (withTimeout(supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: name },
      emailRedirectTo: window.location.origin
    }
  })) as any);

  if (error) {
    if (error.message.toLowerCase().includes('user already registered')) {
      throw new Error('USER_ALREADY_EXISTS');
    }
    throw error;
  }
  return data.user;
};

export const resendConfirmationEmail = async (email: string) => {
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
  await supabase.auth.signOut();
};

export const getCurrentSession = async () => {
  try {
    // Added 'as any' cast to bypass inference issue where result is seen as {}
    const { data: { session }, error: sessionError } = await (withTimeout(supabase.auth.getSession(), 5000) as any);
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
