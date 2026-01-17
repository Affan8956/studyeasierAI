
import React, { useState, useEffect, useRef } from 'react';
import { GeminiLiveClient } from '../services/geminiService';
import { Message, User } from '../types';
import { LiveServerMessage } from '@google/genai';

interface LiveInterfaceProps {
  user: User;
  onSaveSession: (messages: Message[]) => void;
}

// Audio Engine Utils
function float32ToInt16(float32: Float32Array): Int16Array {
  const int16 = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return int16;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

const VOICES = [
  { name: 'Zephyr', label: 'Zephyr (Professional)' },
  { name: 'Puck', label: 'Puck (Engaging)' },
  { name: 'Charon', label: 'Charon (Authoritative)' },
  { name: 'Kore', label: 'Kore (Supportive)' },
  { name: 'Fenrir', label: 'Fenrir (Direct)' },
];

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'hi', label: 'Hindi' },
];

const LiveInterface: React.FC<LiveInterfaceProps> = ({ user, onSaveSession }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isModelSpeaking, setIsModelSpeaking] = useState(false);
  const [audioContextState, setAudioContextState] = useState<string>('unknown');
  
  // Real-time transcriptions
  const [transcript, setTranscript] = useState<Message[]>([]);
  const [currentInputTrans, setCurrentInputTrans] = useState('');
  const [currentOutputTrans, setCurrentOutputTrans] = useState('');
  const inputAccRef = useRef('');
  const outputAccRef = useRef('');
  
  const [selectedVoice, setSelectedVoice] = useState('Zephyr');
  const [selectedLang, setSelectedLang] = useState('en');
  const [showConfig, setShowConfig] = useState(false);

  // Visualization
  const [micSpectrum, setMicSpectrum] = useState<number[]>(new Array(16).fill(0));
  const [aiPulseLevel, setAiPulseLevel] = useState(0);

  // Audio Context Refs
  const clientRef = useRef<GeminiLiveClient | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const outputAnalyserRef = useRef<AnalyserNode | null>(null);
  const outputGainRef = useRef<GainNode | null>(null);
  const inputAnalyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number>(0);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const transcriptRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Visualizer loop
  useEffect(() => {
    const renderFrame = () => {
      if (inputAnalyserRef.current && isMicOn && isConnected) {
        const dataArray = new Uint8Array(inputAnalyserRef.current.frequencyBinCount);
        inputAnalyserRef.current.getByteFrequencyData(dataArray);
        const sampled: number[] = [];
        const step = Math.floor(dataArray.length / 16);
        for (let i = 0; i < 16; i++) sampled.push(dataArray[i * step]);
        setMicSpectrum(sampled);
      } else {
        setMicSpectrum(new Array(16).fill(0));
      }

      if (outputAnalyserRef.current && isModelSpeaking) {
        const dataArray = new Uint8Array(outputAnalyserRef.current.frequencyBinCount);
        outputAnalyserRef.current.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        setAiPulseLevel(avg / 128);
      } else {
        setAiPulseLevel(0);
      }
      
      if (audioContextRef.current) {
        setAudioContextState(audioContextRef.current.state);
      }

      animationFrameRef.current = requestAnimationFrame(renderFrame);
    };
    animationFrameRef.current = requestAnimationFrame(renderFrame);
    return () => cancelAnimationFrame(animationFrameRef.current);
  }, [isMicOn, isModelSpeaking, isConnected]);

  // Lifecycle
  useEffect(() => {
    return () => { stopSession(); };
  }, []);

  const playFeedbackTone = (freq: number, type: 'sine' | 'square' = 'sine', duration: number = 0.1) => {
    if (!audioContextRef.current) return;
    const osc = audioContextRef.current.createOscillator();
    const gain = audioContextRef.current.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioContextRef.current.currentTime);
    gain.gain.setValueAtTime(0.05, audioContextRef.current.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioContextRef.current.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioContextRef.current.destination);
    osc.start();
    osc.stop(audioContextRef.current.currentTime + duration);
  };

  const unlockMobileAudio = async () => {
    const AC = (window.AudioContext || (window as any).webkitAudioContext);
    if (!audioContextRef.current) {
      audioContextRef.current = new AC({ sampleRate: 24000 });
      
      const analyser = audioContextRef.current.createAnalyser();
      analyser.fftSize = 256;
      
      const gainNode = audioContextRef.current.createGain();
      gainNode.gain.value = 1.0; 

      analyser.connect(gainNode);
      gainNode.connect(audioContextRef.current.destination);
      
      outputAnalyserRef.current = analyser;
      outputGainRef.current = gainNode;
    }

    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }
    
    // Audible ping for hardware confirmation
    playFeedbackTone(880, 'sine', 0.15);
  };

  const startSession = async () => {
    if (isConnected) return;
    try {
      await unlockMobileAudio();

      clientRef.current = new GeminiLiveClient();
      const userName = user.name.split(' ')[0] || "User";
      
      await clientRef.current.connect(
        {
          voiceName: selectedVoice,
          systemInstruction: `You are StudyEasierAI. Greet ${userName} by name immediately. Speak naturally, fluidly, and concisely in ${selectedLang}. Your purpose is to act as a real-time study companion. Start the session now with a warm greeting.`
        },
        {
          onopen: async () => {
            setIsConnected(true);
            // Reset the clock for the audio buffer queue
            nextStartTimeRef.current = audioContextRef.current?.currentTime || 0;
            await startMic();
          },
          onmessage: handleLiveMessage,
          onclose: () => stopSession(),
          onerror: (e: any) => {
            console.error("Neural Link Error:", e);
            stopSession();
          }
        }
      );
    } catch (err) {
      alert("Hardware Error: Microphone permission is required for Live Link.");
    }
  };

  const stopSession = async () => {
    playFeedbackTone(220, 'square', 0.2);
    if (clientRef.current) {
      await clientRef.current.disconnect();
      clientRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(t => t.stop());
      micStreamRef.current = null;
    }
    activeSourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
    activeSourcesRef.current.clear();
    setIsConnected(false);
    setIsModelSpeaking(false);
  };

  const toggleMic = () => {
    const newState = !isMicOn;
    setIsMicOn(newState);
    if (newState) playFeedbackTone(660, 'sine', 0.1);
    else playFeedbackTone(440, 'sine', 0.1);
  };

  const startMic = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      
      const AC = (window.AudioContext || (window as any).webkitAudioContext);
      const inputCtx = new AC({ sampleRate: 16000 });
      const source = inputCtx.createMediaStreamSource(stream);
      
      const analyser = inputCtx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      inputAnalyserRef.current = analyser;

      const processor = inputCtx.createScriptProcessor(4096, 1, 1);
      processor.onaudioprocess = (e) => {
        if (!isMicOn || !isConnected) return;
        const data = e.inputBuffer.getChannelData(0);
        const int16 = float32ToInt16(data);
        const base64 = arrayBufferToBase64(int16.buffer);
        if (clientRef.current) clientRef.current.sendAudioChunk(base64);
      };

      source.connect(processor);
      processor.connect(inputCtx.destination);
    } catch (e) {
      console.warn("Input stream failed to bind", e);
    }
  };

  const handleLiveMessage = async (msg: LiveServerMessage) => {
    // 1. Process Voice Data Parts
    const modelTurn = msg.serverContent?.modelTurn;
    if (modelTurn && modelTurn.parts) {
      for (const part of modelTurn.parts) {
        if (part.inlineData && part.inlineData.data) {
          const audioB64 = part.inlineData.data;
          const audioBuffer = await decodePCM(audioB64);
          
          if (audioBuffer && audioContextRef.current && outputAnalyserRef.current) {
            // Aggressively resume context on chunk arrival
            if (audioContextRef.current.state !== 'running') {
              await audioContextRef.current.resume();
            }

            const source = audioContextRef.current.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(outputAnalyserRef.current);
            
            const now = audioContextRef.current.currentTime;
            // SCHEDULING: 150ms look-ahead is safer for network audio streams
            const startTime = Math.max(nextStartTimeRef.current, now + 0.15);
            
            source.start(startTime);
            nextStartTimeRef.current = startTime + audioBuffer.duration;
            
            setIsModelSpeaking(true);
            activeSourcesRef.current.add(source);
            
            source.onended = () => {
              activeSourcesRef.current.delete(source);
              if (activeSourcesRef.current.size === 0) {
                setIsModelSpeaking(false);
              }
            };
          }
        }
      }
    }

    // 2. Transcriptions for UI context
    if (msg.serverContent?.outputTranscription) {
      outputAccRef.current += msg.serverContent.outputTranscription.text;
      setCurrentOutputTrans(outputAccRef.current);
    }
    if (msg.serverContent?.inputTranscription) {
      inputAccRef.current += msg.serverContent.inputTranscription.text;
      setCurrentInputTrans(inputAccRef.current);
    }
    
    if (msg.serverContent?.turnComplete) {
      const finI = inputAccRef.current.trim();
      const finO = outputAccRef.current.trim();
      if (finI || finO) {
        setTranscript(prev => [
          ...prev,
          ...(finI ? [{ id: Date.now() + '_i', role: 'user', content: finI, timestamp: Date.now() } as Message] : []),
          ...(finO ? [{ id: (Date.now() + 1) + '_o', role: 'model', content: finO, timestamp: Date.now() } as Message] : [])
        ]);
      }
      inputAccRef.current = '';
      outputAccRef.current = '';
      setCurrentInputTrans('');
      setCurrentOutputTrans('');
    }
    
    if (msg.serverContent?.interrupted) {
      activeSourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
      activeSourcesRef.current.clear();
      setIsModelSpeaking(false);
      nextStartTimeRef.current = audioContextRef.current?.currentTime || 0;
    }
  };

  const decodePCM = async (base64: string) => {
    try {
      if (!audioContextRef.current) return null;
      const buffer = base64ToArrayBuffer(base64);
      
      // GEMINI SPEC: 16-bit PCM little-endian data
      // Ensure we are reading exactly 2-byte pairs
      const sampleCount = Math.floor(buffer.byteLength / 2);
      const view = new DataView(buffer);
      const float32 = new Float32Array(sampleCount);
      
      for (let i = 0; i < sampleCount; i++) {
        // Offset is i * 2 bytes, true = little-endian
        const int16 = view.getInt16(i * 2, true);
        float32[i] = int16 / 32768.0; // Normalize -32768..32767 to -1.0..1.0
      }
      
      // Output sample rate for Gemini Live is 24000
      const audioBuffer = audioContextRef.current.createBuffer(1, float32.length, 24000);
      audioBuffer.copyToChannel(float32, 0);
      return audioBuffer;
    } catch (e) { 
      console.error("PCM Signal Decrypt Failed:", e);
      return null; 
    }
  };

  const handleVisionUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && clientRef.current) {
      const reader = new FileReader();
      reader.onload = () => {
        const b64 = (reader.result as string).split(',')[1];
        clientRef.current?.sendImageFrame(b64, file.type);
        setTranscript(p => [...p, { id: Date.now().toString(), role: 'user', content: `[Neural Sync: Image Data Provided]`, timestamp: Date.now() }]);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-app relative overflow-hidden">
      
      {/* HEADER */}
      <div className="relative z-30 flex justify-between items-center p-8 no-print">
         <div className="flex items-center gap-6">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-2xl transition-all duration-700 ${isConnected ? 'bg-rose-600 rotate-12 scale-110 shadow-rose-900/40' : 'bg-slate-800 scale-90'}`}>
               <i className={`fas ${isConnected ? 'fa-satellite' : 'fa-power-off'} text-2xl`}></i>
            </div>
            <div>
               <h2 className="text-sm font-black text-text-main uppercase tracking-[0.2em] mb-1">Live Study Link</h2>
               <div className="flex items-center gap-2.5">
                  <div className={`w-2 h-2 rounded-full ${isConnected ? (isModelSpeaking ? 'bg-rose-500 animate-ping' : 'bg-emerald-500') : 'bg-slate-600'}`}></div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">
                    {isConnected ? (isModelSpeaking ? 'Transmission Active' : 'System Ready') : 'Protocol Offline'}
                  </span>
                  {isConnected && (
                    <span className={`ml-2 text-[8px] px-1.5 py-0.5 rounded border ${audioContextState === 'running' ? 'border-emerald-500/30 text-emerald-500' : 'border-rose-500/30 text-rose-500'} uppercase font-bold`}>
                       Audio: {audioContextState}
                    </span>
                  )}
               </div>
            </div>
         </div>
         <button onClick={() => setShowConfig(true)} className="w-12 h-12 rounded-2xl bg-surface border border-border flex items-center justify-center text-text-muted hover:text-rose-500 transition-all shadow-xl">
            <i className="fas fa-microchip"></i>
         </button>
      </div>

      {/* TRANSCRIPT FEED */}
      <div className="flex-1 flex flex-col pt-4 pb-48 px-6 md:px-12 max-w-4xl mx-auto w-full relative z-20">
         <div ref={transcriptRef} className="flex-1 overflow-y-auto custom-scrollbar space-y-8 pb-10 mask-fade-top mask-fade-bottom px-2">
            {transcript.length === 0 && !isConnected && (
              <div className="flex flex-col items-center justify-center h-full text-center opacity-30">
                 <div className="w-20 h-20 border-2 border-dashed border-border rounded-full flex items-center justify-center mb-6 animate-spin-slow">
                    <i className="fas fa-atom text-2xl"></i>
                 </div>
                 <p className="text-[10px] font-black uppercase tracking-[0.4em]">Establish Neural Bridge</p>
              </div>
            )}
            {transcript.map(msg => (
               <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}>
                  {msg.role === 'model' && <div className="w-8 h-8 rounded-xl bg-rose-600 flex items-center justify-center text-white text-[10px] shrink-0 shadow-lg"><i className="fas fa-robot"></i></div>}
                  <div className={`p-4 rounded-3xl max-w-[85%] text-sm leading-relaxed shadow-xl border transition-all ${msg.role === 'user' ? 'bg-indigo-600 text-white border-indigo-400 rounded-tr-none' : 'bg-surface border-border text-text-main rounded-tl-none'}`}>
                    {msg.content}
                  </div>
               </div>
            ))}
            {currentInputTrans && (
               <div className="flex justify-end opacity-60 animate-pulse">
                  <div className="p-3 rounded-2xl bg-indigo-600/10 text-indigo-400 text-xs border border-indigo-500/20">{currentInputTrans}</div>
               </div>
            )}
            {currentOutputTrans && (
               <div className="flex justify-start opacity-60 animate-pulse">
                  <div className="p-3 rounded-2xl bg-rose-600/10 text-rose-400 text-xs border border-rose-500/20">{currentOutputTrans}</div>
               </div>
            )}
         </div>
      </div>

      {/* CORE NEURAL VISUALIZER */}
      <div className="absolute inset-x-0 bottom-40 flex flex-col items-center justify-center z-40 pointer-events-none">
         <div className="relative pointer-events-auto">
             <div className="absolute inset-0 bg-rose-600/30 rounded-full blur-3xl transition-transform duration-100" style={{ transform: `scale(${1 + aiPulseLevel * 2.5})` }}></div>
             <div className={`w-32 h-32 md:w-40 md:h-40 rounded-full flex items-center justify-center shadow-2xl border-4 transition-all duration-700 relative z-10 ${isConnected ? 'bg-rose-600 border-rose-300 scale-100 shadow-rose-900/60' : 'bg-slate-800 border-slate-700 scale-90 opacity-40'}`}>
                <div className="relative text-center">
                   <i className={`fas ${isConnected ? (isModelSpeaking ? 'fa-volume-up animate-bounce' : 'fa-atom fa-spin') : 'fa-power-off'} text-4xl text-white`}></i>
                </div>
             </div>
         </div>
         
         {isConnected && (
            <div className="mt-10 flex items-end gap-1.5 h-12 px-8 bg-surface/40 backdrop-blur-3xl rounded-full border border-white/10 shadow-inner">
               {micSpectrum.map((val, i) => (
                 <div 
                   key={i} 
                   className={`w-2 rounded-full transition-all duration-75 ${val > 160 ? 'bg-rose-500' : val > 80 ? 'bg-indigo-400' : 'bg-indigo-900/30'}`} 
                   style={{ height: `${Math.max(4, (val / 255) * 36)}px` }}
                 ></div>
               ))}
            </div>
         )}
      </div>

      {/* CONTROLS */}
      <div className="absolute bottom-0 inset-x-0 z-50 p-10 flex flex-col items-center bg-gradient-to-t from-app via-app/95 to-transparent no-print">
         {!isConnected ? (
            <button 
               onClick={startSession} 
               className="group relative bg-rose-600 hover:bg-rose-500 text-white px-14 py-4 rounded-[2rem] shadow-2xl transition-all hover:scale-105 active:scale-95 font-black uppercase tracking-[0.3em] text-xs overflow-hidden"
            >
               <span className="relative z-10 flex items-center gap-3">
                  <i className="fas fa-play"></i> Initialize Protocol
               </span>
               <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
            </button>
         ) : (
            <div className="flex items-center gap-10 animate-fadeIn">
               <button 
                  onClick={toggleMic} 
                  className={`w-16 h-16 rounded-2xl border-2 flex items-center justify-center transition-all shadow-2xl hover:scale-110 active:scale-90 ${isMicOn ? 'bg-indigo-600/10 border-indigo-400 text-indigo-400' : 'bg-rose-600/10 border-rose-500 text-rose-500'}`}
               >
                  <i className={`fas ${isMicOn ? 'fa-microphone' : 'fa-microphone-slash'} text-xl`}></i>
               </button>
               
               <button 
                  onClick={stopSession} 
                  className="group w-20 h-20 rounded-[2.5rem] bg-white text-rose-600 shadow-2xl flex items-center justify-center text-3xl hover:scale-110 active:scale-90 border-6 border-rose-100 transition-all"
               >
                  <i className="fas fa-stop"></i>
               </button>
               
               <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleVisionUpload} />
               <button 
                  onClick={() => fileInputRef.current?.click()} 
                  className="w-16 h-16 rounded-2xl bg-surface border-2 border-border flex items-center justify-center text-text-muted hover:text-indigo-400 shadow-2xl transition-all hover:scale-110 active:scale-90"
               >
                  <i className="fas fa-camera text-xl"></i>
               </button>
            </div>
         )}
      </div>

      {/* CONFIG MODAL */}
      {showConfig && (
         <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6 animate-fadeIn" onClick={() => setShowConfig(false)}>
            <div className="bg-surface border border-border rounded-[3rem] p-10 max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
               <div className="flex items-center gap-4 mb-8">
                  <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg"><i className="fas fa-cog"></i></div>
                  <h3 className="text-lg font-black text-text-main uppercase tracking-widest">Neural Protocol</h3>
               </div>
               
               <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-3 block">Voice Matrix</label>
                    <div className="grid grid-cols-1 gap-2">
                       {VOICES.map(v => (
                         <button
                           key={v.name}
                           onClick={() => setSelectedVoice(v.name)}
                           className={`w-full text-left px-5 py-4 rounded-xl border-2 transition-all font-bold text-xs uppercase tracking-widest ${selectedVoice === v.name ? 'border-rose-500 bg-rose-600/10 text-rose-500 shadow-lg shadow-rose-500/10' : 'border-border bg-surface2 text-text-muted'}`}
                         >
                            {v.label}
                         </button>
                       ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-3 block">Linguistic Region</label>
                    <select 
                      value={selectedLang} 
                      onChange={(e) => setSelectedLang(e.target.value)}
                      className="w-full bg-surface2 border-2 border-border rounded-xl px-5 py-4 text-xs font-bold text-text-main outline-none focus:border-indigo-600 shadow-inner"
                    >
                       {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
                    </select>
                  </div>
               </div>

               <button 
                  onClick={() => setShowConfig(false)}
                  className="w-full mt-10 py-5 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/20"
               >
                  Sync Matrix
               </button>
            </div>
         </div>
      )}

      <style>{`
        .mask-fade-top { mask-image: linear-gradient(to bottom, transparent, black 15%); }
        .mask-fade-bottom { mask-image: linear-gradient(to top, transparent, black 20%); }
        .animate-spin-slow { animation: spin 10s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default LiveInterface;
