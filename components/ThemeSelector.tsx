
import React, { useState, useRef, useEffect } from 'react';
import { AppTheme } from '../types';

interface ThemeSelectorProps {
  currentTheme: AppTheme;
  onThemeChange: (theme: AppTheme) => void;
}

const ThemeSelector: React.FC<ThemeSelectorProps> = ({ currentTheme, onThemeChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const themes: { id: AppTheme; name: string; color: string; icon: string }[] = [
    { id: 'default', name: 'Cyber Deck', color: 'bg-[#0a0a0a]', icon: 'fa-microchip' },
    { id: 'light', name: 'Academic Paper', color: 'bg-[#f8fafc]', icon: 'fa-book-open' },
    { id: 'midnight', name: 'Midnight OLED', color: 'bg-black', icon: 'fa-moon' },
    { id: 'forest', name: 'Deep Forest', color: 'bg-[#051a10]', icon: 'fa-tree' },
  ];

  const activeTheme = themes.find(t => t.id === currentTheme) || themes[0];

  return (
    <div className="absolute top-6 right-8 z-50 theme-selector" ref={menuRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 bg-surface border border-border px-4 py-2.5 rounded-full shadow-lg hover:border-indigo-500/50 transition-all group"
      >
        <div className={`w-4 h-4 rounded-full ${activeTheme.color} border border-slate-600 shadow-sm`}></div>
        <span className="text-text-main text-xs font-bold uppercase tracking-widest hidden md:block">{activeTheme.name}</span>
        <i className={`fas fa-chevron-down text-text-muted text-[10px] transition-transform ${isOpen ? 'rotate-180' : ''}`}></i>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-14 w-48 bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden animate-fadeIn">
          {themes.map(theme => (
            <button
              key={theme.id}
              onClick={() => { onThemeChange(theme.id); setIsOpen(false); }}
              className={`w-full text-left px-5 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors ${currentTheme === theme.id ? 'bg-indigo-600/10' : ''}`}
            >
              <div className={`w-3 h-3 rounded-full ${theme.color} border border-slate-600`}></div>
              <span className={`text-xs font-bold ${currentTheme === theme.id ? 'text-indigo-400' : 'text-text-main'}`}>
                {theme.name}
              </span>
              {currentTheme === theme.id && <i className="fas fa-check text-indigo-400 ml-auto text-xs"></i>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ThemeSelector;
