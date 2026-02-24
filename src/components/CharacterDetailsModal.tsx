import React, { useState, useRef, useEffect } from 'react';
import type { Character, CharacterVersion } from '../types';
import { saveCharacterImages, deleteCharacter } from '../api';
import { useDialog } from '../context/DialogContext';
import { useAuth } from '../context/AuthContext';
import { X, UploadCloud, Trash2, Calendar, User, Loader2, Download, Plus, ChevronRight, Layers } from 'lucide-react';

interface CharacterDetailsModalProps {
    character: Character;
    projectId: string;
    onClose: () => void;
    onUpdate: () => void;
}

const AGE_GROUPS = ['Kid', 'Adult', 'Senior'];

export const CharacterDetailsModal: React.FC<CharacterDetailsModalProps> = ({ character, projectId, onClose, onUpdate }) => {
    const { userProfile } = useAuth();
    const dialog = useDialog();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // State
    const [activeTab, setActiveTab] = useState<string>(character.default_age_group || 'Adult');
    const [activeVersionId, setActiveVersionId] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [deleting, setDeleting] = useState(false);

    // Derived Data
    // Get versions for current tab
    const currentVersions: CharacterVersion[] = character.age_groups?.[activeTab] || [];
    // Sort versions desc
    const sortedVersions = [...currentVersions].sort((a, b) => b.version_number - a.version_number);

    // Set active version on tab change or init
    useEffect(() => {
        if (sortedVersions.length > 0) {
            // Should selection persist? Maybe not. Default to latest.
            if (!activeVersionId || !sortedVersions.find(v => v.id === activeVersionId)) {
                setActiveVersionId(sortedVersions[0].id);
            }
        } else {
            setActiveVersionId(null);
        }
    }, [activeTab, character]);

    const activeVersion = sortedVersions.find(v => v.id === activeVersionId);
    const currentImages = activeVersion?.images || [];

    // Fallback for Legacy Images (if no versions exist for this age group, but it's the default age)
    // Actually, migration should have moved them. But if not:
    // const legacyImages = (activeTab === character.default_age_group && currentVersions.length === 0) ? character.images || [] : [];
    // For now, assume migration worked or empty.

    const handleUploadClick = () => {
        if (fileInputRef.current) fileInputRef.current.click();
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0 || !userProfile) return;
        setUploading(true);
        const files = Array.from(e.target.files);

        try {
            // Upload as NEW VERSION for the active Age Group
            await saveCharacterImages(files, character.id, projectId, userProfile.id, activeTab);
            dialog.alert("Success", "New version uploaded successfully", 'success');
            onUpdate(); // Parent refresh
        } catch (err) {
            console.error("Upload failed:", err);
            dialog.alert("Error", "Failed to upload images", 'danger');
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleDeleteCharacter = async () => {
        dialog.confirm(
            "Delete Character",
            `Are you sure you want to delete ${character.name}? This will delete all versions and images.`,
            async () => {
                setDeleting(true);
                try {
                    await deleteCharacter(character.id);
                    onUpdate();
                    onClose();
                } catch (err) {
                    console.error("Failed to delete character:", err);
                    dialog.alert("Error", "Failed to delete character", 'danger');
                } finally {
                    setDeleting(false);
                }
            },
            'danger'
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-zinc-900 border border-white/10 rounded-xl w-full max-w-6xl shadow-2xl flex flex-col h-[85vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/5 bg-black/20">
                    <div className="flex items-center gap-4">
                        <div className="p-3 text-blue-400">
                            <User size={32} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white leading-tight">{character.name}</h2>
                            <div className="flex items-center gap-3 mt-1">
                                <span className="text-xs text-zinc-500 flex items-center gap-1">
                                    <Calendar size={12} />
                                    Created {new Date(character.created_at).toLocaleDateString()}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleDeleteCharacter}
                            disabled={deleting}
                            className="p-2 hover:bg-red-500/10 text-zinc-500 hover:text-red-400 rounded-lg transition-colors"
                            title="Delete Character"
                        >
                            {deleting ? <Loader2 size={20} className="animate-spin" /> : <Trash2 size={20} />}
                        </button>
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-zinc-400 hover:text-white">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex flex-1 overflow-hidden">

                    {/* Sidebar: Age Groups & Versions */}
                    <div className="w-64 bg-black/10 border-r border-white/5 flex flex-col">

                        {/* Age Group Tabs */}
                        <div className="flex p-2 gap-1 border-b border-white/5 bg-zinc-900/50">
                            {AGE_GROUPS.map(age => (
                                <button
                                    key={age}
                                    onClick={() => setActiveTab(age)}
                                    className={`
                                        flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all
                                        ${activeTab === age
                                            ? 'bg-blue-600 text-white shadow-lg'
                                            : 'text-zinc-500 hover:bg-white/5 hover:text-zinc-300'
                                        }
                                    `}
                                >
                                    {age}
                                </button>
                            ))}
                        </div>

                        {/* Versions List */}
                        <div className="flex-1 overflow-y-auto p-3 space-y-2">
                            <div className="flex justify-between items-center px-2 mb-2">
                                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Versions</span>
                                <span className="text-xs text-zinc-600">{sortedVersions.length} found</span>
                            </div>

                            {sortedVersions.map(version => (
                                <button
                                    key={version.id}
                                    onClick={() => setActiveVersionId(version.id)}
                                    className={`
                                        w-full flex items-center justify-between p-3 rounded-lg border transition-all group
                                        ${activeVersionId === version.id
                                            ? 'bg-blue-500/10 border-blue-500/50 text-blue-400'
                                            : 'bg-zinc-800/50 border-transparent hover:bg-zinc-800 hover:border-white/10 text-zinc-400'
                                        }
                                    `}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`p-1.5 rounded-md ${activeVersionId === version.id ? 'bg-blue-500/20' : 'bg-black/20'}`}>
                                            <Layers size={14} />
                                        </div>
                                        <div className="text-left">
                                            <div className="text-sm font-bold">Version {version.version_number}</div>
                                            <div className="text-[10px] opacity-60">
                                                {version.images.length} images
                                            </div>
                                        </div>
                                    </div>
                                    {activeVersionId === version.id && <ChevronRight size={14} />}
                                </button>
                            ))}

                            {sortedVersions.length === 0 && (
                                <div className="text-center py-8 text-zinc-600 text-xs italic">
                                    No versions for {activeTab} yet.
                                </div>
                            )}
                        </div>

                        {/* Upload Button */}
                        <div className="p-4 border-t border-white/5 bg-zinc-900/50">
                            <input
                                type="file"
                                multiple
                                accept="image/*"
                                ref={fileInputRef}
                                className="hidden"
                                onChange={handleFileSelect}
                            />
                            <button
                                onClick={handleUploadClick}
                                disabled={uploading}
                                className="w-full flex items-center justify-center gap-2 py-3 bg-white text-black hover:bg-zinc-200 disabled:bg-zinc-700 disabled:text-zinc-500 rounded-lg font-bold transition-all shadow-lg shadow-white/5"
                            >
                                {uploading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                                New Version
                            </button>
                            <p className="text-[10px] text-center text-zinc-600 mt-2">
                                Uploads create a new {activeTab} version
                            </p>
                        </div>
                    </div>

                    {/* Main Gallery Area */}
                    <div className="flex-1 flex flex-col bg-zinc-900/50">
                        {/* Toolbar */}
                        <div className="h-14 border-b border-white/5 flex items-center justify-between px-6">
                            <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                <span className="text-zinc-500">{activeTab}</span>
                                <span className="text-zinc-700">/</span>
                                <span>{activeVersion ? `Version ${activeVersion.version_number}` : 'No Selection'}</span>
                            </h3>
                            {activeVersion && (
                                <span className="text-xs text-zinc-500">
                                    {activeVersion.images.length} images
                                </span>
                            )}
                        </div>

                        {/* Grid */}
                        <div className="flex-1 overflow-y-auto p-6">
                            {!activeVersion && sortedVersions.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-zinc-500">
                                    <div className="w-16 h-16 bg-zinc-800/50 rounded-full flex items-center justify-center mb-4">
                                        <UploadCloud size={32} className="opacity-50" />
                                    </div>
                                    <p className="font-medium">No images uploaded for {activeTab}</p>
                                    <p className="text-sm mt-1">Upload a new version to get started</p>
                                </div>
                            ) : !activeVersion ? (
                                <div className="h-full flex items-center justify-center text-zinc-500">
                                    Select a version to view images
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 animate-in fade-in duration-500">
                                    {currentImages.map((img) => (
                                        <div key={img.id} className="group relative aspect-[3/4] bg-zinc-800 rounded-lg overflow-hidden border border-white/5 shadow-sm hover:shadow-lg transition-all hover:-translate-y-1">
                                            <img
                                                src={img.url}
                                                alt={img.name}
                                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                loading="lazy"
                                            />
                                            <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex justify-between items-end">
                                                <p className="text-xs text-zinc-300 truncate max-w-[70%]">{img.name}</p>
                                                <a
                                                    href={img.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-1.5 bg-white/10 hover:bg-white/30 rounded-full text-white backdrop-blur-sm transition-colors"
                                                    title="Download"
                                                >
                                                    <Download size={14} />
                                                </a>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
