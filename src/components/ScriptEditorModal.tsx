import React, { useState } from 'react';
import type { Asset } from '../types';
import { saveScriptVersion } from '../api';
import { useAuth } from '../context/AuthContext';
import { useDialog } from '../context/DialogContext';
import { X, UploadCloud, FileText, Download, Loader2, CheckCircle } from 'lucide-react';

interface ScriptEditorModalProps {
    episode: Asset;
    onClose: () => void;
    initialUrl?: string; // If present, we are in View mode
    versionNumber?: number;
}

export const ScriptEditorModal: React.FC<ScriptEditorModalProps> = ({ episode, onClose, initialUrl, versionNumber }) => {
    const { userProfile } = useAuth();
    const dialog = useDialog();

    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);

    const isViewMode = !!initialUrl;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleUpload = async () => {
        if (!file || !userProfile) return;

        setUploading(true);
        try {
            await saveScriptVersion(episode.id, file, userProfile.id);
            dialog.alert("Success", "Script version uploaded successfully", 'success');
            onClose(); // Close and let parent refresh
        } catch (err) {
            console.error("Upload failed:", err);
            dialog.alert("Error", "Failed to upload script", 'danger');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200">
            <div className="bg-zinc-900 border border-white/10 rounded-xl w-full max-w-lg shadow-2xl flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10 bg-black/20">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                            <FileText size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white leading-tight">{episode.name}</h2>
                            <p className="text-xs text-zinc-500">
                                {isViewMode ? `Viewing Version ${versionNumber}` : 'Upload New Version'}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-zinc-400 hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 flex flex-col items-center justify-center gap-6 min-h-[300px]">
                    {isViewMode ? (
                        <div className="text-center space-y-4">
                            <div className="w-20 h-20 bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto ring-1 ring-white/10">
                                <FileText size={40} className="text-zinc-400" />
                            </div>
                            <div>
                                <h3 className="text-white font-medium">Script Version {versionNumber}</h3>
                                <p className="text-sm text-zinc-500 mt-1">Ready for download</p>
                            </div>
                            <div className="pt-2">
                                <a
                                    href={initialUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors shadow-lg shadow-blue-500/10"
                                >
                                    <Download size={18} />
                                    Download Script
                                </a>
                            </div>
                        </div>
                    ) : (
                        <div className="w-full space-y-6">
                            <div className="border-2 border-dashed border-zinc-700 hover:border-blue-500/50 rounded-xl p-8 transition-colors bg-black/20 group relative">
                                <input
                                    type="file"
                                    onChange={handleFileChange}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                    accept=".pdf,.doc,.docx,.txt"
                                />
                                <div className="flex flex-col items-center justify-center text-center gap-3">
                                    {file ? (
                                        <>
                                            <div className="w-12 h-12 bg-green-500/10 text-green-400 rounded-full flex items-center justify-center mb-1">
                                                <CheckCircle size={24} />
                                            </div>
                                            <div>
                                                <p className="text-white font-medium truncate max-w-[200px]">{file.name}</p>
                                                <p className="text-xs text-zinc-500 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                            </div>
                                            <p className="text-xs text-blue-400 mt-2">Click to replace</p>
                                        </>
                                    ) : (
                                        <>
                                            <div className="w-12 h-12 bg-zinc-800 text-zinc-400 group-hover:text-blue-400 group-hover:bg-blue-500/10 rounded-full flex items-center justify-center transition-colors">
                                                <UploadCloud size={24} />
                                            </div>
                                            <div>
                                                <p className="text-zinc-300 font-medium group-hover:text-blue-300 transition-colors">Click or drag script here</p>
                                                <p className="text-xs text-zinc-500 mt-1">PDF, Word, or Text files</p>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            <button
                                onClick={handleUpload}
                                disabled={!file || uploading}
                                className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors shadow-lg shadow-blue-500/10 flex items-center justify-center gap-2"
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
                    )}
                </div>
            </div>
        </div>
    );
};
