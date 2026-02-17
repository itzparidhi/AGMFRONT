import React, { useState } from 'react';
import type { Asset } from '../types';
import { saveMoodboard } from '../api';
import { useAuth } from '../context/AuthContext';
import { useDialog } from '../context/DialogContext';
import { X, UploadCloud, ImageIcon, Loader2 } from 'lucide-react';

interface MoodboardUploadModalProps {
    episode: Asset;
    onClose: () => void;
}

export const MoodboardUploadModal: React.FC<MoodboardUploadModalProps> = ({ episode, onClose }) => {
    const { userProfile } = useAuth();
    const dialog = useDialog();

    const [files, setFiles] = useState<File[]>([]);
    const [uploading, setUploading] = useState(false);
    const [previews, setPreviews] = useState<string[]>([]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const newFiles = Array.from(e.target.files);
            setFiles(prev => [...prev, ...newFiles]);

            // Generate previews for images
            const newPreviews = newFiles.map(file => URL.createObjectURL(file));
            setPreviews(prev => [...prev, ...newPreviews]);
        }
    };

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
        setPreviews(prev => {
            // Revoke URL to avoid memory leaks
            URL.revokeObjectURL(prev[index]);
            return prev.filter((_, i) => i !== index);
        });
    };

    const handleUpload = async () => {
        if (files.length === 0 || !userProfile) return;

        setUploading(true);
        try {
            await saveMoodboard(episode.id, files, userProfile.id);
            dialog.alert("Success", "Moodboard version uploaded successfully", 'success');
            onClose();
        } catch (err) {
            console.error("Upload failed:", err);
            dialog.alert("Error", "Failed to upload moodboard", 'danger');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200">
            <div className="bg-zinc-900 border border-white/10 rounded-xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10 bg-black/20">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
                            <ImageIcon size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white leading-tight">{episode.name}</h2>
                            <p className="text-xs text-zinc-500">Upload New Moodboard Version</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-zinc-400 hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto">
                    <div className="space-y-6">
                        {/* Dropzone */}
                        <div className="border-2 border-dashed border-zinc-700 hover:border-purple-500/50 rounded-xl p-8 transition-colors bg-black/20 group relative">
                            <input
                                type="file"
                                onChange={handleFileChange}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                accept="image/*"
                                multiple
                            />
                            <div className="flex flex-col items-center justify-center text-center gap-3">
                                <div className="w-12 h-12 bg-zinc-800 text-zinc-400 group-hover:text-purple-400 group-hover:bg-purple-500/10 rounded-full flex items-center justify-center transition-colors">
                                    <UploadCloud size={24} />
                                </div>
                                <div>
                                    <p className="text-zinc-300 font-medium group-hover:text-purple-300 transition-colors">Click or drag images here</p>
                                    <p className="text-xs text-zinc-500 mt-1">PNG, JPG, WEBP</p>
                                </div>
                            </div>
                        </div>

                        {/* Previews */}
                        {files.length > 0 && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm text-zinc-400 px-1">
                                    <span>Selected Images ({files.length})</span>
                                    <button onClick={() => { setFiles([]); setPreviews([]); }} className="text-red-400 hover:text-red-300">Clear All</button>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {previews.map((src, index) => (
                                        <div key={index} className="relative group aspect-square bg-zinc-800 rounded-lg overflow-hidden border border-white/5">
                                            <img src={src} alt="Preview" className="w-full h-full object-cover" />
                                            <button
                                                onClick={() => removeFile(index)}
                                                className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-white/10 bg-black/20 flex justify-end">
                    <button
                        onClick={handleUpload}
                        disabled={files.length === 0 || uploading}
                        className="px-6 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors shadow-lg shadow-purple-500/10 flex items-center gap-2"
                    >
                        {uploading ? (
                            <>
                                <Loader2 size={18} className="animate-spin" />
                                Uploading...
                            </>
                        ) : (
                            <>
                                <UploadCloud size={18} />
                                Upload Version
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
