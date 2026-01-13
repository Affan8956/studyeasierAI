
import React, { useRef, useEffect } from 'react';

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

  const formatText = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-bold text-emerald-400 print:text-black">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return <em key={i} className="italic text-slate-400 print:text-gray-600">{part.slice(1, -1)}</em>;
      }
      return part;
    });
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
    // Uses the global @media print styles defined in index.html
    window.print();
  };

  const formatSummary = (text: string) => {
    return text.split('\n').map((line, i) => {
      const trimmed = line.trim();
      
      // Headers
      if (trimmed.startsWith('# ')) {
        return <h1 key={i} className="text-3xl font-black mt-8 mb-6 text-white border-b border-slate-800 pb-4 tracking-tight uppercase print:text-black print:border-gray-300">{formatText(trimmed.replace('# ', ''))}</h1>;
      }
      if (trimmed.startsWith('## ')) {
        return <h2 key={i} className="text-2xl font-bold mt-8 mb-4 text-emerald-400 flex items-center gap-3 print:text-black">
          <span className="w-2 h-6 bg-emerald-500 rounded-full inline-block shrink-0 print:bg-black"></span>
          {formatText(trimmed.replace('## ', ''))}
        </h2>;
      }
      if (trimmed.startsWith('### ')) {
        return <h3 key={i} className="text-xl font-bold mt-6 mb-3 text-emerald-300/90 print:text-black">{formatText(trimmed.replace('### ', ''))}</h3>;
      }

      // Lists
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        return (
          <li key={i} className="ml-6 list-none mb-3 text-slate-300 relative pl-6 leading-relaxed print:text-black">
            <span className="absolute left-0 text-emerald-500 font-black top-0 print:text-black">•</span>
            {formatText(trimmed.substring(2))}
          </li>
        );
      }

      // Images
      const imgMatch = trimmed.match(/!\[(.*?)\]\((.*?)\)/);
      if (imgMatch) {
        return (
          <div key={i} className="my-8 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl bg-black print:border-gray-200 print:shadow-none">
            <img 
              crossOrigin="anonymous" 
              src={imgMatch[2]} 
              alt={imgMatch[1]} 
              className="w-full h-auto object-cover block" 
            />
            {imgMatch[1] && <p className="text-center py-3 bg-[#0a0a0a] text-[10px] text-slate-500 font-bold uppercase tracking-widest border-t border-slate-800 print:bg-white print:text-gray-500 print:border-none">{imgMatch[1]}</p>}
          </div>
        );
      }

      if (trimmed === '---' || trimmed === '***') {
        return <hr key={i} className="my-10 border-slate-800 print:border-gray-300" />;
      }

      if (trimmed === '') return <div key={i} className="h-4" />;
      
      return <p key={i} className="mb-4 leading-relaxed text-slate-300 text-lg print:text-black">{formatText(line)}</p>;
    });
  };

  return (
    <div 
      ref={summaryRef}
      className="bg-[#0d0d0d] rounded-3xl shadow-2xl border border-slate-800 p-8 md:p-14 max-w-4xl mx-auto my-8 animate-fadeIn summary-print-container relative overflow-hidden print:bg-white print:border-none print:shadow-none"
    >
      <div className="flex items-center gap-4 mb-12 pb-8 border-b border-slate-800 relative z-10 no-print">
        <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-600/20 shrink-0">
          <i className="fas fa-graduation-cap text-xl"></i>
        </div>
        <div className="flex-1">
          <span className="text-indigo-400 font-black text-[10px] uppercase tracking-[0.4em] mb-1 block">StudyEasierAI Module</span>
          <h1 className="text-2xl font-black text-white tracking-tight uppercase">{title}</h1>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleDownloadMarkdown}
            title="Download Markdown"
            className="bg-slate-800 text-slate-400 w-12 h-12 rounded-xl hover:bg-slate-700 hover:text-white transition-all flex items-center justify-center border border-slate-700"
          >
            <i className="fas fa-file-code"></i>
          </button>
          <button 
            onClick={handleGeneratePDF} 
            className="bg-indigo-600 text-white px-6 py-3 rounded-xl hover:bg-indigo-700 font-black text-xs uppercase tracking-widest transition-all flex items-center gap-3 shadow-xl shadow-indigo-600/20"
          >
            <i className="fas fa-file-pdf"></i> Export PDF
          </button>
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

      <div className="mt-20 pt-10 border-t border-slate-800 flex items-center justify-between text-slate-600 text-[10px] font-black uppercase tracking-widest relative z-10 print:border-gray-300">
        <div className="flex items-center gap-4">
           <p>© {new Date().getFullYear()} StudyEasierAI</p>
           <div className="w-1 h-1 bg-slate-800 rounded-full print:bg-gray-400"></div>
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
