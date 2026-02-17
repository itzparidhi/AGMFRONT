import React, { useState, useEffect, useRef } from 'react';
import type { Project, Asset } from '../types';
import { getProjectAssets, uploadAsset, deleteProjectAsset } from '../api';
import { useAuth } from '../context/AuthContext';
import { Loader2, UploadCloud, Trash2, FileText, Image as ImageIcon, Film, CheckSquare } from 'lucide-react';
import { useDialog } from '../context/DialogContext';
import { ScriptVersionsModal } from './ScriptVersionsModal';
import { MoodboardVersionsModal } from './MoodboardVersionsModal';

interface AssetLibraryProps {
    projects: Project[];
}

export const AssetLibrary: React.FC<AssetLibraryProps> = ({ projects }) => {
    const { userProfile } = useAuth();
    const dialog = useDialog();
    const [selectedProjectId, setSelectedProjectId] = useState<string>('');
    const [activeTab, setActiveTab] = useState<'script' | 'character' | 'moodboard' | 'storyboard'>('script');
    const [assets, setAssets] = useState<Record<string, Asset[]>>({ script: [], character: [], moodboard: [], storyboard: [] });
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [selectedEpisode, setSelectedEpisode] = useState<Asset | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (selectedProjectId) {
            fetchAssets(selectedProjectId);
        }
    }, [selectedProjectId]);

    const fetchAssets = async (projectId: string) => {
        setLoading(true);
        try {
            const data = await getProjectAssets(projectId);
            // Ensure all keys exist
            setAssets({
                script: data.script || [],
                character: data.character || [],
                moodboard: data.moodboard || [],
                storyboard: data.storyboard || []
            });
        } catch (err) {
            console.error("Failed to fetch assets:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleProjectSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedProjectId(e.target.value);
        setAssets({ script: [], character: [], moodboard: [], storyboard: [] });
    };

    const handleUploadClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
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
                    folder_id: '', // Not used
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

    const handleDelete = async (assetId: string) => {
        dialog.confirm(
            "Delete Asset",
            "Are you sure you want to delete this asset?",
            async () => {
                try {
                    await deleteProjectAsset(assetId);
                    setAssets(prev => ({
                        ...prev,
                        [activeTab]: prev[activeTab].filter(a => a.id !== assetId)
                    }));
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

                <div className="mb-8">
                    <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-2 tracking-widest">Select Project</label>
                    <div className="relative">
                        <select
                            className="w-full bg-zinc-900 text-zinc-200 p-3 rounded-lg border-transparent appearance-none focus:outline-none focus:ring-1 focus:ring-purple-500/50 transition-all cursor-pointer hover:bg-zinc-800"
                            onChange={handleProjectSelect}
                            value={selectedProjectId}
                        >
                            <option value="" className="bg-zinc-900 text-zinc-500">Select Project...</option>
                            {projects.map(p => <option key={p.id} value={p.id} className="bg-black text-white py-2">{p.name}</option>)}
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-zinc-500">
                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                    </div>
                </div>

                {selectedProjectId && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Tabs & Upload Action */}
                        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                            <div className="flex gap-2 p-1 bg-black/20 rounded-lg border border-white/5">
                                {(['script', 'character', 'moodboard', 'storyboard'] as const).map(tab => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all capitalize ${activeTab === tab
                                            ? 'bg-zinc-700 text-white shadow-lg'
                                            : 'text-zinc-400 hover:text-white hover:bg-white/5'
                                            }`}
                                    >
                                        {tab}s
                                    </button>
                                ))}
                            </div>

                            <button
                                onClick={handleUploadClick}
                                disabled={uploading}
                                className="glass-button px-6 py-3 flex items-center gap-2 hover:bg-white text-zinc-100 hover:text-black font-bold transition-all shadow-glass rounded-xl disabled:opacity-50"
                            >
                                {uploading ? <Loader2 size={18} className="animate-spin" /> : <UploadCloud size={18} />}
                                <span>Upload to {activeTab}s</span>
                            </button>
                            <input
                                type="file"
                                multiple
                                ref={fileInputRef}
                                className="hidden"
                                onChange={handleFileSelect}
                                accept={activeTab === 'script' ? '.pdf,.doc,.docx,.txt' : 'image/*'}
                            />
                        </div>

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

                                    {/* Character Tab */}
                                    {activeTab === 'character' && (
                                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 animate-in fade-in">
                                            {assets[activeTab].length === 0 ? (
                                                <div className="col-span-full flex flex-col items-center justify-center py-20 text-zinc-600 border-2 border-dashed border-zinc-800/50 rounded-xl">
                                                    <ImageIcon size={48} className="mb-4 opacity-30" />
                                                    <p className="text-zinc-500 font-medium">No characters found.</p>
                                                </div>
                                            ) : (
                                                assets[activeTab].map(asset => (
                                                    <div key={asset.id} className="group relative bg-zinc-900/50 rounded-lg border border-white/5 overflow-hidden hover:border-white/20 transition-all hover:shadow-xl hover:-translate-y-1">
                                                        <div className="aspect-[3/4] bg-black/30 flex items-center justify-center overflow-hidden relative">
                                                            <img src={asset.url} alt={asset.name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-all duration-500" />
                                                            {/* Overlay Actions */}
                                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-sm">
                                                                <button
                                                                    onClick={() => window.open(asset.url, '_blank')}
                                                                    className="p-2 bg-white/10 rounded-full text-white hover:bg-white/20 hover:scale-110 transition-all"
                                                                    title="View"
                                                                >
                                                                    <ImageIcon size={16} />
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
                                                ))
                                            )}
                                        </div>
                                    )}

                                    {/* Storyboard Tab */}
                                    {activeTab === 'storyboard' && (
                                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 animate-in fade-in">
                                            {assets[activeTab].length === 0 ? (
                                                <div className="col-span-full flex flex-col items-center justify-center py-20 text-zinc-600 border-2 border-dashed border-zinc-800/50 rounded-xl">
                                                    <Film size={48} className="mb-4 opacity-30" />
                                                    <p className="text-zinc-500 font-medium">No storyboards found.</p>
                                                </div>
                                            ) : (
                                                assets[activeTab].map(asset => (
                                                    <div key={asset.id} className="group relative bg-zinc-900/50 rounded-lg border border-white/5 overflow-hidden hover:border-white/20 transition-all hover:shadow-xl hover:-translate-y-1">
                                                        <div className="aspect-[3/4] bg-black/30 flex items-center justify-center overflow-hidden relative">
                                                            <img src={asset.url} alt={asset.name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-all duration-500" />
                                                            {/* Overlay Actions */}
                                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-sm">
                                                                <button
                                                                    onClick={() => window.open(asset.url, '_blank')}
                                                                    className="p-2 bg-white/10 rounded-full text-white hover:bg-white/20 hover:scale-110 transition-all"
                                                                    title="View"
                                                                >
                                                                    <ImageIcon size={16} />
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
                                                ))
                                            )}
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
        </div>
    );
};

