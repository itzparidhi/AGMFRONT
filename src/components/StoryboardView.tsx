import React, { useState, useEffect } from 'react';
import {
    getStoryboardEpisodes,
    getScenes,
    getShots,
    uploadStoryboardImage,
    createStructure,
    createStructureWithSequence,
    renumberScenes
} from '../api';
import type { Episode, Scene, Shot } from '../types';
import { Loader2, Plus, Image as ImageIcon, ChevronRight, UploadCloud, Film, Video, RefreshCcw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDialog } from '../context/DialogContext';

interface StoryboardViewProps {
    projectId: string;
}

export const StoryboardView: React.FC<StoryboardViewProps> = ({ projectId }) => {
    const { userProfile } = useAuth();
    const dialog = useDialog();

    // Hierarchy State
    const [episodes, setEpisodes] = useState<Episode[]>([]);
    const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null);

    const [scenes, setScenes] = useState<Scene[]>([]);
    const [selectedScene, setSelectedScene] = useState<Scene | null>(null);

    const [shots, setShots] = useState<Shot[]>([]);

    // Loading States
    const [loadingEpisodes, setLoadingEpisodes] = useState(false);
    const [loadingScenes, setLoadingScenes] = useState(false);
    const [loadingShots, setLoadingShots] = useState(false);
    const [uploadingShotId, setUploadingShotId] = useState<string | null>(null);
    const [isBulkUploading, setIsBulkUploading] = useState(false);
    const bulkInputRef = React.useRef<HTMLInputElement>(null);

    // Initial Fetch
    useEffect(() => {
        if (projectId) {
            fetchEpisodes();
        } else {
            // Reset if project unselected
            setEpisodes([]);
            setSelectedEpisode(null);
            setSelectedScene(null);
        }
    }, [projectId]);

    // Fetch Scenes when Episode selected
    useEffect(() => {
        if (selectedEpisode) {
            fetchScenes(selectedEpisode.id);
        } else {
            setScenes([]);
            setSelectedScene(null);
        }
    }, [selectedEpisode]);

    // Fetch Shots when Scene selected
    useEffect(() => {
        if (selectedScene) {
            fetchShots(selectedScene.id);
        } else {
            setShots([]);
        }
    }, [selectedScene]);

    const fetchEpisodes = async () => {
        setLoadingEpisodes(true);
        try {
            const data = await getStoryboardEpisodes(projectId);
            setEpisodes(data);
        } catch (err) {
            console.error("Failed to fetch episodes", err);
        } finally {
            setLoadingEpisodes(false);
        }
    };

    const fetchScenes = async (episodeId: string) => {
        setLoadingScenes(true);
        try {
            const data = await getScenes(episodeId);
            setScenes(data);
        } catch (err) {
            console.error("Failed to fetch scenes", err);
        } finally {
            setLoadingScenes(false);
        }
    };

    const fetchShots = async (sceneId: string) => {
        setLoadingShots(true);
        try {
            const data = await getShots(sceneId);
            setShots(data);
        } catch (err) {
            console.error("Failed to fetch shots", err);
        } finally {
            setLoadingShots(false);
        }
    };

    const [isRenumbering, setIsRenumbering] = useState(false);

    const handleAddScene = async () => {
        if (!selectedEpisode) return;

        const sceneName = `Scene_${scenes.length + 1}`;

        try {
            await createStructure({
                name: sceneName,
                type: 'scene',
                parentDbId: selectedEpisode.id,
                parentFolderId: selectedEpisode.gdrive_folder_id
            });
            await handleRenumberScenes(); // Ensure consistency after creation
            fetchScenes(selectedEpisode.id);
        } catch (err) {
            console.error("Failed to create scene", err);
            dialog.alert("Error", "Failed to create scene", 'danger');
        }
    };

    const handleRenumberScenes = async () => {
        if (!selectedEpisode) return;

        setIsRenumbering(true);
        try {
            await renumberScenes(selectedEpisode.id);
            fetchScenes(selectedEpisode.id);
        } catch (err) {
            console.error("Failed to renumber scenes", err);
            dialog.alert("Error", "Failed to renumber scenes", 'danger');
        } finally {
            setIsRenumbering(false);
        }
    };

    const handleAddShot = async () => {
        if (!selectedScene) return;

        const name = prompt("Enter Shot Name (e.g., Shot 1)");
        if (!name) return;

        try {
            // Calculate next sequence
            const nextSeq = shots.length;

            await createStructureWithSequence({
                name,
                type: 'shot',
                parentDbId: selectedScene.id,
                parentFolderId: selectedScene.gdrive_folder_id,
                sequence: nextSeq
            });
            fetchShots(selectedScene.id);
        } catch (err) {
            console.error("Failed to create shot", err);
            dialog.alert("Error", "Failed to create shot", 'danger');
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, shotId: string) => {
        if (!e.target.files || e.target.files.length === 0) return;
        if (!userProfile) return;

        const file = e.target.files[0];
        setUploadingShotId(shotId);

        try {
            const res = await uploadStoryboardImage(shotId, file, userProfile.id);
            // Update local state to reflect new URL immediately
            setShots(prev => prev.map(s =>
                s.id === shotId ? { ...s, storyboard_url: res.url } : s
            ));
        } catch (err) {
            console.error("Upload failed", err);
            dialog.alert("Error", "Failed to upload image", 'danger');
        } finally {
            setUploadingShotId(null);
            // Reset input
            e.target.value = '';
        }
    };

    const handleBulkUploadClick = () => {
        if (bulkInputRef.current) {
            bulkInputRef.current.click();
        }
    };

    const handleBulkFilesCheck = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        if (!selectedScene || !userProfile) return;

        setIsBulkUploading(true);
        const files = Array.from(e.target.files);
        // Sort files by name to ensure order (optional but good)
        files.sort((a, b) => a.name.localeCompare(b.name));

        let currentSeq = shots.length;

        try {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const shotName = `Shot ${currentSeq + i + 1}`; // Simple naming

                // 1. Create Shot
                const shotRes = await createStructureWithSequence({
                    name: shotName,
                    type: 'shot',
                    parentDbId: selectedScene.id,
                    parentFolderId: selectedScene.gdrive_folder_id,
                    sequence: currentSeq + i
                });

                // 2. Upload Image
                const shotId = shotRes.dbData.id;
                await uploadStoryboardImage(shotId, file, userProfile.id);
            }

            await fetchShots(selectedScene.id);
            dialog.alert("Success", `${files.length} shots created successfully`, 'success');

        } catch (err) {
            console.error("Bulk upload failed", err);
            dialog.alert("Error", "Failed to complete bulk upload", 'danger');
        } finally {
            setIsBulkUploading(false);
            if (bulkInputRef.current) {
                bulkInputRef.current.value = '';
            }
        }
    };

    // Breadcrumbs
    const renderBreadcrumbs = () => (
        <div className="flex items-center gap-2 text-sm text-zinc-400 mb-6 bg-zinc-900/50 p-3 rounded-lg border border-white/5">
            <span
                className="hover:text-white cursor-pointer transition-colors"
                onClick={() => { setSelectedEpisode(null); setSelectedScene(null); }}
            >
                Episodes
            </span>
            {selectedEpisode && (
                <>
                    <ChevronRight size={14} />
                    <span
                        className={`hover:text-white cursor-pointer transition-colors ${!selectedScene ? 'text-white font-bold' : ''}`}
                        onClick={() => setSelectedScene(null)}
                    >
                        {selectedEpisode.name || `Episode ${selectedEpisode.episode_number}`}
                    </span>
                </>
            )}
            {selectedScene && (
                <>
                    <ChevronRight size={14} />
                    <span className="text-white font-bold">
                        {selectedScene.name}
                    </span>
                </>
            )}
        </div>
    );

    // Level 1: Episodes
    if (!selectedEpisode) {
        return (
            <div className="animate-in fade-in duration-300">
                {loadingEpisodes ? (
                    <div className="flex justify-center p-12"><Loader2 className="animate-spin text-blue-500" /></div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {episodes.map(ep => (
                            <div
                                key={ep.id}
                                onClick={() => setSelectedEpisode(ep)}
                                className="bg-zinc-900 border border-white/5 rounded-xl overflow-hidden hover:border-blue-500/50 transition-all cursor-pointer group hover:shadow-lg hover:shadow-blue-500/10"
                            >
                                <div className="aspect-video bg-zinc-800 relative overflow-hidden">
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <Film size={32} className="text-zinc-600" />
                                    </div>
                                    
                                    {/* Hover Overlay */}
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                                        <span className="px-4 py-2 bg-blue-500/20 text-blue-300 rounded-full border border-blue-500/30 font-medium text-xs tracking-wide uppercase">
                                            Open
                                        </span>
                                    </div>

                                    <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 to-transparent pointer-events-none">
                                        <p className="text-xs text-zinc-400 font-medium uppercase tracking-wider">Episode {ep.episode_number || '1'}</p>
                                    </div>
                                </div>
                                <div className="p-4">
                                    <h3 className="text-white font-medium truncate group-hover:text-blue-400 transition-colors">{ep.name || `Episode ${ep.episode_number}`}</h3>
                                    <div className="flex items-center justify-between mt-2">
                                        <span className="text-xs text-zinc-500 flex items-center gap-1">
                                            <Film size={12} />
                                            Select to view
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {episodes.length === 0 && (
                            <div className="col-span-full text-center py-20 text-zinc-500">
                                No episodes found. Create one in the Script tab first.
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    }

    // Level 2: Scenes
    if (!selectedScene) {
        return (
            <div className="animate-in fade-in duration-300">
                {renderBreadcrumbs()}

                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-white">Scenes in {selectedEpisode.name}</h2>
                    <div className="flex gap-3">
                        <button
                            onClick={handleRenumberScenes}
                            disabled={isRenumbering || loadingScenes}
                            className="glass-button flex items-center gap-2 !px-6 !py-2 !text-sm"
                            title="Renumber scenes to Scene_1, Scene_2, etc."
                        >
                            <RefreshCcw size={16} className={isRenumbering ? 'animate-spin' : ''} />
                            {isRenumbering ? 'Fix Naming' : 'Fix Naming'}
                        </button>
                        <button
                            onClick={handleAddScene}
                            className="glass-button flex items-center gap-2 !px-6 !py-2 !text-sm"
                        >
                            <Plus size={16} /> Add Scene
                        </button>
                    </div>
                </div>

                {loadingScenes ? (
                    <div className="flex justify-center p-12"><Loader2 className="animate-spin text-blue-500" /></div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {scenes.map(scene => (
                            <div
                                key={scene.id}
                                onClick={() => setSelectedScene(scene)}
                                className="bg-zinc-900 border border-white/5 rounded-xl overflow-hidden hover:border-blue-500/50 transition-all cursor-pointer group hover:shadow-lg hover:shadow-blue-500/10"
                            >
                                <div className="aspect-video bg-zinc-800 relative overflow-hidden">
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <Video size={32} className="text-zinc-600" />
                                    </div>

                                    {/* Hover Overlay */}
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                                        <span className="px-4 py-2 bg-blue-500/20 text-blue-300 rounded-full border border-blue-500/30 font-medium text-xs tracking-wide uppercase">
                                            Open
                                        </span>
                                    </div>

                                    <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 to-transparent pointer-events-none">
                                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${scene.status === 'complete' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                                            'bg-zinc-500/20 text-zinc-300 border-zinc-500/30'
                                            }`}>
                                            {scene.status}
                                        </span>
                                    </div>
                                </div>
                                <div className="p-4">
                                    <h3 className="text-white font-medium truncate group-hover:text-blue-400 transition-colors">{scene.name}</h3>
                                    <div className="flex items-center justify-between mt-2">
                                        <span className="text-xs text-zinc-500 flex items-center gap-1">
                                            <Video size={12} />
                                            View Shots
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {scenes.length === 0 && (
                            <div className="col-span-full border-2 border-dashed border-zinc-800 rounded-xl p-12 flex flex-col items-center justify-center text-zinc-500">
                                <Video size={48} className="mb-4 opacity-20" />
                                <p>No scenes yet. Add one to get started.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    }

    // Level 3: Shots (Storyboard)
    return (
        <div className="animate-in fade-in duration-300">
            {renderBreadcrumbs()}

            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white">Storyboard: {selectedScene.name}</h2>
                <div className="flex gap-3">
                    <button
                        onClick={handleBulkUploadClick}
                        disabled={isBulkUploading}
                        className="glass-button flex items-center gap-2 !px-6 !py-2 !text-sm"
                    >
                        {isBulkUploading ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
                        {isBulkUploading ? 'Uploading...' : 'Bulk Upload'}
                    </button>
                    <button
                        onClick={handleAddShot}
                        disabled={isBulkUploading}
                        className="glass-button flex items-center gap-2 !px-6 !py-2 !text-sm"
                    >
                        <Plus size={16} /> Add Shot
                    </button>
                    <input
                        type="file"
                        multiple
                        accept="image/*"
                        ref={bulkInputRef}
                        className="hidden"
                        onChange={handleBulkFilesCheck}
                    />
                </div>
            </div>

            {loadingShots ? (
                <div className="flex justify-center p-12"><Loader2 className="animate-spin text-blue-500" /></div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    {shots.map((shot, index) => (
                        <div key={shot.id} className="bg-zinc-900 border border-white/5 rounded-xl overflow-hidden hover:border-blue-500/50 transition-all shadow-lg hover:shadow-blue-500/10 group">
                            {/* Sequence Badge */}
                            <div className="absolute top-2 left-2 z-10 bg-black/60 backdrop-blur px-2 py-1 rounded text-xs font-mono text-white border border-white/10">
                                #{index + 1}
                            </div>

                            {/* Image Area */}
                            <div className="aspect-video bg-zinc-800 relative group/image">
                                {shot.storyboard_url ? (
                                    <img
                                        src={shot.storyboard_url}
                                        alt={shot.name}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center text-zinc-600">
                                        <ImageIcon size={32} className="mb-2 opacity-50" />
                                        <span className="text-xs">No Storyboard</span>
                                    </div>
                                )}

                                {/* Upload Overlay */}
                                <label className="absolute inset-0 bg-black/60 opacity-0 group-hover/image:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 cursor-pointer backdrop-blur-[2px]">
                                    {uploadingShotId === shot.id ? (
                                        <Loader2 className="animate-spin text-blue-400" />
                                    ) : (
                                        <>
                                            <UploadCloud className="text-white mb-1" />
                                            <span className="text-white text-xs font-bold px-3 py-1 bg-white/10 rounded-full">
                                                {shot.storyboard_url ? 'Replace Image' : 'Upload Image'}
                                            </span>
                                        </>
                                    )}
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => handleImageUpload(e, shot.id)}
                                        disabled={uploadingShotId === shot.id}
                                    />
                                </label>
                            </div>

                            {/* Details */}
                            <div className="p-4">
                                <h3 className="text-white font-medium truncate group-hover:text-blue-400 transition-colors">{shot.name}</h3>
                            </div>
                        </div>
                    ))}
                    {shots.length === 0 && (
                        <div className="col-span-full border-2 border-dashed border-zinc-800 rounded-xl p-12 flex flex-col items-center justify-center text-zinc-500">
                            <ImageIcon size={48} className="mb-4 opacity-20" />
                            <p>No shots in this scene.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
