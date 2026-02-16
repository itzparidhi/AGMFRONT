import React, { useState } from 'react';
import { X, Check, Download, Plus, Grid } from 'lucide-react';

interface BackgroundGridResultsModalProps {
    isOpen: boolean;
    onClose: () => void;
    urls: string[];
    onSaveToReferences: (urls: string[]) => void;
}

export const BackgroundGridResultsModal: React.FC<BackgroundGridResultsModalProps> = ({
    isOpen,
    onClose,
    urls,
    onSaveToReferences
}) => {
    const [selectedIndexes, setSelectedIndexes] = useState<number[]>([]);

    if (!isOpen) return null;

    const toggleSelection = (index: number) => {
        setSelectedIndexes(prev =>
            prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
        );
    };

    const handleDownload = (url: string, index: number) => {
        const link = document.createElement('a');
        link.href = url;
        link.download = `background_crop_${index + 1}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleSave = () => {
        const selectedUrls = selectedIndexes.map(i => urls[i]);
        onSaveToReferences(selectedUrls);
        setSelectedIndexes([]);
        onClose(); // Optional: Close on save?
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl max-w-4xl w-full flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-500/20 rounded-lg">
                            <Grid className="text-purple-400" size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Background Grid Results</h2>
                            <p className="text-xs text-zinc-400">Select images to add to references or download them.</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <X className="text-zinc-400 hover:text-white" size={24} />
                    </button>
                </div>

                {/* Grid */}
                <div className="p-6 overflow-y-auto flex-1">
                    <div className="grid grid-cols-3 gap-4">
                        {urls.map((url, index) => {
                            const isSelected = selectedIndexes.includes(index);
                            return (
                                <div key={index}
                                    className={`
                                        relative aspect-square group rounded-xl overflow-hidden cursor-pointer border-2 transition-all
                                        ${isSelected ? 'border-purple-500 ring-2 ring-purple-500/30' : 'border-transparent hover:border-white/20'}
                                    `}
                                    onClick={() => toggleSelection(index)}
                                >
                                    <img src={url} alt={`Crop ${index + 1}`} className="w-full h-full object-cover" />

                                    {/* Overlay */}
                                    <div className={`absolute inset-0 bg-black/40 transition-opacity flex items-center justify-center ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                        {isSelected && <Check className="text-purple-400 w-10 h-10 drop-shadow-md" strokeWidth={3} />}
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="absolute top-2 right-2 flex gap-1 transform translate-y-[-10px] opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDownload(url, index); }}
                                            className="p-1.5 bg-black/60 hover:bg-black/90 rounded-lg text-white backdrop-blur-sm"
                                            title="Download"
                                        >
                                            <Download size={14} />
                                        </button>
                                    </div>

                                    {/* Index Badge */}
                                    <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/60 rounded text-[10px] font-mono font-bold text-zinc-400">
                                        #{index + 1}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-white/10 flex justify-between items-center bg-zinc-900/50 rounded-b-2xl">
                    <span className="text-sm text-zinc-400 font-medium">
                        {selectedIndexes.length} selected
                    </span>
                    <button
                        onClick={handleSave}
                        disabled={selectedIndexes.length === 0}
                        className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-bold text-sm flex items-center gap-2 transition-all shadow-lg shadow-purple-900/20"
                    >
                        <Plus size={16} />
                        Add to References
                    </button>
                </div>
            </div>
        </div>
    );
};
