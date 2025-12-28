
import { ChatSession, LabAsset, AIMode, Message } from '../types';
import { supabase } from './supabaseClient';
import { db } from './db';

/**
 * Cloud Sync State Tracker
 * We use this to prevent repeated 404/403 errors if the tables don't exist yet.
 */
let cloudSyncActive = {
  chats: true,
  assets: true
};

const handleSupabaseError = (error: any, feature: 'chats' | 'assets') => {
  // If we get a 404 (Not Found) or 403 (Forbidden/RLS) it usually means tables are missing
  if (error.code === 'PGRST204' || error.code === 'PGRST205' || error.status === 404 || error.message?.includes('not found')) {
    if (cloudSyncActive[feature]) {
      console.warn(`Supabase ${feature} table not found. Switching to highly-available Local Mode.`);
      cloudSyncActive[feature] = false;
    }
  }
};

export const saveChat = async (userId: string, chat: ChatSession) => {
  // 1. Local storage is the source of truth for immediate responsiveness
  await db.saveChat(chat);

  // 2. Cloud Sync (Async)
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
  } catch (e) {}
};

export const getHistory = async (userId: string): Promise<ChatSession[]> => {
  // Always get local first
  const localHistory = await db.getChats(userId);
  
  if (!cloudSyncActive.chats) return localHistory;

  try {
    const { data, error } = await supabase
      .from('chats')
      .select('*, messages(*)')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

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

      // In a real app, we would merge synced and localHistory here.
      // For now, if we have cloud data, we use it to ensure cross-device consistency.
      return synced;
    }
  } catch (e) {}

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

  // Save locally first
  await db.saveChat(newChat);

  if (cloudSyncActive.chats) {
    try {
      const { error } = await supabase
        .from('chats')
        .insert([{ id: newChat.id, user_id: userId, mode, title: 'New Discussion' }]);
      
      if (error) handleSupabaseError(error, 'chats');
    } catch (err) {}
  }

  return newChat;
};

export const deleteChat = async (userId: string, id: string) => {
  await db.deleteChat(id);
  if (cloudSyncActive.chats) {
    try {
      await supabase.from('chats').delete().eq('id', id);
    } catch (e) {}
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
    } catch (e) {}
  }
};

export const getAssets = async (userId: string): Promise<LabAsset[]> => {
  const localAssets = await db.getAssets(userId);
  if (!cloudSyncActive.assets) return localAssets;

  try {
    const { data, error } = await supabase
      .from('assets')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

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
  } catch (e) {}

  return localAssets;
};

export const deleteAsset = async (userId: string, id: string) => {
  await db.deleteAsset(id);
  if (cloudSyncActive.assets) {
    try {
      await supabase.from('assets').delete().eq('id', id);
    } catch (e) {}
  }
};

export const clearAllAssets = async (userId: string) => {
  await db.clearAssets(userId);
  if (cloudSyncActive.assets) {
    try {
      await supabase.from('assets').delete().eq('user_id', userId);
    } catch (e) {}
  }
};
