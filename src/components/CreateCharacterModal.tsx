import React, { useState } from 'react';
import { useDialog } from '../context/DialogContext';
import { createCharacter } from '../api';
import { X, UserPlus, Loader2 } from 'lucide-react';

interface CreateCharacterModalProps {
    projectId: string;
    onClose: () => void;
    onSuccess: () => void;
}

export const CreateCharacterModal: React.FC<CreateCharacterModalProps> = ({ projectId, onClose, onSuccess }) => {
    const dialog = useDialog();
    const [name, setName] = useState('');
    const [ageGroup, setAgeGroup] = useState<'Kid' | 'Adult' | 'Senior'>('Adult');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        setLoading(true);
        try {
            await createCharacter(name, ageGroup, projectId);
            dialog.alert("Success", "Character created successfully", 'success');
            onSuccess();
            onClose();
        } catch (err) {
            console.error("Failed to create character:", err);
            dialog.alert("Error", "Failed to create character", 'danger');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-zinc-900 border border-white/10 rounded-xl w-full max-w-md shadow-2xl">
                <div className="flex items-center justify-between p-6 border-b border-white/10">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <UserPlus className="text-purple-400" size={24} />
                        Add New Character
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-zinc-400 hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-2">Character Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 outline-none transition-all placeholder:text-zinc-600"
                            placeholder="e.g. John Doe"
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-2">Age Group</label>
                        <div className="grid grid-cols-3 gap-2">
                            {(['Kid', 'Adult', 'Senior'] as const).map((group) => (
                                <button
                                    key={group}
                                    type="button"
                                    onClick={() => setAgeGroup(group)}
                                    className={`p-3 rounded-lg text-sm font-medium transition-all ${ageGroup === group
                                        ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20'
                                        : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'
                                        }`}
                                >
                                    {group}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={!name.trim() || loading}
                            className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:from-zinc-800 disabled:to-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed text-white rounded-lg font-bold shadow-lg shadow-purple-500/20 transition-all flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 size={18} className="animate-spin" /> : <UserPlus size={18} />}
                            Create Character
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
