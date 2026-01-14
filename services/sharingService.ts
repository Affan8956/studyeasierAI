
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { LabAsset, UserProfile, ShareRequest } from '../types';

const isValidUUID = (id: string) => {
  const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return regex.test(id);
};

/**
 * Searches for users via the Supabase RPC function.
 */
export const searchUsers = async (query: string): Promise<UserProfile[]> => {
  if (!isSupabaseConfigured || query.length < 3) return [];

  try {
    const { data, error } = await supabase.rpc('search_users', { search_term: query });
    if (error) {
      // If the function doesn't exist or other db error, log message to avoid [object Object]
      console.warn("Search users error:", error.message);
      return [];
    }
    return data || [];
  } catch (err: any) {
    console.error("Search users exception:", err.message || err);
    return [];
  }
};

/**
 * Sends a sharing request (sets status to pending).
 */
export const sendShareRequest = async (ownerId: string, ownerName: string, targetUserId: string, targetUserEmail: string, assetId?: string) => {
  if (!isSupabaseConfigured) throw new Error("Cloud features disabled (Local Mode).");
  if (!isValidUUID(ownerId)) throw new Error("Your account is in Local Mode (ID not synced). Cannot share.");
  if (!isValidUUID(targetUserId)) throw new Error("Invalid Target User ID.");

  const { data, error } = await supabase
    .from('shared_resources')
    .insert([{
      owner_id: ownerId,
      target_user_id: targetUserId,
      shared_with_email: targetUserEmail,
      shared_by_name: ownerName,
      asset_id: assetId || null,
      resource_type: assetId ? 'asset' : 'vault',
      status: 'pending' // Explicitly setting pending
    }]);
    
  if (error) throw new Error(error.message);
  return data;
};

/**
 * Fetches pending requests for the current user.
 */
export const getPendingRequests = async (userId: string): Promise<ShareRequest[]> => {
  if (!isSupabaseConfigured) return [];
  if (!isValidUUID(userId)) return []; // Silent return for local users
  
  try {
    const { data, error } = await supabase.rpc('get_pending_requests', { current_user_id: userId });

    if (error) {
      console.error("Fetch requests error:", error.message);
      return [];
    }
    return data || [];
  } catch (err: any) {
    console.error("Fetch requests exception:", err.message || err);
    return [];
  }
};

/**
 * Responds to a share request (Accept/Reject).
 */
export const respondToShareRequest = async (requestId: string, status: 'accepted' | 'rejected') => {
  if (!isSupabaseConfigured) return;

  const { error } = await supabase
    .from('shared_resources')
    .update({ status: status })
    .eq('id', requestId);

  if (error) throw new Error(error.message);
};

/**
 * Gets content that has been explicitly accepted.
 */
export const getSharedContent = async (userId: string): Promise<LabAsset[]> => {
  if (!isSupabaseConfigured) return [];
  if (!isValidUUID(userId)) return [];

  try {
    // 1. Find all shares targeting this user that are ACCEPTED
    const { data: shares, error } = await supabase
      .from('shared_resources')
      .select('*')
      .eq('target_user_id', userId) 
      .eq('status', 'accepted');

    if (error) {
      console.warn("Error fetching shared resources:", error.message);
      return [];
    }
    if (!shares || shares.length === 0) return [];

    const sharedAssets: LabAsset[] = [];

    // 2. Resolve assets for each share
    for (const share of shares) {
      if (share.resource_type === 'asset' && share.asset_id) {
        // Fetch specific asset
        const { data: asset } = await supabase
          .from('assets')
          .select('*')
          .eq('id', share.asset_id)
          .maybeSingle(); // Use maybeSingle to handle deleted assets gracefully
        
        if (asset) {
          sharedAssets.push(mapDbAssetToType(asset, share.shared_by_name));
        }
      } else if (share.resource_type === 'vault') {
        // Fetch ALL assets from the owner (Vault Share)
        const { data: assets } = await supabase
          .from('assets')
          .select('*')
          .eq('user_id', share.owner_id);
          
        if (assets) {
          assets.forEach((a: any) => sharedAssets.push(mapDbAssetToType(a, share.shared_by_name)));
        }
      }
    }

    // Deduplicate by ID
    const seen = new Set();
    return sharedAssets.filter(a => {
      const duplicate = seen.has(a.id);
      seen.add(a.id);
      return !duplicate;
    });

  } catch (err: any) {
    console.warn("Error processing shared content:", err.message || err);
    return [];
  }
};

const mapDbAssetToType = (dbAsset: any, sharerName?: string): LabAsset => ({
  id: dbAsset.id,
  userId: dbAsset.user_id,
  title: dbAsset.title,
  type: dbAsset.type,
  content: dbAsset.content,
  sourceName: dbAsset.source_name + (sharerName ? ` (Shared by ${sharerName})` : ''),
  timestamp: new Date(dbAsset.created_at).getTime()
});
