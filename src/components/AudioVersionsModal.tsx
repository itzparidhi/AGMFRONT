import React, { useState, useEffect, useRef } from 'react';
import type { Asset } from '../types';
import { getAudioVersions, saveAudio } from '../api';
import { useDialog } from '../context/DialogContext';
import { useAuth } from '../context/AuthContext';
import { X, Music, Mic, UploadCloud, Calendar, Loader2, Play, FileAudio } from 'lucide-react';

interface AudioVersionsModalProps {
    episode: Asset;
    onClose: () => void;
}

interface AudioVersion {
    version_number: number;
    created_at: string;
    uploader_id: string;
    files: Asset[];
}

export const AudioVersionsModal: React.FC<AudioVersionsModalProps> = ({ episode, onClose }) => {
    const { userProfile } = useAuth();
    const dialog = useDialog();
    const [activeCategory, setActiveCategory] = useState<'sfx' | 'dialogue'>('sfx');
    const [versions, setVersions] = useState<AudioVersion[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchVersions();
    }, [episode.id, activeCategory]);

    const fetchVersions = async () => {
        setLoading(true);
        try {
            const data = await getAudioVersions(episode.id, activeCategory);
            setVersions(data);
        } catch (err) {
            console.error("Failed to fetch audio versions:", err);
            dialog.alert("Error", "Failed to load audio versions", 'danger');
        } finally {
            setLoading(false);
        }
    };

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
            await saveAudio(episode.id, activeCategory, files, userProfile.id);
            await fetchVersions();
            dialog.alert("Success", "Audio uploaded successfully", 'success');
        } catch (err) {
            console.error("Upload failed", err);
            dialog.alert("Error", "Failed to upload audio", 'danger');
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-zinc-900 border border-white/10 rounded-xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[85vh]">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/10 bg-zinc-900/50">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            {activeCategory === 'sfx' ? <Music className="text-blue-400" /> : <Mic className="text-blue-400" />}
                            {episode.name}
                        </h2>
                        <p className="text-zinc-500 text-sm mt-1">Audio Library • {activeCategory === 'sfx' ? 'Sound Effects' : 'Dialogues'}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-zinc-400 hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                {/* Toolbar */}
                <div className="flex items-center justify-between p-4 border-b border-white/5 bg-black/20">
                    <div className="flex gap-2">
                        <button
                            onClick={() => setActiveCategory('sfx')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeCategory === 'sfx'
                                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                                : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}
                        >
                            <Music size={16} />
                            SFX
                        </button>
                        <button
                            onClick={() => setActiveCategory('dialogue')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeCategory === 'dialogue'
                                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                                : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}
                        >
                            <Mic size={16} />
                            Dialogues
                        </button>
                    </div>

                    <button
                        onClick={handleUploadClick}
                        disabled={uploading}
                        className="px-4 py-2 bg-white text-zinc-900 rounded-lg hover:bg-zinc-200 transition-colors text-sm font-bold flex items-center gap-2 disabled:opacity-50"
                    >
                        {uploading ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
                        Upload {activeCategory === 'sfx' ? 'SFX' : 'Dialogue'}
                    </button>
                    <input
                        type="file"
                        multiple
                        ref={fileInputRef}
                        className="hidden"
                        onChange={handleFileSelect}
                        accept="audio/*"
                    />
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-zinc-950/30">
                    {loading ? (
                        <div className="flex justify-center py-20">
                            <Loader2 size={32} className="animate-spin text-zinc-500" />
                        </div>
                    ) : versions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-zinc-500 border-2 border-dashed border-zinc-800/50 rounded-xl">
                            <FileAudio size={48} className="mb-4 opacity-30" />
                            <p className="mb-4">No audio files uploaded yet.</p>
                            <button
                                onClick={handleUploadClick}
                                className="text-blue-400 hover:text-blue-300 text-sm font-medium"
                            >
                                Upload your first batch
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {versions.map((version) => (
                                <div key={version.version_number} className="animate-in fade-in slide-in-from-bottom-2">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="h-px flex-1 bg-white/10"></div>
                                        <span className="text-zinc-500 text-xs font-mono uppercase tracking-wider flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                            Version {version.version_number}
                                        </span>
                                        <span className="text-zinc-600 text-xs flex items-center gap-1">
                                            <Calendar size={10} />
                                            {new Date(version.created_at).toLocaleString()}
                                        </span>
                                        <div className="h-px flex-1 bg-white/10"></div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {version.files.map((file) => (
                                            <div key={file.id} className="bg-zinc-900 border border-white/5 rounded-lg p-3 group hover:border-white/20 transition-all">
                                                <div className="flex items-start gap-3">
                                                    <div className="w-10 h-10 bg-zinc-800 rounded flex items-center justify-center shrink-0">
                                                        <Play size={16} className="text-zinc-400" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm text-zinc-200 truncate font-medium mb-1" title={file.name}>
                                                            {file.name}
                                                        </p>
                                                        <div className="flex items-center gap-2">
                                                            <a
                                                                href={file.url}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="text-[10px] bg-white/5 hover:bg-white/10 px-2 py-0.5 rounded text-zinc-400 hover:text-white transition-colors"
                                                            >
                                                                Download / Play
                                                            </a>
                                                        </div>
                                                    </div>
                                                </div>
                                                <audio controls className="w-full mt-3 h-8 opacity-50 group-hover:opacity-100 transition-opacity">
                                                    <source src={file.url} />
                                                </audio>
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
