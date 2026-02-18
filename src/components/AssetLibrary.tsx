import React, { useState, useEffect, useRef } from 'react';
import type { Project, Asset } from '../types';
import { getProjectAssets, uploadAsset, deleteProjectAsset, createFolder } from '../api';
import { useAuth } from '../context/AuthContext';
import { Loader2, UploadCloud, Trash2, FileText, Image as ImageIcon, CheckSquare, UserPlus, User, Music, File, Monitor, FolderPlus, ArrowLeft, Folder } from 'lucide-react';
import { useDialog } from '../context/DialogContext';
import { ScriptVersionsModal } from './ScriptVersionsModal';
import { MoodboardVersionsModal } from './MoodboardVersionsModal';
import { CreateCharacterModal } from './CreateCharacterModal';
import { CharacterDetailsModal } from './CharacterDetailsModal';
import { AudioVersionsModal } from './AudioVersionsModal';
import { ProjectCard } from './ProjectCard';
import { FolderCard } from './FolderCard';
import { StoryboardView } from './StoryboardView';
import { getCharacters } from '../api';
import type { Character } from '../types';

interface AssetLibraryProps {
    projects: Project[];
}

export const AssetLibrary: React.FC<AssetLibraryProps> = ({ projects }) => {
    const { userProfile } = useAuth();
    const dialog = useDialog();
    const [selectedProjectId, setSelectedProjectId] = useState<string>('');
    const [activeTab, setActiveTab] = useState<'script' | 'character' | 'moodboard' | 'storyboard' | 'audio' | 'miscellaneous'>('script');
    const [assets, setAssets] = useState<Record<string, Asset[]>>({ script: [], character: [], moodboard: [], storyboard: [], audio: [], miscellaneous: [] });
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [selectedEpisode, setSelectedEpisode] = useState<Asset | null>(null);
    const [characters, setCharacters] = useState<Character[]>([]);
    const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
    const [showCreateCharacter, setShowCreateCharacter] = useState(false);

    // Folder Navigation State
    const [currentFolder, setCurrentFolder] = useState<Asset | null>(null);
    const [folderPath, setFolderPath] = useState<Asset[]>([]);

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (selectedProjectId) {
            fetchAssets(selectedProjectId);
            // Reset folder navigation when project changes 
            setCurrentFolder(null);
            setFolderPath([]);
        }
    }, [selectedProjectId]);

    const fetchAssets = async (projectId: string) => {
        setLoading(true);
        try {
            // Fetch Assets (Script, Moodboard, Storyboard, Audio, Miscellaneous)
            try {
                const assetsData = await getProjectAssets(projectId);
                setAssets({
                    script: assetsData.script || [],
                    character: [],
                    moodboard: assetsData.moodboard || [],
                    storyboard: assetsData.storyboard || [],
                    audio: assetsData.audio || [],
                    miscellaneous: assetsData.miscellaneous || []
                });
            } catch (err) {
                console.error("Failed to fetch project assets:", err);
            }

            // Fetch Characters (might fail if migration not run)
            try {
                const charactersData = await getCharacters(projectId);
                setCharacters(charactersData || []);
            } catch (err) {
                console.error("Failed to fetch characters:", err);
                setCharacters([]);
            }

        } catch (err) {
            console.error("Critical error in fetchAssets:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleProjectSelect = (project: Project) => {
        setSelectedProjectId(project.id);
        setAssets({ script: [], character: [], moodboard: [], storyboard: [], audio: [], miscellaneous: [] });
    };
    


    const handleUploadClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };
    
    const handleCreateFolder = async () => {
        if (!selectedProjectId || !userProfile) return;

        const folderName = prompt("Enter folder name:");
        if (!folderName) return;

        try {
            const newFolder = await createFolder(
                folderName,
                selectedProjectId,
                currentFolder?.id, // Parent folder ID (or undefined for root)
                userProfile.id
            );
            
            // Add new folder to local assets state
            setAssets(prev => ({
                ...prev,
                miscellaneous: [newFolder as Asset, ...prev.miscellaneous]
            }));

        } catch (err) {
            console.error("Failed to create folder:", err);
            dialog.alert("Error", "Failed to create folder", 'danger');
        }
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0 || !selectedProjectId || !userProfile) return;

        setUploading(true);
        const files = Array.from(e.target.files);

        try {
            for (const file of files) {
                await uploadAsset({
                    file,
                    folder_id: currentFolder?.id || '', // Pass current folder ID
                    db_id: selectedProjectId,
                    uploader_id: userProfile.id,
                    asset_library_type: activeTab
                });
            }

            await fetchAssets(selectedProjectId);
            dialog.alert("Success", "Assets uploaded successfully", 'success');

        } catch (err: any) {
            console.error("Upload failed", err);
            dialog.alert("Error", "Failed to upload assets", 'danger');
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };
    
    const navigateToFolder = (folder: Asset) => {
        setFolderPath([...folderPath, folder]);
        setCurrentFolder(folder);
    };

    // Go back to global projects view
    const exitProjectView = () => {
        setSelectedProjectId('');
        setAssets({ script: [], character: [], moodboard: [], storyboard: [], audio: [], miscellaneous: [] });
    };
    
    // Filter miscellaneous items for current view
    const getCurrentMiscItems = () => {
        return assets.miscellaneous.filter(item => {
            if (currentFolder) {
                return item.folder_id === currentFolder.id;
            } else {
                return !item.folder_id; // Root items have no folder_id
            }
        });
    };

    const handleDelete = async (assetId: string) => {
        dialog.confirm(
            "Delete Asset",
            "Are you sure you want to delete this asset?",
            async () => {
                try {
                    await deleteProjectAsset(assetId);
                    // Optimistic update
                    setAssets(prev => ({
                        ...prev,
                        [activeTab]: prev[activeTab].filter(a => a.id !== assetId)
                    }));

                    // Also refetch to be safe
                    fetchAssets(selectedProjectId);
                } catch (err) {
                    console.error("Delete failed", err);
                    dialog.alert("Error", "Failed to delete asset", 'danger');
                }
            },
            'danger'
        );
    };

    return (
        <div className="space-y-8 p-4">
            {/* Project Selector - Matching AssignmentsPanel Style */}
            <div className="glass-panel p-8">
                <h3 className="text-2xl font-bold mb-8 flex items-center gap-3 text-white border-b border-white/10 pb-4">
                    <CheckSquare className="text-white" />
                    <span>Asset Library</span>
                </h3>

                {/* Tab Navigation */}
                <div className="flex items-center gap-1 mb-8 bg-zinc-900/50 p-1 rounded-lg w-fit border border-white/5">
                    {(['script', 'character', 'moodboard', 'storyboard', 'audio', 'miscellaneous'] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => {
                                setActiveTab(tab);
                                setCurrentFolder(null); // Reset folder when switching tabs
                                setFolderPath([]);
                            }}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                                activeTab === tab 
                                ? 'bg-white/10 text-white shadow-sm' 
                                : 'text-zinc-400 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    ))}
                </div>

                {/* 1. Global Project View (No Project Selected) */}
                {!selectedProjectId && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                         <div className="flex items-center gap-2 mb-6 text-zinc-400">
                            <Folder size={18} />
                            <span className="font-semibold text-white">Select Project</span>
                            <span className="text-zinc-600">to view {activeTab}</span>
                         </div>
                         
                         <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {projects.map(project => (
                                <ProjectCard 
                                    key={project.id}
                                    project={project}
                                    onClick={() => handleProjectSelect(project)}
                                    // Disable other features not needed here like rename/delete if needed, or keep them
                                    canDelete={false} 
                                />
                            ))}
                            {projects.length === 0 && (
                                <div className="col-span-full py-10 text-center text-zinc-500">
                                    No projects found.
                                </div>
                            )}
                         </div>
                    </div>
                )}

                {/* 3. Active Project View (For all tabs including Misc inside a project) */}
                {selectedProjectId && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Project Header / Back to Global (for Misc) */}
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-4">
                                    <button 
                                        onClick={exitProjectView}
                                        className="p-2 hover:bg-white/10 rounded-full text-zinc-400 hover:text-white transition-colors"
                                        title="Back to All Projects"
                                    >
                                        <ArrowLeft size={20} />
                                    </button>
                                <div>
                                    <h4 className="text-lg font-bold text-white leading-none">
                                        {projects.find(p => p.id === selectedProjectId)?.name || 'Project'}
                                    </h4>
                                    <p className="text-xs text-zinc-500 font-mono mt-1 uppercase tracking-wider">
                                        {activeTab}
                                    </p>
                                </div>
                            </div>

                            {/* Actions Toolbar */}
                            <div className="flex items-center gap-3">
                                {activeTab === 'miscellaneous' && (
                                    <button
                                        onClick={handleCreateFolder}
                                        className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all"
                                    >
                                        <FolderPlus size={16} />
                                        <span className="text-sm font-medium">New Folder</span>
                                    </button>
                                )}
                                
                                {activeTab !== 'audio' && activeTab !== 'storyboard' && (
                                    <>
                                        <button
                                            onClick={activeTab === 'character' ? () => setShowCreateCharacter(true) : handleUploadClick}
                                            disabled={uploading}
                                            className="glass-button px-6 py-2 flex items-center gap-2 hover:bg-white text-zinc-100 hover:text-black font-bold transition-all shadow-glass rounded-xl disabled:opacity-50"
                                        >
                                            {uploading ? (
                                                <Loader2 size={18} className="animate-spin" />
                                            ) : activeTab === 'character' ? (
                                                <UserPlus size={18} />
                                            ) : (
                                                <UploadCloud size={18} />
                                            )}
                                            <span>{activeTab === 'character' ? 'Add Character' : 'Upload'}</span>
                                        </button>
                                        
                                        <input
                                            type="file"
                                            multiple
                                            ref={fileInputRef}
                                            className="hidden"
                                            onChange={handleFileSelect}
                                            accept={activeTab === 'script' ? '.pdf,.doc,.docx,.txt' :
                                                activeTab === 'miscellaneous' ? '*/*' : 'image/*'}
                                        />
                                    </>
                                )}
                            </div>
                            {activeTab === 'audio' && (
                                <div className="text-zinc-500 text-sm italic pr-4">
                                    Select an episode to upload audio
                                </div>
                            )}
                            {activeTab === 'storyboard' && (
                                <div className="text-zinc-500 text-sm italic pr-4">
                                    Navigate to a shot to upload storyboard
                                </div>
                            )}

                            <input
                                type="file"
                                multiple
                                ref={fileInputRef}
                                className="hidden"
                                onChange={handleFileSelect}
                                accept={activeTab === 'script' ? '.pdf,.doc,.docx,.txt' :
                                    activeTab === 'audio' ? 'audio/*' :
                                        activeTab === 'miscellaneous' ? '*/*' : 'image/*'}
                            />
                        </div>

                        {/* Breadcrumbs for Miscellaneous */}
                        {activeTab === 'miscellaneous' && (
                             <div className="flex items-center gap-2 text-sm text-zinc-400 mb-6 bg-black/20 p-2 rounded-lg border border-white/5">
                                <button 
                                    onClick={() => { setCurrentFolder(null); setFolderPath([]); }}
                                    className="hover:text-white hover:underline px-1"
                                >
                                    Root
                                </button>
                                {folderPath.map((folder, index) => (
                                    <React.Fragment key={folder.id}>
                                        <span className="text-zinc-600">/</span>
                                        <button 
                                            onClick={() => {
                                                // Navigate to this folder
                                                const newPath = folderPath.slice(0, index + 1);
                                                setFolderPath(newPath);
                                                setCurrentFolder(folder);
                                            }}
                                            className="hover:text-white hover:underline px-1 truncate max-w-[150px]"
                                        >
                                            {folder.name}
                                        </button>
                                    </React.Fragment>
                                ))}
                            </div>
                        )}

                        {/* Content Grid */}
                        <div className="bg-black/20 rounded-xl border border-white/5 min-h-[400px] p-6">
                            {loading ? (
                                <div className="flex h-full items-center justify-center text-zinc-500 py-20">
                                    <Loader2 size={32} className="animate-spin mb-2" />
                                </div>
                            ) : (
                                <>
                                    {/* Script Tab */}
                                    {activeTab === 'script' && (
                                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 animate-in fade-in duration-300">
                                            {assets.script.map((asset) => (
                                                <div
                                                    key={asset.id}
                                                    onClick={() => setSelectedEpisode(asset)}
                                                    className="bg-zinc-900 border border-white/5 rounded-xl overflow-hidden hover:border-blue-500/50 transition-all cursor-pointer group hover:shadow-lg hover:shadow-blue-500/10"
                                                >
                                                    <div className="aspect-video bg-zinc-800 relative overflow-hidden">
                                                        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-500/20 to-purple-500/20 opacity-50 group-hover:opacity-100 transition-opacity">
                                                            <FileText size={32} className="text-white drop-shadow-lg" />
                                                        </div>
                                                        <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                                                            <p className="text-xs text-zinc-400 font-medium uppercase tracking-wider">{asset.episode_number ? `Episode ${asset.episode_number}` : asset.name}</p>
                                                        </div>
                                                    </div>
                                                    <div className="p-4">
                                                        <h3 className="text-white font-medium truncate group-hover:text-blue-400 transition-colors">{asset.name}</h3>
                                                        <div className="flex items-center justify-between mt-2">
                                                            <span className="text-xs text-zinc-500 flex items-center gap-1">
                                                                <FileText size={12} />
                                                                Script
                                                            </span>
                                                            <span className="text-xs px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded-full border border-blue-500/20">
                                                                View
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                            {assets.script.length === 0 && (
                                                <div className="col-span-full flex flex-col items-center justify-center py-20 text-zinc-500">
                                                    <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mb-4 border border-zinc-800">
                                                        <FileText size={32} className="opacity-50" />
                                                    </div>
                                                    <p>No episodes found to add scripts to.</p>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Moodboard Tab */}
                                    {activeTab === 'moodboard' && (
                                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 animate-in fade-in duration-300">
                                            {assets.moodboard.map((asset) => (
                                                <div
                                                    key={asset.id}
                                                    onClick={() => setSelectedEpisode(asset)}
                                                    className="bg-zinc-900 border border-white/5 rounded-xl overflow-hidden hover:border-purple-500/50 transition-all cursor-pointer group hover:shadow-lg hover:shadow-purple-500/10"
                                                >
                                                    <div className="aspect-video bg-zinc-800 relative overflow-hidden">
                                                        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple-500/20 to-blue-500/20 opacity-50 group-hover:opacity-100 transition-opacity">
                                                            <ImageIcon size={32} className="text-white drop-shadow-lg" />
                                                        </div>
                                                        <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                                                            <p className="text-xs text-zinc-400 font-medium uppercase tracking-wider">{asset.episode_number ? `Episode ${asset.episode_number}` : asset.name}</p>
                                                        </div>
                                                    </div>
                                                    <div className="p-4">
                                                        <h3 className="text-white font-medium truncate group-hover:text-purple-400 transition-colors">{asset.name}</h3>
                                                        <div className="flex items-center justify-between mt-2">
                                                            <span className="text-xs text-zinc-500 flex items-center gap-1">
                                                                <ImageIcon size={12} />
                                                                Moodboard
                                                            </span>
                                                            <span className="text-xs px-2 py-0.5 bg-purple-500/10 text-purple-400 rounded-full border border-purple-500/20">
                                                                View
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                            {assets.moodboard.length === 0 && (
                                                <div className="col-span-full flex flex-col items-center justify-center py-20 text-zinc-500">
                                                    <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mb-4 border border-zinc-800">
                                                        <ImageIcon size={32} className="opacity-50" />
                                                    </div>
                                                    <p>No episodes found to add moodboards to.</p>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Audio Tab */}
                                    {activeTab === 'audio' && (
                                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 animate-in fade-in duration-300">
                                            {assets.audio.map((asset) => (
                                                <div
                                                    key={asset.id}
                                                    onClick={() => setSelectedEpisode(asset)}
                                                    className="bg-zinc-900 border border-white/5 rounded-xl overflow-hidden hover:border-blue-400/50 transition-all cursor-pointer group hover:shadow-lg hover:shadow-blue-500/10"
                                                >
                                                    <div className="aspect-video bg-zinc-800 relative overflow-hidden">
                                                        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-500/20 to-teal-500/20 opacity-50 group-hover:opacity-100 transition-opacity">
                                                            <Music size={32} className="text-white drop-shadow-lg" />
                                                        </div>
                                                        <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                                                            <p className="text-xs text-zinc-400 font-medium uppercase tracking-wider">{asset.episode_number ? `Episode ${asset.episode_number}` : asset.name}</p>
                                                        </div>
                                                    </div>
                                                    <div className="p-4">
                                                        <h3 className="text-white font-medium truncate group-hover:text-blue-400 transition-colors">{asset.name}</h3>
                                                        <div className="flex items-center justify-between mt-2">
                                                            <span className="text-xs text-zinc-500 flex items-center gap-1">
                                                                <Music size={12} />
                                                                Audio
                                                            </span>
                                                            <span className="text-xs px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded-full border border-blue-500/20">
                                                                View
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                            {assets.audio.length === 0 && (
                                                <div className="col-span-full flex flex-col items-center justify-center py-20 text-zinc-500">
                                                    <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mb-4 border border-zinc-800">
                                                        <Music size={32} className="opacity-50" />
                                                    </div>
                                                    <p>No episodes found to add audio to.</p>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Character Tab */}
                                    {activeTab === 'character' && (
                                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 animate-in fade-in">
                                            {characters.length === 0 ? (
                                                <div className="col-span-full flex flex-col items-center justify-center py-20 text-zinc-600 border-2 border-dashed border-zinc-800/50 rounded-xl">
                                                    <User size={48} className="mb-4 opacity-30" />
                                                    <p className="text-zinc-500 font-medium">No characters found.</p>
                                                    <button
                                                        onClick={() => setShowCreateCharacter(true)}
                                                        className="mt-4 text-purple-400 hover:text-purple-300 text-sm font-medium"
                                                    >
                                                        Create your first character
                                                    </button>
                                                </div>
                                            ) : (
                                                characters.map(char => (
                                                    <div
                                                        key={char.id}
                                                        onClick={() => setSelectedCharacter(char)}
                                                        className="group relative bg-zinc-900/50 rounded-lg border border-white/5 overflow-hidden hover:border-purple-500/50 transition-all hover:shadow-xl hover:-translate-y-1 cursor-pointer"
                                                    >
                                                        <div className="aspect-[3/4] bg-zinc-800 flex items-center justify-center overflow-hidden relative">
                                                            {char.images && char.images.length > 0 ? (
                                                                <img src={char.images[0].url} alt={char.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                                            ) : (
                                                                <User size={32} className="text-zinc-600" />
                                                            )}

                                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-sm">
                                                                <span className="text-white font-medium text-sm">View Details</span>
                                                            </div>
                                                        </div>
                                                        <div className="p-3 border-t border-white/5 bg-zinc-900/80">
                                                            <div className="flex justify-between items-start">
                                                                <p className="text-sm font-bold text-white truncate" title={char.name}>{char.name}</p>
                                                                <span className="text-[10px] uppercase text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded">{char.age_group}</span>
                                                            </div>
                                                            <p className="text-xs text-zinc-500 mt-1">{char.images?.length || 0} images</p>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    )}

                                    {/* Storyboard Tab */}
                                    {activeTab === 'storyboard' && (
                                        <StoryboardView projectId={selectedProjectId} />
                                    )}

                                    {/* Miscellaneous Tab */}
                                    {activeTab === 'miscellaneous' && (
                                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 animate-in fade-in">
                                            {(() => {
                                                const items = getCurrentMiscItems();
                                                const folders = items.filter(i => i.type === 'folder');
                                                const files = items.filter(i => i.type !== 'folder');

                                                if (items.length === 0) {
                                                    return (
                                                        <div className="col-span-full flex flex-col items-center justify-center py-20 text-zinc-600 border-2 border-dashed border-zinc-800/50 rounded-xl">
                                                            <FolderPlus size={48} className="mb-4 opacity-30" />
                                                            <p className="text-zinc-500 font-medium">No items found.</p>
                                                            <div className="flex gap-4 mt-4">
                                                                <button
                                                                    onClick={handleCreateFolder}
                                                                    className="text-purple-400 hover:text-purple-300 text-sm font-medium hover:underline"
                                                                >
                                                                    Create new folder
                                                                </button>
                                                                <span className="text-zinc-600">or</span>
                                                                <button
                                                                    onClick={handleUploadClick}
                                                                    className="text-purple-400 hover:text-purple-300 text-sm font-medium hover:underline"
                                                                >
                                                                    Upload files
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                }

                                                return (
                                                    <>
                                                        {folders.map(folder => (
                                                            <FolderCard
                                                                key={folder.id}
                                                                name={folder.name}
                                                                type="folder"
                                                                itemCount={assets.miscellaneous.filter(a => a.folder_id === folder.id).length}
                                                                onClick={() => navigateToFolder(folder)}
                                                                onDelete={() => handleDelete(folder.id)}
                                                            />
                                                        ))}
                                                        
                                                        {files.map(asset => (
                                                            <div key={asset.id} className="group relative bg-zinc-900/50 rounded-lg border border-white/5 overflow-hidden hover:border-white/20 transition-all hover:shadow-xl hover:-translate-y-1">
                                                                <div className="aspect-[3/4] bg-black/30 flex items-center justify-center overflow-hidden relative">
                                                                    {/* Preview if image, else File Icon */}
                                                                    {asset.name.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                                                        <img src={asset.url} alt={asset.name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-all duration-500" />
                                                                    ) : (
                                                                        <div className="flex flex-col items-center gap-2 text-zinc-500 group-hover:text-zinc-300">
                                                                            <File size={32} />
                                                                            <span className="text-xs uppercase font-bold">{asset.name.split('.').pop()}</span>
                                                                        </div>
                                                                    )}

                                                                    {/* Overlay Actions */}
                                                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-sm">
                                                                        <button
                                                                            onClick={() => window.open(asset.url, '_blank')}
                                                                            className="p-2 bg-white/10 rounded-full text-white hover:bg-white/20 hover:scale-110 transition-all"
                                                                            title="View"
                                                                        >
                                                                            {asset.name.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? <ImageIcon size={16} /> : <Monitor size={16} />}
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleDelete(asset.id)}
                                                                            className="p-2 bg-red-500/10 rounded-full text-red-400 hover:bg-red-500 hover:text-white hover:scale-110 transition-all"
                                                                            title="Delete"
                                                                        >
                                                                            <Trash2 size={16} />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                                <div className="p-3 border-t border-white/5 bg-zinc-900/80">
                                                                    <p className="text-xs font-semibold text-zinc-300 truncate font-mono" title={asset.name}>{asset.name}</p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    )}

                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Modals */}
            {selectedEpisode && activeTab === 'script' && (
                <ScriptVersionsModal
                    episode={selectedEpisode}
                    onClose={() => setSelectedEpisode(null)}
                />
            )}
            {selectedEpisode && activeTab === 'moodboard' && (
                <MoodboardVersionsModal
                    episode={selectedEpisode}
                    onClose={() => setSelectedEpisode(null)}
                />
            )}
            {selectedEpisode && activeTab === 'audio' && (
                <AudioVersionsModal
                    episode={selectedEpisode}
                    onClose={() => setSelectedEpisode(null)}
                />
            )}

            {showCreateCharacter && selectedProjectId && (
                <CreateCharacterModal
                    projectId={selectedProjectId}
                    onClose={() => setShowCreateCharacter(false)}
                    onSuccess={() => fetchAssets(selectedProjectId)}
                />
            )}

            {selectedCharacter && selectedProjectId && (
                <CharacterDetailsModal
                    character={selectedCharacter}
                    projectId={selectedProjectId}
                    onClose={() => setSelectedCharacter(null)}
                    onUpdate={() => fetchAssets(selectedProjectId)}
                />
            )}
        </div>
    );
};

