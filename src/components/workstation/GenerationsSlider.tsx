import React from 'react';
import { RefreshCw, Loader2 } from 'lucide-react';
import type { Generation } from '../../types';

interface GenerationsSliderProps {
    generations: Generation[];
    selectedGeneration: Generation | null;
    setSelectedGeneration: (gen: Generation | null) => void;
    onRestore: (gen: Generation) => void;
}

export const GenerationsSlider: React.FC<GenerationsSliderProps> = ({
    generations,
    selectedGeneration,
    setSelectedGeneration,
    onRestore,
}) => {
    return (
        <div className="w-full mt-2">
            <h3 className="text-[10px] font-bold text-zinc-500 mb-3 uppercase tracking-wider pl-1">Generations History</h3>
            <div className="flex gap-3 overflow-x-auto pb-4 px-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                {generations.map((gen) => (
                    <div
                        key={gen.id}
                        onClick={() => setSelectedGeneration(gen)}
                        className={`
              relative flex-shrink-0 w-36 aspect-video rounded-lg border cursor-pointer overflow-hidden transition-all duration-300 group shadow-md hover:shadow-xl hover:-translate-y-1
              ${selectedGeneration?.id === gen.id ? 'border-zinc-300 ring-2 ring-zinc-300/30 shadow-lg scale-[1.02]' : 'border-white/10 hover:border-white/30'}
            `}
                    >
                        {gen.status === 'pending' && !gen.image_url ? (
                            <div className="w-full h-full bg-black/40 flex flex-col items-center justify-center gap-2 backdrop-blur-sm">
                                <Loader2 className="animate-spin text-white" size={20} />
                                <span className="text-[10px] text-zinc-400 font-mono tracking-widest">GENERATING</span>
                            </div>
                        ) : gen.status === 'failed' ? (
                            <div className="w-full h-full bg-red-900/40 border border-red-500/30 flex flex-col items-center justify-center gap-2 backdrop-blur-sm relative group">
                                <RefreshCw className="text-red-400 mb-1" size={24} />
                                <span className="text-[10px] text-red-200 font-mono tracking-widest uppercase">Failed</span>
                                <span className="text-[8px] text-red-300 px-2 text-center line-clamp-2">{gen.ref_data?.error || "Unknown Error"}</span>

                                {/* Restore Button for Failed Items */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onRestore(gen);
                                    }}
                                    className="absolute top-1 right-1 p-1.5 bg-black/60 hover:bg-zinc-700 rounded-md text-white opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm shadow-lg border border-white/5"
                                    title="Restore Settings & Retry"
                                >
                                    <RefreshCw size={12} />
                                </button>
                            </div>
                        ) : (
                            <>
                                <img src={gen.image_url} className="w-full h-full object-cover" alt={gen.prompt} />

                                {/* Restore Button */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onRestore(gen);
                                    }}
                                    className="absolute top-1 right-1 p-1.5 bg-black/60 hover:bg-zinc-700 rounded-md text-white opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm shadow-lg border border-white/5"
                                    title="Restore Settings"
                                >
                                    <RefreshCw size={12} />
                                </button>
                            </>
                        )}
                    </div>
                ))}
                {generations.length === 0 && (
                    <div className="text-zinc-600 text-xs p-4 w-full text-center border border-dashed border-zinc-700 rounded-lg">
                        No generations yet
                    </div>
                )}
            </div>
        </div>
    );
};
