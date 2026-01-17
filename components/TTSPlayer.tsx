
import React, { useState, useEffect, useRef } from 'react';

interface TTSPlayerProps {
  text: string;
}

type TTSStatus = 'idle' | 'playing' | 'paused';
type SupportedLang = 'en' | 'hi' | 'mr';

const TTSPlayer: React.FC<TTSPlayerProps> = ({ text }) => {
  const [status, setStatus] = useState<TTSStatus>('idle');
  const [lang, setLang] = useState<SupportedLang>('en');
  const [speed, setSpeed] = useState<number>(1);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
  const [isSupported, setIsSupported] = useState(true);
  
  const chunksRef = useRef<string[]>([]);
  const indexRef = useRef(0);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const isPausedRef = useRef(false);

  useEffect(() => {
    if (!('speechSynthesis' in window)) {
        setIsSupported(false);
        return;
    }

    const loadVoices = () => {
      const available = window.speechSynthesis.getVoices();
      if (available.length > 0) {
        setVoices(available);
      }
    };

    loadVoices();
    // Chrome requires this event listener
    window.speechSynthesis.onvoiceschanged = loadVoices;

    // Fallback if voices take too long
    setTimeout(loadVoices, 1000);

    return () => {
      cancelSpeech();
    };
  }, []);

  const cancelSpeech = () => {
    if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }
    setStatus('idle');
    isPausedRef.current = false;
    indexRef.current = 0;
    setCurrentChunkIndex(0);
  };

  const cleanTextForSpeech = (markdown: string) => {
    return markdown
      .replace(/[*#_`]/g, '')
      .replace(/\[(.*?)\]\(.*?\)/g, '$1')
      .replace(/!\[(.*?)\]\(.*?\)/g, 'Image of $1')
      .replace(/\$\$(.*?)\$\$/g, 'Equation')
      .replace(/\$(.*?)\$/g, 'math')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const chunkText = (cleanText: string): string[] => {
    const rawChunks = cleanText.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [cleanText];
    return rawChunks.map(c => c.trim()).filter(c => c.length > 0);
  };

  const getVoiceForLang = (l: SupportedLang) => {
    if (voices.length === 0) return null;
    if (l === 'hi') return voices.find(v => v.lang.includes('hi-IN')) || voices.find(v => v.lang.includes('hi'));
    if (l === 'mr') return voices.find(v => v.lang.includes('mr-IN')) || voices.find(v => v.lang.includes('mr'));
    return voices.find(v => v.name.includes('Google US English')) || voices.find(v => v.lang.includes('en-US')) || voices[0];
  };

  const speakNextChunk = () => {
    if (indexRef.current >= chunksRef.current.length || isPausedRef.current) {
      if (indexRef.current >= chunksRef.current.length) {
        setStatus('idle');
        indexRef.current = 0;
      }
      return;
    }

    const chunk = chunksRef.current[indexRef.current];
    const utterance = new SpeechSynthesisUtterance(chunk);
    
    const targetVoice = getVoiceForLang(lang);
    if (targetVoice) utterance.voice = targetVoice;

    // Apply speed
    utterance.rate = speed;
    
    utterance.onend = () => {
      indexRef.current += 1;
      setCurrentChunkIndex(indexRef.current);
      speakNextChunk();
    };

    utterance.onerror = (e) => {
      console.error("TTS Error:", e.error);
      // Skip error chunk
      indexRef.current += 1;
      speakNextChunk();
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const handlePlay = () => {
    if (!isSupported) return;
    cancelSpeech();
    
    const clean = cleanTextForSpeech(text);
    const chunks = chunkText(clean);
    
    if (chunks.length === 0) return;

    chunksRef.current = chunks;
    indexRef.current = 0;
    setCurrentChunkIndex(0);
    isPausedRef.current = false;
    
    setStatus('playing');
    speakNextChunk();
  };

  const handlePause = () => {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    isPausedRef.current = true;
    setStatus('paused');
  };

  const handleResume = () => {
    if (status !== 'paused') return;
    isPausedRef.current = false;
    setStatus('playing');
    speakNextChunk();
  };

  if (!isSupported) {
      return (
          <div className="text-[9px] text-rose-500 font-bold bg-rose-500/10 px-2 py-1 rounded">
             <i className="fas fa-volume-mute mr-1"></i> Not Supported
          </div>
      );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 bg-surface border border-border p-1.5 rounded-xl shadow-sm animate-fadeIn">
      {/* Settings Group */}
      <div className="flex items-center gap-2">
        {/* Language */}
        <div className="relative group">
          <select
            value={lang}
            onChange={(e) => {
              setLang(e.target.value as SupportedLang);
              cancelSpeech();
            }}
            className="appearance-none bg-surface2 hover:bg-surface border border-border text-text-main text-[10px] font-bold uppercase tracking-wider py-1.5 pl-2 pr-6 rounded-lg outline-none cursor-pointer transition-colors"
          >
            <option value="en">ENG</option>
            <option value="hi">HIN</option>
            <option value="mr">MAR</option>
          </select>
          <i className="fas fa-chevron-down absolute right-2 top-1/2 -translate-y-1/2 text-[8px] text-text-muted pointer-events-none"></i>
        </div>

        {/* Speed */}
        <div className="relative group">
          <select
            value={speed}
            onChange={(e) => {
              setSpeed(Number(e.target.value));
              cancelSpeech();
            }}
            className="appearance-none bg-surface2 hover:bg-surface border border-border text-text-main text-[10px] font-bold uppercase tracking-wider py-1.5 pl-2 pr-6 rounded-lg outline-none cursor-pointer transition-colors"
          >
            <option value={0.75}>0.75x</option>
            <option value={1}>1.0x</option>
            <option value={1.25}>1.25x</option>
            <option value={1.5}>1.5x</option>
            <option value={2}>2.0x</option>
          </select>
          <i className="fas fa-tachometer-alt absolute right-2 top-1/2 -translate-y-1/2 text-[8px] text-text-muted pointer-events-none"></i>
        </div>
      </div>

      <div className="h-4 w-[1px] bg-border hidden md:block"></div>

      {/* Playback Controls */}
      <div className="flex items-center gap-1">
        {status === 'idle' ? (
          <button
            onClick={handlePlay}
            className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
          >
            <i className="fas fa-volume-up"></i> Play
          </button>
        ) : (
          <>
            {status === 'playing' ? (
              <button
                onClick={handlePause}
                className="w-7 h-7 flex items-center justify-center bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-white rounded-lg transition-all"
                title="Pause"
              >
                <i className="fas fa-pause text-xs"></i>
              </button>
            ) : (
              <button
                onClick={handleResume}
                className="w-7 h-7 flex items-center justify-center bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white rounded-lg transition-all"
                title="Resume"
              >
                <i className="fas fa-play text-xs"></i>
              </button>
            )}
            
            <button
              onClick={cancelSpeech}
              className="w-7 h-7 flex items-center justify-center bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white rounded-lg transition-all"
              title="Stop"
            >
              <i className="fas fa-stop text-xs"></i>
            </button>
            
            {/* Visualizer */}
            <div className="hidden md:flex flex-col ml-1 justify-center min-w-[60px]">
               <div className="flex items-center gap-0.5 mb-0.5 h-3 items-end">
                  <span className="w-0.5 h-2 bg-indigo-500 rounded-full animate-[music_0.8s_ease-in-out_infinite]"></span>
                  <span className="w-0.5 h-3 bg-indigo-500 rounded-full animate-[music_1.0s_ease-in-out_infinite]"></span>
                  <span className="w-0.5 h-1.5 bg-indigo-500 rounded-full animate-[music_0.6s_ease-in-out_infinite]"></span>
                  <span className="w-0.5 h-2.5 bg-indigo-500 rounded-full animate-[music_0.9s_ease-in-out_infinite]"></span>
               </div>
               {chunksRef.current.length > 0 && (
                 <div className="w-full bg-surface2 h-0.5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-indigo-500 transition-all duration-300"
                      style={{ width: `${Math.min(100, (currentChunkIndex / chunksRef.current.length) * 100)}%` }}
                    ></div>
                 </div>
               )}
            </div>
          </>
        )}
      </div>
      <style>{`
        @keyframes music {
          0%, 100% { height: 20%; }
          50% { height: 100%; }
        }
      `}</style>
    </div>
  );
};

export default TTSPlayer;
