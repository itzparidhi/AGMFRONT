import React, { useState, useRef } from 'react';
import type { Character, Asset } from '../types';
import { saveCharacterImages, deleteCharacter } from '../api';
import { useDialog } from '../context/DialogContext';
import { useAuth } from '../context/AuthContext';
import { X, UploadCloud, Trash2, Calendar, User, Loader2, Download } from 'lucide-react';

interface CharacterDetailsModalProps {
    character: Character;
    projectId: string;
    onClose: () => void;
    onUpdate: () => void; // Trigger refresh of character list
}

export const CharacterDetailsModal: React.FC<CharacterDetailsModalProps> = ({ character, projectId, onClose, onUpdate }) => {
    const { userProfile } = useAuth();
    const dialog = useDialog();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [images, setImages] = useState<Asset[]>(character.images || []);

    const handleUploadClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0 || !userProfile) return;

        setUploading(true);
        const files = Array.from(e.target.files);

        try {
            const result = await saveCharacterImages(character.id, files, projectId, userProfile.id);
            if (result.success && result.data) {
                // Determine if result.data is array or single and update state
                const newImages = Array.isArray(result.data) ? result.data : [result.data];
                setImages(prev => [...newImages, ...prev]); // Add new images to top
                dialog.alert("Success", "Images uploaded successfully", 'success');
                onUpdate(); // generic update
            }
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
            `Are you sure you want to delete ${character.name}? This will delete all associated images.`,
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
            <div className="bg-zinc-900 border border-white/10 rounded-xl w-full max-w-5xl shadow-2xl flex flex-col h-[85vh]">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/10 bg-black/20">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-purple-500/10 rounded-full text-purple-400 border border-purple-500/20">
                            <User size={32} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white leading-tight">{character.name}</h2>
                            <div className="flex items-center gap-3 mt-1">
                                <span className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${character.age_group === 'Kid' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                                        character.age_group === 'Adult' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                                            'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                                    }`}>
                                    {character.age_group}
                                </span>
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

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-zinc-900/50">
                    <div className="mb-8">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-white">Gallery ({images.length})</h3>
                            <div>
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
                                    className="px-4 py-2 bg-white text-black hover:bg-zinc-200 disabled:bg-zinc-700 disabled:text-zinc-500 disabled:cursor-not-allowed rounded-lg font-bold transition-all flex items-center gap-2 shadow-lg shadow-white/10"
                                >
                                    {uploading ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
                                    Upload Images
                                </button>
                            </div>
                        </div>

                        {images.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-zinc-800 rounded-xl bg-black/20">
                                <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mb-4 text-zinc-500">
                                    <User size={32} />
                                </div>
                                <p className="text-zinc-500 font-medium mb-1">No images uploaded yet</p>
                                <p className="text-xs text-zinc-600">Upload images to build the character profile</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 animate-in fade-in duration-500">
                                {images.map((img) => (
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
    );
};
