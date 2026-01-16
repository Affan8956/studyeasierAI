
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
 * Robust wrapper for promises with timeout protection.
 * Sinks original promise rejections to prevent aborted signal errors.
 */
const withTimeout = <T>(promise: Promise<T>, ms: number = 5000, fallback: T): Promise<T> => {
  let timeoutId: any;
  const timeoutPromise = new Promise<T>((resolve) => {
    timeoutId = setTimeout(() => resolve(fallback), ms);
  });

  return Promise.race([
    promise.then(val => {
      clearTimeout(timeoutId);
      return val;
    }),
    timeoutPromise
  ]).catch(() => {
    // If the timeout wins or original fails, we handle it gracefully
    clearTimeout(timeoutId);
    return fallback;
  });
};

const handleSupabaseError = (error: any, feature: 'chats' | 'assets') => {
  const errorMsg = (error.message || "").toLowerCase();
  console.warn(`Supabase ${feature} error:`, errorMsg);
  
  if (
    error.code === 'PGRST204' || 
    error.code === 'PGRST205' || 
    error.status === 404 || 
    errorMsg.includes('not found') ||
    errorMsg.includes('failed to fetch') ||
    errorMsg.includes('invalid api key') ||
    errorMsg.includes('abort') ||
    errorMsg.includes('signal')
  ) {
    if (cloudSyncActive[feature]) {
      console.warn(`Supabase ${feature} sync disabled: ${errorMsg || 'Connection issues'}. Switching to Local Mode.`);
      cloudSyncActive[feature] = false;
    }
  }
};

const isValidUUID = (id: string) => {
  const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return regex.test(id);
};

export const saveChat = async (userId: string, chat: ChatSession) => {
  await db.saveChat(chat);

  if (!cloudSyncActive.chats) return;
  if (!isValidUUID(userId)) return;

  try {
    const { error } = await supabase
      .from('chats')
      .upsert({
        id: chat.id,
        user_id: userId,
        title: chat.title,
        mode: chat.mode,
        messages: chat.messages,
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
  if (!isValidUUID(userId)) return localHistory;

  try {
    const { data, error } = await withTimeout(
      supabase
        .from('chats')
        .select('*') 
        .eq('user_id', userId)
        .order('updated_at', { ascending: false }) as any,
      5000,
      { data: null, error: null } as any
    );

    if (error) {
      handleSupabaseError(error, 'chats');
      return localHistory;
    }

    if (data) {
      const synced = data.map((chat: any) => ({
        id: chat.id,
        userId: chat.user_id,
        title: chat.title,
        mode: chat.mode,
        messages: Array.isArray(chat.messages) ? chat.messages.map((m: any) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          timestamp: m.timestamp || new Date(m.created_at || Date.now()).getTime()
        })) : [],
        createdAt: new Date(chat.created_at).getTime(),
        updatedAt: new Date(chat.updated_at).getTime()
      }));

      if (synced.length > 0) return synced;
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

  if (cloudSyncActive.chats && isValidUUID(userId)) {
    try {
      const { error } = await supabase
        .from('chats')
        .insert([{ 
          id: newChat.id, 
          user_id: userId, 
          mode, 
          title: 'New Discussion',
          messages: [] 
        }]);
      
      if (error) handleSupabaseError(error, 'chats');
    } catch (err: any) {
      handleSupabaseError(err, 'chats');
    }
  }

  return newChat;
};

export const deleteChat = async (userId: string, id: string) => {
  await db.deleteChat(id);
  if (cloudSyncActive.chats && isValidUUID(userId)) {
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

  if (cloudSyncActive.assets && isValidUUID(userId)) {
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
  if (!isValidUUID(userId)) return localAssets;

  try {
    const { data, error } = await withTimeout(
      supabase
        .from('assets')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }) as any,
      5000, 
      { data: null, error: null } as any
    );

    if (error) {
      handleSupabaseError(error, 'assets');
      return localAssets;
    }

    if (data) {
      const synced = data.map((asset: any) => ({
        id: asset.id,
        userId: asset.user_id,
        title: asset.title,
        type: asset.type,
        content: asset.content, 
        sourceName: asset.source_name,
        timestamp: new Date(asset.created_at).getTime()
      }));
      return synced;
    }
  } catch (e: any) {
    handleSupabaseError(e, 'assets');
  }

  return localAssets;
};

export const deleteAsset = async (userId: string, id: string) => {
  await db.deleteAsset(id);
  if (cloudSyncActive.assets && isValidUUID(userId)) {
    try {
      await supabase.from('assets').delete().eq('id', id);
    } catch (e: any) {
      handleSupabaseError(e, 'assets');
    }
  }
};

export const clearAllAssets = async (userId: string) => {
  await db.clearAssets(userId);
  if (cloudSyncActive.assets && isValidUUID(userId)) {
    try {
      await supabase.from('assets').delete().eq('user_id', userId);
    } catch (e: any) {
      handleSupabaseError(e, 'assets');
    }
  }
};
