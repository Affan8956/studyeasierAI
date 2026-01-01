
import React, { useRef, useEffect } from 'react';

interface SummaryViewProps {
  summary: string;
  title: string;
}

const SummaryView: React.FC<SummaryViewProps> = ({ summary, title }) => {
  const summaryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (summaryRef.current && (window as any).renderMathInElement) {
      (window as any).renderMathInElement(summaryRef.current, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '$', right: '$', display: false },
          { left: '\\(', right: '\\)', display: false },
          { left: '\\[', right: '\\]', display: true }
        ],
        throwOnError: false,
        trust: true
      });
    }
  }, [summary]);

  const formatText = (text: string) => {
    // Handle Bold (**text**) and Italics (*text*)
    // We don't process $ here because KaTeX auto-render handles it
    const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-bold text-emerald-400">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return <em key={i} className="italic text-slate-400">{part.slice(1, -1)}</em>;
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
    if (!summaryRef.current) return;
    
    const element = summaryRef.current.cloneNode(true) as HTMLElement;
    const actionButtons = element.querySelector('.no-print-zone');
    if (actionButtons) actionButtons.remove();

    element.style.width = '800px';
    element.style.padding = '50px';
    element.style.backgroundColor = '#000000';
    element.style.color = '#f1f5f9';
    element.style.margin = '0';
    element.style.borderRadius = '0';
    element.style.border = 'none';
    
    const textElements = element.querySelectorAll('p, li, span, h1, h2, h3, h4');
    textElements.forEach((el: any) => {
      if (!el.classList.contains('text-emerald-400') && !el.classList.contains('text-indigo-400')) {
        el.style.color = '#cbd5e1';
      }
    });

    const opt = {
      margin: [0, 0, 0, 0],
      filename: `${title.replace(/\s+/g, '_')}_StudySummary.pdf`,
      image: { type: 'jpeg', quality: 1.0 },
      html2canvas: { 
        scale: 2, 
        useCORS: true, 
        backgroundColor: '#000000',
        logging: false,
        letterRendering: true,
        allowTaint: true
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    const wrapper = document.createElement('div');
    wrapper.style.backgroundColor = '#000000';
    wrapper.appendChild(element);

    // @ts-ignore
    window.html2pdf().set(opt).from(wrapper).save();
  };

  const formatSummary = (text: string) => {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let mathBuffer: string[] = [];
    let inMathBlock = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Detection for multi-line block math
      if (trimmed === '$$' || (trimmed.startsWith('$$') && !trimmed.endsWith('$$', trimmed.length - 1))) {
        if (inMathBlock) {
          mathBuffer.push(line);
          elements.push(
            <div key={`math-${i}`} className="my-6 bg-emerald-500/5 p-4 rounded-xl border border-emerald-500/10 overflow-x-auto">
              {mathBuffer.join('\n')}
            </div>
          );
          mathBuffer = [];
          inMathBlock = false;
        } else {
          inMathBlock = true;
          mathBuffer.push(line);
        }
        continue;
      }

      if (inMathBlock) {
        mathBuffer.push(line);
        if (trimmed.endsWith('$$')) {
          elements.push(
            <div key={`math-${i}`} className="my-6 bg-emerald-500/5 p-4 rounded-xl border border-emerald-500/10 overflow-x-auto">
              {mathBuffer.join('\n')}
            </div>
          );
          mathBuffer = [];
          inMathBlock = false;
        }
        continue;
      }

      // Headers
      if (trimmed.startsWith('# ')) {
        elements.push(<h1 key={i} className="text-3xl font-black mt-8 mb-6 text-white border-b border-slate-800 pb-4 tracking-tight uppercase">{formatText(trimmed.replace('# ', ''))}</h1>);
        continue;
      }
      if (trimmed.startsWith('## ')) {
        elements.push(<h2 key={i} className="text-2xl font-bold mt-8 mb-4 text-emerald-400 flex items-center gap-3">
          <span className="w-2 h-6 bg-emerald-500 rounded-full inline-block shrink-0"></span>
          {formatText(trimmed.replace('## ', ''))}
        </h2>);
        continue;
      }
      if (trimmed.startsWith('### ')) {
        elements.push(<h3 key={i} className="text-xl font-bold mt-6 mb-3 text-emerald-300/90">{formatText(trimmed.replace('### ', ''))}</h3>);
        continue;
      }

      // Lists
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        elements.push(
          <li key={i} className="ml-6 list-none mb-3 text-slate-300 relative pl-6 leading-relaxed">
            <span className="absolute left-0 text-emerald-500 font-black top-0">•</span>
            {formatText(trimmed.substring(2))}
          </li>
        );
        continue;
      }

      // Images
      const imgMatch = trimmed.match(/!\[(.*?)\]\((.*?)\)/);
      if (imgMatch) {
        elements.push(
          <div key={i} className="my-8 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl bg-black">
            <img 
              crossOrigin="anonymous" 
              src={imgMatch[2]} 
              alt={imgMatch[1]} 
              className="w-full h-auto object-cover block" 
            />
            {imgMatch[1] && <p className="text-center py-3 bg-[#0a0a0a] text-[10px] text-slate-500 font-bold uppercase tracking-widest border-t border-slate-800">{imgMatch[1]}</p>}
          </div>
        );
        continue;
      }

      if (trimmed === '---' || trimmed === '***') {
        elements.push(<hr key={i} className="my-10 border-slate-800" />);
        continue;
      }

      if (trimmed === '') {
        elements.push(<div key={i} className="h-4" />);
        continue;
      }
      
      elements.push(<p key={i} className="mb-4 leading-relaxed text-slate-300 text-lg">{formatText(line)}</p>);
    }

    return elements;
  };

  return (
    <div 
      ref={summaryRef}
      className="bg-[#0d0d0d] rounded-3xl shadow-2xl border border-slate-800 p-8 md:p-14 max-w-4xl mx-auto my-8 animate-fadeIn summary-print-container relative overflow-hidden"
    >
      <div className="flex items-center gap-4 mb-12 pb-8 border-b border-slate-800 relative z-10">
        <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-600/20 shrink-0">
          <i className="fas fa-graduation-cap text-xl"></i>
        </div>
        <div className="flex-1">
          <span className="text-indigo-400 font-black text-[10px] uppercase tracking-[0.4em] mb-1 block">StudyEasierAI Module</span>
          <h1 className="text-2xl font-black text-white tracking-tight uppercase">{title}</h1>
        </div>
        <div className="flex gap-3 no-print-zone">
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

      <div className="prose prose-invert max-w-none relative z-10">
        {formatSummary(summary)}
      </div>

      <div className="mt-20 pt-10 border-t border-slate-800 flex items-center justify-between text-slate-600 text-[10px] font-black uppercase tracking-widest relative z-10">
        <div className="flex items-center gap-4">
           <p>© {new Date().getFullYear()} StudyEasierAI</p>
           <div className="w-1 h-1 bg-slate-800 rounded-full"></div>
           <p>Academic Intelligence</p>
        </div>
        <p className="flex items-center gap-2">
           <i className="fas fa-shield-alt text-emerald-600"></i>
           Verified Generation
        </p>
      </div>

      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none"></div>
    </div>
  );
};

export default SummaryView;
