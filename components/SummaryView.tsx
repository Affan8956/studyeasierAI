
import React, { useRef, useEffect } from 'react';
import TTSPlayer from './TTSPlayer';

interface SummaryViewProps {
  summary: string;
  title: string;
}

const SummaryView: React.FC<SummaryViewProps> = ({ summary, title }) => {
  const summaryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (summaryRef.current && (window as any).MathJax) {
      // Typeset the math using MathJax 3
      (window as any).MathJax.typesetPromise([summaryRef.current]).catch((err: any) => {
        console.warn('MathJax typesetting failed:', err);
      });
    }
  }, [summary]);

  // Robust Text Formatter to handle Markdown Symbols like **bold** and *italic* correctly
  const formatInlineText = (text: string) => {
    const elements: React.ReactNode[] = [];
    let lastIndex = 0;
    
    // Regex for **bold** and *italic*
    const regex = /(\*\*(.*?)\*\*)|(\*(.*?)\*)/g;
    let match;

    while ((match = regex.exec(text)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        elements.push(text.substring(lastIndex, match.index));
      }
      
      if (match[1]) { // **bold** group
        elements.push(
          <strong key={match.index} className="font-bold text-emerald-400 print:text-black">
            {match[2]}
          </strong>
        );
      } else if (match[3]) { // *italic* group
        elements.push(
          <em key={match.index} className="italic text-text-muted print:text-gray-600">
            {match[4]}
          </em>
        );
      }
      
      lastIndex = regex.lastIndex;
    }
    
    // Add remaining text
    if (lastIndex < text.length) {
      elements.push(text.substring(lastIndex));
    }
    
    return elements.length > 0 ? elements : text;
  };

  const handleDownloadMarkdown = () => {
    const blob = new Blob([summary], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/\s+/g, '_')}_summary.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleGeneratePDF = () => {
    window.print();
  };

  const formatSummary = (text: string) => {
    return text.split('\n').map((line, i) => {
      const trimmed = line.trim();
      
      // Headers
      if (trimmed.startsWith('# ')) {
        return (
          <h1 key={i} className="text-3xl font-black mt-10 mb-6 text-text-main border-b border-border pb-4 tracking-tight uppercase print:text-black print:border-gray-300">
            {formatInlineText(trimmed.replace('# ', ''))}
          </h1>
        );
      }
      if (trimmed.startsWith('## ')) {
        return (
          <h2 key={i} className="text-2xl font-bold mt-8 mb-4 text-emerald-400 flex items-center gap-3 print:text-black">
            <span className="w-2 h-6 bg-emerald-500 rounded-full inline-block shrink-0 print:bg-black"></span>
            {formatInlineText(trimmed.replace('## ', ''))}
          </h2>
        );
      }
      if (trimmed.startsWith('### ')) {
        return (
          <h3 key={i} className="text-xl font-bold mt-6 mb-3 text-emerald-400/90 print:text-black">
            {formatInlineText(trimmed.replace('### ', ''))}
          </h3>
        );
      }

      // Unordered Lists
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        return (
          <div key={i} className="ml-2 mb-2 flex items-start gap-3">
             <span className="text-emerald-500 font-black mt-1.5 text-[8px] print:text-black">●</span>
             <p className="text-text-main leading-relaxed print:text-black flex-1">
               {formatInlineText(trimmed.substring(2))}
             </p>
          </div>
        );
      }

      // Numbered Lists
      if (/^\d+\./.test(trimmed)) {
        const parts = trimmed.split('.');
        const num = parts[0];
        const content = parts.slice(1).join('.').trim();
        return (
           <div key={i} className="ml-2 mb-2 flex items-start gap-3">
              <span className="text-emerald-500 font-bold font-mono mt-0.5 print:text-black">{num}.</span>
              <p className="text-text-main leading-relaxed print:text-black flex-1">
                {formatInlineText(content)}
              </p>
           </div>
        );
      }

      // Images
      const imgMatch = trimmed.match(/!\[(.*?)\]\((.*?)\)/);
      if (imgMatch) {
        return (
          <div key={i} className="my-8 rounded-2xl overflow-hidden border border-border shadow-2xl bg-black print:border-gray-200 print:shadow-none">
            <img 
              crossOrigin="anonymous" 
              src={imgMatch[2]} 
              alt={imgMatch[1]} 
              className="w-full h-auto object-cover block" 
            />
            {imgMatch[1] && <p className="text-center py-3 bg-surface text-[10px] text-text-muted font-bold uppercase tracking-widest border-t border-border print:bg-white print:text-gray-500 print:border-none">{imgMatch[1]}</p>}
          </div>
        );
      }

      // Horizontal Rules
      if (trimmed === '---' || trimmed === '***') {
        return <hr key={i} className="my-10 border-border print:border-gray-300" />;
      }

      // Spacer
      if (trimmed === '') return <div key={i} className="h-4" />;
      
      // Regular Paragraph
      return (
        <p key={i} className="mb-4 leading-relaxed text-text-main text-lg print:text-black">
          {formatInlineText(line)}
        </p>
      );
    });
  };

  return (
    <div 
      ref={summaryRef}
      className="bg-sidebar rounded-3xl shadow-2xl border border-border p-6 md:p-14 max-w-4xl mx-auto my-8 animate-fadeIn summary-print-container relative print:bg-white print:border-none print:shadow-none"
    >
      {/* Header with Title and Actions - HIGH Z-INDEX TO FIX VISIBILITY */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6 mb-12 pb-8 border-b border-border relative z-50 no-print">
        <div className="flex items-center gap-4 flex-1 w-full lg:w-auto">
           <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-600/20 shrink-0">
             <i className="fas fa-graduation-cap text-xl"></i>
           </div>
           <div className="min-w-0 flex-1">
             <span className="text-indigo-400 font-black text-[10px] uppercase tracking-widest md:tracking-[0.4em] mb-1 block break-words whitespace-normal leading-tight">StudyEasierAI Module</span>
             <h1 className="text-2xl font-black text-text-main tracking-tight uppercase break-words whitespace-normal leading-tight">{title}</h1>
           </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto lg:justify-end">
          {/* TTS Player Integrated Here - Visible on all screens */}
          <div className="w-full sm:w-auto relative z-50">
            <TTSPlayer text={summary} />
          </div>

          <div className="flex gap-3 w-full sm:w-auto">
            <button 
              onClick={handleDownloadMarkdown}
              title="Download Markdown"
              className="bg-surface text-text-muted w-10 h-10 rounded-xl hover:bg-slate-700 hover:text-white transition-all flex items-center justify-center border border-border shrink-0"
            >
              <i className="fas fa-file-code"></i>
            </button>
            <button 
              onClick={handleGeneratePDF} 
              className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl hover:bg-indigo-700 font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 shadow-xl shadow-indigo-600/20 w-full sm:w-auto justify-center"
            >
              <i className="fas fa-file-pdf"></i> Export
            </button>
          </div>
        </div>
      </div>

      {/* Print Only Header */}
      <div className="print-only mb-8 border-b-2 border-black pb-4">
        <h1 className="text-4xl font-black text-black mb-2">{title}</h1>
        <p className="text-sm text-gray-500 uppercase tracking-widest">StudyEasierAI Generated Report</p>
      </div>

      <div className="prose prose-invert max-w-none relative z-10 print:prose-black">
        {formatSummary(summary)}
      </div>

      <div className="mt-20 pt-10 border-t border-border flex items-center justify-between text-text-muted text-[10px] font-black uppercase tracking-widest relative z-10 print:border-gray-300">
        <div className="flex items-center gap-4">
           <p>© {new Date().getFullYear()} StudyEasierAI</p>
           <div className="w-1 h-1 bg-border rounded-full print:bg-gray-400"></div>
           <p>Academic Intelligence</p>
        </div>
        <p className="flex items-center gap-2">
           <i className="fas fa-shield-alt text-emerald-600 print:text-black"></i>
           Verified Generation
        </p>
      </div>

      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none no-print"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none no-print"></div>
    </div>
  );
};

export default SummaryView;
