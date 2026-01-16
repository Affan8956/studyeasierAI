
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { LabAsset, UserProfile, ShareRequest } from '../types';

/**
 * Searches for users via the Supabase RPC function.
 */
export const searchUsers = async (query: string): Promise<UserProfile[]> => {
  if (!isSupabaseConfigured || query.length < 3) return [];

  const { data, error } = await supabase.rpc('search_users', { search_term: query });

  if (error) {
    console.error("Search users error:", error);
    return [];
  }
  return data || [];
};

/**
 * Sends a sharing request (sets status to pending).
 */
export const sendShareRequest = async (
  ownerId: string, 
  ownerName: string, 
  targetUserId: string, 
  targetUserEmail: string, 
  assetId?: string
) => {
  if (!isSupabaseConfigured) throw new Error("Cloud features disabled (Local Mode).");
  
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
    
  if (error) throw new Error(error.message || "Failed to send share request");
  return data;
};

/**
 * Fetches pending requests for the current user.
 * Now uses direct client query to avoid SQL UUID casting issues.
 */
export const getPendingRequests = async (userId: string): Promise<ShareRequest[]> => {
  if (!isSupabaseConfigured) return [];
  
  // Fetch from shared_resources table directly
  const { data: shares, error } = await supabase
    .from('shared_resources')
    .select('id, resource_type, asset_id, shared_by_name, created_at')
    .eq('target_user_id', userId)
    .eq('status', 'pending');

  if (error) {
    console.error("Fetch requests error:", error);
    return [];
  }

  if (!shares || shares.length === 0) return [];

  // Manually join with assets to get titles
  const enrichedRequests = await Promise.all(shares.map(async (share) => {
    let assetTitle = 'Entire Vault';
    
    if (share.resource_type === 'asset' && share.asset_id) {
      const { data: asset } = await supabase
        .from('assets')
        .select('title')
        .eq('id', share.asset_id)
        .maybeSingle();
        
      if (asset) {
        assetTitle = asset.title;
      } else {
        assetTitle = 'Unavailable Resource';
      }
    }

    return {
      request_id: share.id,
      resource_type: share.resource_type,
      asset_title: assetTitle,
      shared_by_name: share.shared_by_name,
      created_at: share.created_at
    } as ShareRequest;
  }));

  return enrichedRequests;
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

  if (error) throw new Error(error.message || "Failed to update request status");
};

/**
 * Gets content that has been explicitly accepted.
 */
export const getSharedContent = async (userId: string): Promise<LabAsset[]> => {
  if (!isSupabaseConfigured) return [];

  try {
    // 1. Find all shares targeting this user that are ACCEPTED
    const { data: shares, error } = await supabase
      .from('shared_resources')
      .select('*')
      .eq('target_user_id', userId) 
      .eq('status', 'accepted');

    if (error) {
      console.error("Error fetching shares:", error);
      return [];
    }
    
    if (!shares || shares.length === 0) return [];

    const sharedAssets: LabAsset[] = [];

    // 2. Resolve assets for each share
    for (const share of shares) {
      try {
        if (share.resource_type === 'asset' && share.asset_id) {
          // Fetch specific asset
          const { data: asset, error: assetError } = await supabase
            .from('assets')
            .select('*')
            .eq('id', share.asset_id)
            .maybeSingle(); // Use maybeSingle to prevent throwing on 0 rows (RLS hidden)
          
          if (asset && !assetError) {
            sharedAssets.push(mapDbAssetToType(asset, share.shared_by_name));
          }
        } else if (share.resource_type === 'vault') {
          // Fetch ALL assets from the owner (Vault Share)
          const { data: assets, error: assetsError } = await supabase
            .from('assets')
            .select('*')
            .eq('user_id', share.owner_id);
            
          if (assets && !assetsError) {
            assets.forEach((a: any) => sharedAssets.push(mapDbAssetToType(a, share.shared_by_name)));
          }
        }
      } catch (innerErr) {
        console.warn(`Failed to resolve share ${share.id}`, innerErr);
        // Continue loop even if one share fails
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
    console.warn("Error fetching shared content:", err.message || err);
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
