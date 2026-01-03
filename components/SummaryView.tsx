
import React, { useRef, useEffect } from 'react';

interface SummaryViewProps {
  summary: string;
  title: string;
}

const SummaryView: React.FC<SummaryViewProps> = ({ summary, title }) => {
  const summaryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const renderMath = () => {
      if (summaryRef.current && (window as any).renderMathInElement) {
        (window as any).renderMathInElement(summaryRef.current, {
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
  }, [summary]);

  const formatText = (text: string) => {
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

  const handleGeneratePDF = async () => {
    if (!summaryRef.current) return;

    // Create a temporary container for PDF generation to avoid visible layout shifts
    const pdfContainer = document.createElement('div');
    pdfContainer.style.position = 'absolute';
    pdfContainer.style.left = '-9999px';
    pdfContainer.style.top = '-9999px';
    pdfContainer.style.width = '800px'; // Standard width for high-quality scaling
    pdfContainer.className = 'pdf-export-root';
    
    // Clone the summary content
    const contentClone = summaryRef.current.cloneNode(true) as HTMLElement;
    
    // Remove UI elements that shouldn't be in the PDF
    const noPrintElements = contentClone.querySelectorAll('.no-print-zone');
    noPrintElements.forEach(el => el.remove());

    // Inject styles specifically for PDF rendering to preserve colors and layout
    const style = document.createElement('style');
    style.innerHTML = `
      .pdf-export-root {
        background-color: #0d0d0d !important;
        color: #f1f5f9 !important;
        font-family: 'Inter', sans-serif !important;
        padding: 60px !important;
      }
      .pdf-export-root h1 { color: #ffffff !important; font-weight: 900 !important; }
      .pdf-export-root h2 { color: #10b981 !important; font-weight: 800 !important; margin-top: 40px !important; }
      .pdf-export-root h3 { color: #34d399 !important; font-weight: 700 !important; }
      .pdf-export-root p, .pdf-export-root li { color: #cbd5e1 !important; line-height: 1.6 !important; margin-bottom: 16px !important; }
      .pdf-export-root .text-emerald-400 { color: #10b981 !important; }
      .pdf-export-root .text-indigo-400 { color: #818cf8 !important; }
      .pdf-export-root .bg-emerald-500 { background-color: #10b981 !important; }
      .pdf-export-root .bg-indigo-600 { background-color: #4f46e5 !important; }
      .pdf-export-root .border-slate-800 { border-color: #1e293b !important; }
      .pdf-export-root .katex { color: #10b981 !important; }
      .pdf-export-root img { border-radius: 12px !important; max-width: 100% !important; margin: 30px 0 !important; }
    `;
    
    pdfContainer.appendChild(style);
    pdfContainer.appendChild(contentClone);
    document.body.appendChild(pdfContainer);

    const opt = {
      margin: 10,
      filename: `${title.replace(/\s+/g, '_')}_StudySummary.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2, 
        useCORS: true, 
        backgroundColor: '#0d0d0d',
        letterRendering: true,
        logging: false
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    try {
      // @ts-ignore
      await window.html2pdf().set(opt).from(pdfContainer).save();
    } catch (error) {
      console.error('PDF Generation Error:', error);
    } finally {
      document.body.removeChild(pdfContainer);
    }
  };

  const formatSummary = (text: string) => {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let mathBuffer: string[] = [];
    let inMathBlock = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      if (trimmed.startsWith('$$')) {
        if (trimmed.endsWith('$$') && trimmed.length > 2 && !inMathBlock) {
          elements.push(
            <div key={`math-single-${i}`} className="my-6 bg-emerald-500/5 p-5 rounded-2xl border border-emerald-500/10 overflow-x-auto text-center font-serif">
              {line}
            </div>
          );
          continue;
        }

        if (inMathBlock) {
          mathBuffer.push(line);
          elements.push(
            <div key={`math-block-${i}`} className="my-6 bg-emerald-500/5 p-5 rounded-2xl border border-emerald-500/10 overflow-x-auto text-center font-serif whitespace-pre-wrap">
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
        continue;
      }

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

      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        elements.push(
          <li key={i} className="ml-6 list-none mb-3 text-slate-300 relative pl-6 leading-relaxed">
            <span className="absolute left-0 text-emerald-500 font-black top-0">•</span>
            {formatText(trimmed.substring(2))}
          </li>
        );
        continue;
      }

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
