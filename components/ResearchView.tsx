
import React, { useState, useEffect } from 'react';
import { performDeepResearch } from '../services/geminiService';
import { GroundingChunk, LabAsset } from '../types';
import SummaryView from './SummaryView';

interface ResearchViewProps {
  onSaveAsset?: (asset: Omit<LabAsset, 'id' | 'timestamp' | 'userId'>) => void;
  savedResearch?: LabAsset[];
  onLoadResearch?: (asset: LabAsset) => void;
  viewingAsset?: LabAsset | null; // Pass in asset if we opened from Vault
}

const ResearchView: React.FC<ResearchViewProps> = ({ onSaveAsset, savedResearch = [], onLoadResearch, viewingAsset }) => {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<{ text: string; groundingChunks: GroundingChunk[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  // Load viewing asset if passed
  useEffect(() => {
    if (viewingAsset && viewingAsset.type === 'research') {
      setResult({
        text: viewingAsset.content,
        groundingChunks: [] // Saved assets currently store just text content, or we need to expand structure. Assuming text for now.
      });
      setQuery(viewingAsset.title);
    }
  }, [viewingAsset]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await performDeepResearch(query);
      setResult(data);
      
      // Auto-save history
      if (onSaveAsset) {
        onSaveAsset({
          title: query.charAt(0).toUpperCase() + query.slice(1),
          type: 'research',
          content: data.text,
          sourceName: 'Deep Research Agent'
        });
      }
    } catch (err: any) {
      setError(err.message || "Research failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleLoadHistory = (asset: LabAsset) => {
    setResult({
      text: asset.content,
      groundingChunks: [] // Historic chunks might not be saved in simplified content model yet
    });
    setQuery(asset.title);
    setShowHistory(false);
    if(onLoadResearch) onLoadResearch(asset);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden relative">
      {/* Top Bar with History Toggle */}
      <div className="absolute top-4 right-4 z-20">
        <button 
          onClick={() => setShowHistory(!showHistory)}
          className="bg-[#151515] hover:bg-[#202020] text-cyan-400 border border-cyan-500/30 px-4 py-2 rounded-xl flex items-center gap-2 shadow-xl transition-all font-bold text-xs uppercase tracking-widest"
        >
          <i className="fas fa-history"></i> History
        </button>
      </div>

      {/* History Sidebar/Drawer */}
      <div className={`absolute top-0 right-0 h-full w-80 bg-[#0d0d0d] border-l border-slate-800 z-30 transform transition-transform duration-300 shadow-2xl ${showHistory ? 'translate-x-0' : 'translate-x-full'}`}>
         <div className="p-6 h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
               <h3 className="text-sm font-black text-white uppercase tracking-widest">Recent Research</h3>
               <button onClick={() => setShowHistory(false)} className="text-slate-500 hover:text-white"><i className="fas fa-times"></i></button>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
               {savedResearch.filter(a => a.type === 'research').length === 0 ? (
                 <p className="text-slate-600 text-xs text-center py-4">No search history.</p>
               ) : (
                 savedResearch.filter(a => a.type === 'research').map(asset => (
                   <div 
                     key={asset.id} 
                     onClick={() => handleLoadHistory(asset)}
                     className="p-3 rounded-xl bg-[#151515] border border-slate-800 hover:border-cyan-500/50 cursor-pointer group"
                   >
                      <h4 className="text-xs font-bold text-slate-300 group-hover:text-cyan-400 truncate mb-1">{asset.title}</h4>
                      <p className="text-[9px] text-slate-600 font-bold uppercase">{new Date(asset.timestamp).toLocaleDateString()}</p>
                   </div>
                 ))
               )}
            </div>
         </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-12 pb-32" onClick={() => showHistory && setShowHistory(false)}>
        <div className="max-w-4xl mx-auto">
          <header className="mb-12 text-center">
             <div className="inline-flex items-center justify-center w-16 h-16 bg-cyan-500/10 text-cyan-400 rounded-2xl mb-6 shadow-2xl shadow-cyan-500/10">
                <i className="fas fa-globe-americas text-3xl"></i>
             </div>
             <h1 className="text-4xl font-black mb-2 tracking-tight text-white">Deep Research</h1>
             <p className="text-slate-500">Live web grounding via Google Search + Gemini 3 Flash.</p>
          </header>

          {!result && !loading && !error && (
            <div className="text-center py-12 border-2 border-dashed border-slate-800 rounded-3xl">
               <p className="text-slate-600 font-bold uppercase tracking-widest text-xs">Enter a complex topic to begin analysis</p>
            </div>
          )}

          {error && (
            <div className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400 text-center mb-8">
               <i className="fas fa-exclamation-circle mr-2"></i> {error}
            </div>
          )}

          {loading && (
             <div className="space-y-8 animate-fadeIn">
                <div className="flex items-center gap-4 justify-center text-cyan-400 font-black uppercase tracking-widest text-xs">
                   <i className="fas fa-satellite-dish animate-pulse"></i> Scanning Global Indices...
                </div>
                <div className="h-64 bg-slate-900/50 rounded-3xl animate-pulse"></div>
                <div className="grid grid-cols-3 gap-4">
                   <div className="h-24 bg-slate-900/50 rounded-2xl animate-pulse delay-75"></div>
                   <div className="h-24 bg-slate-900/50 rounded-2xl animate-pulse delay-150"></div>
                   <div className="h-24 bg-slate-900/50 rounded-2xl animate-pulse delay-200"></div>
                </div>
             </div>
          )}

          {result && (
            <div className="animate-fadeIn space-y-12">
              <SummaryView summary={result.text} title={query} />

              {/* Source Verification Nodes */}
              {result.groundingChunks.length > 0 && (
                <div className="bg-[#111] border border-slate-800 rounded-3xl p-8">
                  <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                    <i className="fas fa-link text-cyan-500"></i> Source Verification Nodes
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {result.groundingChunks.map((chunk, idx) => {
                      if (!chunk.web) return null;
                      return (
                        <a 
                          key={idx} 
                          href={chunk.web.uri} 
                          target="_blank" 
                          rel="noreferrer"
                          className="group p-4 bg-[#0a0a0a] border border-slate-800 hover:border-cyan-500/50 rounded-xl transition-all flex items-start gap-4 hover:bg-white/5"
                        >
                          <div className="w-8 h-8 rounded-lg bg-cyan-900/20 text-cyan-400 flex items-center justify-center shrink-0 font-bold text-xs group-hover:scale-110 transition-transform">
                             {idx + 1}
                          </div>
                          <div className="min-w-0">
                             <div className="font-bold text-sm text-slate-200 truncate group-hover:text-cyan-400 transition-colors">{chunk.web.title}</div>
                             <div className="text-[10px] text-slate-600 truncate mt-1 font-mono">{new URL(chunk.web.uri).hostname}</div>
                          </div>
                          <i className="fas fa-external-link-alt text-[10px] text-slate-700 ml-auto group-hover:text-cyan-500"></i>
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="p-6 md:p-8 absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#0d0d0d] via-[#0d0d0d] to-transparent z-10">
        <form onSubmit={handleSearch} className="max-w-3xl mx-auto relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search the live web..."
            className="w-full bg-[#151515] border border-slate-800 rounded-2xl px-6 py-5 pr-16 text-sm text-slate-200 outline-none transition-all focus:border-cyan-500 shadow-2xl focus:ring-1 focus:ring-cyan-500/20"
          />
          <button
            type="submit"
            disabled={!query.trim() || loading}
            className="absolute right-2 top-2 bottom-2 w-14 rounded-xl bg-cyan-600 text-white flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:bg-cyan-500 transition-all shadow-lg shadow-cyan-600/20"
          >
            <i className={`fas ${loading ? 'fa-spinner fa-spin' : 'fa-search'}`}></i>
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResearchView;
