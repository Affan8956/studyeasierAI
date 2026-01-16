
import React, { useRef, useState } from 'react';
import { VisionState, LabAsset } from '../types';
import SummaryView from './SummaryView';

interface VisionPanelProps {
  state: VisionState;
  onAnalyze: (image: string, mimeType: string, prompt: string) => void;
  onGenerate: (prompt: string) => void;
  onUpdateState: (newState: Partial<VisionState>) => void;
  onSaveAsset?: (asset: Omit<LabAsset, 'id' | 'timestamp' | 'userId'>) => void;
}

const VisionPanel: React.FC<VisionPanelProps> = ({ state, onAnalyze, onGenerate, onUpdateState, onSaveAsset }) => {
  const { image, mimeType, prompt, isLoading, result, error, mode, generatedImage } = state;
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Full View & Zoom States
  const [isFullView, setIsFullView] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');

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

  const handleGenerate = () => {
    if (!prompt.trim()) return;
    setSaveStatus('idle');
    onGenerate(prompt);
  };

  const handleSaveToVault = () => {
    if (!generatedImage || !onSaveAsset) return;
    onSaveAsset({
      title: prompt ? `Generated: ${prompt.slice(0, 30)}...` : 'Generated Diagram',
      type: 'image_analysis', // Using image_analysis type as container for Base64 content
      content: generatedImage,
      sourceName: 'Generative Studio'
    });
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 3000);
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

  const downloadGenerated = () => {
    if (!generatedImage) return;
    const link = document.createElement('a');
    link.href = generatedImage;
    link.download = `generated_diagram_${Date.now()}.png`;
    link.click();
  };

  const toggleFullView = () => {
    setIsFullView(!isFullView);
    setZoomLevel(1); // Reset zoom on toggle
  };

  const zoomIn = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoomLevel(prev => Math.min(prev + 0.25, 3));
  };

  const zoomOut = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoomLevel(prev => Math.max(prev - 0.25, 0.5));
  };

  return (
    <div className="flex-1 flex flex-col p-8 overflow-y-auto custom-scrollbar relative">
      <div className="max-w-4xl mx-auto w-full">
        <header className="mb-10 text-center no-print">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-500/10 text-purple-400 rounded-2xl mb-6 shadow-2xl shadow-purple-500/10">
             <i className="fas fa-eye text-3xl"></i>
          </div>
          <h1 className="text-4xl font-black mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-indigo-400">
            Vision & Graphics
          </h1>
          <p className="text-text-muted font-medium">
            Analyze diagrams or generate precise technical schematics and graphs.
          </p>
        </header>

        {/* Mode Switcher */}
        <div className="flex justify-center mb-10 no-print">
           <div className="flex bg-surface p-1.5 rounded-2xl border border-border shadow-md">
             <button
               onClick={() => onUpdateState({ mode: 'analyze', error: null, prompt: '' })}
               className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${mode === 'analyze' ? 'bg-purple-600 text-white shadow-lg' : 'text-text-muted hover:text-text-main hover:bg-surface2'}`}
             >
               <i className="fas fa-search-plus mr-2"></i> Visual Analysis
             </button>
             <button
               onClick={() => onUpdateState({ mode: 'generate', error: null, prompt: '' })}
               className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${mode === 'generate' ? 'bg-indigo-600 text-white shadow-lg' : 'text-text-muted hover:text-text-main hover:bg-surface2'}`}
             >
               <i className="fas fa-pencil-ruler mr-2"></i> Generative Studio
             </button>
           </div>
        </div>

        {mode === 'analyze' ? (
          // --- ANALYZE MODE ---
          <div className="bg-surface rounded-[2.5rem] border border-border overflow-hidden shadow-2xl mb-8 no-print animate-fadeIn">
            <div className="p-8">
              {!image ? (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-border hover:border-purple-500/50 hover:bg-purple-500/5 rounded-3xl h-64 flex flex-col items-center justify-center cursor-pointer transition-all group"
                >
                  <input 
                    type="file" 
                    accept="image/*" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    className="hidden" 
                  />
                  <div className="w-16 h-16 bg-surface2 rounded-2xl flex items-center justify-center mb-4 text-text-muted group-hover:text-purple-400 group-hover:scale-110 transition-all border border-border">
                    <i className="fas fa-cloud-upload-alt text-2xl"></i>
                  </div>
                  <p className="text-text-main font-bold">Click to Upload Image</p>
                  <p className="text-text-muted text-xs mt-2 font-medium uppercase tracking-widest">JPG, PNG, WEBP Supported</p>
                </div>
              ) : (
                <div className="flex flex-col md:flex-row gap-8">
                  <div className="w-full md:w-1/2 relative group">
                    <img src={image} alt="Upload" className="w-full h-auto rounded-2xl border border-border shadow-lg" />
                    <button 
                      onClick={clearImage}
                      className="absolute top-2 right-2 w-8 h-8 bg-black/60 backdrop-blur text-white rounded-lg flex items-center justify-center hover:bg-rose-600 transition-colors"
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  </div>
                  
                  <div className="w-full md:w-1/2 flex flex-col">
                     <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-3">
                       Analysis Prompt (Optional)
                     </label>
                     <textarea
                       value={prompt}
                       onChange={(e) => onUpdateState({ prompt: e.target.value })}
                       placeholder="e.g. 'Explain this diagram', 'Solve this equation', 'Extract text'..."
                       className="w-full bg-surface2 border border-border rounded-2xl p-4 text-sm text-text-main focus:border-purple-500 outline-none resize-none h-32 mb-6"
                     ></textarea>
                     
                     <button
                       onClick={handleAnalyze}
                       disabled={isLoading}
                       className="mt-auto w-full py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-purple-600/20 flex items-center justify-center gap-3 transition-all disabled:opacity-50"
                     >
                       {isLoading ? (
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
        ) : (
          // --- GENERATE MODE ---
          <div className="bg-surface rounded-[2.5rem] border border-border overflow-hidden shadow-2xl mb-8 no-print animate-fadeIn">
            <div className="p-8">
               <div className="flex flex-col gap-6">
                 <div>
                   <label className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-3 block">
                     Technical Description
                   </label>
                   <textarea
                     value={prompt}
                     onChange={(e) => onUpdateState({ prompt: e.target.value })}
                     placeholder="Describe the circuit, graph, or diagram in detail. E.g., 'A circuit diagram of a full-wave bridge rectifier with labels' or 'Graph of y = x^2 showing vertex at origin'."
                     className="w-full bg-surface2 border border-border rounded-2xl p-4 text-sm text-text-main focus:border-indigo-500 outline-none resize-none h-32"
                   ></textarea>
                   
                   {/* Quick Prompts */}
                   <div className="flex gap-2 mt-3 overflow-x-auto custom-scrollbar pb-2">
                      <button onClick={() => onUpdateState({ prompt: "Circuit diagram of an RC Low Pass Filter" })} className="whitespace-nowrap px-3 py-1.5 bg-surface2 hover:bg-indigo-600/10 hover:text-indigo-400 border border-border rounded-lg text-[10px] font-bold text-text-muted transition-colors">Circuit: RC Filter</button>
                      <button onClick={() => onUpdateState({ prompt: "Graph of sine and cosine waves from 0 to 2pi" })} className="whitespace-nowrap px-3 py-1.5 bg-surface2 hover:bg-indigo-600/10 hover:text-indigo-400 border border-border rounded-lg text-[10px] font-bold text-text-muted transition-colors">Graph: Sin/Cos</button>
                      <button onClick={() => onUpdateState({ prompt: "Labeled diagram of a Plant Cell" })} className="whitespace-nowrap px-3 py-1.5 bg-surface2 hover:bg-indigo-600/10 hover:text-indigo-400 border border-border rounded-lg text-[10px] font-bold text-text-muted transition-colors">Bio: Plant Cell</button>
                   </div>
                 </div>

                 {generatedImage && (
                    <div className="relative rounded-2xl overflow-hidden border border-border shadow-lg group">
                       <img 
                         src={generatedImage} 
                         alt="Generated Result" 
                         className="w-full h-auto cursor-zoom-in"
                         onClick={toggleFullView}
                       />
                       <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 backdrop-blur-sm pointer-events-none">
                          {/* Controls Container */}
                          <div className="pointer-events-auto flex gap-3">
                            <button 
                              onClick={toggleFullView}
                              className="bg-white/10 backdrop-blur text-white w-12 h-12 rounded-xl flex items-center justify-center hover:bg-white hover:text-black transition-all"
                              title="Full View & Zoom"
                            >
                              <i className="fas fa-expand-alt"></i>
                            </button>
                            <button 
                              onClick={downloadGenerated}
                              className="bg-white/10 backdrop-blur text-white w-12 h-12 rounded-xl flex items-center justify-center hover:bg-white hover:text-black transition-all"
                              title="Download"
                            >
                              <i className="fas fa-download"></i>
                            </button>
                            {onSaveAsset && (
                              <button 
                                onClick={handleSaveToVault}
                                className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${saveStatus === 'saved' ? 'bg-emerald-500 text-white' : 'bg-white/10 backdrop-blur text-white hover:bg-white hover:text-black'}`}
                                title={saveStatus === 'saved' ? 'Saved to Vault' : 'Save to Vault'}
                                disabled={saveStatus === 'saved'}
                              >
                                <i className={`fas ${saveStatus === 'saved' ? 'fa-check' : 'fa-vault'}`}></i>
                              </button>
                            )}
                          </div>
                       </div>
                    </div>
                 )}

                 <button
                   onClick={handleGenerate}
                   disabled={isLoading || !prompt.trim()}
                   className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-indigo-600/20 flex items-center justify-center gap-3 transition-all disabled:opacity-50"
                 >
                   {isLoading ? (
                     <>
                       <i className="fas fa-circle-notch animate-spin"></i> Rendering Graphics...
                     </>
                   ) : (
                     <>
                       <i className="fas fa-drafting-compass"></i> Generate Diagram
                     </>
                   )}
                 </button>
               </div>
            </div>
          </div>
        )}

        {error && (
          <div className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400 text-center mb-8 font-medium animate-fadeIn">
             <i className="fas fa-exclamation-circle mr-2"></i> {error}
          </div>
        )}

        {isLoading && (
             <div className="space-y-4 animate-fadeIn text-center mb-8">
                <p className={`${mode === 'analyze' ? 'text-purple-400' : 'text-indigo-400'} font-black uppercase tracking-widest text-xs`}>
                   <i className="fas fa-satellite-dish animate-pulse mr-2"></i> {mode === 'analyze' ? 'Analyzing Visual Data...' : 'Synthesizing Technical Graphic...'}
                </p>
                <div className="w-48 h-1 bg-surface2 rounded-full overflow-hidden mx-auto">
                   <div className={`h-full animate-[loading_2s_ease-in-out_infinite] ${mode === 'analyze' ? 'bg-purple-500' : 'bg-indigo-500'}`}></div>
                </div>
                <p className="text-text-muted text-[10px] uppercase font-bold">
                  StudyEasierAI is Working...
                </p>
             </div>
        )}

        {result && mode === 'analyze' && (
          <div className="animate-fadeIn">
             <SummaryView summary={result} title={prompt || "Visual Analysis Result"} />
          </div>
        )}
      </div>

      {/* FULL VIEW OVERLAY */}
      {isFullView && generatedImage && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex flex-col animate-fadeIn">
           {/* Toolbar */}
           <div className="flex items-center justify-between p-6 w-full absolute top-0 left-0 z-50">
             <h3 className="text-white font-bold text-lg hidden md:block">Detailed Inspector</h3>
             <div className="flex gap-4 items-center mx-auto md:mx-0 bg-black/50 rounded-2xl p-2 border border-white/10">
                <button 
                  onClick={zoomOut}
                  className="w-10 h-10 rounded-xl bg-white/10 text-white hover:bg-white hover:text-black transition-all flex items-center justify-center"
                >
                  <i className="fas fa-minus"></i>
                </button>
                <span className="text-white font-mono text-xs w-12 text-center">{Math.round(zoomLevel * 100)}%</span>
                <button 
                  onClick={zoomIn}
                  className="w-10 h-10 rounded-xl bg-white/10 text-white hover:bg-white hover:text-black transition-all flex items-center justify-center"
                >
                  <i className="fas fa-plus"></i>
                </button>
             </div>
             <button 
               onClick={toggleFullView}
               className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 hover:bg-rose-600 hover:text-white transition-all flex items-center justify-center border border-rose-500/50"
             >
               <i className="fas fa-times"></i>
             </button>
           </div>
           
           {/* Zoomable Image Area */}
           <div className="flex-1 overflow-auto flex items-center justify-center p-8 custom-scrollbar">
              <img 
                src={generatedImage} 
                alt="Full View" 
                className="transition-transform duration-200 ease-out origin-center rounded-lg shadow-2xl border border-white/10"
                style={{ transform: `scale(${zoomLevel})` }}
              />
           </div>
           
           {/* Footer Action Bar */}
           <div className="p-6 flex justify-center gap-4 absolute bottom-0 w-full bg-gradient-to-t from-black via-black/80 to-transparent">
              <button 
                 onClick={handleSaveToVault}
                 disabled={saveStatus === 'saved'}
                 className={`px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 transition-all ${saveStatus === 'saved' ? 'bg-emerald-500 text-white' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
              >
                 <i className={`fas ${saveStatus === 'saved' ? 'fa-check' : 'fa-vault'}`}></i> 
                 {saveStatus === 'saved' ? 'Saved to Vault' : 'Save to Vault'}
              </button>
              <button 
                 onClick={downloadGenerated}
                 className="px-8 py-3 bg-surface text-white border border-white/20 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-white hover:text-black transition-all"
              >
                 <i className="fas fa-download"></i> Download PNG
              </button>
           </div>
        </div>
      )}

      <style>{`
        @keyframes loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
};

export default VisionPanel;
