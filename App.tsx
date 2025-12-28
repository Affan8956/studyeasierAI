
import React, { useState, useEffect } from 'react';
import { User, ChatSession, ViewState, LabAsset, AuthState, AIMode } from './types';
import { getCurrentSession, logout } from './services/authService';
import { getHistory, saveChat, deleteChat, createNewChat, getAssets, saveAsset, deleteAsset, clearAllAssets } from './services/historyService';
import { supabase } from './services/supabaseClient';
import AuthForm from './components/AuthForm';
import Sidebar from './components/Sidebar';
import ChatInterface from './components/ChatInterface';
import Dashboard from './components/Dashboard';
import LabPanel from './components/LabPanel';
import Vault from './components/Vault';

const App: React.FC = () => {
  const [auth, setAuth] = useState<AuthState>({ user: null, token: null, isAuthenticated: false });
  const [view, setView] = useState<ViewState>('dashboard');
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [assets, setAssets] = useState<LabAsset[]>([]);
  const [viewingAsset, setViewingAsset] = useState<LabAsset | null>(null);
  const [isInitializingChat, setIsInitializingChat] = useState(false);
  const [isAppLoading, setIsAppLoading] = useState(true);

  useEffect(() => {
    // SECURITY: Limit initialization time. The app should show login or dashboard within 5s.
    const hardTimeout = setTimeout(() => {
      if (isAppLoading) {
        setIsAppLoading(false);
      }
    }, 5000);

    const init = async () => {
      try {
        const session = await getCurrentSession();
        if (session) {
          setAuth({ user: session.user, token: session.token, isAuthenticated: true });
          await loadUserData(session.user.id);
        }
      } catch (e) {
        console.error("Initialization error:", e);
      } finally {
        setIsAppLoading(false);
        clearTimeout(hardTimeout);
      }
    };
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) {
        const fullSession = await getCurrentSession();
        if (fullSession) {
          setAuth({ user: fullSession.user, token: fullSession.token, isAuthenticated: true });
          await loadUserData(fullSession.user.id);
        }
      } else if (event === 'SIGNED_OUT') {
        setAuth({ user: null, token: null, isAuthenticated: false });
        setChats([]);
        setAssets([]);
        setActiveChatId(null);
        setView('dashboard');
      }
    });

    return () => {
      subscription.unsubscribe();
      clearTimeout(hardTimeout);
    };
  }, []);

  const loadUserData = async (userId: string) => {
    if (!userId) return;
    try {
      const [history, savedAssets] = await Promise.all([
        getHistory(userId).catch(() => []),
        getAssets(userId).catch(() => [])
      ]);
      setChats(history);
      setAssets(savedAssets);
    } catch (e: any) {
      console.error("Data load error:", e.message || e);
    }
  };

  const handleLogout = async () => {
    await logout();
    setViewingAsset(null);
  };

  const handleNewChat = async (mode: AIMode = 'study') => {
    if (!auth.user || isInitializingChat) return;
    setIsInitializingChat(true);
    try {
      const chat = await createNewChat(auth.user.id, mode);
      setChats(prev => [chat, ...prev]);
      setActiveChatId(chat.id);
      setView('chat');
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
    if (viewingAsset?.id === id) setViewingAsset(null);
  };

  const handleClearAllAssets = async () => {
    if (!auth.user) return;
    await clearAllAssets(auth.user.id);
    setAssets([]);
    setViewingAsset(null);
  };

  const handleOpenAsset = (asset: LabAsset) => {
    setViewingAsset(asset);
    setView('lab');
  };

  if (isAppLoading) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 text-white">
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
        setView={(v) => { setView(v); if(v !== 'lab') setViewingAsset(null); }} 
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
          />
        )}

        {view === 'chat' && (
          <ChatInterface 
            chat={chats.find(c => c.id === activeChatId) || null}
            onUpdateChat={async (updated) => {
               await saveChat(auth.user!.id, updated);
               setChats(prev => prev.map(c => c.id === updated.id ? updated : c));
            }}
          />
        )}

        {view === 'lab' && (
          <LabPanel onSaveAsset={handleSaveAsset} viewingAsset={viewingAsset} />
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
