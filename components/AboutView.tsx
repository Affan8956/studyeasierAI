
import React from 'react';

const AboutView: React.FC = () => {
  return (
    <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
      <div className="max-w-4xl mx-auto space-y-12 pb-20">
        
        {/* Header Section */}
        <header className="text-center space-y-6">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-indigo-600/10 text-indigo-400 rounded-3xl mb-4 shadow-2xl border border-indigo-500/20">
             <i className="fas fa-rocket text-4xl"></i>
          </div>
          <h1 className="text-5xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
            StudyEasierAI
          </h1>
          <div className="flex flex-col items-center gap-2">
            <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-xs">
              Architected by <span className="text-white">Team RootOps</span>
            </p>
            <a 
              href="https://github.com/Affan8956/studyeasierAI" 
              target="_blank" 
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-3 px-6 py-3 bg-[#151515] border border-slate-700 hover:border-white hover:bg-white hover:text-black text-white rounded-xl transition-all font-bold text-xs uppercase tracking-widest"
            >
              <i className="fab fa-github text-lg"></i> View Source Code
            </a>
          </div>
        </header>

        {/* Problem Statement */}
        <section className="bg-[#121212] border border-slate-800 rounded-[2.5rem] p-10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-rose-600/5 rounded-full blur-[80px]"></div>
          <h2 className="text-2xl font-black text-white mb-6 flex items-center gap-3">
            <i className="fas fa-bolt text-rose-500"></i> The Problem Statement
          </h2>
          <div className="space-y-4 text-slate-400 leading-relaxed text-sm md:text-base">
            <p>
              <strong className="text-white">Cognitive Overload:</strong> Modern students are drowning in data. Hours of lecture recordings, dense PDF textbooks, and scattered notes create a barrier to effective learning. The time spent <em>organizing</em> materials often exceeds the time spent <em>learning</em> them.
            </p>
            <p>
              <strong className="text-white">Inefficient Review:</strong> Passive reading is the least effective study method, yet it's the most common because creating active recall tools (flashcards, quizzes) is labor-intensive.
            </p>
            <p className="pt-4 border-t border-slate-800 mt-4">
              <strong className="text-emerald-400">The Solution:</strong> StudyEasierAI acts as an academic hyper-processor. It ingests raw chaotic data (audio/text) and instantly restructures it into pedagogy-aligned formats: concise summaries, active recall quizzes, and visual slides. We automate the "busy work" of studying so you can focus on comprehension.
            </p>
          </div>
        </section>

        {/* Feature Guide */}
        <section>
          <h2 className="text-xl font-black text-slate-200 mb-8 uppercase tracking-widest border-b border-slate-800 pb-4">
            Feature & Usage Guide
          </h2>
          
          <div className="grid gap-6">
            
            {/* Knowledge Lab */}
            <div className="p-6 bg-[#151515] rounded-3xl border border-slate-800 hover:border-emerald-500/30 transition-all group">
               <div className="flex items-start gap-4">
                 <div className="w-12 h-12 bg-emerald-600/10 text-emerald-400 rounded-xl flex items-center justify-center shrink-0">
                    <i className="fas fa-microscope text-xl"></i>
                 </div>
                 <div>
                    <h3 className="text-lg font-bold text-white mb-2 group-hover:text-emerald-400 transition-colors">Knowledge Lab</h3>
                    <p className="text-slate-400 text-sm mb-4">
                      The core engine. Upload a <strong>PDF</strong> or an <strong>Audio Recording</strong> (or provide a YouTube URL). The AI performs a single-pass analysis to generate a "Mastery Package" containing:
                    </p>
                    <ul className="text-slate-500 text-xs font-bold uppercase tracking-wide space-y-2">
                      <li className="flex items-center gap-2"><i className="fas fa-check text-emerald-600"></i> Markdown Summary with LaTeX Math</li>
                      <li className="flex items-center gap-2"><i className="fas fa-check text-emerald-600"></i> 10-Question Mastery Quiz</li>
                      <li className="flex items-center gap-2"><i className="fas fa-check text-emerald-600"></i> Interactive Flashcards</li>
                      <li className="flex items-center gap-2"><i className="fas fa-check text-emerald-600"></i> Visual Slide Deck</li>
                    </ul>
                 </div>
               </div>
            </div>

            {/* Smart Chat */}
            <div className="p-6 bg-[#151515] rounded-3xl border border-slate-800 hover:border-indigo-500/30 transition-all group">
               <div className="flex items-start gap-4">
                 <div className="w-12 h-12 bg-indigo-600/10 text-indigo-400 rounded-xl flex items-center justify-center shrink-0">
                    <i className="fas fa-comment-alt text-xl"></i>
                 </div>
                 <div>
                    <h3 className="text-lg font-bold text-white mb-2 group-hover:text-indigo-400 transition-colors">Smart Chat & Tutor</h3>
                    <p className="text-slate-400 text-sm">
                      Context-aware chat powered by <strong>Gemini 3 Pro</strong>. Select different modes like 'Tutor' (Socratic method), 'Coding' (Technical), or 'Study' (General). It supports complex reasoning and keeps history of your conversations.
                    </p>
                 </div>
               </div>
            </div>

            {/* Deep Research */}
            <div className="p-6 bg-[#151515] rounded-3xl border border-slate-800 hover:border-cyan-500/30 transition-all group">
               <div className="flex items-start gap-4">
                 <div className="w-12 h-12 bg-cyan-600/10 text-cyan-400 rounded-xl flex items-center justify-center shrink-0">
                    <i className="fas fa-globe-americas text-xl"></i>
                 </div>
                 <div>
                    <h3 className="text-lg font-bold text-white mb-2 group-hover:text-cyan-400 transition-colors">Deep Research</h3>
                    <p className="text-slate-400 text-sm">
                      Connects the AI to the live internet via Google Search Grounding. Use this for topics requiring up-to-date information, citations, or fact-checking. It returns a summary with clickable source links.
                    </p>
                 </div>
               </div>
            </div>

            {/* Image Analysis */}
            <div className="p-6 bg-[#151515] rounded-3xl border border-slate-800 hover:border-purple-500/30 transition-all group">
               <div className="flex items-start gap-4">
                 <div className="w-12 h-12 bg-purple-600/10 text-purple-400 rounded-xl flex items-center justify-center shrink-0">
                    <i className="fas fa-eye text-xl"></i>
                 </div>
                 <div>
                    <h3 className="text-lg font-bold text-white mb-2 group-hover:text-purple-400 transition-colors">Vision Analysis</h3>
                    <p className="text-slate-400 text-sm">
                      Upload screenshots of diagrams, whiteboard notes, or math equations. The AI will transcribe text, solve math using LaTeX, and explain visual concepts in detail.
                    </p>
                 </div>
               </div>
            </div>

             {/* Vault */}
             <div className="p-6 bg-[#151515] rounded-3xl border border-slate-800 hover:border-amber-500/30 transition-all group">
               <div className="flex items-start gap-4">
                 <div className="w-12 h-12 bg-amber-600/10 text-amber-400 rounded-xl flex items-center justify-center shrink-0">
                    <i className="fas fa-vault text-xl"></i>
                 </div>
                 <div>
                    <h3 className="text-lg font-bold text-white mb-2 group-hover:text-amber-400 transition-colors">The Vault</h3>
                    <p className="text-slate-400 text-sm">
                      Your persistent storage. All generated assets (summaries, research, chats) are saved here. You can filter, search, and delete items. Data is synchronized via Supabase or stored locally if offline.
                    </p>
                 </div>
               </div>
            </div>

          </div>
        </section>

        <footer className="text-center pt-10 border-t border-slate-900">
           <p className="text-slate-600 text-[10px] font-black uppercase tracking-[0.4em]">Built with ❤️ by Team RootOps</p>
        </footer>

      </div>
    </div>
  );
};

export default AboutView;
