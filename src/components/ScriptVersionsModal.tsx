import React, { useState, useEffect } from 'react';
import type { Asset } from '../types';
import { getScriptVersions } from '../api';
import { useDialog } from '../context/DialogContext';
import { X, FileText, Calendar, Plus, Loader2 } from 'lucide-react';
import { ScriptEditorModal } from './ScriptEditorModal';

interface ScriptVersionsModalProps {
    episode: Asset;
    onClose: () => void;
}

export const ScriptVersionsModal: React.FC<ScriptVersionsModalProps> = ({ episode, onClose }) => {
    const dialog = useDialog();
    const [versions, setVersions] = useState<Asset[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedVersion, setSelectedVersion] = useState<Asset | null>(null);
    const [isCreatingNew, setIsCreatingNew] = useState(false);

    useEffect(() => {
        fetchVersions();
    }, [episode.id]);

    const fetchVersions = async () => {
        setLoading(true);
        try {
            const data = await getScriptVersions(episode.id);
            setVersions(data);
        } catch (err) {
            console.error("Failed to fetch script versions:", err);
            dialog.alert("Error", "Failed to load versions", 'danger');
        } finally {
            setLoading(false);
        }
    };

    const handleVersionSelect = (version: Asset) => {
        setSelectedVersion(version);
    };

    const handleCreateNew = () => {
        // Find latest version to possibly seed content (optional, or just start blank/latest)
        // For now, we'll just open editor, and editor will fetch latest or we pass it? 
        // Logic: Editor fetches latest by default. So just opening it is enough.
        setIsCreatingNew(true);
    };

    const handleEditorClose = () => {
        setSelectedVersion(null);
        setIsCreatingNew(false);
        fetchVersions(); // Refresh list after edit
    };

    // If editor is open, show it instead (or on top)
    if (selectedVersion || isCreatingNew) {
        return (
            <ScriptEditorModal
                episode={episode}
                initialUrl={selectedVersion?.url}
                versionNumber={selectedVersion?.version_number}
                onClose={handleEditorClose}
            />
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-zinc-900 border border-white/10 rounded-xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[80vh]">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/10">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <FileText className="text-blue-400" />
                            {episode.name}
                        </h2>
                        <p className="text-zinc-500 text-sm mt-1">Version History</p>
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
                            <p className="mb-4">No versions saved yet.</p>
                            <button
                                onClick={handleCreateNew}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors font-medium flex items-center gap-2 mx-auto"
                            >
                                <Plus size={16} />
                                Create First Version
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <button
                                onClick={handleCreateNew}
                                className="w-full py-3 border-2 border-dashed border-zinc-700 hover:border-blue-500/50 hover:bg-blue-500/5 text-zinc-400 hover:text-blue-400 rounded-lg transition-all flex items-center justify-center gap-2 mb-6"
                            >
                                <Plus size={18} />
                                <span className="font-medium">Write New Version</span>
                            </button>

                            {versions.map((version) => (
                                <div
                                    key={version.id}
                                    onClick={() => handleVersionSelect(version)}
                                    className="bg-black/20 hover:bg-white/5 border border-white/5 hover:border-white/10 rounded-lg p-4 cursor-pointer transition-all flex items-center justify-between group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold font-mono">
                                            v{version.version_number}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-white font-medium">Script Version {version.version_number}</span>
                                                {/* <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full">Active</span> */}
                                            </div>
                                            <div className="flex items-center gap-4 mt-1 text-xs text-zinc-500">
                                                <span className="flex items-center gap-1">
                                                    <Calendar size={12} />
                                                    {new Date(version.created_at).toLocaleString()}
                                                </span>
                                                {/* <span className="flex items-center gap-1">
                                                    <User size={12} />
                                                    User
                                                </span> */}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-zinc-600 group-hover:text-blue-400 transition-colors">
                                        View/Edit
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
