
import React, { useRef, useState } from 'react';

interface FileUploadProps {
  onUpload: (file: File) => void;
  onUrlSubmit: (url: string) => void;
  isLoading: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ onUpload, onUrlSubmit, isLoading }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [activeTab, setActiveTab] = useState<'file' | 'url'>('file');
  const [url, setUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      validateAndProcess(files[0]);
    }
  };

  const validateAndProcess = (file: File) => {
    const validTypes = [
      'application/pdf', 
      'audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/m4a'
    ];
    // Strictly filter out video types
    if (validTypes.includes(file.type) || (file.type.startsWith('audio/') && !file.type.startsWith('video/'))) {
      onUpload(file);
    } else {
      alert("Please upload a valid PDF or Audio file.");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndProcess(e.target.files[0]);
    }
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      onUrlSubmit(url.trim());
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-4 md:p-8 animate-fadeIn">
      {/* Tab Switcher */}
      <div className="flex bg-surface p-1.5 rounded-2xl mb-6 border border-border max-w-xs mx-auto shadow-sm">
        <button 
          onClick={() => setActiveTab('file')}
          className={`flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'file' ? 'bg-indigo-600 text-white shadow-lg' : 'text-text-muted hover:text-text-main'}`}
        >
          <i className="fas fa-file-upload mr-2"></i> File
        </button>
        <button 
          onClick={() => setActiveTab('url')}
          className={`flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'url' ? 'bg-red-600 text-white shadow-lg' : 'text-text-muted hover:text-text-main'}`}
        >
          <i className="fab fa-youtube mr-2"></i> Link
        </button>
      </div>

      <div className="bg-surface2 rounded-3xl border border-border p-8 shadow-2xl relative overflow-hidden">
        {activeTab === 'file' ? (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !isLoading && fileInputRef.current?.click()}
            className={`relative flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-2xl transition-all cursor-pointer ${
              isDragging ? 'border-indigo-500 bg-indigo-500/5' : 'border-border hover:border-indigo-500/50 hover:bg-surface'
            } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".pdf,audio/*"
              className="hidden"
              disabled={isLoading}
            />
            
            <div className="text-center">
              <div className="mb-6 inline-flex items-center justify-center w-16 h-16 bg-indigo-600/10 text-indigo-500 rounded-2xl shadow-xl">
                <i className="fas fa-file-audio text-2xl"></i>
              </div>
              <h3 className="text-xl font-bold text-text-main mb-2 uppercase tracking-tight">
                Upload Content
              </h3>
              <p className="text-text-muted text-sm max-w-sm px-4 leading-relaxed font-medium">
                Drop a PDF or <span className="text-indigo-400 font-bold">Audio Recording</span> for advanced AI analysis.
              </p>
              <div className="mt-6 flex gap-6 justify-center text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">
                <span className="flex items-center gap-2"><i className="fas fa-file-pdf text-indigo-500"></i> PDF</span>
                <span className="flex items-center gap-2"><i className="fas fa-microphone text-indigo-500"></i> AUDIO</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center py-6">
            <div className="mb-8 inline-flex items-center justify-center w-16 h-16 bg-red-600/10 text-red-500 rounded-2xl shadow-xl">
              <i className="fab fa-youtube text-2xl"></i>
            </div>
            
            <div className="inline-block bg-red-600/20 text-red-500 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest mb-6 border border-red-600/20">
              <i className="fas fa-search mr-2"></i> Deep Grounding Active
            </div>

            <h3 className="text-xl font-bold text-text-main mb-2 uppercase tracking-tight">
              YouTube Analysis
            </h3>
            <p className="text-text-muted text-sm mb-8 text-center max-w-sm leading-relaxed font-medium">
              Provide a YouTube URL. Our AI will research the topic, extract key points from the transcript, and generate a consistent English study package.
            </p>
            <form onSubmit={handleUrlSubmit} className="w-full relative group">
              <input 
                type="url"
                required
                placeholder="https://www.youtube.com/watch?v=..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full bg-surface border-2 border-border rounded-2xl px-6 py-4 pr-16 text-sm text-text-main outline-none transition-all focus:border-red-600 shadow-2xl font-medium"
              />
              <button 
                type="submit"
                disabled={isLoading || !url.trim()}
                className="absolute right-2 top-2 w-12 h-12 rounded-xl bg-red-600 text-white flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:bg-red-700 transition-all shadow-lg shadow-red-600/20"
              >
                <i className={`fas ${isLoading ? 'fa-spinner fa-spin' : 'fa-arrow-right'}`}></i>
              </button>
            </form>
            <p className="mt-6 text-[9px] text-text-muted font-bold uppercase tracking-widest text-center">
              Processing may take 30-60s for deep transcript grounding.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileUpload;
