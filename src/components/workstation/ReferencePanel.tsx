import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, ArrowLeft } from 'lucide-react';
import { DriveImage } from '../DriveImage';
import { supabase } from '../../supabaseClient';
import type { Shot, UserProfile } from '../../types';

interface Character {
    id: string;
    name: string;
    gdrive_link: string;
}

interface ReferencePanelProps {
    shot: Shot;
    userProfile: UserProfile | null;
    uploadingRefs: {
        storyboard: boolean;
        style: boolean;
    };
    openAccordion: string | null;
    toggleAccordion: (id: string) => void;
    handleReferenceUpload: (e: React.ChangeEvent<HTMLInputElement>, type: 'storyboard' | 'style') => void;
    setFullScreenImage: (url: string | null) => void;
    setZoomLevel: (level: number) => void;
    navigate: any;
    projectId: string | null;
    episodeId: string | null;
    selectedBackgroundUrl: string | null;
    setSelectedBackgroundUrl: (url: string | null) => void;
}

export const ReferencePanel: React.FC<ReferencePanelProps> = ({
    shot,
    userProfile,
    uploadingRefs,
    openAccordion,
    toggleAccordion,
    handleReferenceUpload,
    setFullScreenImage,
    setZoomLevel,
    navigate,
    projectId,
    episodeId,
    selectedBackgroundUrl,
    setSelectedBackgroundUrl,
}) => {
    const [characters, setCharacters] = useState<Character[]>([]);

    // Fetch character resources from the project
    useEffect(() => {
        const fetchCharacters = async () => {
            if (!projectId) return;

            const { data } = await supabase
                .from('resources')
                .select('id, name, gdrive_link')
                .eq('project_id', projectId)
                .eq('type', 'character');

            if (data) setCharacters(data);
        };

        fetchCharacters();
    }, [projectId]);

    const handleFullScreen = (url: string | null) => {
        if (url) {
            setFullScreenImage(url);
            setZoomLevel(1);
        }
    };

    const getPreviewUrl = (gdriveLink: string) => {
        // Supabase or Direct URL check
        if (gdriveLink.includes('supabase.co') || gdriveLink.startsWith('http')) return gdriveLink;

        const match = gdriveLink.match(/\/d\/([^\/]+)/);
        if (match) {
            return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w200`;
        }
        return gdriveLink.replace('/view', '/preview');
    };

    return (
        <div className="w-full">
            <button 
                onClick={() => {
                   // Navigate to Timeline (Episode view) if episode_id exists
                   if (projectId && episodeId) {
                       navigate(`/project/${projectId}/episode/${episodeId}`);
                   } else if (projectId && shot.scene_id) {
                       // Fallback to Scene Detail if no episode
                       navigate(`/project/${projectId}/scene/${shot.scene_id}`);
                   } else {
                       navigate(-1);
                   }
                }} 
                className="mb-4 text-zinc-400 hover:text-white flex items-center gap-2 transition-colors"
            >
                <ArrowLeft size={20} /> Back
            </button>

            <h1 className="text-2xl font-bold mb-6 text-white">References</h1>

            {/* Storyboard Reference Accordion */}
            <div className="border border-zinc-700 rounded bg-zinc-800/30 overflow-hidden mb-1">
                <button
                    onClick={() => toggleAccordion('storyboard')}
                    className="w-full flex items-center justify-between p-3 hover:bg-zinc-800 transition-colors"
                >
                    <span className="text-xs font-bold text-zinc-400 flex items-center gap-2">
                        {openAccordion === 'storyboard' ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        Storyboard Reference
                    </span>

                    <div className="flex items-center gap-3">
                        {(userProfile?.role === 'CD' || userProfile?.role === 'PM') && (
                            <label
                                className="text-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2 py-0.5 rounded cursor-pointer border border-zinc-600"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {uploadingRefs.storyboard ? '...' : 'Upload'}
                                <input
                                    type="file"
                                    className="hidden"
                                    onChange={(e) => handleReferenceUpload(e, 'storyboard')}
                                    disabled={uploadingRefs.storyboard}
                                    accept="image/*"
                                />
                            </label>
                        )}
                        {shot.storyboard_url && (
                            <span className="text-[10px] bg-zinc-700 text-zinc-300 px-1.5 py-0.5 rounded-full">
                                1
                            </span>
                        )}
                    </div>
                </button>

                {openAccordion === 'storyboard' && (
                    <div className="p-3 border-t border-zinc-700 bg-zinc-900/50">
                        {shot.storyboard_url ? (
                            <div
                                className="w-full rounded border border-zinc-700 cursor-zoom-in overflow-hidden"
                                onClick={() => handleFullScreen(shot.storyboard_url)}
                            >
                                <DriveImage
                                    src={shot.storyboard_url}
                                    alt="Storyboard"
                                    className="w-full"
                                />
                            </div>
                        ) : (
                            <div className="aspect-video flex items-center justify-center bg-zinc-800 rounded border border-zinc-700 border-dashed text-zinc-500">
                                No Storyboard
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Characters Accordion */}
            <div className="border border-zinc-700 rounded bg-zinc-800/30 overflow-hidden mb-1">
                <button
                    onClick={() => toggleAccordion('characters')}
                    className="w-full flex items-center justify-between p-3 hover:bg-zinc-800 transition-colors"
                >
                    <span className="text-xs font-bold text-zinc-400 flex items-center gap-2">
                        {openAccordion === 'characters' ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        Characters
                    </span>
                    <div className="flex items-center gap-3">
                        {characters.length > 0 && (
                            <span className="text-[10px] bg-zinc-700 text-zinc-300 px-1.5 py-0.5 rounded-full">
                                {characters.length}
                            </span>
                        )}
                    </div>
                </button>

                {openAccordion === 'characters' && (
                    <div className="p-3 border-t border-zinc-700 bg-zinc-900/50">
                        {characters.length > 0 ? (
                            <div className="grid grid-cols-2 gap-2">
                                {characters.map((character) => (
                                    <div
                                        key={character.id}
                                        className="relative aspect-square rounded border border-zinc-700 cursor-zoom-in overflow-hidden group"
                                        onClick={() => handleFullScreen(getPreviewUrl(character.gdrive_link))}
                                    >
                                        <img
                                            src={getPreviewUrl(character.gdrive_link)}
                                            alt={character.name}
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect fill="%23333" width="200" height="200"/><text fill="%23999" x="50%" y="50%" text-anchor="middle" dy=".3em">No Image</text></svg>';
                                            }}
                                        />
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                                        <div className="absolute bottom-0 left-0 right-0 bg-black/70 backdrop-blur-sm p-1.5">
                                            <p className="text-[10px] text-white font-medium truncate">{character.name}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-4 text-zinc-600 text-xs italic">
                                No characters yet. <br /> Add characters in the Resources panel.
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Background References Accordion */}
            <div className="border border-zinc-700 rounded bg-zinc-800/30 overflow-hidden mb-6">
                <button
                    onClick={() => toggleAccordion('backgrounds')}
                    className="w-full flex items-center justify-between p-3 hover:bg-zinc-800 transition-colors"
                >
                    <span className="text-xs font-bold text-zinc-400 flex items-center gap-2">
                        {openAccordion === 'backgrounds' ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        Background References
                    </span>
                    <div className="flex items-center gap-3">
                        {shot.background_urls && shot.background_urls.length > 0 && (
                            <span className="text-[10px] bg-zinc-700 text-zinc-300 px-1.5 py-0.5 rounded-full">
                                {shot.background_urls.length}
                            </span>
                        )}
                    </div>
                </button>

                {openAccordion === 'backgrounds' && (
                    <div className="p-3 border-t border-zinc-700 bg-zinc-900/50">
                        {shot.background_urls && shot.background_urls.length > 0 ? (
                            <div className="grid grid-cols-2 gap-2">
                                {shot.background_urls.map((url, idx) => (
                                    <div
                                        key={idx}
                                        className={`
                                            relative aspect-square rounded border cursor-pointer overflow-hidden group transition-all
                                            ${selectedBackgroundUrl === url
                                                ? 'border-[#FFFFF0] ring-2 ring-[#FFFFF0]/50' // Ivory highlight
                                                : 'border-zinc-700 hover:border-zinc-500'
                                            }
                                        `}
                                        onClick={() => {
                                            // Toggle selection
                                            setSelectedBackgroundUrl(selectedBackgroundUrl === url ? null : url);
                                        }}
                                        onDoubleClick={(e) => {
                                            e.stopPropagation();
                                            setFullScreenImage(url);
                                        }}
                                    >
                                        <img src={url} alt={`Background ${idx + 1}`} className="w-full h-full object-cover" />

                                        {/* Selection Indicator Overlay */}
                                        {selectedBackgroundUrl === url && (
                                            <div className="absolute inset-0 border-4 border-[#FFFFF0] pointer-events-none" />
                                        )}

                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-4 text-zinc-600 text-xs italic">
                                No background references yet. <br /> Use "Background Grid" mode to generate some.
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
