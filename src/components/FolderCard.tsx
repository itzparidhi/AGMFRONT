import React, { useState } from 'react';
import type { Asset } from '../types';
import { Trash2, Folder, File, ChevronRight } from 'lucide-react';

interface FolderCardProps {
    name: string;
    onClick: () => void;
    onDelete?: () => void;
    type: 'project' | 'folder';
    itemCount?: number;
    disabled?: boolean;
}

export const FolderCard: React.FC<FolderCardProps> = ({ name, onClick, onDelete, type, itemCount = 0, disabled }) => {
    
    // Stop propagation for delete
    const handleDeleteClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onDelete) onDelete();
    };

    return (
        <div
            onClick={disabled ? undefined : onClick}
            className={`group relative flex flex-col items-center justify-center p-6 transition-all duration-300 hover:scale-105 cursor-pointer
       ${disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
        >
            {/* Delete Button - Only for folders if provided */}
            {onDelete && (
                <button
                    onClick={handleDeleteClick}
                    className="absolute top-2 right-2 z-20 p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-all opacity-0 group-hover:opacity-100 duration-300"
                    title="Delete folder"
                >
                    <Trash2 size={14} />
                </button>
            )}
            
            <div className="absolute inset-0 blur-[60px] rounded-full opacity-0 group-hover:opacity-10 transition-opacity duration-500 bg-blue-500" />

            {/* Folder Visuals - Scaled down */}
            <div className="relative w-40 h-32 flex flex-col">
                
                {/* 1. Folder Tab (Back Layer) */}
                <div className={`absolute top-0 left-0 w-14 h-5 rounded-t-lg border-t border-l border-r border-white/10 shadow-sm transition-colors duration-300 
                    ${type === 'project' ? 'bg-[#2a2a2e]' : 'bg-[#3f3f46]'}`} 
                />

                {/* 2. Main Folder Body (Back) */}
                <div className={`absolute bottom-0 w-full h-[88%] rounded-lg rounded-tl-none border border-white/5 shadow-xl transition-colors duration-300
                    ${type === 'project' ? 'bg-[#1c1c1f]' : 'bg-[#27272a]'}`} 
                />

                {/* 3. Paper Documents (Hint at content) */}
                <div className="absolute top-3 left-1/2 -translate-x-1/2 w-[85%] h-full flex justify-center gap-1 opacity-80 group-hover:-translate-y-2 transition-transform duration-300">
                    <div className="w-[90%] h-20 bg-white/5 rounded-sm border border-white/5" />
                </div>

                {/* 4. Front Glass Flap */}
                <div className={`absolute bottom-0 w-full h-[85%] rounded-lg bg-gradient-to-br backdrop-blur-xl border border-white/10 shadow-inner flex flex-col justify-end px-3 pb-3 overflow-hidden
                    ${type === 'project' 
                        ? 'from-[#3a3a3e]/90 to-[#18181b]/95' 
                        : 'from-[#52525b]/90 to-[#27272a]/95'}`}
                >
                    {/* Highlight */}
                    <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />

                    {/* Folder Icon Watermark */}
                    <div className="absolute right-[-10px] bottom-[-10px] opacity-5 rotate-[-15deg]">
                        <Folder size={64} />
                    </div>

                    {/* Label */}
                    <div className="relative z-10 w-full">
                        <div className="flex items-center gap-1.5 mb-1 opacity-50">
                             {type === 'project' ? <Folder size={10} /> : <File size={10} />}
                             <span className="text-[9px] uppercase tracking-wider font-bold">
                                {type === 'project' ? 'Project' : 'Folder'}
                             </span>
                        </div>
                        <div className="text-sm font-semibold text-white/90 truncate leading-tight" title={name}>
                            {name}
                        </div>
                        {itemCount > 0 && (
                            <div className="text-[10px] text-zinc-500 mt-1 font-mono">
                                {itemCount} items
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
