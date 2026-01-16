
import React, { useState, useEffect, useRef } from 'react';
import { TimerMode, AISessionSuggestion } from '../types';
import { generateSessionSuggestion } from '../services/geminiService';
import { saveStudySession } from '../services/historyService';

interface FocusStudioProps {
  userId: string;
}

const MODES: Record<TimerMode, { label: string; icon: string; color: string; defaultMin: number }> = {
  focus: { label: 'Focus Flow', icon: 'fa-brain', color: 'text-indigo-400', defaultMin: 25 },
  deep_study: { label: 'Deep Work', icon: 'fa-layer-group', color: 'text-purple-400', defaultMin: 90 },
  revision: { label: 'Active Recall', icon: 'fa-sync-alt', color: 'text-emerald-400', defaultMin: 45 },
  break: { label: 'Recharge', icon: 'fa-coffee', color: 'text-amber-400', defaultMin: 15 },
  stopwatch: { label: 'Stopwatch', icon: 'fa-stopwatch', color: 'text-cyan-400', defaultMin: 0 },
  custom: { label: 'Custom', icon: 'fa-sliders-h', color: 'text-pink-400', defaultMin: 0 }
};

const FocusStudio: React.FC<FocusStudioProps> = ({ userId }) => {
  // Modes that appear in the selection grid (exclude custom handled via modal/input if needed, but here we inline it)
  const DISPLAY_MODES: TimerMode[] = ['focus', 'deep_study', 'revision', 'stopwatch', 'break'];

  const [mode, setMode] = useState<TimerMode>('focus');
  const [isActive, setIsActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(MODES['focus'].defaultMin * 60);
  const [elapsedTime, setElapsedTime] = useState(0); // For Stopwatch
  const [suggestion, setSuggestion] = useState<AISessionSuggestion | null>(null);
  const [topic, setTopic] = useState('');
  
  // Custom Timer State
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customMinutes, setCustomMinutes] = useState(60);

  // Live Clock State
  const [currentTime, setCurrentTime] = useState(new Date());

  const timerRef = useRef<any>(null);

  // Load suggestion on mount
  useEffect(() => {
    generateSessionSuggestion().then(setSuggestion).catch(() => {});
    
    // Live Clock Interval
    const clockInterval = setInterval(() => setCurrentTime(new Date()), 1000);

    // RESTORE SESSION FROM LOCAL STORAGE
    const savedStart = localStorage.getItem('fs_startTime');
    const savedMode = localStorage.getItem('fs_mode') as TimerMode;
    const savedDuration = localStorage.getItem('fs_duration'); // in seconds
    const savedTopic = localStorage.getItem('fs_topic');

    if (savedStart && savedMode) {
      const start = parseInt(savedStart);
      const now = Date.now();
      
      setMode(savedMode);
      if (savedTopic) setTopic(savedTopic);
      setIsActive(true);

      if (savedMode === 'stopwatch') {
        setElapsedTime(Math.floor((now - start) / 1000));
      } else if (savedDuration) {
        const totalDuration = parseInt(savedDuration);
        const passed = Math.floor((now - start) / 1000);
        const remaining = totalDuration - passed;
        
        if (remaining > 0) {
          setTimeLeft(remaining);
        } else {
          // Timer finished while away
          handleStop(true); // Stop without saving duplicate? Or handled by logic below
          setTimeLeft(0);
          setIsActive(false);
          // Clean up LS done in handleStop
        }
      }
    }

    return () => {
      clearInterval(clockInterval);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Main Timer/Stopwatch Loop
  useEffect(() => {
    if (isActive) {
      timerRef.current = setInterval(() => {
        const now = Date.now();
        const start = parseInt(localStorage.getItem('fs_startTime') || now.toString());

        if (mode === 'stopwatch') {
          const seconds = Math.floor((now - start) / 1000);
          setElapsedTime(seconds);
        } else {
          const totalDuration = parseInt(localStorage.getItem('fs_duration') || (timeLeft * 1000).toString());
          const passed = Math.floor((now - start) / 1000);
          const remaining = totalDuration - passed;

          if (remaining <= 0) {
            setTimeLeft(0);
            handleStop();
          } else {
            setTimeLeft(remaining);
          }
        }
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isActive, mode]);

  const handleStart = () => {
    if (!isActive) {
      const now = Date.now();
      setIsActive(true);
      
      localStorage.setItem('fs_startTime', now.toString());
      localStorage.setItem('fs_mode', mode);
      localStorage.setItem('fs_topic', topic);
      
      if (mode !== 'stopwatch') {
        // If resuming or starting fresh
        localStorage.setItem('fs_duration', timeLeft.toString()); 
      }
    }
  };

  const handleStop = async (finishedAuto: boolean = false) => {
    setIsActive(false);
    clearInterval(timerRef.current);
    
    const startStr = localStorage.getItem('fs_startTime');
    if (startStr) {
      const startTime = parseInt(startStr);
      const endTime = Date.now();
      const durationSeconds = Math.floor((endTime - startTime) / 1000);
      
      // Save if > 1 minute
      if (durationSeconds > 60) {
        await saveStudySession(userId, {
          startTime,
          endTime,
          durationMinutes: Math.round(durationSeconds / 60),
          mode,
          featureUsed: suggestion?.recommended_feature || 'manual',
          topic: topic || 'General Study'
        });
      }
    }

    // Cleanup LocalStorage
    localStorage.removeItem('fs_startTime');
    localStorage.removeItem('fs_mode');
    localStorage.removeItem('fs_duration');
    localStorage.removeItem('fs_topic');

    if (!finishedAuto && mode === 'stopwatch') setElapsedTime(0);
    if (!finishedAuto && mode !== 'stopwatch') setTimeLeft(MODES[mode].defaultMin * 60);
  };

  const handleReset = () => {
    handleStop(false);
    if (mode === 'stopwatch') setElapsedTime(0);
    else setTimeLeft(MODES[mode].defaultMin * 60);
  };

  const handleModeChange = (m: TimerMode) => {
    if (isActive) return;
    setMode(m);
    if (m === 'stopwatch') {
      setElapsedTime(0);
    } else {
      setTimeLeft(MODES[m].defaultMin * 60);
    }
  };

  const handleCustomSet = () => {
    setMode('custom');
    setTimeLeft(customMinutes * 60);
    setShowCustomInput(false);
  };

  const applySuggestion = () => {
    if (suggestion) {
      setMode(suggestion.recommended_mode);
      setTimeLeft(suggestion.recommended_duration * 60);
    }
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-12 pb-32 relative">
      {/* Live Time - Top Right Absolute */}
      <div className="absolute top-24 right-6 md:top-28 md:right-10 z-20 flex flex-col items-end pointer-events-none no-print">
         <div className="text-3xl md:text-4xl font-black text-indigo-500 tabular-nums leading-none tracking-tight" style={{ textShadow: '0 0 20px rgba(99, 102, 241, 0.3)' }}>
            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
         </div>
         <div className="flex flex-col items-end mt-1">
            <div className="text-xs font-black text-emerald-400 uppercase tracking-[0.2em]">
              {currentTime.toLocaleDateString([], { weekday: 'long' })}
            </div>
            <div className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
              {currentTime.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
         </div>
      </div>

      <div className="max-w-4xl mx-auto w-full pt-10 md:pt-4">
        <header className="mb-10 text-center no-print">
          <h1 className="text-4xl font-black mb-4 bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-emerald-400">
            Focus Studio
          </h1>
          <p className="text-text-muted font-medium">Synchronize your cognitive rhythm.</p>
        </header>

        {/* --- MODES ROW (Rounded Rectangles) --- */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-12">
           {DISPLAY_MODES.map((m) => (
             <button
               key={m}
               onClick={() => handleModeChange(m)}
               disabled={isActive}
               className={`relative p-4 rounded-2xl border transition-all flex flex-col items-center justify-center gap-2 group ${
                 mode === m 
                 ? `bg-surface2 border-current ${MODES[m].color} shadow-lg scale-105` 
                 : 'bg-surface border-border text-text-muted hover:bg-surface2 hover:border-text-muted'
               } ${isActive ? 'opacity-50 cursor-not-allowed' : ''}`}
             >
                <i className={`fas ${MODES[m].icon} text-xl mb-1`}></i>
                <span className="text-[10px] font-black uppercase tracking-wider">{MODES[m].label}</span>
             </button>
           ))}
           <button
             onClick={() => setShowCustomInput(true)}
             disabled={isActive}
             className={`relative p-4 rounded-2xl border transition-all flex flex-col items-center justify-center gap-2 group ${
               mode === 'custom' 
               ? 'bg-surface2 border-pink-400 text-pink-400 shadow-lg scale-105' 
               : 'bg-surface border-border text-text-muted hover:bg-surface2 hover:border-text-muted'
             } ${isActive ? 'opacity-50 cursor-not-allowed' : ''}`}
           >
              <i className="fas fa-sliders-h text-xl mb-1"></i>
              <span className="text-[10px] font-black uppercase tracking-wider">Custom</span>
           </button>
        </div>

        {/* --- CUSTOM INPUT MODAL --- */}
        {showCustomInput && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
             <div className="bg-surface border border-border p-8 rounded-3xl w-80 text-center shadow-2xl">
                <h3 className="text-lg font-bold text-text-main mb-6">Set Duration</h3>
                <div className="flex items-center justify-center gap-4 mb-8">
                   <input 
                     type="number" 
                     value={customMinutes} 
                     onChange={(e) => setCustomMinutes(Math.max(1, parseInt(e.target.value) || 0))}
                     className="w-24 bg-surface2 border border-border rounded-xl p-3 text-2xl font-black text-center text-text-main outline-none focus:border-pink-400"
                   />
                   <span className="text-text-muted font-bold">min</span>
                </div>
                <div className="flex gap-2">
                   <button onClick={() => setShowCustomInput(false)} className="flex-1 py-3 rounded-xl bg-surface2 text-text-muted font-bold text-xs uppercase tracking-widest hover:text-text-main">Cancel</button>
                   <button onClick={handleCustomSet} className="flex-1 py-3 rounded-xl bg-pink-500 text-white font-bold text-xs uppercase tracking-widest hover:bg-pink-600">Set Timer</button>
                </div>
             </div>
          </div>
        )}

        {/* --- MAIN TIMER DISPLAY --- */}
        <div className="bg-surface rounded-[3rem] border border-border shadow-2xl p-8 md:p-16 relative overflow-hidden text-center mb-12">
          {/* Progress Ring Background */}
          <div className="absolute inset-0 opacity-5 pointer-events-none flex items-center justify-center">
             <div 
               className="w-[500px] h-[500px] rounded-full border-[20px]"
               style={{ borderColor: 'currentColor', color: 'var(--text-muted)' }}
             ></div>
          </div>

          <div className="relative z-10">
            <div className={`text-7xl md:text-9xl lg:text-[10rem] font-black font-mono tracking-tighter mb-8 tabular-nums transition-colors duration-500 ${isActive ? MODES[mode].color : 'text-text-main'}`}>
              {mode === 'stopwatch' ? formatTime(elapsedTime) : formatTime(timeLeft)}
            </div>

            <div className="max-w-md mx-auto mb-12">
               <input 
                 type="text" 
                 value={topic}
                 onChange={(e) => setTopic(e.target.value)}
                 disabled={isActive}
                 placeholder="What are you mastering today?"
                 className="w-full bg-surface2 border border-border rounded-xl px-6 py-4 text-center text-text-main outline-none focus:border-indigo-500 transition-all placeholder:text-text-muted/50 font-medium"
               />
            </div>

            <div className="flex justify-center gap-6">
               {!isActive ? (
                 <button 
                   onClick={handleStart}
                   className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-emerald-500 text-white flex items-center justify-center text-3xl shadow-xl shadow-emerald-500/30 hover:scale-110 transition-transform"
                 >
                   <i className="fas fa-play ml-1"></i>
                 </button>
               ) : (
                 <button 
                   onClick={() => handleStop(false)}
                   className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-rose-500 text-white flex items-center justify-center text-3xl shadow-xl shadow-rose-500/30 hover:scale-110 transition-transform"
                 >
                   <i className="fas fa-stop"></i>
                 </button>
               )}
               <button 
                 onClick={handleReset}
                 disabled={isActive && mode !== 'stopwatch'}
                 className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-surface2 text-text-muted border border-border flex items-center justify-center text-2xl hover:text-text-main hover:bg-surface transition-all disabled:opacity-50"
               >
                 <i className="fas fa-undo"></i>
               </button>
            </div>
          </div>
        </div>

        {/* --- AI SMART SUGGESTION (Moved Bottom) --- */}
        {suggestion && !isActive && (
          <div className="bg-gradient-to-br from-indigo-900/20 to-purple-900/20 border border-indigo-500/20 rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-lg animate-fadeIn group hover:border-indigo-500/40 transition-all">
             <div className="absolute top-0 right-0 p-4 opacity-10 text-indigo-500 group-hover:scale-110 transition-transform duration-700"><i className="fas fa-robot text-8xl"></i></div>
             <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                   <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs"><i className="fas fa-sparkles"></i></div>
                   <h3 className="text-xs font-black text-indigo-400 uppercase tracking-widest">AI Intelligence Suggestion</h3>
                </div>
                
                <div className="grid md:grid-cols-2 gap-6 mb-6">
                   <div>
                      <p className="text-text-main font-bold text-lg mb-2">
                         Recommended: {suggestion.recommended_duration}m {suggestion.recommended_mode.replace('_', ' ')}
                      </p>
                      <p className="text-text-muted text-sm italic leading-relaxed">"{suggestion.reason}"</p>
                   </div>
                   <div className="bg-surface/50 rounded-xl p-4 border border-white/5">
                      <p className="text-[10px] text-emerald-400 font-black uppercase tracking-widest mb-1"><i className="fas fa-clock mr-1"></i> Temporal Insight</p>
                      <p className="text-text-main text-sm font-medium">{suggestion.time_insight}</p>
                   </div>
                </div>

                <button 
                  onClick={applySuggestion}
                  className="w-full md:w-auto px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  Apply Configuration <i className="fas fa-arrow-right"></i>
                </button>
             </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default FocusStudio;
