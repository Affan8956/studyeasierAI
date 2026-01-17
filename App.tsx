
import React, { useState, useEffect } from 'react';
import { User, ChatSession, ViewState, LabAsset, AuthState, AIMode, LabState, ResearchState, VisionState, AppTheme, CustomThemeColors, Message } from './types';
import { getCurrentSession, logout } from './services/authService';
import { getHistory, saveChat, deleteChat, createNewChat, getAssets, saveAsset, deleteAsset, clearAllAssets } from './services/historyService';
import { processUnifiedLabContent, performDeepResearch, analyzeImage, generateStudyImage } from './services/geminiService';
import { supabase, isSupabaseConfigured } from './services/supabaseClient';
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
import AnalyticsView from './components/AnalyticsView';
import FocusStudio from './components/FocusStudio';
import LiveInterface from './components/LiveInterface';

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
  
  // Custom Theme State
  const [customColors, setCustomColors] = useState<CustomThemeColors>({
    bgApp: '#0f172a',
    bgSurface: '#1e293b',
    borderBase: '#334155',
    textMain: '#f8fafc'
  });
  
  // Specific state for password reset flow
  const [isPasswordResetMode, setIsPasswordResetMode] = useState(false);

  // Mobile Sidebar State
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
    mode: 'analyze',
    image: null,
    generatedImage: null,
    mimeType: '',
    prompt: '',
    result: null,
    error: null
  });

  // Helper to safely extract error message
  const getErrorMessage = (err: any): string => {
    if (typeof err === 'string') return err;
    if (err instanceof Error) return err.message;
    if (typeof err === 'object' && err !== null && 'message' in err) return String(err.message);
    return "An unknown error occurred";
  };

  // --- GLOBAL USAGE TRACKER (Whole App Usage) ---
  useEffect(() => {
    // Only track if authenticated
    if (!auth.isAuthenticated) return;

    const interval = setInterval(() => {
       // Only count if window is focused (optional, but 'whole app usage' usually implies active usage)
       if (document.visibilityState === 'visible') {
         const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
         const key = `app_usage_seconds_${today}`;
         
         // Get current count
         const current = parseInt(localStorage.getItem(key) || '0');
         localStorage.setItem(key, (current + 1).toString());

         // Also update 'last_active_date' for streak calculation in Analytics
         localStorage.setItem('last_active_date', today);
       }
    }, 1000);

    return () => clearInterval(interval);
  }, [auth.isAuthenticated]);

  useEffect(() => {
    // 0. IMMEDIATE HASH CHECK: Detect recovery mode before anything else
    // This catches the case where the user clicks the email link
    if (window.location.hash && window.location.hash.includes('type=recovery')) {
      console.log("Recovery mode detected via URL hash");
      setIsPasswordResetMode(true);
      // Don't turn off loading yet, let Supabase process the session
    }

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
    
    // Check for saved custom colors
    const savedCustomColors = localStorage.getItem('app_custom_colors');
    if (savedCustomColors) {
      try {
        setCustomColors(JSON.parse(savedCustomColors));
      } catch (e) {}
    }

    if (savedTheme) handleThemeChange(savedTheme);

    // Only set up subscription if Supabase is actually configured
    if (isSupabaseConfigured) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        console.log("Auth Event:", event);
        
        // Explicitly handle Password Recovery Event
        if (event === 'PASSWORD_RECOVERY') {
          setIsPasswordResetMode(true);
          setIsAppLoading(false); // Ensure loader is dismissed so they see the form
        }

        if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) {
          // If we are in recovery mode, we might be signed in via the token, 
          // but we still want to show the reset form, not the dashboard.
          // The hash check above helps ensures isPasswordResetMode is true.
          
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
          handleLocalSignOutCleanup();
        }
      });

      return () => {
        subscription.unsubscribe();
        clearTimeout(hardStop);
      };
    } else {
      return () => clearTimeout(hardStop);
    }
  }, []);

  const handleLocalSignOutCleanup = () => {
    setAuth({ user: null, token: null, isAuthenticated: false });
    setChats([]);
    setAssets([]);
    setActiveChatId(null);
    setView('dashboard');
    setIsPasswordResetMode(false);
    setLabState({ isLoading: false, currentPackage: null, error: null, lastSourceInfo: null, activeTab: 'summary' });
    setResearchState({ isLoading: false, result: null, error: null, query: '' });
    setVisionState({ isLoading: false, mode: 'analyze', image: null, generatedImage: null, mimeType: '', prompt: '', result: null, error: null });
  };

  const applyCustomColorsToDOM = (colors: CustomThemeColors) => {
    const root = document.documentElement;
    root.style.setProperty('--bg-app', colors.bgApp);
    root.style.setProperty('--bg-sidebar', colors.bgApp); // Simplified: sidebar same as app bg
    root.style.setProperty('--bg-surface', colors.bgSurface);
    root.style.setProperty('--bg-surface-2', colors.bgSurface); // Use same for now or could derive
    root.style.setProperty('--border-base', colors.borderBase);
    root.style.setProperty('--text-main', colors.textMain);
    root.style.setProperty('--text-muted', colors.textMain + '80'); // 50% opacity hex
  };

  const handleCustomColorChange = (newColors: Partial<CustomThemeColors>) => {
    const updated = { ...customColors, ...newColors };
    setCustomColors(updated);
    localStorage.setItem('app_custom_colors', JSON.stringify(updated));
    
    if (theme === 'custom') {
      applyCustomColorsToDOM(updated);
    }
  };

  const handleThemeChange = (newTheme: AppTheme) => {
    setTheme(newTheme);
    localStorage.setItem('app_theme', newTheme);
    
    const root = document.documentElement;

    // Remove all theme classes first (including old midnight just in case)
    root.classList.remove('theme-light', 'theme-eyecare', 'theme-forest', 'theme-midnight', 'theme-custom');
    
    // Clear inline styles if we are switching AWAY from custom
    if (newTheme !== 'custom') {
      root.removeAttribute('style');
    }

    // Add new theme class if not default
    if (newTheme !== 'default') {
      root.classList.add(`theme-${newTheme}`);
    }

    // If Custom, inject the variables
    if (newTheme === 'custom') {
      applyCustomColorsToDOM(customColors);
    }
  };

  const handleLogout = async () => {
    // Attempt backend logout but force local cleanup immediately to avoid UI hanging
    try {
      await logout();
    } catch (e) {
      console.warn("Backend logout failed, forcing local logout");
    } finally {
      handleLocalSignOutCleanup();
    }
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
      setIsMobileMenuOpen(false);
    } catch (e: any) {
      console.error("Failed to create new chat:", e);
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
    setVisionState(prev => ({ ...prev, result: null, image: null, generatedImage: null }));
  };

  const handleOpenAsset = (asset: LabAsset) => {
    // Parse content if it's a string (Double safety for JSON content stored as string)
    let safeContent = asset.content;
    if (typeof safeContent === 'string') {
        try {
            const parsed = JSON.parse(safeContent);
            // Only use parsed version if it's an array (for tools) or object
            if (parsed && (Array.isArray(parsed) || typeof parsed === 'object')) {
                safeContent = parsed;
            }
        } catch (e) {
            // Content is likely just a string (summary)
        }
    }
    
    // Create safe asset copy with guaranteed parsed content
    const safeAsset = { ...asset, content: safeContent };
    setViewingAsset(safeAsset);
    
    if (asset.type === 'research') {
      setResearchState({
        isLoading: false,
        error: null,
        query: asset.title,
        result: { 
          text: safeAsset.content, 
          groundingChunks: [] // Legacy or simplified assets might not have chunks
        }
      });
      setView('research');
    } else if (asset.type === 'image_analysis') {
      const isBase64Image = typeof safeAsset.content === 'string' && safeAsset.content.startsWith('data:image');
      
      setVisionState({
        isLoading: false,
        mode: isBase64Image ? 'generate' : 'analyze',
        image: isBase64Image ? null : null, // Original upload not stored in asset
        generatedImage: isBase64Image ? safeAsset.content : null,
        mimeType: '',
        prompt: asset.title,
        result: isBase64Image ? null : safeAsset.content,
        error: null
      });
      setView('vision');
    } else {
      const mockPackage: any = { title: asset.title };
      if (asset.type === 'summary') mockPackage.summary = { content: safeAsset.content };
      if (asset.type === 'quiz') mockPackage.quiz = safeAsset.content;
      if (asset.type === 'slides') mockPackage.slides = safeAsset.content;
      if (asset.type === 'flashcards') mockPackage.flashcards = safeAsset.content;
      
      setLabState({
        isLoading: false,
        error: null,
        lastSourceInfo: asset.sourceName,
        currentPackage: mockPackage,
        activeTab: asset.type
      });
      setView('lab');
    }
    setIsMobileMenuOpen(false);
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
      setLabState(prev => ({ ...prev, isLoading: false, error: getErrorMessage(err) }));
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
      setResearchState(prev => ({ ...prev, isLoading: false, error: getErrorMessage(err) }));
    }
  };

  const handleVisionAnalyze = async (image: string, mimeType: string, prompt: string) => {
    setVisionState({ isLoading: true, mode: 'analyze', image, mimeType, prompt, result: null, error: null, generatedImage: null });

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
      setVisionState(prev => ({ ...prev, isLoading: false, error: getErrorMessage(err) }));
    }
  };

  const handleVisionGenerate = async (prompt: string) => {
    setVisionState({ isLoading: true, mode: 'generate', image: null, mimeType: '', prompt, result: null, error: null, generatedImage: null });
    
    try {
      const base64Image = await generateStudyImage(prompt);
      setVisionState(prev => ({ ...prev, isLoading: false, generatedImage: base64Image }));

      // Note: Auto-saving is handled by user action in VisionPanel, but we pass the saver function
    } catch (err: any) {
      setVisionState(prev => ({ ...prev, isLoading: false, error: getErrorMessage(err) }));
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
    if(targetView !== 'chat' && targetView !== 'tutor' && targetView !== 'live') {
      setActiveChatId(null);
    }
    setIsMobileMenuOpen(false);
  };

  const handleSaveLiveSession = async (messages: Message[]) => {
    if (!auth.user) return;
    const chat = await createNewChat(auth.user.id, 'live');
    const updatedChat = { ...chat, messages, title: `Live Session: ${new Date().toLocaleTimeString()}` };
    await saveChat(auth.user.id, updatedChat);
    setChats(prev => [updatedChat, ...prev]);
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

  // Intercept normal auth flow if in Password Reset Mode (triggered by email link)
  if (isPasswordResetMode) {
     return (
       <div className="min-h-screen bg-app flex items-center justify-center p-6">
        <AuthForm 
          initialMode="reset_password"
          onAuthComplete={() => {
             // Reset mode complete, clear state and potentially just let the auth state listener take over
             setIsPasswordResetMode(false);
          }} 
        />
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
      {/* Mobile Menu Button */}
      <button 
        onClick={() => setIsMobileMenuOpen(true)}
        className="lg:hidden absolute top-4 left-4 z-50 w-10 h-10 bg-surface border border-border rounded-xl flex items-center justify-center text-text-muted hover:text-text-main hover:bg-surface-2 transition-all shadow-lg"
      >
        <i className="fas fa-bars"></i>
      </button>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden animate-fadeIn"
          onClick={() => setIsMobileMenuOpen(false)}
        ></div>
      )}

      <Sidebar 
        view={view} 
        setView={handleSidebarViewChange} 
        chats={chats}
        activeChatId={activeChatId}
        onSelectChat={(id) => { setActiveChatId(id); setView('chat'); setIsMobileMenuOpen(false); }}
        onNewChat={() => handleNewChat('study')}
        onNewTutorChat={() => handleNewChat('tutor')}
        onDeleteChat={handleDeleteChat}
        user={auth.user!}
        onLogout={handleLogout}
        mobileOpen={isMobileMenuOpen}
        onMobileClose={() => setIsMobileMenuOpen(false)}
      />

      <main className="flex-1 relative flex flex-col overflow-hidden w-full">
        {/* THEME SELECTOR - Top Right Corner */}
        {view !== 'live' && (
          <ThemeSelector 
            currentTheme={theme} 
            onThemeChange={handleThemeChange} 
            customColors={customColors}
            onCustomColorChange={handleCustomColorChange}
          />
        )}

        {view === 'dashboard' && (
          <Dashboard 
            user={auth.user!} 
            chats={chats} 
            assets={assets}
            onAction={(target) => { setView(target); }}
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

        {view === 'live' && (
          <LiveInterface 
            user={auth.user!}
            onSaveSession={handleSaveLiveSession}
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
            onGenerate={handleVisionGenerate}
            onUpdateState={handleVisionUpdate}
            onSaveAsset={handleSaveAsset}
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

        {view === 'analytics' && (
          <AnalyticsView userId={auth.user!.id} />
        )}

        {view === 'focus_studio' && (
          <FocusStudio userId={auth.user!.id} />
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
