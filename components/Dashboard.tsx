
import React from 'react';
import { User, ChatSession, LabAsset, ViewState } from '../types';

interface DashboardProps {
  user: User;
  chats: ChatSession[];
  assets: LabAsset[];
  onAction: (target: ViewState) => void;
  onNewChat: () => void;
  onOpenChat: (id: string) => void;
  onOpenAsset: (asset: LabAsset) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, chats, assets, onAction, onNewChat, onOpenChat, onOpenAsset }) => {
  const displayName = user?.name || 'Student';
  const firstName = displayName.split(' ')[0] || 'Student';

  const getAssetStyle = (type: string) => {
    switch(type) {
      case 'summary': return { icon: 'fa-file-text', style: 'bg-emerald-600/10 text-emerald-400' };
      case 'quiz': return { icon: 'fa-tasks', style: 'bg-amber-600/10 text-amber-400' };
      case 'flashcards': return { icon: 'fa-layer-group', style: 'bg-violet-600/10 text-violet-400' };
      case 'slides': return { icon: 'fa-chalkboard', style: 'bg-blue-600/10 text-blue-400' };
      default: return { icon: 'fa-file', style: 'bg-slate-600/10 text-slate-400' };
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar pb-24 md:pb-8">
      <div className="max-w-6xl mx-auto pt-10 md:pt-0">
        <header className="mb-10 md:mb-12">
          <div className="flex items-center gap-4 mb-4">
             <div className="h-[2px] w-8 md:w-12 bg-indigo-500"></div>
             <span className="text-[9px] md:text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] md:tracking-[0.4em]">Academic Workspace</span>
          </div>
          <h1 className="text-3xl md:text-6xl font-black mb-4 tracking-tight leading-none text-text-main">
            Welcome, <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-violet-400 block md:inline mt-2 md:mt-0">{firstName}</span>
          </h1>
          <p className="text-text-muted text-sm md:text-lg font-medium max-w-xl">Your intelligence modules are active and synchronized.</p>
        </header>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 mb-12 md:mb-20">
          <div 
            onClick={(e) => { e.preventDefault(); onNewChat(); }}
            className="group p-6 md:p-10 bg-sidebar border border-border rounded-[2rem] md:rounded-[2.5rem] hover:border-indigo-500/50 hover:bg-indigo-600/5 transition-all cursor-pointer shadow-xl md:shadow-2xl relative overflow-hidden"
          >
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-indigo-600/5 rounded-full blur-3xl group-hover:bg-indigo-600/20 transition-all"></div>
            <div className="w-14 h-14 md:w-16 md:h-16 bg-indigo-600/10 rounded-2xl flex items-center justify-center text-indigo-400 mb-6 md:mb-8 group-hover:scale-110 transition-transform shadow-lg border border-indigo-500/10">
              <i className="fas fa-plus text-xl md:text-2xl"></i>
            </div>
            <h3 className="text-xl md:text-2xl font-black mb-3 text-text-main">Smart Chat</h3>
            <p className="text-text-muted text-xs md:text-sm leading-relaxed font-medium">Initiate a deep reasoning session with Gemini 3 Pro intelligence.</p>
            <div className="mt-6 md:mt-8 flex items-center gap-2 text-indigo-400 text-[9px] md:text-[10px] font-black uppercase tracking-widest opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all">
               Launch Terminal <i className="fas fa-arrow-right"></i>
            </div>
          </div>

          <div 
            onClick={() => onAction('lab')}
            className="group p-6 md:p-10 bg-sidebar border border-border rounded-[2rem] md:rounded-[2.5rem] hover:border-emerald-500/50 hover:bg-emerald-600/5 transition-all cursor-pointer shadow-xl md:shadow-2xl relative overflow-hidden"
          >
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-600/5 rounded-full blur-3xl group-hover:bg-emerald-600/20 transition-all"></div>
            <div className="w-14 h-14 md:w-16 md:h-16 bg-emerald-600/10 rounded-2xl flex items-center justify-center text-emerald-400 mb-6 md:mb-8 group-hover:scale-110 transition-transform shadow-lg border border-emerald-500/10">
              <i className="fas fa-microscope text-xl md:text-2xl"></i>
            </div>
            <h3 className="text-xl md:text-2xl font-black mb-3 text-text-main">Knowledge Lab</h3>
            <p className="text-text-muted text-xs md:text-sm leading-relaxed font-medium">Extract structured mastery from lecture recordings and PDFs.</p>
            <div className="mt-6 md:mt-8 flex items-center gap-2 text-emerald-400 text-[9px] md:text-[10px] font-black uppercase tracking-widest opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all">
               Analyze Content <i className="fas fa-arrow-right"></i>
            </div>
          </div>

          <div 
            onClick={() => onAction('vault')}
            className="group p-6 md:p-10 bg-sidebar border border-border rounded-[2rem] md:rounded-[2.5rem] hover:border-amber-500/50 hover:bg-amber-600/5 transition-all cursor-pointer shadow-xl md:shadow-2xl relative overflow-hidden"
          >
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-amber-600/5 rounded-full blur-3xl group-hover:bg-amber-600/20 transition-all"></div>
            <div className="w-14 h-14 md:w-16 md:h-16 bg-amber-600/10 rounded-2xl flex items-center justify-center text-amber-400 mb-6 md:mb-8 group-hover:scale-110 transition-transform shadow-lg border border-amber-500/10">
              <i className="fas fa-vault text-xl md:text-2xl"></i>
            </div>
            <h3 className="text-xl md:text-2xl font-black mb-3 text-text-main">Private Vault</h3>
            <p className="text-text-muted text-xs md:text-sm leading-relaxed font-medium">Access your global knowledge base and persistent assets.</p>
            <div className="mt-6 md:mt-8 flex items-center gap-2 text-amber-400 text-[9px] md:text-[10px] font-black uppercase tracking-widest opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all">
               Review History <i className="fas fa-arrow-right"></i>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12">
           <section>
              <div className="flex items-center justify-between mb-8 px-2">
                 <h4 className="text-[10px] md:text-[11px] font-black text-text-muted uppercase tracking-[0.2em] md:tracking-[0.3em]">Recent Discussions</h4>
                 <div className="h-[1px] flex-1 mx-4 md:mx-6 bg-border"></div>
              </div>
              <div className="space-y-4">
                 {chats.length > 0 ? chats.slice(0, 4).map(chat => (
                   <div 
                     key={chat.id} 
                     onClick={() => onOpenChat(chat.id)}
                     className="p-4 md:p-5 bg-sidebar border border-border rounded-2xl flex items-center justify-between hover:border-indigo-500/30 transition-all group cursor-pointer hover:bg-surface"
                   >
                      <div className="flex items-center gap-4 md:gap-5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-indigo-600/10 flex items-center justify-center text-indigo-400 shrink-0">
                           <i className="fas fa-comment-alt text-xs"></i>
                        </div>
                        <span className="font-bold text-xs md:text-sm truncate text-text-main">{chat.title}</span>
                      </div>
                      <span className="text-[8px] md:text-[9px] text-text-muted uppercase font-black tracking-widest ml-4 shrink-0">{new Date(chat.updatedAt).toLocaleDateString()}</span>
                   </div>
                 )) : (
                   <div className="py-12 text-center border-2 border-dashed border-border rounded-[2rem]">
                      <p className="text-text-muted text-xs font-black uppercase tracking-widest">No Recent Activity</p>
                   </div>
                 )}
              </div>
           </section>

           <section>
              <div className="flex items-center justify-between mb-8 px-2">
                 <h4 className="text-[10px] md:text-[11px] font-black text-text-muted uppercase tracking-[0.2em] md:tracking-[0.3em]">Intelligence Assets</h4>
                 <div className="h-[1px] flex-1 mx-4 md:mx-6 bg-border"></div>
              </div>
              <div className="space-y-4">
                 {assets.length > 0 ? assets.slice(0, 4).map(asset => {
                   const { icon, style } = getAssetStyle(asset.type);
                   return (
                     <div 
                       key={asset.id} 
                       onClick={() => onOpenAsset(asset)}
                       className="p-4 md:p-5 bg-sidebar border border-border rounded-2xl flex items-center justify-between hover:border-emerald-500/30 transition-all cursor-pointer hover:bg-surface"
                     >
                        <div className="flex items-center gap-4 md:gap-5 min-w-0">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${style}`}>
                             <i className={`fas text-xs ${icon}`}></i>
                          </div>
                          <span className="font-bold text-xs md:text-sm truncate text-text-main">{asset.title}</span>
                        </div>
                        <span className="text-[8px] md:text-[9px] text-text-muted uppercase font-black tracking-widest ml-4 shrink-0">{asset.type}</span>
                     </div>
                   );
                 }) : (
                   <div className="py-12 text-center border-2 border-dashed border-border rounded-[2rem]">
                      <p className="text-text-muted text-xs font-black uppercase tracking-widest">No Assets Generated</p>
                   </div>
                 )}
              </div>
           </section>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
