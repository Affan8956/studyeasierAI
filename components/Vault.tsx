
import React, { useState, useEffect } from 'react';
import { LabAsset, ChatSession, User, UserProfile, ShareRequest } from '../types';
import { 
  searchUsers, 
  sendShareRequest, 
  getPendingRequests, 
  respondToShareRequest, 
  getSharedContent 
} from '../services/sharingService';

interface VaultProps {
  user: User;
  assets: LabAsset[];
  chats: ChatSession[];
  onViewAsset: (asset: LabAsset) => void;
  onDeleteAsset: (id: string) => void;
  onClearAll: () => void;
}

const Vault: React.FC<VaultProps> = ({ user, assets, chats, onViewAsset, onDeleteAsset, onClearAll }) => {
  const [filter, setFilter] = useState<'all' | 'summary' | 'quiz' | 'flashcards' | 'slides' | 'research' | 'image_analysis'>('all');
  const [vaultTab, setVaultTab] = useState<'personal' | 'shared' | 'requests'>('personal');
  const [sharedAssets, setSharedAssets] = useState<LabAsset[]>([]);
  const [pendingRequests, setPendingRequests] = useState<ShareRequest[]>([]);
  const [search, setSearch] = useState('');
  
  // Modal States
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [shareTargetAssetId, setShareTargetAssetId] = useState<string | null>(null); // null means vault share
  
  // User Search States
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userSearchResults, setUserSearchResults] = useState<UserProfile[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [shareStatus, setShareStatus] = useState<'idle' | 'searching' | 'sending' | 'success' | 'error'>('idle');

  // Load shared content or requests when switching tabs
  useEffect(() => {
    if (vaultTab === 'shared') {
      const loadShared = async () => {
        const shared = await getSharedContent(user.id);
        setSharedAssets(shared);
      };
      loadShared();
    } else if (vaultTab === 'requests') {
      const loadRequests = async () => {
        const reqs = await getPendingRequests(user.id);
        setPendingRequests(reqs);
      };
      loadRequests();
    }
  }, [vaultTab, user.id]);

  // Debounced User Search
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (userSearchQuery.length >= 3) {
        setShareStatus('searching');
        const results = await searchUsers(userSearchQuery);
        setUserSearchResults(results);
        setShareStatus('idle');
      } else {
        setUserSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [userSearchQuery]);

  const activeAssetsList = vaultTab === 'personal' ? assets : sharedAssets;

  const filteredAssets = activeAssetsList.filter(asset => {
    const matchesFilter = filter === 'all' ? true : asset.type === filter;
    const matchesSearch = asset.title.toLowerCase().includes(search.toLowerCase()) || 
                          asset.sourceName.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleClearConfirm = () => {
    onClearAll();
    setIsConfirmingClear(false);
  };

  const openShareModal = (assetId: string | null = null) => {
    setShareTargetAssetId(assetId);
    setUserSearchQuery('');
    setUserSearchResults([]);
    setSelectedUser(null);
    setShareStatus('idle');
    setIsSharing(true);
  };

  const handleSendRequest = async () => {
    if (!selectedUser) return;
    setShareStatus('sending');
    try {
      await sendShareRequest(
        user.id, 
        user.name, 
        selectedUser.id, 
        selectedUser.email, 
        shareTargetAssetId || undefined
      );
      setShareStatus('success');
      setTimeout(() => setIsSharing(false), 2000);
    } catch (e) {
      console.error(e);
      setShareStatus('error');
    }
  };

  const handleRequestResponse = async (reqId: string, action: 'accepted' | 'rejected') => {
    try {
      await respondToShareRequest(reqId, action);
      // Remove from list immediately
      setPendingRequests(prev => prev.filter(r => r.request_id !== reqId));
    } catch (e) {
      console.error("Failed to respond", e);
    }
  };

  const getAssetStyle = (type: string) => {
    switch(type) {
      case 'summary': return { icon: 'fa-file-text', bg: 'bg-emerald-600/20', text: 'text-emerald-400', accent: 'bg-emerald-500' };
      case 'quiz': return { icon: 'fa-tasks', bg: 'bg-amber-600/20', text: 'text-amber-400', accent: 'bg-amber-500' };
      case 'flashcards': return { icon: 'fa-layer-group', bg: 'bg-violet-600/20', text: 'text-violet-400', accent: 'bg-violet-500' };
      case 'slides': return { icon: 'fa-chalkboard', bg: 'bg-blue-600/20', text: 'text-blue-400', accent: 'bg-blue-500' };
      case 'research': return { icon: 'fa-globe-americas', bg: 'bg-cyan-600/20', text: 'text-cyan-400', accent: 'bg-cyan-500' };
      case 'image_analysis': return { icon: 'fa-eye', bg: 'bg-purple-600/20', text: 'text-purple-400', accent: 'bg-purple-500' };
      default: return { icon: 'fa-file', bg: 'bg-slate-600/20', text: 'text-slate-400', accent: 'bg-slate-500' };
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar pb-24 md:pb-8">
      <div className="max-w-6xl mx-auto pt-10 md:pt-0">
        <header className="mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-black mb-2 tracking-tight text-text-main">The Vault</h1>
            <p className="text-text-muted text-sm md:text-base">Your historical workspace data and generated intelligence.</p>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
             <button 
                onClick={() => openShareModal(null)}
                className="flex-1 md:flex-none px-6 py-3 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
              >
                <i className="fas fa-share-alt"></i> Share Vault
              </button>
              {assets.length > 0 && vaultTab === 'personal' && (
                <button 
                  onClick={() => setIsConfirmingClear(true)}
                  className="flex-1 md:flex-none px-6 py-3 bg-rose-600/10 text-rose-500 hover:bg-rose-600 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 border border-rose-500/20"
                >
                  <i className="fas fa-trash-sweep"></i> Clear Assets
                </button>
              )}
          </div>
        </header>

        {/* Tab Switcher */}
        <div className="flex bg-surface p-1.5 rounded-2xl mb-8 border border-border w-full max-w-lg shadow-sm">
           <button 
             onClick={() => setVaultTab('personal')}
             className={`flex-1 py-2.5 md:py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${vaultTab === 'personal' ? 'bg-slate-700 text-white shadow-lg' : 'text-text-muted hover:text-text-main'}`}
           >
             <i className="fas fa-user-lock mr-2"></i> My Assets
           </button>
           <button 
             onClick={() => setVaultTab('shared')}
             className={`flex-1 py-2.5 md:py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${vaultTab === 'shared' ? 'bg-indigo-600 text-white shadow-lg' : 'text-text-muted hover:text-text-main'}`}
           >
             <i className="fas fa-share-alt mr-2"></i> Shared
           </button>
           <button 
             onClick={() => setVaultTab('requests')}
             className={`flex-1 py-2.5 md:py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${vaultTab === 'requests' ? 'bg-emerald-600 text-white shadow-lg' : 'text-text-muted hover:text-text-main'}`}
           >
             <i className="fas fa-envelope-open-text mr-2"></i> Requests
             {pendingRequests.length > 0 && <span className="ml-2 bg-white text-emerald-600 px-1.5 py-0.5 rounded-full text-[8px]">{pendingRequests.length}</span>}
           </button>
        </div>

        {/* --- PENDING REQUESTS VIEW --- */}
        {vaultTab === 'requests' && (
          <div className="animate-fadeIn">
            {pendingRequests.length === 0 ? (
               <div className="py-24 text-center">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-surface rounded-full mb-6 shadow-sm border border-border">
                    <i className="fas fa-inbox text-3xl text-text-muted"></i>
                  </div>
                  <p className="text-text-muted font-medium">No pending sharing requests.</p>
               </div>
            ) : (
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pendingRequests.map(req => (
                    <div key={req.request_id} className="bg-surface border border-border p-6 rounded-3xl flex flex-col gap-4 shadow-lg">
                       <div className="flex items-start justify-between">
                          <div>
                             <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1 block">Incoming Request</span>
                             <h3 className="text-lg font-bold text-text-main">
                                {req.shared_by_name} wants to share:
                             </h3>
                             <p className="text-text-muted text-sm">{req.asset_title}</p>
                          </div>
                          <div className="text-text-muted text-[10px] font-bold">{new Date(req.created_at).toLocaleDateString()}</div>
                       </div>
                       <div className="flex gap-3 mt-2">
                          <button 
                            onClick={() => handleRequestResponse(req.request_id, 'accepted')}
                            className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-emerald-700"
                          >
                            Accept
                          </button>
                          <button 
                            onClick={() => handleRequestResponse(req.request_id, 'rejected')}
                            className="flex-1 py-3 bg-slate-800 text-slate-400 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-rose-900 hover:text-rose-400"
                          >
                            Decline
                          </button>
                       </div>
                    </div>
                  ))}
               </div>
            )}
          </div>
        )}

        {/* --- ASSETS GRID VIEW (Personal or Shared) --- */}
        {vaultTab !== 'requests' && (
          <>
            <div className="flex flex-col lg:flex-row gap-6 mb-10 border-b border-border pb-8">
              {/* Search Bar */}
              <div className="relative w-full lg:w-80">
                <input 
                  type="text" 
                  placeholder="Search assets..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-surface border border-border rounded-2xl py-3 pl-10 pr-4 text-sm text-text-main outline-none focus:border-indigo-600 transition-colors shadow-lg"
                />
                <i className="fas fa-search absolute left-4 top-4 text-text-muted"></i>
              </div>

              {/* Filter Tabs */}
              <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 custom-scrollbar flex-1 w-full">
                {(['all', 'summary', 'quiz', 'flashcards', 'slides', 'research', 'image_analysis'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-4 md:px-5 py-2 md:py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${filter === f ? 'bg-indigo-600 text-white shadow-lg' : 'bg-surface border border-border text-text-muted hover:text-text-main hover:bg-surface2'}`}
                  >
                    {f.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAssets.map(asset => {
                const style = getAssetStyle(asset.type);
                return (
                  <div key={asset.id} className="relative p-6 bg-surface border border-border rounded-3xl hover:border-text-muted transition-all group flex flex-col h-full overflow-hidden animate-fadeIn shadow-xl">
                    <div className="flex justify-between items-start mb-6">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${style.bg} ${style.text}`}>
                        <i className={`fas ${style.icon}`}></i>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                          <span className="text-[10px] text-text-muted font-black uppercase tracking-widest">{new Date(asset.timestamp).toLocaleDateString()}</span>
                          <div className="flex gap-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                            {vaultTab === 'personal' && (
                              <>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); openShareModal(asset.id); }}
                                  className="text-text-muted hover:text-indigo-400 transition-colors p-1"
                                  title="Share Asset"
                                >
                                  <i className="fas fa-share-alt text-xs"></i>
                                </button>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); onDeleteAsset(asset.id); }}
                                  className="text-text-muted hover:text-rose-500 transition-colors p-1"
                                  title="Delete Asset"
                                >
                                  <i className="fas fa-trash-alt text-xs"></i>
                                </button>
                              </>
                            )}
                          </div>
                      </div>
                    </div>
                    <h3 className="text-lg font-bold mb-2 truncate text-text-main" title={asset.title}>{asset.title}</h3>
                    <p className="text-text-muted text-sm mb-6 truncate italic">Source: {asset.sourceName}</p>
                    
                    <div className="mt-auto">
                      <button 
                        onClick={() => onViewAsset(asset)}
                        className="w-full py-3 bg-surface2 hover:bg-surface text-text-muted rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border border-border"
                      >
                        Open Asset <i className="fas fa-external-link-alt text-[10px]"></i>
                      </button>
                    </div>
                    <div className={`absolute bottom-0 left-0 h-1 transition-all group-hover:w-full w-4 ${style.accent}`}></div>
                  </div>
                );
              })}

              {filteredAssets.length === 0 && (
                <div className="col-span-full py-24 text-center">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-surface rounded-full mb-6 border border-border shadow-sm">
                    <i className="fas fa-ghost text-3xl text-text-muted"></i>
                  </div>
                  <p className="text-text-muted font-medium">No assets found matching criteria.</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* --- SHARING MODAL --- */}
      {isSharing && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-6 animate-fadeIn">
           <div className="bg-surface border border-border rounded-[2.5rem] p-6 md:p-10 max-w-md w-full shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-600 to-purple-600"></div>
              
              <h2 className="text-xl md:text-2xl font-black text-text-main mb-2">
                {shareTargetAssetId ? 'Share Asset' : 'Share Entire Vault'}
              </h2>
              <p className="text-text-muted mb-6 text-sm">
                Search for a user to send a {shareTargetAssetId ? 'resource' : 'access'} request.
              </p>

              {!selectedUser ? (
                <div className="space-y-4">
                   <div className="relative">
                      <input 
                        type="text" 
                        placeholder="Search user by name or email..." 
                        value={userSearchQuery}
                        onChange={(e) => setUserSearchQuery(e.target.value)}
                        className="w-full bg-surface2 border border-border rounded-2xl p-4 pl-10 text-text-main outline-none focus:border-indigo-500 text-sm"
                        autoFocus
                      />
                      <i className="fas fa-search absolute left-4 top-4 text-text-muted"></i>
                      {shareStatus === 'searching' && <div className="absolute right-4 top-4 text-indigo-500"><i className="fas fa-circle-notch animate-spin"></i></div>}
                   </div>

                   <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-2">
                      {userSearchResults.map(u => (
                         <div 
                           key={u.id} 
                           onClick={() => setSelectedUser(u)}
                           className="flex items-center gap-3 p-3 bg-surface2 rounded-xl hover:bg-surface cursor-pointer border border-transparent hover:border-indigo-500/30 transition-all"
                         >
                            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs text-white font-bold">
                               {u.name.charAt(0)}
                            </div>
                            <div className="min-w-0">
                               <p className="text-sm font-bold text-text-main truncate">{u.name}</p>
                               <p className="text-[10px] text-text-muted truncate">{u.email}</p>
                            </div>
                            <i className="fas fa-plus ml-auto text-indigo-400"></i>
                         </div>
                      ))}
                      {userSearchQuery.length >= 3 && userSearchResults.length === 0 && shareStatus !== 'searching' && (
                         <p className="text-center text-xs text-text-muted py-2">No users found.</p>
                      )}
                   </div>
                </div>
              ) : (
                <div className="bg-indigo-600/10 border border-indigo-500/30 p-4 rounded-2xl flex items-center justify-between mb-6">
                   <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold">
                         {selectedUser.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                         <p className="text-sm font-bold text-indigo-200 truncate">{selectedUser.name}</p>
                         <p className="text-[10px] text-indigo-400 truncate">{selectedUser.email}</p>
                      </div>
                   </div>
                   <button onClick={() => setSelectedUser(null)} className="text-text-muted hover:text-text-main"><i className="fas fa-times"></i></button>
                </div>
              )}

              {shareStatus === 'error' && <p className="text-rose-500 text-xs font-bold mb-4">Failed to send request.</p>}
              {shareStatus === 'success' && <p className="text-emerald-500 text-xs font-bold mb-4">Request sent successfully!</p>}

              <div className="flex gap-4 mt-6">
                <button 
                  onClick={() => setIsSharing(false)}
                  className="flex-1 py-4 bg-surface2 text-text-muted hover:text-text-main rounded-2xl font-bold text-xs uppercase tracking-widest border border-border"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSendRequest}
                  disabled={!selectedUser || shareStatus === 'sending'}
                  className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {shareStatus === 'sending' ? <i className="fas fa-circle-notch animate-spin"></i> : <i className="fas fa-paper-plane"></i>}
                  Send Request
                </button>
              </div>
           </div>
        </div>
      )}

      {/* Clear All Confirmation Modal */}
      {isConfirmingClear && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-6 animate-fadeIn">
          <div className="bg-surface border border-border rounded-[2.5rem] p-6 md:p-10 max-w-md w-full shadow-2xl">
            <div className="w-16 h-16 md:w-20 md:h-20 bg-rose-600/10 text-rose-500 rounded-3xl flex items-center justify-center mx-auto mb-6 md:mb-8 shadow-xl">
              <i className="fas fa-exclamation-triangle text-2xl md:text-3xl"></i>
            </div>
            <h2 className="text-xl md:text-2xl font-black text-text-main text-center mb-4 tracking-tight uppercase">Confirm Wipe</h2>
            <p className="text-text-muted text-center mb-10 leading-relaxed font-medium text-sm md:text-base">
              This action is permanent and will delete <span className="text-rose-400 font-bold">{assets.length} items</span> from your workspace.
            </p>
            <div className="flex gap-4">
              <button 
                onClick={() => setIsConfirmingClear(false)}
                className="flex-1 py-4 bg-surface2 text-text-main rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-surface transition-all border border-border"
              >
                Cancel
              </button>
              <button 
                onClick={handleClearConfirm}
                className="flex-1 py-4 bg-rose-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-rose-700 transition-all shadow-xl shadow-rose-600/20"
              >
                Yes, Delete All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Vault;
