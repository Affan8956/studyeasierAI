
import React, { useState, useEffect } from 'react';
import { LabAsset, ChatSession, User } from '../types';
import { shareResource, getSharedContent } from '../services/sharingService';

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
  const [vaultTab, setVaultTab] = useState<'personal' | 'shared'>('personal');
  const [sharedAssets, setSharedAssets] = useState<LabAsset[]>([]);
  const [search, setSearch] = useState('');
  
  // Modal States
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [shareTargetAssetId, setShareTargetAssetId] = useState<string | null>(null); // null means vault share
  const [shareEmail, setShareEmail] = useState('');
  const [shareStatus, setShareStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  // Load shared content when switching to Shared tab
  useEffect(() => {
    if (vaultTab === 'shared') {
      const loadShared = async () => {
        const shared = await getSharedContent(user.email);
        setSharedAssets(shared);
      };
      loadShared();
    }
  }, [vaultTab, user.email]);

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
    setShareEmail('');
    setShareStatus('idle');
    setIsSharing(true);
  };

  const handleShareSubmit = async () => {
    if (!shareEmail.trim()) return;
    setShareStatus('loading');
    try {
      await shareResource(user.id, shareEmail, shareTargetAssetId || undefined);
      setShareStatus('success');
      setTimeout(() => setIsSharing(false), 1500);
    } catch (e) {
      console.error(e);
      setShareStatus('error');
    }
  };

  const getAssetStyle = (type: string) => {
    switch(type) {
      case 'summary': return { 
        icon: 'fa-file-text', 
        bg: 'bg-emerald-600/20', 
        text: 'text-emerald-400', 
        accent: 'bg-emerald-500' 
      };
      case 'quiz': return { 
        icon: 'fa-tasks', 
        bg: 'bg-amber-600/20', 
        text: 'text-amber-400', 
        accent: 'bg-amber-500' 
      };
      case 'flashcards': return { 
        icon: 'fa-layer-group', 
        bg: 'bg-violet-600/20', 
        text: 'text-violet-400', 
        accent: 'bg-violet-500' 
      };
      case 'slides': return { 
        icon: 'fa-chalkboard', 
        bg: 'bg-blue-600/20', 
        text: 'text-blue-400', 
        accent: 'bg-blue-500' 
      };
      case 'research': return { 
        icon: 'fa-globe-americas', 
        bg: 'bg-cyan-600/20', 
        text: 'text-cyan-400', 
        accent: 'bg-cyan-500' 
      };
      case 'image_analysis': return { 
        icon: 'fa-eye', 
        bg: 'bg-purple-600/20', 
        text: 'text-purple-400', 
        accent: 'bg-purple-500' 
      };
      default: return { 
        icon: 'fa-file', 
        bg: 'bg-slate-600/20', 
        text: 'text-slate-400', 
        accent: 'bg-slate-500' 
      };
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar pb-24 md:pb-8">
      <div className="max-w-6xl mx-auto pt-10 md:pt-0">
        <header className="mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-black mb-2 tracking-tight">The Vault</h1>
            <p className="text-slate-500 text-sm md:text-base">Your historical workspace data and generated intelligence.</p>
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

        {/* Tab Switcher (Personal vs Shared) */}
        <div className="flex bg-[#151515] p-1.5 rounded-2xl mb-8 border border-slate-800 w-full max-w-sm">
           <button 
             onClick={() => setVaultTab('personal')}
             className={`flex-1 py-2.5 md:py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${vaultTab === 'personal' ? 'bg-slate-700 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
           >
             <i className="fas fa-user-lock mr-2"></i> My Assets
           </button>
           <button 
             onClick={() => setVaultTab('shared')}
             className={`flex-1 py-2.5 md:py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${vaultTab === 'shared' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
           >
             <i className="fas fa-share-alt mr-2"></i> Shared With Me
           </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 mb-10 border-b border-slate-800 pb-8">
           {/* Search Bar */}
           <div className="relative w-full lg:w-80">
             <input 
               type="text" 
               placeholder="Search assets..." 
               value={search}
               onChange={(e) => setSearch(e.target.value)}
               className="w-full bg-[#151515] border border-slate-800 rounded-2xl py-3 pl-10 pr-4 text-sm text-slate-200 outline-none focus:border-indigo-600 transition-colors shadow-lg"
             />
             <i className="fas fa-search absolute left-4 top-4 text-slate-500"></i>
           </div>

           {/* Filter Tabs */}
           <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 custom-scrollbar flex-1 w-full">
            {(['all', 'summary', 'quiz', 'flashcards', 'slides', 'research', 'image_analysis'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 md:px-5 py-2 md:py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${filter === f ? 'bg-indigo-600 text-white shadow-lg' : 'bg-[#151515] text-slate-500 hover:text-white hover:bg-slate-800'}`}
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
              <div key={asset.id} className="relative p-6 bg-[#121212] border border-slate-800 rounded-3xl hover:border-slate-600 transition-all group flex flex-col h-full overflow-hidden animate-fadeIn">
                <div className="flex justify-between items-start mb-6">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${style.bg} ${style.text}`}>
                    <i className={`fas ${style.icon}`}></i>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                      <span className="text-[10px] text-slate-600 font-black uppercase tracking-widest">{new Date(asset.timestamp).toLocaleDateString()}</span>
                      <div className="flex gap-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                         {vaultTab === 'personal' && (
                           <>
                             <button 
                               onClick={(e) => { e.stopPropagation(); openShareModal(asset.id); }}
                               className="text-slate-700 hover:text-indigo-400 transition-colors p-1"
                               title="Share Asset"
                             >
                               <i className="fas fa-share-alt text-xs"></i>
                             </button>
                             <button 
                               onClick={(e) => { e.stopPropagation(); onDeleteAsset(asset.id); }}
                               className="text-slate-700 hover:text-rose-500 transition-colors p-1"
                               title="Delete Asset"
                             >
                               <i className="fas fa-trash-alt text-xs"></i>
                             </button>
                           </>
                         )}
                      </div>
                  </div>
                </div>
                <h3 className="text-lg font-bold mb-2 truncate text-slate-100" title={asset.title}>{asset.title}</h3>
                <p className="text-slate-500 text-sm mb-6 truncate italic">Source: {asset.sourceName}</p>
                
                <div className="mt-auto">
                  <button 
                    onClick={() => onViewAsset(asset)}
                    className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                  >
                    Open Asset <i className="fas fa-external-link-alt text-[10px]"></i>
                  </button>
                </div>

                {/* Decorative accent for asset type */}
                <div className={`absolute bottom-0 left-0 h-1 transition-all group-hover:w-full w-4 ${style.accent}`}></div>
              </div>
            );
          })}

          {filteredAssets.length === 0 && (
            <div className="col-span-full py-24 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-slate-800/50 rounded-full mb-6">
                <i className="fas fa-ghost text-3xl text-slate-600"></i>
              </div>
              <p className="text-slate-500 font-medium">No intelligence found matching criteria.</p>
              {vaultTab === 'personal' && <p className="text-slate-700 text-sm mt-2">Generate new content in the Lab or Deep Research.</p>}
              {vaultTab === 'shared' && <p className="text-slate-700 text-sm mt-2">Items shared with you via email will appear here.</p>}
            </div>
          )}
        </div>
      </div>

      {/* Sharing Modal */}
      {isSharing && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-6 animate-fadeIn">
           <div className="bg-[#0d0d0d] border border-slate-800 rounded-[2.5rem] p-6 md:p-10 max-w-md w-full shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-600 to-purple-600"></div>
              
              <h2 className="text-xl md:text-2xl font-black text-white mb-2">
                {shareTargetAssetId ? 'Share Asset' : 'Share Entire Vault'}
              </h2>
              <p className="text-slate-500 mb-8 text-sm">
                Grant read access to {shareTargetAssetId ? 'this specific item' : 'your entire library'}.
              </p>

              <div className="space-y-6">
                 <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Recipient Email</label>
                    <input 
                      type="email" 
                      placeholder="student@university.edu" 
                      value={shareEmail}
                      onChange={(e) => setShareEmail(e.target.value)}
                      className="w-full bg-[#151515] border border-slate-800 rounded-2xl p-4 text-slate-200 outline-none focus:border-indigo-500 text-sm"
                    />
                 </div>

                 {shareStatus === 'error' && <p className="text-rose-500 text-xs font-bold">Failed to share. Please try again.</p>}
                 {shareStatus === 'success' && <p className="text-emerald-500 text-xs font-bold">Successfully shared!</p>}

                 <div className="flex gap-4">
                    <button 
                      onClick={() => setIsSharing(false)}
                      className="flex-1 py-4 bg-slate-800 text-slate-400 hover:text-white rounded-2xl font-bold text-xs uppercase tracking-widest"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleShareSubmit}
                      disabled={shareStatus === 'loading' || !shareEmail}
                      className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {shareStatus === 'loading' && <i className="fas fa-circle-notch animate-spin"></i>}
                      Share Access
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Clear All Confirmation Modal */}
      {isConfirmingClear && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-6 animate-fadeIn">
          <div className="bg-[#0d0d0d] border border-slate-800 rounded-[2.5rem] p-6 md:p-10 max-w-md w-full shadow-2xl">
            <div className="w-16 h-16 md:w-20 md:h-20 bg-rose-600/10 text-rose-500 rounded-3xl flex items-center justify-center mx-auto mb-6 md:mb-8 shadow-xl">
              <i className="fas fa-exclamation-triangle text-2xl md:text-3xl"></i>
            </div>
            <h2 className="text-xl md:text-2xl font-black text-white text-center mb-4 tracking-tight uppercase">Confirm Wipe</h2>
            <p className="text-slate-500 text-center mb-10 leading-relaxed font-medium text-sm md:text-base">
              This action is permanent and will delete <span className="text-rose-400 font-bold">{assets.length} items</span> from your workspace and cloud synchronized storage.
            </p>
            <div className="flex gap-4">
              <button 
                onClick={() => setIsConfirmingClear(false)}
                className="flex-1 py-4 bg-slate-800 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-700 transition-all"
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
