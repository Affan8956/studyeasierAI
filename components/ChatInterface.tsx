
import React, { useState, useRef, useEffect } from 'react';
import { ChatSession, Message, AIMode } from '../types';
import { streamChatResponse } from '../services/geminiService';

interface ChatInterfaceProps {
  chat: ChatSession | null;
  onUpdateChat: (updated: ChatSession) => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ chat, onUpdateChat }) => {
  const [input, setInput] = useState('');
  const [streamingContent, setStreamingContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [chat?.messages, streamingContent, isStreaming]);

  useEffect(() => {
    const renderMath = () => {
      if (chatContainerRef.current && (window as any).renderMathInElement) {
        (window as any).renderMathInElement(chatContainerRef.current, {
          delimiters: [
            { left: '$$', right: '$$', display: true },
            { left: '$', right: '$', display: false },
            { left: '\\(', right: '\\)', display: false },
            { left: '\\[', right: '\\]', display: true }
          ],
          throwOnError: false,
          trust: true,
          strict: false
        });
      }
    };

    const timeout = setTimeout(renderMath, 150);
    return () => clearTimeout(timeout);
  }, [chat?.messages, streamingContent]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !chat || isStreaming) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: Date.now()
    };

    const updatedChat = { 
      ...chat, 
      messages: [...chat.messages, userMsg],
      updatedAt: Date.now()
    };
    
    onUpdateChat(updatedChat);
    setInput('');
    setIsStreaming(true);
    setStreamingContent('');

    try {
      let finalResponse = "";
      await streamChatResponse(
        chat.messages,
        input,
        chat.mode,
        (chunk) => {
          setStreamingContent(chunk);
          finalResponse = chunk;
        }
      );

      const modelMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: finalResponse,
        timestamp: Date.now()
      };

      const finalizedChat = {
        ...updatedChat,
        messages: [...updatedChat.messages, modelMsg],
        title: chat.messages.length === 0 && chat.title === 'New Discussion' ? input.slice(0, 30) + (input.length > 30 ? '...' : '') : chat.title
      };
      
      onUpdateChat(finalizedChat);
    } catch (err) {
      console.error(err);
    } finally {
      setIsStreaming(false);
      setStreamingContent('');
    }
  };

  const handleSaveTitle = () => {
    if (chat && tempTitle.trim()) {
      onUpdateChat({ ...chat, title: tempTitle.trim() });
    }
    setIsEditingTitle(false);
  };

  if (!chat) return <div className="flex-1 flex items-center justify-center text-slate-500">Select a chat to begin</div>;

  return (
    <div className="flex-1 flex flex-col h-full">
      <header className="h-16 border-b border-slate-900 flex items-center justify-between px-8 bg-[#0a0a0a]/80 backdrop-blur-md z-10">
        <div className="flex items-center gap-4 flex-1">
          <div className="w-8 h-8 rounded-lg bg-indigo-600/20 flex items-center justify-center text-indigo-400">
            <i className={`fas ${getModeIcon(chat.mode)}`}></i>
          </div>
          <div className="flex-1 min-w-0">
            {isEditingTitle ? (
              <div className="flex items-center gap-2">
                <input 
                  autoFocus
                  className="bg-[#151515] border border-indigo-500 rounded px-2 py-0.5 text-sm text-slate-100 outline-none w-full max-w-xs"
                  value={tempTitle}
                  onChange={(e) => setTempTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
                  onBlur={handleSaveTitle}
                />
              </div>
            ) : (
              <div className="flex items-center gap-2 group cursor-pointer" onClick={() => { setIsEditingTitle(true); setTempTitle(chat.title); }}>
                <h4 className="text-sm font-bold text-slate-100 truncate max-w-sm">{chat.title}</h4>
                <i className="fas fa-pen text-[10px] text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity"></i>
              </div>
            )}
            <span className="text-[10px] text-slate-600 font-black uppercase tracking-widest">{chat.mode} Intelligent Link</span>
          </div>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar pb-32">
        <div ref={chatContainerRef} className="space-y-10">
          {chat.messages.map((msg) => (
            <div key={msg.id} className={`flex gap-6 max-w-4xl mx-auto animate-fadeIn ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
               {msg.role === 'model' && <div className="w-10 h-10 rounded-2xl bg-indigo-600 shrink-0 flex items-center justify-center text-white shadow-lg shadow-indigo-600/20"><i className="fas fa-brain"></i></div>}
               <div 
                style={{ whiteSpace: 'pre-wrap' }}
                className={`p-5 rounded-3xl text-sm leading-relaxed ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-[#151515] border border-slate-800 text-slate-300 rounded-tl-none font-sans'}`}>
                  {msg.content}
               </div>
               {msg.role === 'user' && <div className="w-10 h-10 rounded-2xl bg-slate-800 shrink-0 flex items-center justify-center text-slate-400 font-bold">U</div>}
            </div>
          ))}
          {isStreaming && (
            <div className="flex gap-6 max-w-4xl mx-auto animate-pulse">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600 shrink-0 flex items-center justify-center text-white"><i className="fas fa-circle-notch animate-spin"></i></div>
              <div 
                style={{ whiteSpace: 'pre-wrap' }}
                className="p-5 rounded-3xl bg-[#151515] border border-slate-800 text-slate-300 rounded-tl-none text-sm leading-relaxed font-sans">
                {streamingContent || "StudyEasierAI is resonating..."}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="p-8 absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a] to-transparent">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto relative group">
          <input 
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Reason with StudyEasierAI..."
            className="w-full bg-[#151515] border border-slate-800 rounded-2xl px-6 py-4 pr-16 text-sm text-slate-200 outline-none transition-all focus:border-indigo-500 shadow-2xl"
          />
          <button 
            type="submit"
            disabled={!input.trim() || isStreaming}
            className="absolute right-2 top-2 w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20"
          >
            <i className={`fas ${isStreaming ? 'fa-spinner fa-spin' : 'fa-paper-plane'}`}></i>
          </button>
        </form>
      </div>
    </div>
  );
};

const getModeIcon = (mode: string) => {
  switch(mode) {
    case 'study': return 'fa-book-reader';
    case 'coding': return 'fa-code';
    case 'tutor': return 'fa-user-graduate';
    case 'research': return 'fa-microscope';
    default: return 'fa-feather';
  }
};

export default ChatInterface;
