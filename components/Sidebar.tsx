
import React from 'react';
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
}

const Sidebar: React.FC<SidebarProps> = ({ view, setView, chats, activeChatId, onSelectChat, onNewChat, onDeleteChat, user, onLogout }) => {
  return (
    <div className="w-72 bg-[#0d0d0d] border-r border-slate-900 flex flex-col h-full z-50">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-10 px-2 cursor-pointer" onClick={() => setView('dashboard')}>
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
            <i className="fas fa-graduation-cap text-lg"></i>
          </div>
          <span className="text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-500 uppercase tracking-tighter">StudyEasierAI</span>
        </div>

        <nav className="space-y-2 mb-10">
          <button 
            onClick={() => setView('dashboard')}
            className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl font-bold transition-all ${view === 'dashboard' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-white hover:bg-slate-800'}`}
          >
            <i className="fas fa-th-large text-sm"></i> Dashboard
          </button>
          <button 
            onClick={() => setView('lab')}
            className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl font-bold transition-all ${view === 'lab' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-white hover:bg-slate-800'}`}
          >
            <i className="fas fa-microscope text-sm"></i> Knowledge Lab
          </button>
          <button 
            onClick={() => setView('vault')}
            className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl font-bold transition-all ${view === 'vault' ? 'bg-amber-600 text-white shadow-lg' : 'text-slate-500 hover:text-white hover:bg-slate-800'}`}
          >
            <i className="fas fa-vault text-sm"></i> Vault
          </button>
        </nav>

        <div className="flex items-center justify-between mb-4 px-2">
           <span className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">Saved Discussions</span>
           <button onClick={onNewChat} className="text-slate-500 hover:text-indigo-400 p-1"><i className="fas fa-plus"></i></button>
        </div>

        <div className="space-y-1 overflow-y-auto custom-scrollbar max-h-64 pr-2">
           {chats.map(chat => (
             <div 
              key={chat.id}
              onClick={() => onSelectChat(chat.id)}
              className={`group relative p-3 rounded-xl cursor-pointer text-sm font-medium transition-all ${activeChatId === chat.id ? 'bg-[#1a1a1a] text-indigo-400 border border-indigo-500/20' : 'text-slate-500 hover:bg-slate-800 hover:text-slate-300'}`}
             >
               <div className="truncate pr-6">{chat.title}</div>
               <button 
                onClick={(e) => { e.stopPropagation(); onDeleteChat(chat.id); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-slate-600 hover:text-rose-500 p-1 transition-all"
               >
                 <i className="fas fa-trash-alt text-[10px]"></i>
               </button>
             </div>
           ))}
        </div>
      </div>

      <div className="mt-auto p-6 bg-[#0a0a0a] border-t border-slate-900">
         <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-300 overflow-hidden">
               <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.name}`} alt="user" />
            </div>
            <div className="min-w-0">
               <div className="text-sm font-bold text-slate-200 truncate">{user.name}</div>
               <button onClick={onLogout} className="text-[10px] text-rose-500 font-black uppercase hover:underline">Sign Out</button>
            </div>
         </div>
         <div className="text-[9px] text-slate-700 font-bold uppercase tracking-widest text-center">StudyEasierAI Enterprise v3.1</div>
      </div>
    </div>
  );
};

export default Sidebar;
