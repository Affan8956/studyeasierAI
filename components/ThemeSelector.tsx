
import React, { useState, useRef, useEffect } from 'react';
import { AppTheme, CustomThemeColors } from '../types';

interface ThemeSelectorProps {
  currentTheme: AppTheme;
  onThemeChange: (theme: AppTheme) => void;
  customColors?: CustomThemeColors;
  onCustomColorChange?: (colors: Partial<CustomThemeColors>) => void;
}

const ThemeSelector: React.FC<ThemeSelectorProps> = ({ currentTheme, onThemeChange, customColors, onCustomColorChange }) => {
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
    { id: 'light', name: 'Light Mode', color: 'bg-[#f8fafc]', icon: 'fa-sun' },
    { id: 'eyecare', name: 'EyeCare Mode', color: 'bg-[#1c1917]', icon: 'fa-eye-slash' },
    { id: 'custom', name: 'Custom Mode', color: 'bg-gradient-to-br from-indigo-500 to-purple-500', icon: 'fa-palette' },
  ];

  const activeTheme = themes.find(t => t.id === currentTheme) || themes[0];

  return (
    <div className="absolute top-4 right-4 md:top-6 md:right-8 z-50 theme-selector" ref={menuRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 bg-surface border border-border px-3 md:px-4 py-2 md:py-2.5 rounded-full shadow-lg hover:border-indigo-500/50 transition-all group"
      >
        <div className={`w-3 h-3 md:w-4 md:h-4 rounded-full ${activeTheme.color} border border-border shadow-sm`}></div>
        <span className="text-text-main text-xs font-bold uppercase tracking-widest hidden md:block">{activeTheme.name}</span>
        <i className={`fas fa-chevron-down text-text-muted text-[10px] transition-transform ${isOpen ? 'rotate-180' : ''}`}></i>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-12 md:top-14 w-64 bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden animate-fadeIn">
          {themes.map(theme => (
            <button
              key={theme.id}
              onClick={() => { onThemeChange(theme.id); if(theme.id !== 'custom') setIsOpen(false); }}
              className={`w-full text-left px-5 py-3 flex items-center gap-3 hover:bg-surface2 transition-colors ${currentTheme === theme.id ? 'bg-indigo-600/10' : ''}`}
            >
              <div className={`w-3 h-3 rounded-full ${theme.color} border border-border`}></div>
              <span className={`text-xs font-bold ${currentTheme === theme.id ? 'text-indigo-400' : 'text-text-main'}`}>
                {theme.name}
              </span>
              {currentTheme === theme.id && <i className="fas fa-check text-indigo-400 ml-auto text-xs"></i>}
            </button>
          ))}

          {currentTheme === 'custom' && customColors && onCustomColorChange && (
            <div className="p-4 border-t border-border bg-surface2/50 space-y-3">
              <h4 className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-2">Palette Configuration</h4>
              
              <div className="flex items-center justify-between">
                <label className="text-xs text-text-main font-bold">App Background</label>
                <div className="relative overflow-hidden w-6 h-6 rounded-full border border-border shadow-sm">
                  <input 
                    type="color" 
                    value={customColors.bgApp} 
                    onChange={(e) => onCustomColorChange({ bgApp: e.target.value })}
                    className="absolute -top-2 -left-2 w-10 h-10 cursor-pointer p-0 border-0"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-xs text-text-main font-bold">Card Surface</label>
                <div className="relative overflow-hidden w-6 h-6 rounded-full border border-border shadow-sm">
                  <input 
                    type="color" 
                    value={customColors.bgSurface} 
                    onChange={(e) => onCustomColorChange({ bgSurface: e.target.value })}
                    className="absolute -top-2 -left-2 w-10 h-10 cursor-pointer p-0 border-0"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-xs text-text-main font-bold">Text Color</label>
                <div className="relative overflow-hidden w-6 h-6 rounded-full border border-border shadow-sm">
                  <input 
                    type="color" 
                    value={customColors.textMain} 
                    onChange={(e) => onCustomColorChange({ textMain: e.target.value })}
                    className="absolute -top-2 -left-2 w-10 h-10 cursor-pointer p-0 border-0"
                  />
                </div>
              </div>

               <div className="flex items-center justify-between">
                <label className="text-xs text-text-main font-bold">Accent / Border</label>
                <div className="relative overflow-hidden w-6 h-6 rounded-full border border-border shadow-sm">
                  <input 
                    type="color" 
                    value={customColors.borderBase} 
                    onChange={(e) => onCustomColorChange({ borderBase: e.target.value })}
                    className="absolute -top-2 -left-2 w-10 h-10 cursor-pointer p-0 border-0"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ThemeSelector;
