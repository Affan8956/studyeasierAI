
import { ChatSession, LabAsset, AIMode, Message } from '../types';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { db } from './db';

/**
 * Cloud Sync State Tracker
 */
let cloudSyncActive = {
  chats: isSupabaseConfigured,
  assets: isSupabaseConfigured
};

/**
 * Wraps a promise with a timeout.
 */
const withTimeout = <T>(promise: Promise<T>, ms: number = 2000, fallback: T): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))
  ]);
};

const handleSupabaseError = (error: any, feature: 'chats' | 'assets') => {
  // If we get connection errors, 404s, or auth errors, downgrade to local mode
  if (
    error.code === 'PGRST204' || 
    error.code === 'PGRST205' || 
    error.status === 404 || 
    error.message?.includes('not found') ||
    error.message?.includes('Failed to fetch') ||
    error.message?.includes('Invalid API key')
  ) {
    if (cloudSyncActive[feature]) {
      console.warn(`Supabase ${feature} sync disabled: ${error.message || 'Connection failed'}. Switching to Local Mode.`);
      cloudSyncActive[feature] = false;
    }
  }
};

export const saveChat = async (userId: string, chat: ChatSession) => {
  await db.saveChat(chat);

  if (!cloudSyncActive.chats) return;

  try {
    const { error } = await supabase
      .from('chats')
      .upsert({
        id: chat.id,
        user_id: userId,
        title: chat.title,
        mode: chat.mode,
        updated_at: new Date().toISOString()
      });
    if (error) handleSupabaseError(error, 'chats');
  } catch (e: any) {
    handleSupabaseError(e, 'chats');
  }
};

export const getHistory = async (userId: string): Promise<ChatSession[]> => {
  const localHistory = await db.getChats(userId);
  
  if (!cloudSyncActive.chats) return localHistory;

  try {
    const { data, error } = await withTimeout(
      supabase
        .from('chats')
        .select('*, messages(*)')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false }) as any,
      2500,
      { data: null, error: null } as any
    );

    if (error) {
      handleSupabaseError(error, 'chats');
      return localHistory;
    }

    if (data && data.length > 0) {
      const synced = data.map((chat: any) => ({
        id: chat.id,
        userId: chat.user_id,
        title: chat.title,
        mode: chat.mode,
        messages: (chat.messages || []).map((m: any) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          timestamp: new Date(m.created_at).getTime()
        })),
        createdAt: new Date(chat.created_at).getTime(),
        updatedAt: new Date(chat.updated_at).getTime()
      }));

      return synced;
    }
  } catch (e: any) {
    handleSupabaseError(e, 'chats');
  }

  return localHistory;
};

export const createNewChat = async (userId: string, mode: AIMode): Promise<ChatSession> => {
  const newChat: ChatSession = {
    id: 'chat_' + Math.random().toString(36).substr(2, 9),
    userId,
    title: 'New Discussion',
    mode,
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  await db.saveChat(newChat);

  if (cloudSyncActive.chats) {
    try {
      const { error } = await supabase
        .from('chats')
        .insert([{ id: newChat.id, user_id: userId, mode, title: 'New Discussion' }]);
      
      if (error) handleSupabaseError(error, 'chats');
    } catch (err: any) {
      handleSupabaseError(err, 'chats');
    }
  }

  return newChat;
};

export const deleteChat = async (userId: string, id: string) => {
  await db.deleteChat(id);
  if (cloudSyncActive.chats) {
    try {
      await supabase.from('chats').delete().eq('id', id);
    } catch (e: any) {
      handleSupabaseError(e, 'chats');
    }
  }
};

export const saveAsset = async (userId: string, asset: Omit<LabAsset, 'id' | 'timestamp' | 'userId'>) => {
  const fullAsset: LabAsset = {
    ...asset,
    id: 'asset_' + Math.random().toString(36).substr(2, 9),
    userId,
    timestamp: Date.now()
  };

  await db.saveAsset(fullAsset);

  if (cloudSyncActive.assets) {
    try {
      const { error } = await supabase
        .from('assets')
        .insert([{
          id: fullAsset.id,
          user_id: userId,
          title: asset.title,
          type: asset.type,
          content: asset.content,
          source_name: asset.sourceName
        }]);
      if (error) handleSupabaseError(error, 'assets');
    } catch (e: any) {
      handleSupabaseError(e, 'assets');
    }
  }
};

export const getAssets = async (userId: string): Promise<LabAsset[]> => {
  const localAssets = await db.getAssets(userId);
  if (!cloudSyncActive.assets) return localAssets;

  try {
    const { data, error } = await withTimeout(
      supabase
        .from('assets')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }) as any,
      2500, 
      { data: null, error: null } as any
    );

    if (error) {
      handleSupabaseError(error, 'assets');
      return localAssets;
    }

    if (data && data.length > 0) {
      return data.map((asset: any) => ({
        id: asset.id,
        userId: asset.user_id,
        title: asset.title,
        type: asset.type,
        content: asset.content,
        sourceName: asset.source_name,
        timestamp: new Date(asset.created_at).getTime()
      }));
    }
  } catch (e: any) {
    handleSupabaseError(e, 'assets');
  }

  return localAssets;
};

export const deleteAsset = async (userId: string, id: string) => {
  await db.deleteAsset(id);
  if (cloudSyncActive.assets) {
    try {
      await supabase.from('assets').delete().eq('id', id);
    } catch (e: any) {
      handleSupabaseError(e, 'assets');
    }
  }
};

export const clearAllAssets = async (userId: string) => {
  await db.clearAssets(userId);
  if (cloudSyncActive.assets) {
    try {
      await supabase.from('assets').delete().eq('user_id', userId);
    } catch (e: any) {
      handleSupabaseError(e, 'assets');
    }
  }
};
