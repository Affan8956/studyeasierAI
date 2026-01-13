
import React, { useRef } from 'react';
import { VisionState } from '../types';
import SummaryView from './SummaryView';

interface VisionPanelProps {
  state: VisionState;
  onAnalyze: (image: string, mimeType: string, prompt: string) => void;
  onUpdateState: (newState: Partial<VisionState>) => void;
}

const VisionPanel: React.FC<VisionPanelProps> = ({ state, onAnalyze, onUpdateState }) => {
  const { image, mimeType, prompt, loading, result, error } = {
      image: state.image,
      mimeType: state.mimeType,
      prompt: state.prompt,
      loading: state.isLoading,
      result: state.result,
      error: state.error
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.type.startsWith('image/')) {
        onUpdateState({ error: "Please upload a valid image file." });
        return;
      }
      
      const reader = new FileReader();
      reader.onload = () => {
        onUpdateState({
            image: reader.result as string,
            mimeType: file.type,
            error: null,
            result: null
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = () => {
    if (!image || !mimeType) return;
    onAnalyze(image, mimeType, prompt);
  };

  const clearImage = () => {
    onUpdateState({
        image: null,
        mimeType: '',
        result: null,
        prompt: '',
        error: null
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="flex-1 flex flex-col p-8 overflow-y-auto custom-scrollbar">
      <div className="max-w-4xl mx-auto w-full">
        <header className="mb-10 text-center no-print">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-500/10 text-purple-400 rounded-2xl mb-6 shadow-2xl shadow-purple-500/10">
             <i className="fas fa-eye text-3xl"></i>
          </div>
          <h1 className="text-4xl font-black mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-indigo-400">
            Image Analysis
          </h1>
          <p className="text-slate-500 font-medium">
            Upload diagrams, math problems, or text snapshots for deep visual reasoning.
          </p>
        </header>

        <div className="bg-[#121212] rounded-[2.5rem] border border-slate-800 overflow-hidden shadow-2xl mb-8 no-print">
          <div className="p-8">
            {!image ? (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-700 hover:border-purple-500/50 hover:bg-purple-500/5 rounded-3xl h-64 flex flex-col items-center justify-center cursor-pointer transition-all group"
              >
                <input 
                  type="file" 
                  accept="image/*" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  className="hidden" 
                />
                <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mb-4 text-slate-400 group-hover:text-purple-400 group-hover:scale-110 transition-all">
                  <i className="fas fa-cloud-upload-alt text-2xl"></i>
                </div>
                <p className="text-slate-300 font-bold">Click to Upload Image</p>
                <p className="text-slate-600 text-xs mt-2 font-medium uppercase tracking-widest">JPG, PNG, WEBP Supported</p>
              </div>
            ) : (
              <div className="flex flex-col md:flex-row gap-8">
                <div className="w-full md:w-1/2 relative group">
                  <img src={image} alt="Upload" className="w-full h-auto rounded-2xl border border-slate-700 shadow-lg" />
                  <button 
                    onClick={clearImage}
                    className="absolute top-2 right-2 w-8 h-8 bg-black/60 backdrop-blur text-white rounded-lg flex items-center justify-center hover:bg-rose-600 transition-colors"
                  >
                    <i className="fas fa-times"></i>
                  </button>
                </div>
                
                <div className="w-full md:w-1/2 flex flex-col">
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3">
                     Analysis Prompt (Optional)
                   </label>
                   <textarea
                     value={prompt}
                     onChange={(e) => onUpdateState({ prompt: e.target.value })}
                     placeholder="e.g. 'Explain this diagram', 'Solve this equation', 'Extract text'..."
                     className="w-full bg-[#0a0a0a] border border-slate-700 rounded-2xl p-4 text-sm text-slate-200 focus:border-purple-500 outline-none resize-none h-32 mb-6"
                   ></textarea>
                   
                   <button
                     onClick={handleAnalyze}
                     disabled={loading}
                     className="mt-auto w-full py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-purple-600/20 flex items-center justify-center gap-3 transition-all disabled:opacity-50"
                   >
                     {loading ? (
                       <>
                         <i className="fas fa-circle-notch animate-spin"></i> Processing Visuals...
                       </>
                     ) : (
                       <>
                         <i className="fas fa-magic"></i> Analyze Image
                       </>
                     )}
                   </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400 text-center mb-8 font-medium">
             <i className="fas fa-exclamation-circle mr-2"></i> {error}
          </div>
        )}

        {loading && !result && (
             <div className="space-y-4 animate-fadeIn text-center mb-8">
                <p className="text-purple-400 font-black uppercase tracking-widest text-xs">
                   <i className="fas fa-satellite-dish animate-pulse mr-2"></i> Analyzing Visual Data...
                </p>
                <p className="text-slate-600 text-[10px] uppercase font-bold">
                  Background Task Active
                </p>
             </div>
        )}

        {result && (
          <div className="animate-fadeIn">
             <SummaryView summary={result} title={prompt || "Visual Analysis Result"} />
          </div>
        )}
      </div>
    </div>
  );
};

export default VisionPanel;
