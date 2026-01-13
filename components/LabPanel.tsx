
import React, { useState, useEffect } from 'react';
import { LabTool, LabAsset, LabState } from '../types';
import FileUpload from './FileUpload';
import SummaryView from './SummaryView';
import QuizView from './QuizView';
import SlideView from './SlideView';
import FlashcardView from './FlashcardView';

const LOADING_STATUSES = [
  "Initializing Research Engine...",
  "Fetching Source Transcripts...",
  "Cross-referencing Academic Data...",
  "Generating Mastery Summary...",
  "Constructing Knowledge Quiz...",
  "Synthesizing Flashcards...",
  "Designing Visual Slides...",
  "Finalizing Synthesis..."
];

interface LabPanelProps {
  state: LabState;
  onProcess: (sourcePayload: { file?: { base64: string; mimeType: string }; url?: string }, sourceName: string) => void;
  onClear: () => void;
  onSaveAsset: (asset: Omit<LabAsset, 'id' | 'timestamp' | 'userId'>) => void;
}

const LabPanel: React.FC<LabPanelProps> = ({ state, onProcess, onClear, onSaveAsset }) => {
  const { isLoading, currentPackage, error, activeTab } = state;
  const [activeTool, setActiveTool] = useState<LabTool>('summary');
  const [statusIndex, setStatusIndex] = useState(0);

  // Sync activeTool with the requested activeTab from parent state (Vault open)
  useEffect(() => {
    if (activeTab) {
      setActiveTool(activeTab);
    }
  }, [activeTab]);

  useEffect(() => {
    let interval: any;
    if (isLoading) {
      interval = setInterval(() => {
        setStatusIndex((prev) => (prev + 1) % LOADING_STATUSES.length);
      }, 4000);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  const handleSourceSubmission = async (source: { file?: File; url?: string }) => {
    const sourceName = source.file?.name || source.url || "Resource";
    
    let sourcePayload: { file?: { base64: string; mimeType: string }; url?: string } = {};

    if (source.file) {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
      });
      reader.readAsDataURL(source.file);
      const base64 = await base64Promise;
      sourcePayload = { file: { base64, mimeType: source.file.type } };
    } else if (source.url) {
      sourcePayload = { url: source.url };
    }

    onProcess(sourcePayload, sourceName);
  };

  const downloadPackage = () => {
    if (!currentPackage) return;
    const blob = new Blob([JSON.stringify(currentPackage, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${currentPackage.title.replace(/\s+/g, '_')}_package.json`;
    link.click();
  };

  // Determine which tabs to show based on available content
  const visibleTabs = (['summary', 'quiz', 'flashcards', 'slides'] as LabTool[]).filter(t => {
     if (!currentPackage) return true; // During loading/initial state, show all (or none logic handled below)
     if (t === 'summary' && currentPackage.summary) return true;
     if (t === 'quiz' && currentPackage.quiz) return true;
     if (t === 'flashcards' && currentPackage.flashcards) return true;
     if (t === 'slides' && currentPackage.slides) return true;
     return false;
  });

  return (
    <div className="flex-1 flex flex-col p-8 overflow-y-auto custom-scrollbar">
      <div className="max-w-5xl mx-auto w-full">
        <header className="mb-10 text-center no-print">
          <h1 className="text-4xl font-black mb-4 bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400">
            Knowledge Lab
          </h1>
          <p className="text-slate-500 font-medium">Single-pass intelligent extraction from any source.</p>
        </header>

        {(currentPackage || isLoading) && (
          <div className="flex justify-center gap-4 mb-10 no-print flex-wrap">
            {visibleTabs.map((t) => (
              <button
                key={t}
                onClick={() => setActiveTool(t)}
                disabled={isLoading}
                className={`px-8 py-3 rounded-2xl font-bold transition-all border ${
                  activeTool === t 
                  ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg' 
                  : 'bg-[#151515] border-slate-800 text-slate-500 hover:text-slate-300'
                } disabled:opacity-50`}
              >
                <i className={`fas mr-2 ${
                  t === 'summary' ? 'fa-file-alt' : 
                  t === 'quiz' ? 'fa-tasks' : 
                  t === 'flashcards' ? 'fa-layer-group' : 
                  'fa-presentation'
                }`}></i>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        )}

        {!currentPackage && !isLoading && (
          <div className="animate-fadeIn no-print">
            <div className="mb-4 text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">Unified Summary-First Pass</p>
            </div>
            <FileUpload 
              onUpload={(file) => handleSourceSubmission({ file })} 
              onUrlSubmit={(url) => handleSourceSubmission({ url })}
              isLoading={isLoading} 
            />
          </div>
        )}

        {isLoading && (
          <div className="flex flex-col items-center justify-center py-24 space-y-8 no-print animate-fadeIn">
            <div className="relative">
              <div className="w-20 h-20 border-4 border-emerald-500/10 border-t-emerald-500 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <i className="fas fa-brain text-emerald-500 animate-pulse text-sm"></i>
              </div>
            </div>
            <div className="text-center max-w-sm">
              <p className="text-emerald-400 font-black animate-pulse uppercase tracking-[0.4em] text-[11px] mb-2">
                {LOADING_STATUSES[statusIndex]}
              </p>
              <p className="text-slate-600 text-[9px] font-bold uppercase tracking-widest leading-relaxed">
                Background Task Active: You can switch tabs. The AI will continue processing.
              </p>
            </div>
            
            <div className="w-48 h-1 bg-slate-900 rounded-full overflow-hidden">
               <div className="h-full bg-emerald-500 animate-[loading_2s_ease-in-out_infinite]"></div>
            </div>
          </div>
        )}

        {error && (
          <div className="p-8 bg-rose-500/10 border border-rose-500/20 rounded-3xl text-rose-400 text-center mb-8 no-print font-bold text-xs uppercase tracking-widest leading-relaxed">
            <div className="mb-4 text-2xl"><i className="fas fa-exclamation-triangle"></i></div>
            <p className="mb-4">{error}</p>
            <button 
              onClick={onClear} 
              className="bg-rose-500 text-white px-6 py-2 rounded-xl hover:bg-rose-600 transition-colors"
            >
              Try Different Source
            </button>
          </div>
        )}

        {currentPackage && !isLoading && (
          <div className="animate-fadeIn space-y-8">
            <div className="flex justify-between items-center bg-[#151515] p-4 rounded-2xl border border-slate-800 no-print">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                <i className="fas fa-fingerprint mr-2 text-emerald-500"></i> Entity: <span className="text-slate-300">{currentPackage.title}</span>
              </p>
              <div className="flex gap-4">
                <button 
                  onClick={downloadPackage}
                  className="text-emerald-500 hover:text-emerald-400 transition-colors flex items-center gap-2 font-black text-[10px] uppercase tracking-widest"
                >
                  <i className="fas fa-download"></i> Full Export
                </button>
                <button 
                  onClick={onClear}
                  className="text-rose-500 hover:text-rose-400 transition-colors flex items-center gap-2 font-black text-[10px] uppercase tracking-widest"
                >
                  <i className="fas fa-sync"></i> New Source
                </button>
              </div>
            </div>
            
            {activeTool === 'summary' && currentPackage.summary && (
              <SummaryView summary={currentPackage.summary.content} title={currentPackage.title} />
            )}
            {activeTool === 'quiz' && currentPackage.quiz && (
              <QuizView quiz={currentPackage.quiz} />
            )}
            {activeTool === 'flashcards' && currentPackage.flashcards && (
              <FlashcardView flashcards={currentPackage.flashcards} />
            )}
            {activeTool === 'slides' && currentPackage.slides && (
              <SlideView slides={currentPackage.slides} />
            )}
          </div>
        )}
      </div>
      <style>{`
        @keyframes loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
};

export default LabPanel;
