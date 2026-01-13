
import React, { useState, useEffect } from 'react';
import { User, ChatSession, ViewState, LabAsset, AuthState, AIMode, LabState, ResearchState } from './types';
import { getCurrentSession, logout } from './services/authService';
import { getHistory, saveChat, deleteChat, createNewChat, getAssets, saveAsset, deleteAsset, clearAllAssets } from './services/historyService';
import { processUnifiedLabContent, performDeepResearch } from './services/geminiService';
import { supabase } from './services/supabaseClient';
import AuthForm from './components/AuthForm';
import Sidebar from './components/Sidebar';
import ChatInterface from './components/ChatInterface';
import Dashboard from './components/Dashboard';
import LabPanel from './components/LabPanel';
import Vault from './components/Vault';
import ResearchView from './components/ResearchView';
import VisionPanel from './components/VisionPanel';

const App: React.FC = () => {
  const [auth, setAuth] = useState<AuthState>({ user: null, token: null, isAuthenticated: false });
  const [view, setView] = useState<ViewState>('dashboard');
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [assets, setAssets] = useState<LabAsset[]>([]);
  const [isInitializingChat, setIsInitializingChat] = useState(false);
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [viewingAsset, setViewingAsset] = useState<LabAsset | null>(null);

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
      }
    });

    return () => {
      subscription.unsubscribe();
      clearTimeout(hardStop);
    };
  }, []);

  // Logic to handle "AI Tutor" button from sidebar
  useEffect(() => {
    const handleTutorView = async () => {
      if (view === 'tutor' && auth.user && !isInitializingChat) {
        // Find latest active tutor chat
        const tutorChat = chats.find(c => c.mode === 'tutor');
        if (tutorChat) {
          setActiveChatId(tutorChat.id);
        } else {
          // Create new one if none exists
          await handleNewChat('tutor');
        }
      }
    };
    handleTutorView();
  }, [view]); // Run when view changes

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
      // For tutor mode, we stay in 'tutor' view state but use ChatInterface
      if (mode !== 'tutor') {
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
    
    // Clear viewing state if deleted
    if (labState.currentPackage && labState.currentPackage.id === id) { // This check is approximate since package doesn't hold ID usually
       // logic to clear lab state if needed, but currentPackage is usually ephemeral or hydrated.
    }
  };

  const handleClearAllAssets = async () => {
    if (!auth.user) return;
    await clearAllAssets(auth.user.id);
    setAssets([]);
    setLabState(prev => ({ ...prev, currentPackage: null, activeTab: 'summary' }));
    setResearchState(prev => ({ ...prev, result: null }));
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
      setView('vision');
    } else {
      // Reconstruct package structure for LabPanel
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
        activeTab: asset.type // Explicitly set the tab to match asset type
      });
      setView('lab');
    }
  };

  // --- Background Process Handlers ---

  const handleLabProcess = async (sourcePayload: { file?: { base64: string; mimeType: string }; url?: string }, sourceName: string) => {
    // Reset activeTab to summary for new generations
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

      // Auto-save generated assets
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
      
      // Auto-save research
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

  const handleClearLab = () => {
    setLabState({ isLoading: false, currentPackage: null, error: null, lastSourceInfo: null, activeTab: 'summary' });
  };

  const handleSidebarViewChange = (targetView: ViewState) => {
    // RESET LOGIC: If user clicks "Knowledge Lab" in sidebar, reset to upload screen 
    // unless it's currently processing (loading).
    if (targetView === 'lab' && !labState.isLoading) {
      handleClearLab();
    }
    
    // Clear viewing asset if switching views generally, except if going to the specific view for that asset
    if (targetView !== 'vision' && targetView !== 'research' && targetView !== 'lab') {
       setViewingAsset(null);
    }
    
    setView(targetView);
    
    // Clear active chat if moving away from chat views
    if(targetView !== 'chat' && targetView !== 'tutor') {
      setActiveChatId(null);
    }
  };

  if (isAppLoading) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 text-white animate-fadeIn">
        <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-6"></div>
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-400">Initializing Core AI...</p>
        <p className="text-slate-600 text-[9px] mt-4 uppercase font-bold tracking-widest">Verifying Academic Handshake</p>
      </div>
    );
  }

  if (!auth.isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6">
        <AuthForm onAuthComplete={(user, token) => setAuth({user, token, isAuthenticated: true})} />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#0a0a0a] text-slate-100 overflow-hidden">
      <Sidebar 
        view={view} 
        setView={handleSidebarViewChange} 
        chats={chats}
        activeChatId={activeChatId}
        onSelectChat={(id) => { setActiveChatId(id); setView('chat'); }}
        onNewChat={() => handleNewChat()}
        onDeleteChat={handleDeleteChat}
        user={auth.user!}
        onLogout={handleLogout}
      />

      <main className="flex-1 relative flex flex-col overflow-hidden">
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
            onSaveAsset={handleSaveAsset} 
            savedAssets={assets}
            viewingAsset={viewingAsset?.type === 'image_analysis' ? viewingAsset : null}
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
            assets={assets} 
            chats={chats} 
            onViewAsset={handleOpenAsset}
            onDeleteAsset={handleDeleteAsset}
            onClearAll={handleClearAllAssets}
          />
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
