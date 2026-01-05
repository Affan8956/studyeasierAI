
import React from 'react';
import { User, ChatSession, LabAsset, ViewState } from '../types';

interface DashboardProps {
  user: User;
  chats: ChatSession[];
  assets: LabAsset[];
  onAction: (target: ViewState) => void;
  onNewChat: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, chats, assets, onAction, onNewChat }) => {
  const displayName = user?.name || 'Student';
  const firstName = displayName.split(' ')[0] || 'Student';

  return (
    <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
      <div className="max-w-6xl mx-auto">
        <header className="mb-12">
          <div className="flex items-center gap-4 mb-4">
             <div className="h-[2px] w-12 bg-indigo-500"></div>
             <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em]">Academic Workspace</span>
          </div>
          <h1 className="text-6xl font-black mb-4 tracking-tight leading-none">
            Welcome, <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-violet-400">{firstName}</span>
          </h1>
          <p className="text-slate-500 text-lg font-medium">Your intelligence modules are active and synchronized.</p>
        </header>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
          <div 
            onClick={(e) => { e.preventDefault(); onNewChat(); }}
            className="group p-10 bg-[#0d0d0d] border border-slate-800 rounded-[2.5rem] hover:border-indigo-500/50 hover:bg-indigo-600/5 transition-all cursor-pointer shadow-2xl relative overflow-hidden"
          >
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-indigo-600/5 rounded-full blur-3xl group-hover:bg-indigo-600/20 transition-all"></div>
            <div className="w-16 h-16 bg-indigo-600/10 rounded-2xl flex items-center justify-center text-indigo-400 mb-8 group-hover:scale-110 transition-transform shadow-lg border border-indigo-500/10">
              <i className="fas fa-plus text-2xl"></i>
            </div>
            <h3 className="text-2xl font-black mb-3">Smart Chat</h3>
            <p className="text-slate-500 text-sm leading-relaxed font-medium">Initiate a deep reasoning session with Gemini 3 Pro intelligence.</p>
            <div className="mt-8 flex items-center gap-2 text-indigo-400 text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all">
               Launch Terminal <i className="fas fa-arrow-right"></i>
            </div>
          </div>

          <div 
            onClick={() => onAction('lab')}
            className="group p-10 bg-[#0d0d0d] border border-slate-800 rounded-[2.5rem] hover:border-emerald-500/50 hover:bg-emerald-600/5 transition-all cursor-pointer shadow-2xl relative overflow-hidden"
          >
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-600/5 rounded-full blur-3xl group-hover:bg-emerald-600/20 transition-all"></div>
            <div className="w-16 h-16 bg-emerald-600/10 rounded-2xl flex items-center justify-center text-emerald-400 mb-8 group-hover:scale-110 transition-transform shadow-lg border border-emerald-500/10">
              <i className="fas fa-microscope text-2xl"></i>
            </div>
            <h3 className="text-2xl font-black mb-3">Knowledge Lab</h3>
            <p className="text-slate-500 text-sm leading-relaxed font-medium">Extract structured mastery from lecture recordings and PDFs.</p>
            <div className="mt-8 flex items-center gap-2 text-emerald-400 text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all">
               Analyze Content <i className="fas fa-arrow-right"></i>
            </div>
          </div>

          <div 
            onClick={() => onAction('vault')}
            className="group p-10 bg-[#0d0d0d] border border-slate-800 rounded-[2.5rem] hover:border-amber-500/50 hover:bg-amber-600/5 transition-all cursor-pointer shadow-2xl relative overflow-hidden"
          >
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-amber-600/5 rounded-full blur-3xl group-hover:bg-amber-600/20 transition-all"></div>
            <div className="w-16 h-16 bg-amber-600/10 rounded-2xl flex items-center justify-center text-amber-400 mb-8 group-hover:scale-110 transition-transform shadow-lg border border-amber-500/10">
              <i className="fas fa-vault text-2xl"></i>
            </div>
            <h3 className="text-2xl font-black mb-3">Private Vault</h3>
            <p className="text-slate-500 text-sm leading-relaxed font-medium">Access your global knowledge base and persistent assets.</p>
            <div className="mt-8 flex items-center gap-2 text-amber-400 text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all">
               Review History <i className="fas fa-arrow-right"></i>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
           <section>
              <div className="flex items-center justify-between mb-8 px-2">
                 <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em]">Recent Discussions</h4>
                 <div className="h-[1px] flex-1 mx-6 bg-slate-900"></div>
              </div>
              <div className="space-y-4">
                 {chats.length > 0 ? chats.slice(0, 4).map(chat => (
                   <div key={chat.id} className="p-5 bg-[#0d0d0d] border border-slate-800 rounded-2xl flex items-center justify-between hover:border-indigo-500/30 transition-all group">
                      <div className="flex items-center gap-5">
                        <div className="w-8 h-8 rounded-lg bg-indigo-600/10 flex items-center justify-center text-indigo-400">
                           <i className="fas fa-comment-alt text-xs"></i>
                        </div>
                        <span className="font-bold text-sm truncate max-w-[200px] text-slate-200">{chat.title}</span>
                      </div>
                      <span className="text-[9px] text-slate-600 uppercase font-black tracking-widest">{new Date(chat.updatedAt).toLocaleDateString()}</span>
                   </div>
                 )) : (
                   <div className="py-12 text-center border-2 border-dashed border-slate-900 rounded-[2rem]">
                      <p className="text-slate-700 text-xs font-black uppercase tracking-widest">No Recent Activity</p>
                   </div>
                 )}
              </div>
           </section>

           <section>
              <div className="flex items-center justify-between mb-8 px-2">
                 <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em]">Intelligence Assets</h4>
                 <div className="h-[1px] flex-1 mx-6 bg-slate-900"></div>
              </div>
              <div className="space-y-4">
                 {assets.length > 0 ? assets.slice(0, 4).map(asset => (
                   <div key={asset.id} className="p-5 bg-[#0d0d0d] border border-slate-800 rounded-2xl flex items-center justify-between hover:border-emerald-500/30 transition-all">
                      <div className="flex items-center gap-5">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${asset.type === 'summary' ? 'bg-emerald-600/10 text-emerald-400' : 'bg-amber-600/10 text-amber-400'}`}>
                           <i className={`fas text-xs ${asset.type === 'summary' ? 'fa-file-text' : 'fa-tasks'}`}></i>
                        </div>
                        <span className="font-bold text-sm truncate max-w-[200px] text-slate-200">{asset.title}</span>
                      </div>
                      <span className="text-[9px] text-slate-600 uppercase font-black tracking-widest">{asset.type}</span>
                   </div>
                 )) : (
                   <div className="py-12 text-center border-2 border-dashed border-slate-900 rounded-[2rem]">
                      <p className="text-slate-700 text-xs font-black uppercase tracking-widest">No Assets Generated</p>
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
