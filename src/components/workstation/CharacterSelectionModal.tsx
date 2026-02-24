import React, { useEffect, useState } from 'react';
import { getCharacters } from '../../api';
import type { Character } from '../../types';
import { X, Check } from 'lucide-react';

interface CharacterSelectionModalProps {
    projectId: string;
    onSelect: (characters: (Character & { selectedAgeGroup: string })[]) => void;
    onClose: () => void;
    selectedCharacterIds: string[]; // This might need to track ID + Age, but for now ID is okay
}

export const CharacterSelectionModal: React.FC<CharacterSelectionModalProps> = ({
    projectId,
    onSelect,
    onClose,

}) => {
    const [characters, setCharacters] = useState<Character[]>([]);
    // Track selected characters and their chosen age group
    // Map charID -> AgeGroup (e.g. "Adult")
    const [selectionMap, setSelectionMap] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCharacters();
        // Initialize selection map from props if needed (logic handled by parent usually, but simple init here)
        // If we want to persist previous age selections, we'd need more complex props.
        // For now, new selections start fresh or default to Adult.
    }, [projectId]);

    const fetchCharacters = async () => {
        try {
            const data = await getCharacters(projectId);
            if (data) setCharacters(data);
        } catch (err) {
            console.error('Error fetching characters:', err);
        } finally {
            setLoading(false);
        }
    };

    const toggleCharacter = (char: Character) => {
        setSelectionMap(prev => {
            const newMap = { ...prev };
            if (newMap[char.id]) {
                delete newMap[char.id];
            } else {
                newMap[char.id] = char.default_age_group || 'Adult';
            }
            return newMap;
        });
    };

    const changeAgeGroup = (charId: string, age: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectionMap(prev => ({
            ...prev,
            [charId]: age
        }));
    };

    const handleConfirm = () => {
        const selected = characters
            .filter(c => selectionMap[c.id])
            .map(c => ({
                ...c,
                selectedAgeGroup: selectionMap[c.id]
            }));
        onSelect(selected);
        onClose();
    };

    // Helper to get image URL from the character object
    // Handles both flat `images` list (legacy) or picking from `age_groups`
    const getPreviewImage = (char: Character, age: string): string => {
        // Try to find image for specific age group
        if (char.age_groups && char.age_groups[age] && char.age_groups[age].length > 0) {
            const latestVer = char.age_groups[age][0];
            if (latestVer.images && latestVer.images.length > 0) return latestVer.images[0].url;
        }

        // Fallback to legacy flat images
        if (char.images && char.images.length > 0) return char.images[0].url;

        return '';
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-8 backdrop-blur-sm">
            <div className="bg-zinc-900 w-full max-w-5xl max-h-[85vh] rounded-xl flex flex-col border border-zinc-800 shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-white/5 bg-zinc-900/50">
                    <div>
                        <h2 className="text-xl font-bold text-white">Select Characters</h2>
                        <p className="text-zinc-500 text-sm mt-1">Choose characters and their age variants for this generation</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-full text-zinc-400 hover:text-white transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-black/20">
                    {loading ? (
                        <div className="flex justify-center py-20">
                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                        </div>
                    ) : characters.length === 0 ? (
                        <div className="text-center text-zinc-500 py-20 border-2 border-dashed border-zinc-800 rounded-xl">
                            <p>No characters found.</p>
                            <p className="text-sm mt-2">Add characters in the Asset Library first.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {characters.map(character => {
                                const isSelected = !!selectionMap[character.id];
                                const currentAge = selectionMap[character.id] || character.default_age_group || 'Adult';
                                const imageUrl = getPreviewImage(character, currentAge);

                                return (
                                    <div
                                        key={character.id}
                                        onClick={() => toggleCharacter(character)}
                                        className={`
                                            group relative aspect-[3/4] rounded-xl border-2 overflow-hidden transition-all cursor-pointer
                                            ${isSelected
                                                ? 'border-blue-500 shadow-[0_0_0_4px_rgba(59,130,246,0.1)]'
                                                : 'border-white/5 hover:border-white/20 hover:-translate-y-1'
                                            }
                                        `}
                                    >
                                        {/* Character Image */}
                                        {imageUrl ? (
                                            <img
                                                src={imageUrl}
                                                alt={character.name}
                                                className={`w-full h-full object-cover transition-transform duration-500 ${isSelected ? 'scale-105' : 'group-hover:scale-105'}`}
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-zinc-600 font-medium">
                                                No Image
                                            </div>
                                        )}

                                        {/* Overlay Grade */}
                                        <div className={`absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent transition-opacity ${isSelected ? 'opacity-100' : 'opacity-60 group-hover:opacity-80'}`} />

                                        {/* Selection Check */}
                                        <div className={`absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center transition-all ${isSelected ? 'bg-blue-500 scale-100' : 'bg-white/10 scale-0 group-hover:scale-100'}`}>
                                            <Check size={14} className="text-white" />
                                        </div>

                                        {/* Image/Age Controls at Bottom */}
                                        <div className="absolute bottom-0 left-0 right-0 p-3">
                                            <p className="text-white font-bold truncate mb-2">{character.name}</p>

                                            {/* Age Group Selector - Only show valid options if they exist or just the standard 3? */}
                                            <div className="flex gap-1 bg-black/50 p-1 rounded-lg backdrop-blur-md">
                                                {['Kid', 'Adult', 'Senior'].map(age => (
                                                    <button
                                                        key={age}
                                                        onClick={(e) => isSelected ? changeAgeGroup(character.id, age, e) : null}
                                                        className={`
                                                            flex-1 py-1 px-1.5 rounded text-[10px] uppercase font-bold tracking-wide transition-colors
                                                            ${currentAge === age
                                                                ? (isSelected ? 'bg-blue-600 text-white' : 'bg-white/20 text-white')
                                                                : 'text-zinc-500 hover:text-zinc-300'
                                                            }
                                                        `}
                                                    >
                                                        {age}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-between items-center p-6 border-t border-white/5 bg-zinc-900">
                    <p className="text-zinc-400">
                        <strong className="text-white">{Object.keys(selectionMap).length}</strong> characters selected
                    </p>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-6 py-2 rounded-lg text-zinc-300 hover:text-white hover:bg-white/5 transition-colors font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={Object.keys(selectionMap).length === 0}
                            className="px-8 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:shadow-none transition-all"
                        >
                            Confirm Selection
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
