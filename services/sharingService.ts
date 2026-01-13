
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { LabAsset } from '../types';

/**
 * SQL SCHEMA REQUIREMENT:
 * To use this feature, run the following SQL in your Supabase SQL Editor:
 * 
 * create table if not exists shared_resources (
 *   id uuid default gen_random_uuid() primary key,
 *   created_at timestamp with time zone default timezone('utc'::text, now()) not null,
 *   owner_id uuid not null,
 *   shared_with_email text not null,
 *   resource_type text not null, -- 'asset' or 'vault'
 *   asset_id text -- nullable
 * );
 * 
 * -- Optional RLS Policies would be needed for true security in a production app
 */

export const shareResource = async (ownerId: string, email: string, assetId?: string) => {
  if (!isSupabaseConfigured) throw new Error("Cloud features disabled (Local Mode).");
  
  const { data, error } = await supabase
    .from('shared_resources')
    .insert([{
      owner_id: ownerId,
      shared_with_email: email,
      asset_id: assetId || null,
      resource_type: assetId ? 'asset' : 'vault'
    }]);
    
  if (error) throw error;
  return data;
};

export const getSharedContent = async (userEmail: string): Promise<LabAsset[]> => {
  if (!isSupabaseConfigured) return [];

  try {
    // 1. Find all shares targeting this user's email
    const { data: shares, error } = await supabase
      .from('shared_resources')
      .select('*')
      .eq('shared_with_email', userEmail);

    if (error || !shares || shares.length === 0) return [];

    const sharedAssets: LabAsset[] = [];

    // 2. Resolve assets for each share
    for (const share of shares) {
      if (share.resource_type === 'asset' && share.asset_id) {
        // Fetch specific asset
        const { data: asset } = await supabase
          .from('assets')
          .select('*')
          .eq('id', share.asset_id)
          .single();
        
        if (asset) {
          sharedAssets.push(mapDbAssetToType(asset, true));
        }
      } else if (share.resource_type === 'vault') {
        // Fetch ALL assets from the owner (Vault Share)
        const { data: assets } = await supabase
          .from('assets')
          .select('*')
          .eq('user_id', share.owner_id);
          
        if (assets) {
          assets.forEach((a: any) => sharedAssets.push(mapDbAssetToType(a, true)));
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

  } catch (err) {
    console.warn("Error fetching shared content:", err);
    return [];
  }
};

const mapDbAssetToType = (dbAsset: any, isShared: boolean): LabAsset => ({
  id: dbAsset.id,
  userId: dbAsset.user_id,
  title: dbAsset.title,
  type: dbAsset.type,
  content: dbAsset.content,
  sourceName: dbAsset.source_name + (isShared ? ' (Shared)' : ''),
  timestamp: new Date(dbAsset.created_at).getTime()
});
