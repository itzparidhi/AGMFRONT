import React, { useState } from 'react';
import { Wand2, Sparkles, Loader2, ImagePlus, X, ChevronDown, Star, User, Upload, Target, Image as ImageIcon } from 'lucide-react';
import { DriveImage } from '../DriveImage';
import type { Shot } from '../../types';
import { CharacterSelectionModal } from './CharacterSelectionModal';

interface GenerationToolsProps {
    generationMode: 'manual' | 'automatic' | 'storyboard_enhancer' | 'angles' | 'background_grid';
    setGenerationMode: (mode: 'manual' | 'automatic' | 'storyboard_enhancer' | 'angles' | 'background_grid') => void;
    prompt: string;
    handlePromptChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    textareaRef: React.RefObject<HTMLTextAreaElement | null>;
    handleDragOver: (e: React.DragEvent) => void;
    handleDropRef: (e: React.DragEvent) => void;
    showTagMenu: boolean;
    refImages: File[];
    insertTag: (tag: string) => void;
    removeRefImage: (index: number) => void;
    refInputRef: React.RefObject<HTMLInputElement | null>;
    handleRefImageSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
    selectedAutoTabs: string[];
    setSelectedAutoTabs: React.Dispatch<React.SetStateAction<string[]>>;
    fileInputRefs: {
        storyboard: React.RefObject<HTMLInputElement | null>;
        background: React.RefObject<HTMLInputElement | null>;
        // Angles mode refs
        anglesAnchor: React.RefObject<HTMLInputElement | null>;
        anglesTarget: React.RefObject<HTMLInputElement | null>;
        characters: React.MutableRefObject<Map<string, HTMLInputElement>>;
        // Background Grid
        backgroundGrid?: React.RefObject<HTMLInputElement | null>;
    };
    handleAutoStoryboardUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    autoStoryboardFile: File | null;
    setAutoStoryboardFile: (file: File | null) => void;
    shot: Shot;
    handleAutoBackgroundUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    autoBackgroundFile: File | null;
    setAutoBackgroundFile: (file: File | null) => void;
    characterTabs: { id: string; name: string; file: File | null }[];
    autoCharacterFiles: { [id: string]: File | null };
    handleAutoCharacterUpload: (id: string, e: React.ChangeEvent<HTMLInputElement>) => void;
    removeAutoCharacterFile: (id: string) => void;
    addCharacterTab: () => void;
    removeCharacterTab: (id: string, e: React.MouseEvent) => void;
    selectedModel: string;
    setSelectedModel: (model: string) => void;
    aspectRatio: string;
    setAspectRatio: (ratio: string) => void;
    resolution: string;
    setResolution: (res: string) => void;
    handleGenerate: () => void;
    isGenerating: boolean;
    uploadingRefs: {
        storyboard: boolean;
        style: boolean;
    };
    // Angles Props
    anglesAngle: string;
    setAnglesAngle: (val: string) => void;
    anglesLength: string;
    setAnglesLength: (val: string) => void;
    anglesFocus: string;
    setAnglesFocus: (val: string) => void;
    anglesBackground: string;
    setAnglesBackground: (val: string) => void;
    anglesAnchorFile: File | null;
    setAnglesAnchorFile: (file: File | null) => void;
    handleAnglesAnchorUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    anglesTargetFile: File | null;
    setAnglesTargetFile: (file: File | null) => void;
    handleAnglesTargetUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    // Background Grid Props
    backgroundGridFile?: File | null;
    setBackgroundGridFile?: (file: File | null) => void;
    handleBackgroundGridUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    // Project ID for character resources
    projectId: string | null;
    // Character mention
    showCharacterModalFromMention?: boolean;
    onCharacterMentionSelect?: (characters: any[]) => void;
    onCloseCharacterMention?: () => void;
    // New: Selected Characters for Auto Mode
    selectedCharacters: any[];
    setSelectedCharacters: (chars: any[]) => void;
    // New Prop for Background Selection
    selectedBackgroundUrl?: string | null;
    onDirectCharacterUpload?: (file: File) => void;
}

const GenerateButton: React.FC<{ onGenerate: () => void; isGenerating: boolean }> = ({ onGenerate, isGenerating }) => {
    const [cooldown, setCooldown] = React.useState(false);

    const handleClick = () => {
        if (cooldown || isGenerating) return;

        onGenerate();
        setCooldown(true);
        setTimeout(() => setCooldown(false), 5000);
    };

    const isDisabled = isGenerating || cooldown;

    return (
        <button
            onClick={handleClick}
            disabled={isDisabled}
            className="w-full bg-blue-100 hover:bg-blue-200 text-black font-medium py-2 rounded flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
            {isGenerating ? (
                <Loader2 className="animate-spin" size={16} />
            ) : (
                <Sparkles size={16} />
            )}
            <span>
                {isGenerating ? 'Generating...' : cooldown ? 'Please wait...' : 'Generate Version'}
            </span>
        </button>
    );
};

