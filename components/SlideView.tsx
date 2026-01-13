
import React, { useState, useEffect } from 'react';
import { generateSlideImage } from '../services/geminiService';

interface Slide {
  slideTitle: string;
  bullets: string[];
  speakerNotes: string;
  imageKeyword: string;
}

interface SlideViewProps {
  slides: Slide[];
}

const SlideView: React.FC<SlideViewProps> = ({ slides }) => {
  const [index, setIndex] = useState(0);
  const [images, setImages] = useState<Record<number, string>>({});
  const [imageLoading, setImageLoading] = useState<Record<number, boolean>>({});

  useEffect(() => {
    let isActive = true;

    const loadCurrentSlideImage = async () => {
      if (images[index] || imageLoading[index]) return;
      
      setImageLoading(prev => ({ ...prev, [index]: true }));
      try {
        const slide = slides[index];
        const imageUrl = await generateSlideImage(slide.slideTitle, slide.bullets.join(' '));
        
        if (isActive) {
           setImages(prev => ({ ...prev, [index]: imageUrl }));
        }
      } catch (err) {
        console.error("Slide image load error:", err);
      } finally {
        if (isActive) {
          setImageLoading(prev => ({ ...prev, [index]: false }));
        }
      }
    };

    if (slides && slides.length > 0) {
        loadCurrentSlideImage();
    }

    return () => {
        isActive = false;
    };
  }, [index, slides]); 

  if (!slides || slides.length === 0) return null;

  const currentSlide = slides[index];

  const handleDownloadOutline = () => {
    const content = slides.map((s, i) => 
      `Slide ${i+1}: ${s.slideTitle}\n` +
      s.bullets.map(b => `- ${b}`).join('\n') + 
      `\n\nNotes: ${s.speakerNotes}\n\n`
    ).join('-------------------\n');
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'presentation_outline.txt';
    a.click();
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-20 relative">
      {/* PRINT VIEW: Handouts Style */}
      <div className="print-only">
        <div className="mb-8 border-b-2 border-black pb-4">
           <h1 className="text-3xl font-black text-black">Presentation Handouts</h1>
           <p className="text-sm text-gray-500 uppercase tracking-widest">StudyEasierAI Generated Deck</p>
        </div>
        <div className="space-y-8">
           {slides.map((s, i) => (
             <div key={i} className="break-inside-avoid border-b border-gray-200 pb-8 mb-8">
                <div className="flex justify-between items-baseline mb-4">
                   <h2 className="text-xl font-bold text-black">{s.slideTitle}</h2>
                   <span className="text-xs font-bold bg-gray-200 text-gray-700 px-2 py-1 rounded">Slide {i+1}</span>
                </div>
                <div className="grid grid-cols-2 gap-8">
                   <ul className="list-disc pl-5 space-y-2">
                      {s.bullets.map((b, bi) => (
                        <li key={bi} className="text-sm text-gray-800">{b}</li>
                      ))}
                   </ul>
                   <div className="bg-gray-50 p-4 border border-gray-200 rounded text-sm italic text-gray-600">
                      <strong>Speaker Notes:</strong><br/>
                      {s.speakerNotes}
                   </div>
                </div>
             </div>
           ))}
        </div>
      </div>

      {/* WEB VIEW */}
      <div className="no-print slide-container flex flex-col bg-[#111111] rounded-[2rem] border border-slate-800 shadow-2xl relative overflow-hidden min-h-[650px] transition-all duration-500">
        
        <div className="absolute top-8 right-8 z-20">
          <span className="bg-emerald-500/90 backdrop-blur-md text-white text-[11px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-xl">
            Slide {index + 1} / {slides.length}
          </span>
        </div>

        <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
          {/* Main Slide Content Area */}
          <div className="flex-1 flex flex-col p-10 lg:p-16 overflow-y-auto custom-scrollbar animate-fadeIn">
            <h2 className="text-3xl lg:text-4xl font-black mb-10 text-emerald-400 leading-tight border-l-4 border-emerald-500 pl-6">
              {currentSlide.slideTitle}
            </h2>
            <ul className="space-y-6 flex-1">
              {currentSlide.bullets.map((b, i) => (
                <li key={i} className="flex items-start gap-6 text-xl text-slate-200 group">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-3 shrink-0 group-hover:scale-150 transition-transform"></span>
                  <span className="leading-relaxed font-medium">{b}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* AI Image Generation Area */}
          <div className="w-full lg:w-[45%] min-h-[400px] lg:min-h-full relative bg-[#0a0a0a] overflow-hidden border-l border-slate-800">
             {imageLoading[index] ? (
               <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0d0d0d] gap-4">
                  <div className="w-12 h-12 border-4 border-emerald-500/10 border-t-emerald-500 rounded-full animate-spin"></div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500 animate-pulse">Generating High-Res Visual...</span>
               </div>
             ) : (
               <img 
                 key={index}
                 src={images[index] || `https://loremflickr.com/1280/720/${encodeURIComponent(currentSlide.imageKeyword || 'education')}`} 
                 alt={currentSlide.imageKeyword} 
                 className="w-full h-full object-cover opacity-90 hover:opacity-100 transition-opacity duration-1000 animate-fadeIn"
               />
             )}
             
             <div className="absolute bottom-6 left-6 right-6 bg-black/80 backdrop-blur-xl p-5 rounded-2xl border border-white/5 shadow-2xl">
                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest block mb-2">GenAI Visual Intelligence</span>
                <p className="text-xs text-slate-300 font-medium italic leading-relaxed">
                  Contextual rendering for "{currentSlide.slideTitle}"
                </p>
             </div>
          </div>
        </div>

        {/* Navigation Bar */}
        <div className="flex justify-between items-center px-10 py-6 bg-[#0a0a0a] border-t border-slate-800 z-30">
           <button 
            disabled={index === 0}
            onClick={() => setIndex(index - 1)}
            className="flex items-center gap-3 px-8 py-3.5 bg-slate-900 hover:bg-slate-800 text-[11px] font-black text-slate-300 hover:text-white disabled:opacity-20 transition-all rounded-xl uppercase tracking-widest border border-slate-800"
           >
             <i className="fas fa-arrow-left"></i> Previous
           </button>
           
           <div className="hidden lg:flex gap-2.5 items-center">
             {slides.map((_, i) => (
               <button 
                key={i} 
                onClick={() => setIndex(i)}
                className={`h-2.5 rounded-full transition-all duration-500 ${i === index ? 'bg-emerald-500 w-12' : 'bg-slate-800 w-2.5 hover:bg-slate-600'}`} 
               />
             ))}
           </div>

           <button 
            disabled={index === slides.length - 1}
            onClick={() => setIndex(index + 1)}
            className="flex items-center gap-3 px-8 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-[11px] font-black text-white disabled:opacity-20 transition-all rounded-xl shadow-xl shadow-emerald-600/30 uppercase tracking-widest"
           >
             Next <i className="fas fa-arrow-right"></i>
           </button>
        </div>
      </div>

      {/* Speaker Notes */}
      <div className="p-10 bg-[#121212] rounded-[2rem] border border-slate-800 shadow-xl border-t-4 border-t-emerald-500/50 no-print">
        <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
          <i className="fas fa-microphone-alt text-emerald-500 text-lg"></i>
          Expert Presentation Script
        </h4>
        <div className="text-slate-300 leading-relaxed italic text-xl border-l-4 border-emerald-500/20 pl-8 bg-[#0a0a0a]/50 p-8 rounded-2xl shadow-inner">
          "{currentSlide.speakerNotes}"
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-center gap-6 no-print">
        <button 
          onClick={() => window.print()}
          className="px-12 py-6 bg-white text-black rounded-2xl font-black text-sm hover:bg-slate-200 transition-all shadow-2xl flex items-center justify-center gap-4 uppercase tracking-widest"
        >
          <i className="fas fa-file-pdf text-indigo-600"></i> Export Course Materials
        </button>
        <button 
          onClick={handleDownloadOutline}
          className="px-12 py-6 bg-slate-900 text-white rounded-2xl font-black text-sm hover:bg-slate-800 transition-all flex items-center justify-center gap-4 uppercase tracking-widest border border-slate-800 shadow-xl"
        >
          <i className="fas fa-list-alt text-emerald-500"></i> Download Transcript
        </button>
      </div>
    </div>
  );
};

export default SlideView;
