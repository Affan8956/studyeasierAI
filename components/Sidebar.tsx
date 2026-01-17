
import React, { useState, useEffect, useRef } from 'react';
import { ViewState, ChatSession, User } from '../types';

interface SidebarProps {
  view: ViewState;
  setView: (view: ViewState) => void;
  chats: ChatSession[];
  activeChatId: string | null;
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
  onNewTutorChat?: () => void;
  onDeleteChat: (id: string) => void;
  user: User;
  onLogout: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  view, setView, chats, activeChatId, onSelectChat, onNewChat, onNewTutorChat, 
  onDeleteChat, user, onLogout, mobileOpen, onMobileClose 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'tutor' | 'study'>('all');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  
  // Close menu when clicking outside
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpenId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredChats = chats
    .filter(chat => {
      const matchesSearch = chat.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesMode = filterMode === 'all' 
        ? true 
        : filterMode === 'tutor' 
          ? chat.mode === 'tutor'
          : chat.mode !== 'tutor';
      return matchesSearch && matchesMode;
    });

  const handleTutorClick = () => {
    const recentTutorChat = chats.find(c => c.mode === 'tutor');

    if (recentTutorChat) {
      onSelectChat(recentTutorChat.id);
      setView('tutor');
    } else if (onNewTutorChat) {
      onNewTutorChat();
    } else {
      setView('tutor');
    }
    
    if (mobileOpen) onMobileClose();
  };