export const GenerationTools: React.FC<GenerationToolsProps> = ({
    generationMode,
    setGenerationMode,
    prompt,
    handlePromptChange,
    textareaRef,
    handleDragOver,
    handleDropRef,
    showTagMenu,
    refImages,
    insertTag,
    removeRefImage,
    refInputRef,
    handleRefImageSelect,
    selectedAutoTabs,
    setSelectedAutoTabs,
    fileInputRefs,
    handleAutoStoryboardUpload,
    autoStoryboardFile,
    setAutoStoryboardFile,
    shot,
    handleAutoBackgroundUpload,
    autoBackgroundFile,
    setAutoBackgroundFile,
    characterTabs,
    // autoCharacterFiles,
    // handleAutoCharacterUpload,
    removeCharacterTab,
    selectedModel,
    setSelectedModel,
    aspectRatio,
    setAspectRatio,
    resolution,
    setResolution,
    handleGenerate,
    isGenerating,
    // uploadingRefs,
    // Angles Props
    anglesAngle,
    setAnglesAngle,
    anglesLength,
    setAnglesLength,
    anglesFocus,
    setAnglesFocus,
    anglesBackground,
    setAnglesBackground,
    anglesAnchorFile,
    setAnglesAnchorFile,
    handleAnglesAnchorUpload,
    anglesTargetFile,
    setAnglesTargetFile,
    handleAnglesTargetUpload,
    // BG Grid
    backgroundGridFile,
    setBackgroundGridFile,
    handleBackgroundGridUpload,
    // Project ID
    projectId,
    // Character mention
    showCharacterModalFromMention,
    onCharacterMentionSelect,
    onCloseCharacterMention,
    // New Props
    selectedCharacters,
    setSelectedCharacters,
    selectedBackgroundUrl,
    onDirectCharacterUpload
}) => {
    // Character selection state
    const [showCharacterModal, setShowCharacterModal] = useState(false);

    const handleCharacterSelect = (characters: any[]) => {
        setSelectedCharacters(characters);
    };

    const removeCharacter = (id: string) => {
        setSelectedCharacters(selectedCharacters.filter(c => c.id !== id));
    };


    const getPreviewUrl = (gdriveLink: string) => {
        const match = gdriveLink.match(/\/d\/([^\/]+)/);
        if (match) {
            return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w200`;
        }
        return gdriveLink.replace('/view', '/preview');
    };
    // Helper handlers for drag and drop
    const onButtonDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const onDropFile = async (e: React.DragEvent, setter: ((file: File | null) => void) | undefined) => {
        e.preventDefault();
        e.stopPropagation();

        if (!setter) return;

        // Handle File Drop
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const file = e.dataTransfer.files[0];
            if (file.type.startsWith('image/')) {
                setter(file);
            }
            return;
        }

        // Handle URL Drop (from Gallery/Web)
        const imageUrl = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain');
        if (imageUrl) {
            try {
                // Determine filename from URL or default
                const filename = imageUrl.split('/').pop()?.split('?')[0] || 'dropped-image.jpg';
                const response = await fetch(imageUrl);
                const blob = await response.blob();
                const file = new File([blob], filename, { type: blob.type });
                setter(file);
            } catch (error) {
                console.error("Failed to fetch dropped image:", error);
            }
        }
    };
    return (
        <div className="mb-6 p-4 bg-zinc-800/50 rounded-lg border border-zinc-700 space-y-4">
            {/* <div className="glass-panel p-5 rounded-lg space-y-4 bg-black/40"> */}
            {/* Header */}
            <div className="flex items-center justify-between gap-4 min-h-[80px] border-b border-zinc-700 pb-4">
                {/* Title */}
                <div className="flex items-center gap-3 text-zinc-200">
                    <div className="p-2 bg-white-500/10 rounded-lg">
                        <Wand2 size={20} className="text-white-400" />
                    </div>
                    <h3 className="text-lg whitespace-nowrap">AI Generation</h3>
                </div>

                {/* Generation Mode Dropdown (inline with title) */}
                <div className="w-28 relative">
                    <select
                        value={generationMode}
                        onChange={(e) => setGenerationMode(e.target.value as any)}
                        className="w-full bg-black/40 text-xs font-bold text-zinc-300 border border-white/10 rounded-md py-1 pl-2 pr-6 appearance-none focus:outline-none focus:ring-1 focus:ring-zinc-600 cursor-pointer  tracking-wider"
                    >
                        <option value="manual">Manual</option>
                        <option value="automatic">Automatic</option>
                        <option value="storyboard_enhancer">S.B Enhancer</option>
                        <option value="angles">Angles</option>
                        <option value="background_grid">Background Grid</option>
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" size={7} />
                </div>
            </div>

            {/* Prompt / Automatic / Angles Inputs */}
            <div className="relative">
                {generationMode === 'manual' ? (
                    <>
                        <label className="text-xs text-zinc-500 block mb-1">Prompt</label>
                        <textarea
                            ref={textareaRef}
                            value={prompt}
                            onChange={handlePromptChange}
                            onDragOver={handleDragOver}
                            onDrop={handleDropRef}
                            className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-sm text-zinc-200 focus:outline-none focus:border-white-500 resize-none h-20 placeholder-zinc-600 mb-2"
                            placeholder="Describe the shot... Use @img1 to reference uploads, @ch for characters."
                        />

                        {/* Tag Autocomplete Menu */}
                        {showTagMenu && refImages.length > 0 && (
                            <div className="absolute top-20 left-2 z-50 bg-zinc-800 border border-zinc-700 rounded shadow-lg w-40 overflow-hidden">
                                {refImages.map((_, i) => (
                                    <button
                                        key={i}
                                        onClick={() => insertTag(`@img${i + 1}`)}
                                        className="w-full text-left px-3 py-2 text-sm hover:bg-white-600 hover:text-white transition-colors flex items-center gap-2"
                                    >
                                        <span className="font-bold text-white-400">@img{i + 1}</span>
                                        <span className="text-xs text-zinc-400 truncate w-20">Image {i + 1}</span>
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Reference Image Preview Area */}
                        {refImages.length > 0 && (
                            <div className="flex gap-2 mb-2 overflow-x-auto pb-1">
                                {refImages.map((file, idx) => (
                                    <div key={idx} className="relative group flex-shrink-0 w-16 h-16 bg-zinc-800 rounded border border-zinc-700 overflow-hidden">
                                        <img src={URL.createObjectURL(file)} className="w-full h-full object-cover" alt={`ref-${idx}`} />
                                        <div className="absolute top-0 left-0 bg-black/60 text-[10px] px-1 text-white font-mono rounded-br">
                                            img{idx + 1}
                                        </div>
                                        <button
                                            onClick={() => removeRefImage(idx)}
                                            className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X size={12} className="text-white" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="flex justify-between">
                            <button
                                onClick={() => refInputRef.current?.click()}
                                className="text-xs text-white-400 hover:text-blue-100 flex items-center gap-1"
                            >
                                <ImagePlus size={12} />
                                Add References
                            </button>
                            <input type="file" multiple accept="image/*" className="hidden" ref={refInputRef} onChange={handleRefImageSelect} />
                        </div>
                    </>
                ) : generationMode === 'angles' ? (
                    <div className="space-y-4">
                        <div className="flex flex-col space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">Angle</label>
                                    <input
                                        type="text"
                                        value={anglesAngle}
                                        onChange={(e) => setAnglesAngle(e.target.value)}
                                        placeholder="e.g. front shot"
                                        className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-500/50 placeholder-zinc-700"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">Length</label>
                                    <input
                                        type="text"
                                        value={anglesLength}
                                        onChange={(e) => setAnglesLength(e.target.value)}
                                        placeholder="e.g. closeup"
                                        className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-500/50 placeholder-zinc-700"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">Focus On</label>
                                <input
                                    type="text"
                                    value={anglesFocus}
                                    onChange={(e) => setAnglesFocus(e.target.value)}
                                    placeholder="e.g. mom looking at son"
                                    className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-500/50 placeholder-zinc-700"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">Background Details</label>
                                <textarea
                                    value={anglesBackground}
                                    onChange={(e) => setAnglesBackground(e.target.value)}
                                    placeholder="e.g. half window and lamp"
                                    className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-500/50 resize-none h-16 placeholder-zinc-700"
                                />
                            </div>
                        </div>

                        <div className="flex gap-2">
                            {/* Anchor Image Tab */}
                            <button
                                onClick={() => { }} // No tab toggle needed for fixed inputs
                                onDoubleClick={() => fileInputRefs.anglesAnchor.current?.click()}
                                onDragOver={onButtonDragOver}
                                onDrop={(e) => onDropFile(e, setAnglesAnchorFile)}
                                className={`
                                        w-24 h-24 rounded-xl border-2 border-dashed flex flex-col justify-between items-start text-left p-3 relative overflow-hidden group transition-all shrink-0
                                        ${anglesAnchorFile ? 'bg-zinc-800 border-white text-white shadow-lg' : 'bg-zinc-900/50 border-zinc-700 text-zinc-500 hover:border-zinc-500 hover:text-zinc-400'}
                                    `}
                            >
                                <input
                                    type="file"
                                    ref={fileInputRefs.anglesAnchor}
                                    className="hidden"
                                    onChange={handleAnglesAnchorUpload}
                                    accept="image/*"
                                />

                                {/* Icon Top-Left */}
                                <div className="z-20">
                                    <ImageIcon size={18} className={anglesAnchorFile ? 'fill-current' : ''} />
                                </div>

                                {/* Label Bottom-Left */}
                                <span className="text-[10px] font-bold tracking-wider text-left z-20 w-full">Anchor Img</span>

                                {/* Hover Overlay */}
                                <div className="absolute inset-0 bg-black/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-30 pointer-events-none">
                                    <span className="text-[8px] text-zinc-300 font-mono text-center px-1">Drop or Select File</span>
                                </div>

                                {/* Content Background */}
                                {anglesAnchorFile && (
                                    <div className="absolute inset-0 z-10 opacity-40 group-hover:opacity-20 transition-opacity pointer-events-none">
                                        <img
                                            src={URL.createObjectURL(anglesAnchorFile)}
                                            className="w-full h-full object-cover"
                                            alt=""
                                            onError={(e) => e.currentTarget.style.display = 'none'}
                                        />
                                    </div>
                                )}
                            </button>

                            {/* Target Image Tab */}
                            <button
                                onClick={() => { }}
                                onDoubleClick={() => fileInputRefs.anglesTarget.current?.click()}
                                onDragOver={onButtonDragOver}
                                onDrop={(e) => onDropFile(e, setAnglesTargetFile)}
                                className={`
                                        w-24 h-24 rounded-xl border-2 border-dashed flex flex-col justify-between items-start text-left p-3 relative overflow-hidden group transition-all shrink-0
                                        ${anglesTargetFile ? 'bg-zinc-800 border-white text-white shadow-lg' : 'bg-zinc-900/50 border-zinc-700 text-zinc-500 hover:border-zinc-500 hover:text-zinc-400'}
                                    `}
                            >
                                <input
                                    type="file"
                                    ref={fileInputRefs.anglesTarget}
                                    className="hidden"
                                    onChange={handleAnglesTargetUpload}
                                    accept="image/*"
                                />

                                {/* Icon Top-Left */}
                                <div className="z-20">
                                    <Target size={18} className={anglesTargetFile ? 'fill-current' : ''} />
                                </div>

                                {/* Label Bottom-Left */}
                                <span className="text-[10px] font-bold tracking-wider text-left z-20 w-full">Target Img</span>

                                {/* Hover Overlay */}
                                <div className="absolute inset-0 bg-black/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-30 pointer-events-none">
                                    <span className="text-[8px] text-zinc-300 font-mono text-center px-1">Drop or Select File</span>
                                </div>

                                {/* Content Background */}
                                {anglesTargetFile && (
                                    <div className="absolute inset-0 z-10 opacity-40 group-hover:opacity-20 transition-opacity pointer-events-none">
                                        <img
                                            src={URL.createObjectURL(anglesTargetFile)}
                                            className="w-full h-full object-cover"
                                            alt=""
                                            onError={(e) => e.currentTarget.style.display = 'none'}
                                        />
                                    </div>
                                )}
                            </button>
                        </div>
                        <p className="text-[10px] text-zinc-500 italic text-center">* Double-click to upload images</p>
                    </div>
                ) : generationMode === 'storyboard_enhancer' ? (
                    <div className="space-y-3">
                        <div className="flex justify-between items-center mb-1">
                            <label className="text-xs text-zinc-500">Enhancer Inputs</label>
                        </div>

                        <div className="flex gap-2 mb-2">
                            {/* Storyboard Tab for Enhancer */}
                            <button
                                onClick={() => {
                                    // Enhancer mode: selection is implicit or simplified
                                    if (!selectedAutoTabs.includes('storyboard')) {
                                        setSelectedAutoTabs(['storyboard']);
                                    }
                                }}
                                onDoubleClick={() => fileInputRefs.storyboard.current?.click()}
                                onDragOver={onButtonDragOver}
                                onDrop={(e) => onDropFile(e, setAutoStoryboardFile)}
                                className={`
                    w-24 h-24 rounded-xl border-2 border-dashed flex flex-col justify-between items-start text-left p-3 relative overflow-hidden group transition-all shrink-0
                    ${selectedAutoTabs.includes('storyboard')
                                        ? 'bg-zinc-800 border-white text-white shadow-lg'
                                        : 'bg-zinc-900/50 border-zinc-700 text-zinc-500 hover:border-zinc-500 hover:text-zinc-400'
                                    }
                    `}
                            >
                                <input
                                    type="file"
                                    ref={fileInputRefs.storyboard}
                                    className="hidden"
                                    onChange={handleAutoStoryboardUpload}
                                    accept="image/*"
                                />

                                {/* Icon Top-Left */}
                                <div className="z-20">
                                    <Star size={18} className={selectedAutoTabs.includes('storyboard') ? 'fill-current' : ''} />
                                </div>

                                {/* Label Bottom-Left */}
                                <span className="text-[10px] font-bold tracking-wider text-left z-20 w-full">Storyboard</span>

                                {/* Hover Overlay */}
                                <div className="absolute inset-0 bg-black/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-30 pointer-events-none">
                                    <span className="text-[8px] text-zinc-300 font-mono text-center px-1">Drop or Select File</span>
                                </div>

                                {/* Content Background */}
                                {(autoStoryboardFile || shot.storyboard_url) && (
                                    <div className="absolute inset-0 z-10 opacity-40 group-hover:opacity-20 transition-opacity pointer-events-none">
                                        <img
                                            src={autoStoryboardFile ? URL.createObjectURL(autoStoryboardFile) : shot.storyboard_url || undefined}
                                            className="w-full h-full object-cover"
                                            alt=""
                                            onError={(e) => e.currentTarget.style.display = 'none'}
                                        />
                                    </div>
                                )}
                            </button>
                        </div>

                        {/* Additional Context Input (Moved Below) */}
                        <div className="mb-2">
                            <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block mb-1 pl-1">Additional Context</label>
                            <textarea
                                value={prompt}
                                onChange={handlePromptChange}
                                placeholder="Add context to refine the generation..."
                                className="w-full bg-black/40 border border-white/10 rounded-xl p-2 text-[10px] text-zinc-300 focus:outline-none focus:ring-1 focus:ring-zinc-600/50 resize-none h-12 placeholder-zinc-700 shadow-inner leading-tight"
                            />
                        </div>

                        <p className="text-[10px] text-zinc-500 italic text-center">* Double-click to upload custom storyboard</p>
                    </div>
                ) : generationMode === 'background_grid' ? (
                    <div className="space-y-4">
                        <div className="flex flex-col space-y-3">
                            <div>
                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">Base Background</label>
                                <button
                                    onClick={() => { }}
                                    onDoubleClick={() => fileInputRefs.backgroundGrid?.current?.click()}
                                    onDragOver={onButtonDragOver}
                                    onDrop={(e) => onDropFile(e, setBackgroundGridFile)}
                                    className={`
                                            w-24 h-24 rounded-xl border-2 border-dashed flex flex-col justify-between items-start text-left p-3 relative overflow-hidden group transition-all shrink-0
                                            ${backgroundGridFile ? 'bg-zinc-800 border-white text-white shadow-lg' : 'bg-zinc-900/50 border-zinc-700 text-zinc-500 hover:border-zinc-500 hover:text-zinc-400'}
                                        `}
                                >
                                    <input
                                        type="file"
                                        ref={fileInputRefs.backgroundGrid}
                                        className="hidden"
                                        onChange={handleBackgroundGridUpload}
                                        accept="image/*"
                                    />

                                    {/* Icon Top-Left */}
                                    <div className="z-20">
                                        <ImagePlus size={18} className={backgroundGridFile ? 'fill-current' : ''} />
                                    </div>

                                    {/* Label Bottom-Left */}
                                    <span className="text-[10px] font-bold tracking-wider text-left z-20 w-full">Base Background</span>

                                    {/* Hover Overlay */}
                                    <div className="absolute inset-0 bg-black/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-30 pointer-events-none">
                                        <span className="text-[8px] text-zinc-300 font-mono text-center px-1">Drop or Select File</span>
                                    </div>

                                    {/* Content Background */}
                                    {backgroundGridFile && (
                                        <div className="absolute inset-0 z-10 opacity-40 group-hover:opacity-20 transition-opacity pointer-events-none">
                                            <img
                                                src={URL.createObjectURL(backgroundGridFile)}
                                                className="w-full h-full object-cover"
                                                alt=""
                                                onError={(e) => e.currentTarget.style.display = 'none'}
                                            />
                                        </div>
                                    )}
                                </button>
                            </div>

                            <div className="mb-2">
                                <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block mb-1 pl-1">Context (Optional)</label>
                                <textarea
                                    value={prompt}
                                    onChange={handlePromptChange}
                                    placeholder="Add context (e.g. 'Cyberpunk city street')..."
                                    className="w-full bg-black/40 border border-white/10 rounded-xl p-2 text-[10px] text-zinc-300 focus:outline-none focus:ring-1 focus:ring-zinc-600/50 resize-none h-16 placeholder-zinc-700 shadow-inner leading-tight"
                                />
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div className="flex justify-between items-center mb-1">
                            <label className="text-xs text-zinc-500">Pipeline Inputs</label>
                        </div>

                        <div className="flex gap-2 flex-wrap">
                            {/* Storyboard Tab */}
                            <button
                                onClick={() => {
                                    setSelectedAutoTabs(prev =>
                                        prev.includes('storyboard') ? prev.filter(t => t !== 'storyboard') : [...prev, 'storyboard']
                                    );
                                }}
                                onDoubleClick={() => fileInputRefs.storyboard.current?.click()}
                                onDragOver={onButtonDragOver}
                                onDrop={(e) => onDropFile(e, setAutoStoryboardFile)}
                                className={`
                    w-24 h-24 rounded-xl border-2 border-dashed flex flex-col justify-between items-start text-left p-3 relative overflow-hidden group transition-all shrink-0
                    ${selectedAutoTabs.includes('storyboard')
                                        ? 'bg-zinc-800 border-white text-white shadow-lg'
                                        : 'bg-zinc-900/50 border-zinc-700 text-zinc-500 hover:border-zinc-500 hover:text-zinc-400'
                                    }
                    `}
                            >
                                <input
                                    type="file"
                                    ref={fileInputRefs.storyboard}
                                    className="hidden"
                                    onChange={handleAutoStoryboardUpload}
                                    accept="image/*"
                                />

                                {/* Icon Top-Left */}
                                <div className="z-20">
                                    <Star size={18} className={selectedAutoTabs.includes('storyboard') ? 'fill-current' : ''} />
                                </div>

                                {/* Label Bottom-Left */}
                                <span className="text-[10px] font-bold tracking-wider text-left z-20 w-full">Storyboard</span>

                                {/* Hover Overlay */}
                                <div className="absolute inset-0 bg-black/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-30 pointer-events-none">
                                    <span className="text-[8px] text-zinc-300 font-mono text-center px-1">Drop or Select File</span>
                                </div>

                                {/* Content Background */}
                                {(autoStoryboardFile || shot.storyboard_url) && (
                                    <div className="absolute inset-0 z-10 opacity-40 group-hover:opacity-20 transition-opacity pointer-events-none">
                                        <DriveImage
                                            src={autoStoryboardFile ? URL.createObjectURL(autoStoryboardFile) : shot.storyboard_url || undefined}
                                            className="w-full h-full"
                                            imageClassName="object-cover"
                                            alt=""
                                        />
                                    </div>
                                )}
                            </button>

                            {/* Composition & Lighting Tab (Merged) */}


                            {/* Background Tab */}
                            <button
                                onClick={() => {
                                    setSelectedAutoTabs(prev =>
                                        prev.includes('background') ? prev.filter(t => t !== 'background') : [...prev, 'background']
                                    );
                                }}
                                onDoubleClick={() => fileInputRefs.background.current?.click()}
                                onDragOver={onButtonDragOver}
                                onDrop={(e) => onDropFile(e, setAutoBackgroundFile)}
                                className={`
                    w-24 h-24 rounded-xl border-2 border-dashed flex flex-col justify-between items-start text-left p-3 relative overflow-hidden group transition-all shrink-0
                    ${selectedAutoTabs.includes('background')
                                        ? 'bg-zinc-800 border-white text-white shadow-lg'
                                        : 'bg-zinc-900/50 border-zinc-700 text-zinc-500 hover:border-zinc-500 hover:text-zinc-400'
                                    }
                    `}
                            >
                                <input
                                    type="file"
                                    ref={fileInputRefs.background}
                                    className="hidden"
                                    onChange={handleAutoBackgroundUpload}
                                    accept="image/*"
                                />

                                {/* Icon Top-Left */}
                                <div className="z-20">
                                    <ImagePlus size={18} className={selectedAutoTabs.includes('background') ? 'fill-current' : ''} />
                                </div>

                                {/* Label Bottom-Left */}
                                <span className="text-[10px] font-bold tracking-wider text-left z-20 w-full">Background</span>

                                {/* Hover Overlay */}
                                <div className="absolute inset-0 bg-black/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-30 pointer-events-none">
                                    <span className="text-[8px] text-zinc-300 font-mono text-center px-1">Drop or Select File</span>
                                </div>

                                {/* Content Background */}
                                {(autoBackgroundFile || selectedBackgroundUrl || (shot.background_urls && shot.background_urls.length > 0)) && (
                                    <div className="absolute inset-0 z-10 opacity-40 group-hover:opacity-20 transition-opacity pointer-events-none">
                                        <DriveImage
                                            src={autoBackgroundFile ? URL.createObjectURL(autoBackgroundFile) : selectedBackgroundUrl || shot.background_urls![0]}
                                            alt="Background"
                                            className="w-full h-full"
                                            imageClassName="object-cover"
                                        />
                                    </div>
                                )}
                            </button>

                            {/* Select Characters Button */}
                            <button
                                onClick={() => setShowCharacterModal(true)}
                                disabled={!projectId}
                                className="w-24 h-24 rounded-xl border-2 border-dashed border-zinc-700 bg-zinc-900/50 text-zinc-500 hover:text-zinc-400 hover:border-zinc-500 hover:bg-zinc-800 flex flex-col justify-between items-start text-left p-3 relative overflow-hidden group transition-all shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <div className="z-20">
                                    <User size={18} />
                                </div>
                                <span className="text-[10px] font-bold tracking-wider text-left z-20 w-full">Select Characters</span>

                                {/* Hover Overlay */}
                                <div className="absolute inset-0 bg-black/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-30 pointer-events-none">
                                    <span className="text-[8px] text-zinc-300 font-mono text-center px-1">Click to Select</span>
                                </div>
                            </button>

                            {/* Selected Characters Display */}
                            {selectedCharacters.map((character) => (
                                <div
                                    key={character.id}
                                    className="w-24 h-24 rounded-xl border-2 border-blue-500 bg-zinc-800 flex flex-col justify-between items-start text-left p-2 relative overflow-hidden group transition-all shrink-0"
                                >
                                    {/* Character Image */}
                                    <img
                                        src={getPreviewUrl(character.gdrive_link)}
                                        alt={character.name}
                                        className="absolute inset-0 w-full h-full object-cover opacity-40"
                                        onError={(e) => {
                                            e.currentTarget.style.display = 'none';
                                        }}
                                    />
                                    {/* Remove Button */}
                                    <button
                                        onClick={() => removeCharacter(character.id)}
                                        className="absolute top-1 right-1 bg-red-500 rounded-full p-1 hover:bg-red-600 z-20"
                                    >
                                        <X size={12} className="text-white" />
                                    </button>


                                    {/* Character Name */}
                                    <div className="absolute bottom-0 left-0 right-0 bg-black/70 backdrop-blur-sm p-1 z-10">
                                        <span className="text-[9px] font-bold text-white truncate block">
                                            {character.name}
                                        </span>
                                    </div>

                                </div>

                            ))}

                            {/* Manual Character Tabs */}
                            {characterTabs.map((tab) => (
                                <div
                                    key={tab.id}
                                    className="w-24 h-24 rounded-xl border-2 border-zinc-600 bg-zinc-800 flex flex-col justify-between items-start text-left p-2 relative overflow-hidden group transition-all shrink-0"
                                >
                                    {/* Image Preview */}
                                    {tab.file && (
                                        <img
                                            src={URL.createObjectURL(tab.file)}
                                            alt={tab.name}
                                            className="absolute inset-0 w-full h-full object-cover opacity-60"
                                        />
                                    )}
                                    {/* Remove Button */}
                                    <button
                                        onClick={(e) => removeCharacterTab(tab.id, e)}
                                        className="absolute top-1 right-1 bg-zinc-700/50 hover:bg-red-500 rounded-full p-1 transition-colors z-20"
                                    >
                                        <X size={12} className="text-white" />
                                    </button>

                                    <span className="absolute bottom-1 left-1 text-[9px] font-bold text-zinc-100 z-10 w-full truncate px-1 shadow-black drop-shadow-md">
                                        {tab.name}
                                    </span>
                                </div>
                            ))}

                            {/* Direct Upload Button */}
                            <button
                                onClick={() => fileInputRefs.characters.current.get('new_upload')?.click()}
                                className="w-24 h-24 rounded-xl border-2 border-dashed border-zinc-700 bg-zinc-900/50 text-zinc-600 hover:text-zinc-400 hover:border-zinc-500 hover:bg-zinc-800 flex flex-col justify-between items-start text-left p-3 transition-all shrink-0 relative"
                            >
                                <input
                                    type="file"
                                    className="hidden"
                                    accept="image/*"
                                    ref={(el) => {
                                        if (el) fileInputRefs.characters.current.set('new_upload', el);
                                    }}
                                    onChange={(e) => {
                                        if (e.target.files?.[0] && onDirectCharacterUpload) {
                                            onDirectCharacterUpload(e.target.files[0]);
                                            e.target.value = ''; // Reset
                                        }
                                    }}
                                />
                                <div className="z-20">
                                    <Upload size={18} />
                                </div>
                                <span className="text-[10px] font-medium text-left z-20">Upload Character</span>
                            </button>
                        </div>

                        {/* Additional Context Input (Moved Below) */}
                        <div className="mb-2 mt-2">
                            <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block mb-1 pl-1">Additional Context</label>
                            <textarea
                                value={prompt}
                                onChange={handlePromptChange}
                                placeholder="Add context to refine the generation..."
                                className="w-full bg-black/40 border border-white/10 rounded-xl p-2 text-[10px] text-zinc-300 focus:outline-none focus:ring-1 focus:ring-zinc-600/50 resize-none h-12 placeholder-zinc-700 shadow-inner leading-tight"
                            />
                        </div>

                        <p className="text-[10px] text-zinc-500 italic text-center">* Click tabs to upload references for each stage</p>
                    </div>
                )}
            </div>

            {/* Controls Row */}
            <div className="grid grid-cols-3 gap-2">
                <div className="col-span-1">
                    <label className="text-xs text-zinc-500 block mb-1">Model</label>
                    <div className="relative">
                        <select
                            value={generationMode === 'background_grid' ? 'Gemini 3 Pro' : selectedModel}
                            onChange={(e) => setSelectedModel(e.target.value)}
                            disabled={generationMode === 'background_grid'}
                            className={`w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-xs text-zinc-200 outline-none appearance-none cursor-pointer truncate ${generationMode === 'background_grid' ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {generationMode === 'background_grid' ? (
                                <option>Google Gemini 3.5 Pro</option>
                            ) : (
                                <>
                                    <option>Google Gemini 3.5 Pro</option>
                                </>
                            )}
                        </select>
                        <ChevronDown size={14} className="absolute right-1 top-2.5 text-zinc-500 pointer-events-none" />
                    </div>
                </div>
                <div>
                    <label className="text-xs text-zinc-500 block mb-1">Ratio</label>
                    <div className="relative">
                        <select
                            value={aspectRatio}
                            onChange={(e) => setAspectRatio(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-xs text-zinc-200 outline-none appearance-none cursor-pointer"
                        >
                            <option>1:1</option>
                            <option>21:9</option>
                            <option>16:9</option>
                            <option>9:16</option>
                            <option>3:4</option>
                            <option>4:5</option>
                            <option>5:4</option>
                            <option>4:3</option>
                            <option>3:2</option>
                            <option>2:3</option>
                        </select>
                        <ChevronDown size={14} className="absolute right-1 top-2.5 text-zinc-500 pointer-events-none" />
                    </div>
                </div>
                <div>
                    <label className="text-xs text-zinc-500 block mb-1">Res</label>
                    <div className="relative">
                        <select
                            value={generationMode === 'background_grid' ? '4K' : resolution}
                            onChange={(e) => setResolution(e.target.value)}
                            disabled={generationMode === 'background_grid'}
                            className={`w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-xs text-zinc-200 outline-none appearance-none cursor-pointer ${generationMode === 'background_grid' ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {generationMode === 'background_grid' ? (
                                <option>4K</option>
                            ) : (
                                <>
                                    <option>1K</option>
                                    <option>2K</option>
                                </>
                            )}
                        </select>
                        <ChevronDown size={14} className="absolute right-1 top-2.5 text-zinc-500 pointer-events-none" />
                    </div>
                </div>
            </div>

            {/* Button */}
            <GenerateButton
                onGenerate={handleGenerate}
                isGenerating={isGenerating}
            />

            {/* Character Selection Modal */}
            {showCharacterModal && projectId && (
                <CharacterSelectionModal
                    projectId={projectId}
                    onSelect={handleCharacterSelect}
                    onClose={() => setShowCharacterModal(false)}
                    selectedCharacterIds={selectedCharacters.map(c => c.id)}
                />
            )}

            {/* Character Selection Modal from @ch mention */}
            {showCharacterModalFromMention && projectId && onCharacterMentionSelect && onCloseCharacterMention && (
                <CharacterSelectionModal
                    projectId={projectId}
                    onSelect={onCharacterMentionSelect}
                    onClose={onCloseCharacterMention}
                    selectedCharacterIds={[]}
                />
            )}
        </div>
    );
};
