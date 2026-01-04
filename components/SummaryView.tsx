
import React, { useRef, useEffect, useState } from 'react';

interface SummaryViewProps {
  summary: string;
  title: string;
}

const SummaryView: React.FC<SummaryViewProps> = ({ summary, title }) => {
  const summaryRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    const renderMath = () => {
      if (document.compatMode === 'BackCompat') {
        console.warn("KaTeX skipped: Browser is in Quirks Mode. Ensure <!DOCTYPE html> is correct.");
        return;
      }
      
      if (summaryRef.current && (window as any).renderMathInElement) {
        try {
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
        } catch (e) {
          console.warn("KaTeX render failed", e);
        }
      }
    };

    const timeout = setTimeout(renderMath, 200);
    return () => clearTimeout(timeout);
  }, [summary]);

  const handleGeneratePDF = async () => {
    if (!summaryRef.current || isGenerating) return;

    const html2pdf = (window as any).html2pdf;
    if (!html2pdf) {
      alert("PDF engine is initializing. Please try again in a few seconds.");
      return;
    }

    setIsGenerating(true);

    const pdfWrapper = document.createElement('div');
    pdfWrapper.id = 'pdf-export-wrapper-temp';
    
    Object.assign(pdfWrapper.style, {
      position: 'fixed',
      top: '0',
      left: '-9999px',
      width: '850px',
      background: '#ffffff',
      color: '#000000',
      padding: '40px',
      zIndex: '-1',
      visibility: 'visible'
    });

    const styleTag = document.createElement('style');
    styleTag.textContent = `
      .pdf-content { font-family: 'Inter', sans-serif; line-height: 1.6; color: #000; }
      .pdf-content h1 { font-size: 26pt; color: #1e293b; margin-bottom: 20pt; border-bottom: 2pt solid #e2e8f0; padding-bottom: 10pt; font-weight: 800; }
      .pdf-content h2 { font-size: 18pt; color: #059669; margin-top: 24pt; margin-bottom: 12pt; font-weight: 700; border-left: 4pt solid #10b981; padding-left: 12pt; }
      .pdf-content h3 { font-size: 14pt; color: #10b981; margin-top: 18pt; margin-bottom: 8pt; font-weight: 600; }
      .pdf-content p, .pdf-content li { font-size: 11pt; color: #334155; margin-bottom: 10pt; }
      .pdf-content .katex { font-size: 1.1em; color: #047857 !important; }
      .pdf-content .katex-display { background: #f8fafc !important; padding: 15pt !important; border: 1pt solid #e2e8f0 !important; }
    `;
    pdfWrapper.appendChild(styleTag);

    const contentClone = summaryRef.current.cloneNode(true) as HTMLElement;
    const allAnimatedElements = contentClone.querySelectorAll('.animate-fadeIn, .opacity-0, .translate-y-10');
    allAnimatedElements.forEach(el => {
      (el as HTMLElement).classList.remove('animate-fadeIn', 'opacity-0', 'translate-y-10');
      (el as HTMLElement).style.opacity = '1';
      (el as HTMLElement).style.transform = 'none';
      (el as HTMLElement).style.animation = 'none';
    });

    contentClone.querySelectorAll('.no-print-export, .no-print-export-header').forEach(el => el.remove());

    const pdfContentDiv = document.createElement('div');
    pdfContentDiv.className = 'pdf-content';
    pdfContentDiv.appendChild(contentClone);
    pdfWrapper.appendChild(pdfContentDiv);
    
    document.body.appendChild(pdfWrapper);

    // Only attempt math re-render if in standard mode
    if ((window as any).renderMathInElement && document.compatMode !== 'BackCompat') {
      try {
        (window as any).renderMathInElement(pdfWrapper, {
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
      } catch (e) {}
    }

    const opt = {
      margin: 10,
      filename: `${title.replace(/\s+/g, '_')}_StudyModule.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2, 
        useCORS: true, 
        backgroundColor: '#ffffff',
        letterRendering: true
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      await html2pdf().set(opt).from(pdfWrapper).save();
    } catch (err) {
      console.error("PDF Export failed:", err);
    } finally {
      setIsGenerating(false);
      if (document.body.contains(pdfWrapper)) document.body.removeChild(pdfWrapper);
    }
  };

  const formatText = (text: string) => {
    const parts = text.split(/(\\\[[\s\S]*?\\\]|\\\(.*?\\\)|\[.*?\]|\(.*?\))/g);
    return parts.map((part, i) => {
      if (!part) return null;
      if (part.startsWith('\\(') || part.startsWith('\\[')) return <span key={i} className="katex-source">{part}</span>;
      if (part.startsWith('**') && part.endsWith('**')) return <strong key={i} className="font-bold text-emerald-400">{part.slice(2, -2)}</strong>;
      return part;
    });
  };

  const formatSummary = (text: string) => {
    const cleanText = text.replace(/<<<SUMMARY_START>>>|<<<SUMMARY_END>>>/g, '').trim();
    const lines = cleanText.split('\n');
    const elements: React.ReactNode[] = [];
    
    lines.forEach((line, i) => {
      const trimmed = line.trim();
      if (!trimmed) return elements.push(<div key={i} className="h-4" />);
      
      if (trimmed.startsWith('# ')) elements.push(<h1 key={i} className="text-3xl font-black mt-8 mb-6 text-white border-b border-slate-800 pb-4 uppercase">{formatText(trimmed.replace('# ', ''))}</h1>);
      else if (trimmed.startsWith('## ')) elements.push(<h2 key={i} className="text-2xl font-bold mt-8 mb-4 text-emerald-400 flex items-center gap-3"><span className="w-2 h-6 bg-emerald-500 rounded-full"></span>{formatText(trimmed.replace('## ', ''))}</h2>);
      else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) elements.push(<li key={i} className="ml-6 list-none mb-3 text-slate-300 relative pl-6 leading-relaxed"><span className="absolute left-0 text-emerald-500">•</span>{formatText(trimmed.substring(2))}</li>);
      else elements.push(<p key={i} className="mb-4 text-slate-300 text-lg leading-relaxed">{formatText(line)}</p>);
    });
    return elements;
  };

  return (
    <div ref={summaryRef} className="bg-[#0d0d0d] rounded-3xl shadow-2xl border border-slate-800 p-8 md:p-14 max-w-4xl mx-auto my-8 animate-fadeIn relative overflow-hidden">
      <div className="flex items-center gap-4 mb-12 pb-8 border-b border-slate-800 relative z-10 no-print-export-header">
        <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shrink-0">
          <i className="fas fa-graduation-cap text-xl"></i>
        </div>
        <div className="flex-1">
          <span className="text-indigo-400 font-black text-[10px] uppercase tracking-[0.4em] mb-1 block">StudyEasierAI Module</span>
          <h1 className="text-2xl font-black text-white tracking-tight uppercase">{title}</h1>
        </div>
        <div className="no-print-export">
          <button 
            onClick={handleGeneratePDF}
            disabled={isGenerating}
            className={`bg-indigo-600 text-white px-6 py-3 rounded-xl hover:bg-indigo-700 font-black text-xs uppercase tracking-widest transition-all flex items-center gap-3 ${isGenerating ? 'opacity-50' : ''}`}
          >
            {isGenerating ? <i className="fas fa-circle-notch animate-spin"></i> : <i className="fas fa-file-pdf"></i>}
            {isGenerating ? 'Generating...' : 'Export PDF'}
          </button>
        </div>
      </div>
      <div className="prose prose-invert max-w-none relative z-10">{formatSummary(summary)}</div>
    </div>
  );
};

export default SummaryView;