  return (
    <div 
      className={`fixed inset-y-0 left-0 z-50 w-80 bg-sidebar border-r border-border flex flex-col h-full transition-transform duration-300 shadow-2xl lg:shadow-none lg:relative lg:translate-x-0 ${
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      {/* Mobile Close Button */}
      <button 
        onClick={onMobileClose}
        className="lg:hidden absolute top-4 right-4 z-50 w-8 h-8 flex items-center justify-center text-text-muted hover:text-text-main bg-surface rounded-full shadow-md"
      >
        <i className="fas fa-times"></i>
      </button>

      {/* --- TOP SECTION: Logo & Main Navigation --- */}
      <div className="flex-shrink-0 p-6 pb-2">
        <div className="flex items-center gap-3 mb-6 px-2 cursor-pointer group" onClick={() => { setView('dashboard'); onMobileClose(); }}>
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/20 group-hover:scale-105 transition-transform">
            <i className="fas fa-graduation-cap text-lg"></i>
          </div>
          <span className="text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-text-main to-text-muted uppercase tracking-tighter">StudyEasierAI</span>
        </div>

        <nav className="space-y-1">
          <button 
            onClick={() => setView('dashboard')}
            className={`w-full flex items-center gap-4 px-4 py-2.5 rounded-xl font-bold transition-all text-sm ${view === 'dashboard' ? 'bg-indigo-600 text-white shadow-lg' : 'text-text-muted hover:text-text-main hover:bg-surface'}`}
          >
            <i className="fas fa-th-large w-5 text-center"></i> Dashboard
          </button>
          
          <div className="flex gap-1">
             <button 
               onClick={handleTutorClick}
               className={`flex-1 flex items-center gap-4 px-4 py-2.5 rounded-xl font-bold transition-all text-sm ${view === 'tutor' ? 'bg-indigo-500 text-white shadow-lg' : 'text-text-muted hover:text-text-main hover:bg-surface'}`}
             >
               <i className="fas fa-chalkboard-teacher w-5 text-center"></i> AI Tutor
             </button>
             {onNewTutorChat && (
               <button 
                 onClick={onNewTutorChat}
                 className="w-10 flex items-center justify-center rounded-xl font-bold transition-all text-sm bg-surface text-indigo-400 hover:bg-indigo-500 hover:text-white border border-border"
                 title="New Tutor Session"
               >
                 <i className="fas fa-plus"></i>
               </button>
             )}
          </div>

          {/* Vertical List for Tools (Reverted from Grid) */}
          <div className="space-y-1 pt-1">
             <button 
               onClick={() => setView('lab')}
               className={`w-full flex items-center gap-4 px-4 py-2.5 rounded-xl font-bold transition-all text-sm ${view === 'lab' ? 'bg-emerald-600 text-white shadow-lg' : 'text-text-muted hover:text-text-main hover:bg-surface'}`}
             >
               <i className="fas fa-microscope w-5 text-center"></i> Knowledge Lab
             </button>

             <button 
               onClick={() => setView('research')}
               className={`w-full flex items-center gap-4 px-4 py-2.5 rounded-xl font-bold transition-all text-sm ${view === 'research' ? 'bg-cyan-600 text-white shadow-lg' : 'text-text-muted hover:text-text-main hover:bg-surface'}`}
             >
               <i className="fas fa-globe-americas w-5 text-center"></i> Deep Research
             </button>
             
             <button 
               onClick={() => setView('vision')}
               className={`w-full flex items-center gap-4 px-4 py-2.5 rounded-xl font-bold transition-all text-sm ${view === 'vision' ? 'bg-purple-600 text-white shadow-lg' : 'text-text-muted hover:text-text-main hover:bg-surface'}`}
             >
               <i className="fas fa-eye w-5 text-center"></i> Image Analysis
             </button>

             <button 
               onClick={() => setView('live')}
               className={`w-full flex items-center gap-4 px-4 py-2.5 rounded-xl font-bold transition-all text-sm ${view === 'live' ? 'bg-rose-600 text-white shadow-lg' : 'text-text-muted hover:text-text-main hover:bg-surface'}`}
             >
               <i className="fas fa-microphone-alt w-5 text-center"></i> Live Study
             </button>

             <button 
               onClick={() => setView('vault')}
               className={`w-full flex items-center gap-4 px-4 py-2.5 rounded-xl font-bold transition-all text-sm ${view === 'vault' ? 'bg-amber-600 text-white shadow-lg' : 'text-text-muted hover:text-text-main hover:bg-surface'}`}
             >
               <i className="fas fa-vault w-5 text-center"></i> Vault
             </button>
          </div>
        </nav>
      </div>

      {/* --- MIDDLE SECTION: History (Takes all remaining space) --- */}
      <div className="flex-1 flex flex-col min-h-0 border-t border-border mt-2 pt-2">
         {/* History Header & Search */}
         <div className="flex-shrink-0 px-6 pb-2">
            <div className="flex items-center justify-between mb-2">
               <span className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">History</span>
               <button onClick={onNewChat} className="text-text-muted hover:text-indigo-400 p-1 transition-colors" title="New Chat">
                 <i className="fas fa-plus"></i>
               </button>
            </div>
            
            <div className="relative mb-2">
               <input 
                 type="text" 
                 placeholder="Search chats..." 
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 className="w-full bg-surface border border-border rounded-lg py-1.5 pl-7 pr-3 text-xs text-text-main outline-none focus:border-indigo-600 transition-colors"
               />
               <i className="fas fa-search absolute left-2.5 top-2 text-text-muted text-[10px]"></i>
            </div>
            
            <div className="flex bg-surface p-0.5 rounded-lg border border-border">
                <button 
                  onClick={() => setFilterMode('all')}
                  className={`flex-1 py-1 text-[9px] font-black uppercase tracking-wider rounded-md transition-all ${filterMode === 'all' ? 'bg-indigo-600 text-white shadow' : 'text-text-muted hover:text-text-main'}`}
                >
                  All
                </button>
                <button 
                  onClick={() => setFilterMode('tutor')}
                  className={`flex-1 py-1 text-[9px] font-black uppercase tracking-wider rounded-md transition-all ${filterMode === 'tutor' ? 'bg-indigo-600 text-white shadow' : 'text-text-muted hover:text-text-main'}`}
                >
                  Tutor
                </button>
                <button 
                  onClick={() => setFilterMode('study')}
                  className={`flex-1 py-1 text-[9px] font-black uppercase tracking-wider rounded-md transition-all ${filterMode === 'study' ? 'bg-indigo-600 text-white shadow' : 'text-text-muted hover:text-text-main'}`}
                >
                  Study
                </button>
             </div>
         </div>

         {/* Scrollable List */}
         <div className="flex-1 overflow-y-auto custom-scrollbar px-6 pb-2">
             {filteredChats.length === 0 ? (
               <div className="text-center py-8 opacity-50">
                  <p className="text-[10px] text-text-muted uppercase font-bold">No chats found</p>
               </div>
             ) : (
               <div className="space-y-1">
                  {filteredChats.map(chat => (
                    <div 
                     key={chat.id}
                     onClick={() => onSelectChat(chat.id)}
                     className={`group relative p-2.5 rounded-xl cursor-pointer text-sm font-medium transition-all flex items-center justify-between ${activeChatId === chat.id ? 'bg-surface text-indigo-400 border border-indigo-500/20 shadow-inner' : 'text-text-muted hover:bg-surface hover:text-text-main'}`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <i className={`fas ${chat.mode === 'tutor' ? 'fa-user-graduate text-[10px]' : chat.mode === 'live' ? 'fa-microphone text-[10px]' : 'fa-comment-alt text-[10px]'} opacity-70`}></i>
                        <div className="truncate text-xs font-bold">{chat.title}</div>
                      </div>

                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          setMenuOpenId(menuOpenId === chat.id ? null : chat.id); 
                        }}
                        className={`w-6 h-6 flex items-center justify-center rounded-lg hover:bg-slate-700 text-slate-600 hover:text-slate-300 transition-all ${menuOpenId === chat.id ? 'opacity-100 bg-slate-700 text-white' : 'opacity-0 group-hover:opacity-100'}`}
                      >
                        <i className="fas fa-ellipsis-h text-[10px]"></i>
                      </button>

                      {menuOpenId === chat.id && (
                         <div 
                           ref={menuRef}
                           className="absolute right-0 top-8 w-28 bg-surface border border-border rounded-xl shadow-2xl z-50 overflow-hidden animate-fadeIn"
                           onClick={(e) => e.stopPropagation()}
                         >
                           <button 
                             onClick={() => { onDeleteChat(chat.id); setMenuOpenId(null); }}
                             className="w-full text-left px-3 py-2 text-[10px] font-bold text-rose-500 hover:bg-rose-500/10 flex items-center gap-2"
                           >
                             <i className="fas fa-trash-alt"></i> Delete
                           </button>
                         </div>
                      )}
                    </div>
                  ))}
               </div>
             )}
         </div>
      </div>

      {/* --- BOTTOM SECTION: Secondary Tools & User Profile --- */}
      <div className="flex-shrink-0 bg-app border-t border-border">
         {/* Productivity Links */}
         <div className="px-6 pt-4 space-y-1">
            <button 
              onClick={() => setView('analytics')}
              className={`w-full flex items-center gap-4 px-4 py-2 rounded-xl font-bold transition-all text-xs ${view === 'analytics' ? 'bg-blue-600 text-white shadow-lg' : 'text-text-muted hover:text-text-main hover:bg-surface'}`}
            >
              <i className="fas fa-chart-pie w-4 text-center"></i> Analytics
            </button>

            <button 
              onClick={() => setView('focus_studio')}
              className={`w-full flex items-center gap-4 px-4 py-2 rounded-xl font-bold transition-all text-xs ${view === 'focus_studio' ? 'bg-rose-600 text-white shadow-lg' : 'text-text-muted hover:text-text-main hover:bg-surface'}`}
            >
              <i className="fas fa-clock w-4 text-center"></i> Focus Studio
            </button>

            <button 
              onClick={() => setView('about')}
              className={`w-full flex items-center gap-4 px-4 py-2 rounded-xl font-bold transition-all text-xs ${view === 'about' ? 'bg-pink-600 text-white shadow-lg' : 'text-text-muted hover:text-text-main hover:bg-surface'}`}
            >
              <i className="fas fa-info-circle w-4 text-center"></i> About & Usage
            </button>
         </div>

         {/* User Profile */}
         <div className="p-6 pt-4 mt-2 border-t border-border/50">
           <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-surface border border-border flex items-center justify-center font-bold text-text-muted overflow-hidden">
                 <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.name}`} alt="user" />
              </div>
              <div className="min-w-0">
                 <div className="text-xs font-bold text-text-main truncate">{user.name}</p>
                 <button onClick={onLogout} className="text-[9px] text-rose-500 font-black uppercase hover:underline">Sign Out</button>
              </div>
           </div>
         </div>
      </div>
    </div>
  );
};

export default Sidebar;
