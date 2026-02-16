import React, { useState, useRef, useEffect } from 'react';
import { Check, LayoutGrid, List, Columns, Image, ChevronDown } from 'lucide-react';
import type { ViewMode } from '../types';

interface ViewSelectorProps {
  currentMode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
}

export const ViewSelector: React.FC<ViewSelectorProps> = ({ currentMode, onModeChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const options: { id: ViewMode; label: string; icon: any }[] = [
    // { id: 'icons', label: 'as Icons', icon: LayoutGrid },
    { id: 'list', label: 'as List', icon: List },
    { id: 'columns', label: 'as Columns', icon: Columns },
    { id: 'gallery', label: 'as Gallery', icon: Image },
  ];

  const ActiveIcon = options.find(opt => opt.id === currentMode)?.icon || LayoutGrid;

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-2 py-1 bg-zinc-800 border border-zinc-700 rounded hover:bg-zinc-700 transition-colors text-sm"
      >
        <ActiveIcon size={16} className="text-zinc-400" />
        <ChevronDown size={14} className="text-zinc-500" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-44 glass-panel border border-white/20 rounded-lg shadow-glass p-1 z-[100] animate-in fade-in zoom-in duration-75">
          {options.map((option) => (
            <button
              key={option.id}
              onClick={() => {
                onModeChange(option.id);
                setIsOpen(false);
              }}
              className={`flex items-center w-full px-2 py-1.5 text-sm rounded-md transition-colors ${
                currentMode === option.id 
                  ? 'bg-white/10 text-white font-medium' 
                  : 'text-zinc-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              <span className="w-5 flex items-center">
                {currentMode === option.id && <Check size={14} strokeWidth={3} />}
              </span>
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};