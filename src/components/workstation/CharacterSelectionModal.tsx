import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import { X, Check } from 'lucide-react';

interface Resource {
    id: string;
    name: string;
    type: string;
    gdrive_link: string;
}

interface CharacterSelectionModalProps {
    projectId: string;
    onSelect: (characters: Resource[]) => void;
    onClose: () => void;
    selectedCharacterIds: string[];
}

export const CharacterSelectionModal: React.FC<CharacterSelectionModalProps> = ({
    projectId,
    onSelect,
    onClose,
    selectedCharacterIds,
}) => {
    const [characters, setCharacters] = useState<Resource[]>([]);
    const [selectedIds, setSelectedIds] = useState<string[]>(selectedCharacterIds);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCharacters();
    }, [projectId]);

    const fetchCharacters = async () => {
        try {
            const { data } = await supabase
                .from('resources')
                .select('*')
                .eq('project_id', projectId)
                .eq('type', 'character');

            if (data) setCharacters(data);
        } catch (err) {
            console.error('Error fetching characters:', err);
        } finally {
            setLoading(false);
        }
    };

    const toggleCharacter = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(cid => cid !== id) : [...prev, id]
        );
    };

    const handleConfirm = () => {
        const selected = characters.filter(c => selectedIds.includes(c.id));
        onSelect(selected);
        onClose();
    };

    const getPreviewUrl = (gdriveLink: string) => {
        // Supabase or Direct URL check
        if (gdriveLink.includes('supabase.co') || gdriveLink.startsWith('http')) return gdriveLink;

        const match = gdriveLink.match(/\/d\/([^\/]+)/);
        if (match) {
            return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w200`;
        }
        return gdriveLink.replace('/view', '/preview');
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-8">
            <div className="bg-zinc-900 w-full max-w-4xl max-h-[80vh] rounded-lg flex flex-col border border-zinc-700 shadow-2xl">
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-zinc-700">
                    <h2 className="text-xl font-bold text-white">Select Characters</h2>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-zinc-700 rounded text-zinc-400 hover:text-white"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="text-center text-zinc-500 py-8">Loading characters...</div>
                    ) : characters.length === 0 ? (
                        <div className="text-center text-zinc-500 py-8">
                            No characters found. Add characters in the Resources panel.
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                            {characters.map(character => {
                                const isSelected = selectedIds.includes(character.id);
                                return (
                                    <button
                                        key={character.id}
                                        onClick={() => toggleCharacter(character.id)}
                                        className={`
                      relative aspect-square rounded-lg border-2 overflow-hidden transition-all
                      ${isSelected
                                                ? 'border-blue-500 ring-2 ring-blue-500/50'
                                                : 'border-zinc-700 hover:border-zinc-500'
                                            }
                    `}
                                    >
                                        {/* Character Image */}
                                        <img
                                            src={getPreviewUrl(character.gdrive_link)}
                                            alt={character.name}
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect fill="%23333" width="200" height="200"/><text fill="%23999" x="50%" y="50%" text-anchor="middle" dy=".3em">No Image</text></svg>';
                                            }}
                                        />

                                        {/* Selection Indicator */}
                                        {isSelected && (
                                            <div className="absolute top-2 right-2 bg-blue-500 rounded-full p-1">
                                                <Check size={16} className="text-white" />
                                            </div>
                                        )}

                                        {/* Character Name */}
                                        <div className="absolute bottom-0 left-0 right-0 bg-black/70 backdrop-blur-sm p-2">
                                            <p className="text-xs text-white font-medium truncate">
                                                {character.name}
                                            </p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-between items-center p-4 border-t border-zinc-700">
                    <p className="text-sm text-zinc-400">
                        {selectedIds.length} character{selectedIds.length !== 1 ? 's' : ''} selected
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={onClose}
                            className="glass-button hover:bg-white/5 border-white/10 text-zinc-300 min-w-[100px]"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleConfirm}
                            className="glass-button border-0 min-w-[120px] shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.4)]"
                        >
                            Confirm
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
