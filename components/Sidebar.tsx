
import React, { useState, useEffect, useRef } from 'react';
import { ViewState, ChatSession, User } from '../types';

interface SidebarProps {
  view: ViewState;
  setView: (view: ViewState) => void;
  chats: ChatSession[];
  activeChatId: string | null;
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
  onDeleteChat: (id: string) => void;
  user: User;
  onLogout: () => void;
  onRenameChat?: (id: string, newTitle: string) => void; // Optional prop if we add renaming from sidebar later
}

const Sidebar: React.FC<SidebarProps> = ({ view, setView, chats, activeChatId, onSelectChat, onNewChat, onDeleteChat, user, onLogout }) => {
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

  return (
    <div className="w-80 bg-[#0d0d0d] border-r border-slate-900 flex flex-col h-full z-50 flex-shrink-0">
      <div className="p-6 flex-1 flex flex-col min-h-0">
        <div className="flex items-center gap-3 mb-8 px-2 cursor-pointer group" onClick={() => setView('dashboard')}>
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/20 group-hover:scale-105 transition-transform">
            <i className="fas fa-graduation-cap text-lg"></i>
          </div>
          <span className="text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-500 uppercase tracking-tighter">StudyEasierAI</span>
        </div>

        <nav className="space-y-1 mb-8">
          <button 
            onClick={() => setView('dashboard')}
            className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl font-bold transition-all text-sm ${view === 'dashboard' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-white hover:bg-slate-800'}`}
          >
            <i className="fas fa-th-large w-5 text-center"></i> Dashboard
          </button>
          
          <button 
            onClick={() => setView('tutor')}
            className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl font-bold transition-all text-sm ${view === 'tutor' ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-500 hover:text-white hover:bg-slate-800'}`}
          >
            <i className="fas fa-chalkboard-teacher w-5 text-center"></i> AI Tutor
          </button>

          <button 
            onClick={() => setView('research')}
            className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl font-bold transition-all text-sm ${view === 'research' ? 'bg-cyan-600 text-white shadow-lg' : 'text-slate-500 hover:text-white hover:bg-slate-800'}`}
          >
            <i className="fas fa-globe-americas w-5 text-center"></i> Deep Research
          </button>

          <button 
            onClick={() => setView('lab')}
            className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl font-bold transition-all text-sm ${view === 'lab' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-white hover:bg-slate-800'}`}
          >
            <i className="fas fa-microscope w-5 text-center"></i> Knowledge Lab
          </button>

          <button 
            onClick={() => setView('vault')}
            className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl font-bold transition-all text-sm ${view === 'vault' ? 'bg-amber-600 text-white shadow-lg' : 'text-slate-500 hover:text-white hover:bg-slate-800'}`}
          >
            <i className="fas fa-vault w-5 text-center"></i> Vault
          </button>
        </nav>

        <div className="flex flex-col gap-3 mb-4">
           <div className="flex items-center justify-between px-2">
             <span className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">History</span>
             <button onClick={onNewChat} className="text-slate-500 hover:text-indigo-400 p-1 transition-colors" title="New Chat">
               <i className="fas fa-plus"></i>
             </button>
           </div>
           
           {/* Search & Filter */}
           <div className="px-2">
             <div className="relative mb-3">
               <input 
                 type="text" 
                 placeholder="Search history..." 
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 className="w-full bg-[#151515] border border-slate-800 rounded-lg py-2 pl-8 pr-3 text-xs text-slate-300 outline-none focus:border-indigo-600 transition-colors"
               />
               <i className="fas fa-search absolute left-3 top-2.5 text-slate-600 text-xs"></i>
             </div>
             
             <div className="flex bg-[#151515] p-1 rounded-lg border border-slate-800 mb-2">
                <button 
                  onClick={() => setFilterMode('all')}
                  className={`flex-1 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-md transition-all ${filterMode === 'all' ? 'bg-indigo-600 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  All
                </button>
                <button 
                  onClick={() => setFilterMode('tutor')}
                  className={`flex-1 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-md transition-all ${filterMode === 'tutor' ? 'bg-indigo-600 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  Tutor
                </button>
                <button 
                  onClick={() => setFilterMode('study')}
                  className={`flex-1 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-md transition-all ${filterMode === 'study' ? 'bg-indigo-600 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  Study
                </button>
             </div>
           </div>
        </div>

        <div className="space-y-1 overflow-y-auto custom-scrollbar flex-1 pr-2 pb-4">
           {filteredChats.length === 0 ? (
             <div className="text-center py-8 opacity-50">
                <p className="text-[10px] text-slate-600 uppercase font-bold">No chats found</p>
             </div>
           ) : (
             filteredChats.map(chat => (
               <div 
                key={chat.id}
                onClick={() => onSelectChat(chat.id)}
                className={`group relative p-3 rounded-xl cursor-pointer text-sm font-medium transition-all flex items-center justify-between ${activeChatId === chat.id ? 'bg-[#1a1a1a] text-indigo-400 border border-indigo-500/20 shadow-inner' : 'text-slate-500 hover:bg-slate-800 hover:text-slate-300'}`}
               >
                 <div className="flex items-center gap-3 min-w-0 flex-1">
                   <i className={`fas ${chat.mode === 'tutor' ? 'fa-user-graduate text-[10px]' : 'fa-comment-alt text-[10px]'} opacity-70`}></i>
                   <div className="truncate text-xs font-bold">{chat.title}</div>
                 </div>

                 {/* Options Menu Button (3 dots) */}
                 <button 
                   onClick={(e) => { 
                     e.stopPropagation(); 
                     setMenuOpenId(menuOpenId === chat.id ? null : chat.id); 
                   }}
                   className={`w-6 h-6 flex items-center justify-center rounded-lg hover:bg-slate-700 text-slate-600 hover:text-slate-300 transition-all ${menuOpenId === chat.id ? 'opacity-100 bg-slate-700 text-white' : 'opacity-0 group-hover:opacity-100'}`}
                 >
                   <i className="fas fa-ellipsis-h text-[10px]"></i>
                 </button>

                 {/* Dropdown Menu */}
                 {menuOpenId === chat.id && (
                    <div 
                      ref={menuRef}
                      className="absolute right-0 top-8 w-32 bg-[#1a1a1a] border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden animate-fadeIn"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button 
                        onClick={() => { onDeleteChat(chat.id); setMenuOpenId(null); }}
                        className="w-full text-left px-4 py-3 text-xs font-bold text-rose-500 hover:bg-rose-500/10 flex items-center gap-2"
                      >
                        <i className="fas fa-trash-alt"></i> Delete
                      </button>
                    </div>
                 )}
               </div>
             ))
           )}
        </div>
      </div>

      <div className="p-6 bg-[#0a0a0a] border-t border-slate-900">
         <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-300 overflow-hidden">
               <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.name}`} alt="user" />
            </div>
            <div className="min-w-0">
               <div className="text-sm font-bold text-slate-200 truncate">{user.name}</div>
               <button onClick={onLogout} className="text-[10px] text-rose-500 font-black uppercase hover:underline">Sign Out</button>
            </div>
         </div>
         <div className="text-[9px] text-slate-700 font-bold uppercase tracking-widest text-center">StudyEasierAI v3.3</div>
      </div>
    </div>
  );
};

export default Sidebar;
