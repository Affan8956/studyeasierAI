
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

  // Scroll to bottom on new messages or streaming updates
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chat?.messages, streamingContent, isStreaming]);

  useEffect(() => {
    if (chatContainerRef.current && (window as any).MathJax) {
      try {
        // Typeset math using MathJax 3
        (window as any).MathJax.typesetPromise([chatContainerRef.current]).catch((err: any) => {
          console.warn("MathJax typesetting failed:", err);
        });
      } catch (e) {
        console.warn("Math rendering skipped due to environment capabilities.");
      }
    }
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
    } catch (err: any) {
      console.error(err);
      
      // Handle Quota/Connection Errors Gracefully
      const errorMessage = err.message?.includes('429') || err.message?.includes('quota')
        ? "Daily AI quota limit reached. Please check your plan or try again later. Switching to Flash model may help."
        : "Connection interrupted. Please try sending your message again.";

      const errorMsg: Message = {
        id: Date.now().toString(),
        role: 'model',
        content: `⚠️ ${errorMessage}`,
        timestamp: Date.now()
      };
      
      onUpdateChat({ ...updatedChat, messages: [...updatedChat.messages, errorMsg] });
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

  const getModeIcon = (mode: string) => {
    switch(mode) {
      case 'study': return 'fa-book-reader';
      case 'coding': return 'fa-code';
      case 'tutor': return 'fa-user-graduate';
      case 'research': return 'fa-microscope';
      default: return 'fa-feather';
    }
  };

  if (!chat) return <div className="flex-1 flex items-center justify-center text-text-muted">Select a chat to begin</div>;

  return (
    <div className="flex-1 flex flex-col h-full relative">
      {/* Header */}
      <header className="h-16 border-b border-border flex items-center justify-between px-4 md:px-8 bg-surface/80 backdrop-blur-md z-10 pl-16 md:pl-8 flex-shrink-0">
        <div className="flex items-center gap-4 flex-1">
          <div className="w-8 h-8 rounded-lg bg-indigo-600/20 flex items-center justify-center text-indigo-400 shrink-0">
            <i className={`fas ${getModeIcon(chat.mode)}`}></i>
          </div>
          <div className="flex-1 min-w-0">
            {isEditingTitle ? (
              <div className="flex items-center gap-2">
                <input 
                  autoFocus
                  className="bg-surface2 border border-indigo-500 rounded px-2 py-0.5 text-sm text-text-main outline-none w-full max-w-xs"
                  value={tempTitle}
                  onChange={(e) => setTempTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
                  onBlur={handleSaveTitle}
                />
              </div>
            ) : (
              <div className="flex items-center gap-2 group cursor-pointer" onClick={() => { setIsEditingTitle(true); setTempTitle(chat.title); }}>
                <h4 className="text-sm font-bold text-text-main truncate max-w-[200px] md:max-w-sm">{chat.title}</h4>
                <i className="fas fa-pen text-[10px] text-text-muted opacity-0 group-hover:opacity-100 transition-opacity"></i>
              </div>
            )}
            <span className="text-[10px] text-text-muted font-black uppercase tracking-widest block truncate">{chat.mode} Intelligent Link</span>
          </div>
        </div>
      </header>

      {/* Messages Scroll Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar scroll-smooth">
        <div ref={chatContainerRef} className="space-y-8 md:space-y-10 max-w-4xl mx-auto pb-4">
          {chat.messages.map((msg) => (
            <div key={msg.id} className={`flex gap-3 md:gap-6 animate-fadeIn ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
               {msg.role === 'model' && <div className="w-8 h-8 md:w-10 md:h-10 rounded-2xl bg-indigo-600 shrink-0 flex items-center justify-center text-white shadow-lg shadow-indigo-600/20 text-xs md:text-base"><i className="fas fa-brain"></i></div>}
               <div 
                style={{ whiteSpace: 'pre-wrap' }}
                className={`p-4 md:p-5 rounded-3xl text-sm leading-relaxed max-w-[85%] md:max-w-full shadow-md ${
                  msg.content.startsWith('⚠️') ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400' :
                  msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-surface border border-border text-text-main rounded-tl-none'
                }`}>
                  {msg.content}
               </div>
               {msg.role === 'user' && <div className="w-8 h-8 md:w-10 md:h-10 rounded-2xl bg-surface2 shrink-0 flex items-center justify-center text-text-muted font-bold text-xs md:text-base">U</div>}
            </div>
          ))}
          
          {isStreaming && (
            <div className="flex gap-3 md:gap-6 animate-pulse">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-2xl bg-indigo-600 shrink-0 flex items-center justify-center text-white"><i className="fas fa-circle-notch animate-spin"></i></div>
              <div 
                style={{ whiteSpace: 'pre-wrap' }}
                className="p-4 md:p-5 rounded-3xl bg-surface border border-border text-text-main rounded-tl-none text-sm leading-relaxed shadow-md">
                {streamingContent || "StudyEasierAI is resonating..."}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input Area (Fixed at bottom relative to flex container) */}
      <div className="p-4 md:p-8 bg-app border-t border-border z-20 flex-shrink-0">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto relative group">
          <input 
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={chat.mode === 'tutor' ? "Ask for a hint or guide..." : "Reason with StudyEasierAI..."}
            className="w-full bg-surface border border-border rounded-2xl pl-4 md:pl-6 pr-14 md:pr-16 py-3 md:py-4 text-sm text-text-main outline-none transition-all focus:border-indigo-500 shadow-2xl"
          />
          <button 
            type="submit"
            disabled={!input.trim() || isStreaming}
            className="absolute right-2 top-1.5 md:top-2 w-10 h-10 md:w-12 md:h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20"
          >
            <i className={`fas ${isStreaming ? 'fa-spinner fa-spin' : 'fa-paper-plane'}`}></i>
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatInterface;
