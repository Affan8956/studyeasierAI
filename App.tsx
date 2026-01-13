
import React, { useState, useEffect } from 'react';
import { User, ChatSession, ViewState, LabAsset, AuthState, AIMode, LabState, ResearchState, VisionState, AppTheme } from './types';
import { getCurrentSession, logout } from './services/authService';
import { getHistory, saveChat, deleteChat, createNewChat, getAssets, saveAsset, deleteAsset, clearAllAssets } from './services/historyService';
import { processUnifiedLabContent, performDeepResearch, analyzeImage } from './services/geminiService';
import { supabase } from './services/supabaseClient';
import AuthForm from './components/AuthForm';
import Sidebar from './components/Sidebar';
import ChatInterface from './components/ChatInterface';
import Dashboard from './components/Dashboard';
import LabPanel from './components/LabPanel';
import Vault from './components/Vault';
import ResearchView from './components/ResearchView';
import VisionPanel from './components/VisionPanel';
import AboutView from './components/AboutView';
import ThemeSelector from './components/ThemeSelector';

const App: React.FC = () => {
  const [auth, setAuth] = useState<AuthState>({ user: null, token: null, isAuthenticated: false });
  const [view, setView] = useState<ViewState>('dashboard');
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [assets, setAssets] = useState<LabAsset[]>([]);
  const [isInitializingChat, setIsInitializingChat] = useState(false);
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [viewingAsset, setViewingAsset] = useState<LabAsset | null>(null);
  const [theme, setTheme] = useState<AppTheme>('default');

  // --- Background Processing States ---
  const [labState, setLabState] = useState<LabState>({
    isLoading: false,
    currentPackage: null,
    error: null,
    lastSourceInfo: null,
    activeTab: 'summary'
  });

  const [researchState, setResearchState] = useState<ResearchState>({
    isLoading: false,
    result: null,
    error: null,
    query: ''
  });

  const [visionState, setVisionState] = useState<VisionState>({
    isLoading: false,
    image: null,
    mimeType: '',
    prompt: '',
    result: null,
    error: null
  });

  useEffect(() => {
    // 1. HARD FAILSAFE: Force loading off after 2.5 seconds no matter what.
    const hardStop = setTimeout(() => {
      setIsAppLoading(false);
    }, 2500);

    const init = async () => {
      try {
        const session = await getCurrentSession();
        if (session) {
          setAuth({ user: session.user, token: session.token, isAuthenticated: true });
          
          // Parallel fetch with error suppression to prevent crashes
          const [history, savedAssets] = await Promise.all([
            getHistory(session.user.id).catch(err => { console.warn('History load failed', err); return []; }),
            getAssets(session.user.id).catch(err => { console.warn('Assets load failed', err); return []; })
          ]);
          
          setChats(history);
          setAssets(savedAssets);
        }
      } catch (e) {
        console.warn("Initialization encountered non-fatal error:", e);
      } finally {
        // Normal completion
        setIsAppLoading(false);
      }
    };

    init();

    // Check for saved theme
    const savedTheme = localStorage.getItem('app_theme') as AppTheme;
    if (savedTheme) handleThemeChange(savedTheme);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) {
        const fullSession = await getCurrentSession();
        if (fullSession) {
          setAuth({ user: fullSession.user, token: fullSession.token, isAuthenticated: true });
          const [history, savedAssets] = await Promise.all([
            getHistory(fullSession.user.id).catch(() => []),
            getAssets(fullSession.user.id).catch(() => [])
          ]);
          setChats(history);
          setAssets(savedAssets);
        }
      } else if (event === 'SIGNED_OUT') {
        setAuth({ user: null, token: null, isAuthenticated: false });
        setChats([]);
        setAssets([]);
        setActiveChatId(null);
        setView('dashboard');
        // Reset background states on logout
        setLabState({ isLoading: false, currentPackage: null, error: null, lastSourceInfo: null, activeTab: 'summary' });
        setResearchState({ isLoading: false, result: null, error: null, query: '' });
        setVisionState({ isLoading: false, image: null, mimeType: '', prompt: '', result: null, error: null });
      }
    });

    return () => {
      subscription.unsubscribe();
      clearTimeout(hardStop);
    };
  }, []);

  const handleThemeChange = (newTheme: AppTheme) => {
    setTheme(newTheme);
    localStorage.setItem('app_theme', newTheme);
    
    // Remove all theme classes first
    document.documentElement.classList.remove('theme-light', 'theme-midnight', 'theme-forest');
    
    // Add new theme class if not default
    if (newTheme !== 'default') {
      document.documentElement.classList.add(`theme-${newTheme}`);
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  const handleNewChat = async (mode: AIMode = 'study') => {
    if (!auth.user || isInitializingChat) return;
    setIsInitializingChat(true);
    try {
      const chat = await createNewChat(auth.user.id, mode);
      setChats(prev => [chat, ...prev]);
      setActiveChatId(chat.id);
      if (mode === 'tutor') {
        setView('tutor');
      } else {
        setView('chat');
      }
    } catch (e: any) {
      console.error("Failed to create new chat:", e.message || e);
    } finally {
      setIsInitializingChat(false);
    }
  };

  const handleDeleteChat = async (id: string) => {
    if (!auth.user) return;
    await deleteChat(auth.user.id, id);
    setChats(prev => prev.filter(c => c.id !== id));
    if (activeChatId === id) setActiveChatId(null);
  };

  const handleSaveAsset = async (asset: Omit<LabAsset, 'id' | 'timestamp' | 'userId'>) => {
    if (!auth.user) return;
    await saveAsset(auth.user.id, asset);
    const savedAssets = await getAssets(auth.user.id);
    setAssets(savedAssets);
  };

  const handleDeleteAsset = async (id: string) => {
    if (!auth.user) return;
    await deleteAsset(auth.user.id, id);
    setAssets(prev => prev.filter(a => a.id !== id));
  };

  const handleClearAllAssets = async () => {
    if (!auth.user) return;
    await clearAllAssets(auth.user.id);
    setAssets([]);
    setLabState(prev => ({ ...prev, currentPackage: null, activeTab: 'summary' }));
    setResearchState(prev => ({ ...prev, result: null }));
    setVisionState(prev => ({ ...prev, result: null, image: null }));
  };

  const handleOpenAsset = (asset: LabAsset) => {
    setViewingAsset(asset);
    
    if (asset.type === 'research') {
      setResearchState({
        isLoading: false,
        error: null,
        query: asset.title,
        result: { 
          text: asset.content, 
          groundingChunks: [] // Legacy or simplified assets might not have chunks
        }
      });
      setView('research');
    } else if (asset.type === 'image_analysis') {
      setVisionState({
        isLoading: false,
        image: null, 
        mimeType: '',
        prompt: asset.title,
        result: asset.content,
        error: null
      });
      setView('vision');
    } else {
      const mockPackage: any = { title: asset.title };
      if (asset.type === 'summary') mockPackage.summary = { content: asset.content };
      if (asset.type === 'quiz') mockPackage.quiz = asset.content;
      if (asset.type === 'slides') mockPackage.slides = asset.content;
      if (asset.type === 'flashcards') mockPackage.flashcards = asset.content;
      
      setLabState({
        isLoading: false,
        error: null,
        lastSourceInfo: asset.sourceName,
        currentPackage: mockPackage,
        activeTab: asset.type
      });
      setView('lab');
    }
  };

  const handleLabProcess = async (sourcePayload: { file?: { base64: string; mimeType: string }; url?: string }, sourceName: string) => {
    setLabState(prev => ({ 
      ...prev, 
      isLoading: true, 
      error: null, 
      lastSourceInfo: sourceName, 
      currentPackage: null,
      activeTab: 'summary' 
    }));

    try {
      const result = await processUnifiedLabContent(sourcePayload);
      setLabState(prev => ({ ...prev, isLoading: false, currentPackage: result }));

      await handleSaveAsset({ title: result.title, type: 'summary', content: result.summary.content, sourceName });
      await handleSaveAsset({ title: result.title, type: 'quiz', content: result.quiz, sourceName });
      await handleSaveAsset({ title: result.title, type: 'flashcards', content: result.flashcards, sourceName });
      await handleSaveAsset({ title: result.title, type: 'slides', content: result.slides, sourceName });

    } catch (err: any) {
      setLabState(prev => ({ ...prev, isLoading: false, error: err.message || "Processing failed" }));
    }
  };

  const handleResearchSearch = async (query: string) => {
    setResearchState(prev => ({ ...prev, isLoading: true, error: null, result: null, query }));
    
    try {
      const data = await performDeepResearch(query);
      setResearchState(prev => ({ ...prev, isLoading: false, result: data }));
      
      await handleSaveAsset({
        title: query.charAt(0).toUpperCase() + query.slice(1),
        type: 'research',
        content: data.text,
        sourceName: 'Deep Research Agent'
      });

    } catch (err: any) {
      setResearchState(prev => ({ ...prev, isLoading: false, error: err.message || "Research failed" }));
    }
  };

  const handleVisionAnalyze = async (image: string, mimeType: string, prompt: string) => {
    setVisionState({ isLoading: true, image, mimeType, prompt, result: null, error: null });

    try {
      const base64Data = image.split(',')[1];
      const analysisText = await analyzeImage(base64Data, mimeType, prompt);
      setVisionState(prev => ({ ...prev, isLoading: false, result: analysisText }));

      await handleSaveAsset({
        title: prompt ? `Analysis: ${prompt.slice(0, 20)}...` : 'Image Analysis',
        type: 'image_analysis',
        content: analysisText,
        sourceName: 'Gemini Vision Engine'
      });

    } catch (err: any) {
      setVisionState(prev => ({ ...prev, isLoading: false, error: err.message || "Analysis failed" }));
    }
  };

  const handleVisionUpdate = (newState: Partial<VisionState>) => {
    setVisionState(prev => ({ ...prev, ...newState }));
  };

  const handleClearLab = () => {
    setLabState({ isLoading: false, currentPackage: null, error: null, lastSourceInfo: null, activeTab: 'summary' });
  };

  const handleSidebarViewChange = (targetView: ViewState) => {
    if (targetView === 'lab' && !labState.isLoading) {
      handleClearLab();
    }
    if (targetView !== 'vision' && targetView !== 'research' && targetView !== 'lab') {
       setViewingAsset(null);
    }
    setView(targetView);
    if(targetView !== 'chat' && targetView !== 'tutor') {
      setActiveChatId(null);
    }
  };

  if (isAppLoading) {
    return (
      <div className="min-h-screen bg-app flex flex-col items-center justify-center p-6 text-white animate-fadeIn">
        <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-6"></div>
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-400">Initializing Core AI...</p>
        <p className="text-slate-600 text-[9px] mt-4 uppercase font-bold tracking-widest">Verifying Academic Handshake</p>
      </div>
    );
  }

  if (!auth.isAuthenticated) {
    return (
      <div className="min-h-screen bg-app flex items-center justify-center p-6">
        <AuthForm onAuthComplete={(user, token) => setAuth({user, token, isAuthenticated: true})} />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-app text-text-main overflow-hidden transition-colors duration-300">
      <Sidebar 
        view={view} 
        setView={handleSidebarViewChange} 
        chats={chats}
        activeChatId={activeChatId}
        onSelectChat={(id) => { setActiveChatId(id); setView('chat'); }}
        onNewChat={() => handleNewChat('study')}
        onNewTutorChat={() => handleNewChat('tutor')}
        onDeleteChat={handleDeleteChat}
        user={auth.user!}
        onLogout={handleLogout}
      />

      <main className="flex-1 relative flex flex-col overflow-hidden">
        {/* THEME SELECTOR - Top Right Corner */}
        <ThemeSelector currentTheme={theme} onThemeChange={handleThemeChange} />

        {view === 'dashboard' && (
          <Dashboard 
            user={auth.user!} 
            chats={chats} 
            assets={assets}
            onAction={(target) => setView(target)}
            onNewChat={() => handleNewChat('study')}
            onOpenChat={(id) => { setActiveChatId(id); setView('chat'); }}
            onOpenAsset={handleOpenAsset}
          />
        )}

        {(view === 'chat' || view === 'tutor') && (
          <ChatInterface 
            chat={chats.find(c => c.id === activeChatId) || null}
            onUpdateChat={async (updated) => {
               await saveChat(auth.user!.id, updated);
               setChats(prev => prev.map(c => c.id === updated.id ? updated : c));
            }}
          />
        )}

        {view === 'research' && (
          <ResearchView 
            state={researchState}
            onSearch={handleResearchSearch}
            savedResearch={assets}
            onLoadResearch={handleOpenAsset}
          />
        )}

        {view === 'vision' && (
          <VisionPanel 
            state={visionState}
            onAnalyze={handleVisionAnalyze}
            onUpdateState={handleVisionUpdate}
          />
        )}

        {view === 'lab' && (
          <LabPanel 
            state={labState}
            onProcess={handleLabProcess}
            onClear={handleClearLab}
            onSaveAsset={handleSaveAsset}
          />
        )}

        {view === 'vault' && (
          <Vault 
            user={auth.user!}
            assets={assets} 
            chats={chats} 
            onViewAsset={handleOpenAsset}
            onDeleteAsset={handleDeleteAsset}
            onClearAll={handleClearAllAssets}
          />
        )}

        {view === 'about' && (
          <AboutView />
        )}

        {isInitializingChat && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center animate-fadeIn">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400">Initializing Session...</span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
