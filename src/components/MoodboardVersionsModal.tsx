import React, { useState, useEffect } from 'react';
import type { Asset } from '../types';
import { getMoodboardVersions } from '../api';
import { useDialog } from '../context/DialogContext';
import { X, ImageIcon, Calendar, Plus, Loader2, Download } from 'lucide-react';
import { MoodboardUploadModal } from './MoodboardUploadModal';

interface MoodboardVersionsModalProps {
    episode: Asset;
    onClose: () => void;
}

interface MoodboardVersion {
    version_number: number;
    created_at: string;
    uploader_id: string;
    files: Asset[];
}

export const MoodboardVersionsModal: React.FC<MoodboardVersionsModalProps> = ({ episode, onClose }) => {
    const dialog = useDialog();
    const [versions, setVersions] = useState<MoodboardVersion[]>([]);
    const [loading, setLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        fetchVersions();
    }, [episode.id]);

    const fetchVersions = async () => {
        setLoading(true);
        try {
            const data = await getMoodboardVersions(episode.id);
            setVersions(data);
        } catch (err) {
            console.error("Failed to fetch moodboard versions:", err);
            dialog.alert("Error", "Failed to load versions", 'danger');
        } finally {
            setLoading(false);
        }
    };

    const handleUploadClose = () => {
        setIsUploading(false);
        fetchVersions();
    };

    if (isUploading) {
        return (
            <MoodboardUploadModal
                episode={episode}
                onClose={handleUploadClose}
            />
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-zinc-900 border border-white/10 rounded-xl w-full max-w-5xl shadow-2xl flex flex-col h-[85vh]">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/10">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <ImageIcon className="text-purple-400" />
                            {episode.name}
                        </h2>
                        <p className="text-zinc-500 text-sm mt-1">Moodboard History</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-zinc-400 hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="flex justify-center py-10">
                            <Loader2 size={32} className="animate-spin text-zinc-500" />
                        </div>
                    ) : versions.length === 0 ? (
                        <div className="text-center py-10 text-zinc-500 border-2 border-dashed border-zinc-800 rounded-lg">
                            <p className="mb-4">No moodboards uploaded yet.</p>
                            <button
                                onClick={() => setIsUploading(true)}
                                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors font-medium flex items-center gap-2 mx-auto"
                            >
                                <Plus size={16} />
                                Upload First Version
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            <button
                                onClick={() => setIsUploading(true)}
                                className="w-full py-3 border-2 border-dashed border-zinc-700 hover:border-purple-500/50 hover:bg-purple-500/5 text-zinc-400 hover:text-purple-400 rounded-lg transition-all flex items-center justify-center gap-2 mb-6"
                            >
                                <Plus size={18} />
                                <span className="font-medium">Upload New Version</span>
                            </button>

                            {versions.map((version) => (
                                <div key={version.version_number} className="space-y-4">
                                    <div className="flex items-center gap-3 border-b border-white/5 pb-2">
                                        <div className="px-2 py-1 bg-purple-500/10 text-purple-400 rounded-md text-sm font-bold border border-purple-500/20">
                                            v{version.version_number}
                                        </div>
                                        <div className="text-xs text-zinc-500 flex items-center gap-2">
                                            <Calendar size={12} />
                                            {new Date(version.created_at).toLocaleString()}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                        {version.files.map((file) => (
                                            <div key={file.id} className="group relative aspect-square bg-zinc-800 rounded-lg overflow-hidden border border-white/5 shadow-sm hover:shadow-md transition-shadow">
                                                <img
                                                    src={file.url}
                                                    alt={file.name}
                                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                    loading="lazy"
                                                />
                                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                    <a
                                                        href={file.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-sm transition-colors"
                                                        title="Download / View"
                                                    >
                                                        <Download size={18} />
                                                    </a>
                                                </div>
                                                <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <p className="text-xs text-white truncate px-1">{file.name}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
