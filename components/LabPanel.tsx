
import React, { useState, useEffect } from 'react';
import { LabTool, LabAsset } from '../types';
import { processUnifiedLabContent } from '../services/geminiService';
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
  "Synthesizing Flashcards...",
  "Constructing Knowledge Quiz...",
  "Designing Visual Slides...",
  "Finalizing Synthesis..."
];

interface LabPanelProps {
  onSaveAsset: (asset: Omit<LabAsset, 'id' | 'timestamp' | 'userId'>) => void;
  viewingAsset?: LabAsset | null;
}

const LabPanel: React.FC<LabPanelProps> = ({ onSaveAsset, viewingAsset }) => {
  const [activeTool, setActiveTool] = useState<LabTool>('summary');
  const [loading, setLoading] = useState(false);
  const [statusIndex, setStatusIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [currentPackage, setCurrentPackage] = useState<any>(null);
  const [lastSourceInfo, setLastSourceInfo] = useState<string | null>(null);

  useEffect(() => {
    let interval: any;
    if (loading) {
      interval = setInterval(() => {
        setStatusIndex((prev) => (prev + 1) % LOADING_STATUSES.length);
      }, 4000);
    }
    return () => clearInterval(interval);
  }, [loading]);

  // If viewing a saved asset from the vault
  useEffect(() => {
    if (viewingAsset) {
      setActiveTool(viewingAsset.type);
      // For viewing existing assets, we wrap them back into our package format
      const mockPackage: any = { title: viewingAsset.title };
      if (viewingAsset.type === 'summary') mockPackage.summary = { content: viewingAsset.content };
      if (viewingAsset.type === 'quiz') mockPackage.quiz = viewingAsset.content;
      if (viewingAsset.type === 'slides') mockPackage.slides = viewingAsset.content;
      if (viewingAsset.type === 'flashcards') mockPackage.flashcards = viewingAsset.content;
      setCurrentPackage(mockPackage);
    }
  }, [viewingAsset]);

  const handleSourceSubmission = async (source: { file?: File; url?: string }) => {
    setLoading(true);
    setError(null);
    setStatusIndex(0);
    const sourceName = source.file?.name || source.url || "Resource";
    setLastSourceInfo(sourceName);

    try {
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

      const result = await processUnifiedLabContent(sourcePayload);
      setCurrentPackage(result);

      // Save each generated part as an individual asset for the vault
      onSaveAsset({
        title: result.title,
        type: 'summary',
        content: result.summary.content,
        sourceName: sourceName
      });
      onSaveAsset({
        title: result.title,
        type: 'flashcards',
        content: result.flashcards,
        sourceName: sourceName
      });
      onSaveAsset({
        title: result.title,
        type: 'quiz',
        content: result.quiz,
        sourceName: sourceName
      });
      onSaveAsset({
        title: result.title,
        type: 'slides',
        content: result.slides,
        sourceName: sourceName
      });

    } catch (err: any) {
      setError(err.message || "Unified processing failed. Check network or source availability.");
    } finally {
      setLoading(false);
    }
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

  return (
    <div className="flex-1 flex flex-col p-8 overflow-y-auto custom-scrollbar">
      <div className="max-w-5xl mx-auto w-full">
        <header className="mb-10 text-center no-print">
          <h1 className="text-4xl font-black mb-4 bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400">
            Knowledge Lab
          </h1>
          <p className="text-slate-500 font-medium">Single-pass intelligent extraction from any source.</p>
        </header>

        {(currentPackage || loading) && (
          <div className="flex justify-center gap-4 mb-10 no-print flex-wrap">
            {(['summary', 'flashcards', 'quiz', 'slides'] as LabTool[]).map((t) => (
              <button
                key={t}
                onClick={() => setActiveTool(t)}
                disabled={loading}
                className={`px-6 py-3 rounded-2xl font-bold transition-all border ${
                  activeTool === t 
                  ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg' 
                  : 'bg-[#151515] border-slate-800 text-slate-500 hover:text-slate-300'
                } disabled:opacity-50`}
              >
                <i className={`fas mr-2 ${
                  t === 'summary' ? 'fa-file-alt' : 
                  t === 'quiz' ? 'fa-tasks' : 
                  t === 'flashcards' ? 'fa-clone' :
                  'fa-presentation'
                }`}></i>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        )}

        {!currentPackage && !loading && (
          <div className="animate-fadeIn no-print">
            <div className="mb-4 text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">Unified Summary-First Pass</p>
            </div>
            <FileUpload 
              onUpload={(file) => handleSourceSubmission({ file })} 
              onUrlSubmit={(url) => handleSourceSubmission({ url })}
              isLoading={loading} 
            />
          </div>
        )}

        {loading && (
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
                Our AI is currently searching for transcripts and cross-referencing metadata to ensure high accuracy.
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
              onClick={() => { setError(null); setCurrentPackage(null); }} 
              className="bg-rose-500 text-white px-6 py-2 rounded-xl hover:bg-rose-600 transition-colors"
            >
              Try Different Source
            </button>
          </div>
        )}

        {currentPackage && !loading && (
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
                  onClick={() => {
                    setCurrentPackage(null);
                    setLastSourceInfo(null);
                  }}
                  className="text-rose-500 hover:text-rose-400 transition-colors flex items-center gap-2 font-black text-[10px] uppercase tracking-widest"
                >
                  <i className="fas fa-sync"></i> New Source
                </button>
              </div>
            </div>
            
            {activeTool === 'summary' && currentPackage.summary && (
              <SummaryView summary={currentPackage.summary.content} title={currentPackage.title} />
            )}
            {activeTool === 'flashcards' && currentPackage.flashcards && (
              <FlashcardView flashcards={currentPackage.flashcards} />
            )}
            {activeTool === 'quiz' && currentPackage.quiz && (
              <QuizView quiz={currentPackage.quiz} />
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