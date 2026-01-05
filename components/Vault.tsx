
import React, { useState } from 'react';
import { LabAsset, ChatSession } from '../types';

interface VaultProps {
  assets: LabAsset[];
  chats: ChatSession[];
  onViewAsset: (asset: LabAsset) => void;
  onDeleteAsset: (id: string) => void;
  onClearAll: () => void;
}

const Vault: React.FC<VaultProps> = ({ assets, chats, onViewAsset, onDeleteAsset, onClearAll }) => {
  const [filter, setFilter] = useState<'all' | 'summary' | 'quiz' | 'slides'>('all');
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);

  const filteredAssets = filter === 'all' ? assets : assets.filter(a => a.type === filter);

  const handleClearConfirm = () => {
    onClearAll();
    setIsConfirmingClear(false);
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
      <div className="max-w-6xl mx-auto">
        <header className="mb-10 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black mb-2 tracking-tight">The Vault</h1>
            <p className="text-slate-500">Your historical workspace data and generated intelligence.</p>
          </div>
          {assets.length > 0 && (
            <button 
              onClick={() => setIsConfirmingClear(true)}
              className="px-6 py-2.5 bg-rose-600/10 text-rose-500 hover:bg-rose-600 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 border border-rose-500/20"
            >
              <i className="fas fa-trash-sweep"></i> Clear All Assets
            </button>
          )}
        </header>

        <div className="flex gap-4 mb-10 border-b border-slate-800 pb-6 overflow-x-auto">
          {(['all', 'summary', 'quiz', 'slides'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-6 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap ${filter === f ? 'bg-white text-black shadow-lg shadow-white/10' : 'text-slate-500 hover:text-white'}`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAssets.map(asset => (
            <div key={asset.id} className="relative p-6 bg-[#121212] border border-slate-800 rounded-3xl hover:border-slate-600 transition-all group flex flex-col h-full overflow-hidden">
              <div className="flex justify-between items-start mb-6">
                 <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                   asset.type === 'summary' ? 'bg-emerald-600/20 text-emerald-400' :
                   asset.type === 'quiz' ? 'bg-amber-600/20 text-amber-400' :
                   'bg-blue-600/20 text-blue-400'
                 }`}>
                   <i className={`fas ${asset.type === 'summary' ? 'fa-file-text' : asset.type === 'quiz' ? 'fa-tasks' : 'fa-presentation'}`}></i>
                 </div>
                 <div className="flex flex-col items-end">
                    <span className="text-[10px] text-slate-600 font-black uppercase tracking-widest">{new Date(asset.timestamp).toLocaleDateString()}</span>
                    <button 
                      onClick={(e) => { e.stopPropagation(); onDeleteAsset(asset.id); }}
                      className="mt-2 text-slate-700 hover:text-rose-500 transition-colors p-1 opacity-0 group-hover:opacity-100"
                      title="Delete Asset"
                    >
                      <i className="fas fa-trash-alt text-xs"></i>
                    </button>
                 </div>
              </div>
              <h3 className="text-lg font-bold mb-2 truncate text-slate-100">{asset.title}</h3>
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
              <div className={`absolute bottom-0 left-0 h-1 transition-all group-hover:w-full w-4 ${
                   asset.type === 'summary' ? 'bg-emerald-500' :
                   asset.type === 'quiz' ? 'bg-amber-500' :
                   'bg-blue-500'
                 }`}></div>
            </div>
          ))}

          {filteredAssets.length === 0 && (
            <div className="col-span-full py-24 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-slate-800/50 rounded-full mb-6">
                <i className="fas fa-ghost text-3xl text-slate-600"></i>
              </div>
              <p className="text-slate-500 font-medium">No intelligence found in this category.</p>
              <p className="text-slate-700 text-sm">Upload materials to the Knowledge Lab to begin.</p>
            </div>
          )}
        </div>
      </div>

      {/* Clear All Confirmation Modal */}
      {isConfirmingClear && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-6 animate-fadeIn">
          <div className="bg-[#0d0d0d] border border-slate-800 rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl">
            <div className="w-20 h-20 bg-rose-600/10 text-rose-500 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl">
              <i className="fas fa-exclamation-triangle text-3xl"></i>
            </div>
            <h2 className="text-2xl font-black text-white text-center mb-4 tracking-tight uppercase">Confirm Wipe</h2>
            <p className="text-slate-500 text-center mb-10 leading-relaxed font-medium">
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
