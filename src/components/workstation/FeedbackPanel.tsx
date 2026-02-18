import React, { useState, useRef } from 'react';
import { NotificationBell } from '../NotificationBell';
import type { Version, Review, UserProfile, TimestampComment } from '../../types';
import { Image as ImageIcon, X, Maximize2, ChevronRight, ChevronLeft, MessageSquare, PenTool, Clock, Plus, Trash2 } from 'lucide-react';
import { ImageViewerModal } from '../ImageViewerModal';
import { ImageAnnotationModal } from '../ImageAnnotationModal';

interface FeedbackPanelProps {
    activeVersion: Version | null;
    review: Review | null;
    userProfile: UserProfile | null;
    handleVote: (type: 'pm' | 'cd', vote: boolean) => void;
    handleCommentSave: (type: 'pm' | 'cd', files?: File[], annotationFiles?: File[]) => void;
    pmCommentRef: React.RefObject<HTMLTextAreaElement | null>;
    cdCommentRef: React.RefObject<HTMLTextAreaElement | null>;
    isCollapsed: boolean;
    toggleCollapse: () => void;
    workstationMode: 'image' | 'video';
    onSaveTimestamps?: (role: 'pm' | 'cd', timestamps: TimestampComment[]) => void;
    currentVideoTime?: number;
}

export const FeedbackPanel: React.FC<FeedbackPanelProps> = ({
    activeVersion,
    review,
    userProfile,
    handleVote,
    handleCommentSave,
    pmCommentRef,
    cdCommentRef,
    isCollapsed,
    toggleCollapse,
    workstationMode,
    onSaveTimestamps,
    currentVideoTime = 0
}) => {
    const [pmFiles, setPmFiles] = useState<File[]>([]);
    const [cdFiles, setCdFiles] = useState<File[]>([]);
    const [pmAnnotationFiles, setPmAnnotationFiles] = useState<File[]>([]);
    const [cdAnnotationFiles, setCdAnnotationFiles] = useState<File[]>([]);
    const pmFileInputRef = useRef<HTMLInputElement>(null);
    const cdFileInputRef = useRef<HTMLInputElement>(null);

    const [viewImage, setViewImage] = useState<{ url: string, prompt?: string } | null>(null);

    // Annotation State
    const [annotating, setAnnotating] = useState<{ type: 'pm' | 'cd', url: string } | null>(null);

    // Timestamp Review State (Video Mode)
    const [pmTimestamps, setPmTimestamps] = useState<TimestampComment[]>([]);
    const [cdTimestamps, setCdTimestamps] = useState<TimestampComment[]>([]);
    const [newTimestamp, setNewTimestamp] = useState<{ time: string; comment: string }>({ time: '', comment: '' });
    const [activeTimestampRole, setActiveTimestampRole] = useState<'pm' | 'cd' | null>(null);

    // Sync timestamps from review when it changes
    React.useEffect(() => {
        if (review) {
            setPmTimestamps(review.pm_timestamps || []);
            setCdTimestamps(review.cd_timestamps || []);
        }
    }, [review]);

    React.useEffect(() => {
        if (workstationMode === 'video' && currentVideoTime !== undefined) {
            setNewTimestamp(prev => ({ ...prev, time: currentVideoTime.toFixed(1) }));
        }
    }, [currentVideoTime, workstationMode]);

    const addTimestamp = (role: 'pm' | 'cd') => {
        const timeVal = parseFloat(newTimestamp.time);
        if (isNaN(timeVal) || !newTimestamp.comment.trim()) return;
        const entry: TimestampComment = { time: timeVal, comment: newTimestamp.comment.trim() };
        if (role === 'pm') {
            setPmTimestamps(prev => [...prev, entry].sort((a, b) => a.time - b.time));
        } else {
            setCdTimestamps(prev => [...prev, entry].sort((a, b) => a.time - b.time));
        }
        setNewTimestamp({ time: '', comment: '' });
    };

    const removeTimestamp = (role: 'pm' | 'cd', index: number) => {
        if (role === 'pm') {
            setPmTimestamps(prev => prev.filter((_, i) => i !== index));
        } else {
            setCdTimestamps(prev => prev.filter((_, i) => i !== index));
        }
    };

    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const isVideoMode = workstationMode === 'video';

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'pm' | 'cd') => {
        if (e.target.files && e.target.files.length > 0) {
            const newFiles = Array.from(e.target.files);
            if (type === 'pm') {
                setPmFiles(prev => [...prev, ...newFiles]);
            } else {
                setCdFiles(prev => [...prev, ...newFiles]);
            }
            if (e.target) e.target.value = ''; // Reset input to allow re-selection
        }
    };

    const removeFile = (type: 'pm' | 'cd', index: number, isAnnotation: boolean = false) => {
        if (type === 'pm') {
            if (isAnnotation) {
                setPmAnnotationFiles(prev => prev.filter((_, i) => i !== index));
            } else {
                setPmFiles(prev => prev.filter((_, i) => i !== index));
            }
        } else {
            if (isAnnotation) {
                setCdAnnotationFiles(prev => prev.filter((_, i) => i !== index));
            } else {
                setCdFiles(prev => prev.filter((_, i) => i !== index));
            }
        }
    };

    const startAnnotation = (type: 'pm' | 'cd') => {
        if (!activeVersion) return;
        // Use the version image to annotate on
        const url = activeVersion.gdrive_link || activeVersion.public_link; // Simplified fallback logic ideally handled in component/types
        if (url) {
            setAnnotating({ type, url });
        }
    };

    const handleAnnotationSave = (file: File) => {
        if (!annotating) return;
        if (annotating.type === 'pm') {
            setPmAnnotationFiles(prev => [...prev, file]);
        } else {
            setCdAnnotationFiles(prev => [...prev, file]);
        }
        setAnnotating(null);
    };

    return (
        <>
            <div
                className={`
                    flex flex-col bg-zinc-800 border-l border-zinc-700 transition-all duration-300 ease-in-out
                    ${isCollapsed ? 'w-12 items-center py-4' : 'w-1/4 p-4 overflow-y-auto'}
                `}
            >
                {/* Header / Collapse Toggle */}
                <div className={`flex ${isCollapsed ? 'flex-col gap-4' : 'justify-between items-center mb-4'}`}>
                    {!isCollapsed && <h2 className="text-xl font-bold ml-4">Feedback</h2>}

                    <div className="flex items-center gap-2">
                        {!isCollapsed && <NotificationBell />}
                        <button
                            onClick={toggleCollapse}
                            className="p-1.5 hover:bg-white/10 rounded-full text-zinc-400 hover:text-white transition-colors"
                            title={isCollapsed ? "Expand Feedback" : "Collapse Feedback"}
                        >
                            {isCollapsed ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
                        </button>
                    </div>
                </div>

                {isCollapsed ? (
                    /* Collapsed View */
                    <div className="flex-1 flex flex-col items-center mt-8 gap-4">
                        <div className="writing-mode-vertical text-zinc-400 font-bold tracking-widest uppercase text-xs rotate-180" style={{ writingMode: 'vertical-rl' }}>
                            Feedback Panel
                        </div>
                        <MessageSquare size={16} className="text-zinc-500" />
                        {review && (
                            <div className="flex flex-col gap-2 mt-4">
                                {review.pm_vote !== null && (
                                    <div className={`w-2 h-2 rounded-full ${review.pm_vote ? 'bg-green-500' : 'bg-red-500'}`} title="PM Vote" />
                                )}
                                {review.cd_vote !== null && (
                                    <div className={`w-2 h-2 rounded-full ${review.cd_vote ? 'bg-green-500' : 'bg-red-500'}`} title="CD Vote" />
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    /* Expanded View */
                    <>
                        {activeVersion && review ? (
                            <div className="space-y-6">
                                {/* PM Card */}
                                <div className="p-4 bg-zinc-900 rounded border border-zinc-700">
                                    <h3 className="font-bold mb-2 text-zinc-300">Project Manager</h3>
                                    <div className="flex space-x-2 mb-4">
                                        <button
                                            disabled={userProfile?.role !== 'PM'}
                                            onClick={() => handleVote('pm', true)}
                                            className={`flex-1 py-2 rounded-full border-2 font-bold transition-all ${review.pm_vote === true ? 'border-green-500 bg-green-500/20 text-white' : 'border-zinc-700 bg-zinc-800 text-zinc-500 hover:border-zinc-500'}`}
                                        >
                                            YES
                                        </button>
                                        <button
                                            disabled={userProfile?.role !== 'PM'}
                                            onClick={() => handleVote('pm', false)}
                                            className={`flex-1 py-2 rounded-full border-2 font-bold transition-all ${review.pm_vote === false ? 'border-red-500 bg-red-500/20 text-white' : 'border-zinc-700 bg-zinc-800 text-zinc-500 hover:border-zinc-500'}`}
                                        >
                                            NO
                                        </button>
                                    </div>
                                    {/* Approval status and email */}
                                    {review.pm_vote !== null && (
                                        <div className="mb-3 text-xs flex justify-between items-center  p-2 rounded-lg">
                                            <span className={review.pm_vote ? 'text-green-400 font-bold' : 'text-red-400 font-bold'}>
                                                {review.pm_vote ? 'Approved' : 'Rejected'} by PM
                                            </span>
                                            {activeVersion?.users?.email && (
                                                <span className="text-zinc-500 font-mono text-[10px] truncate max-w-[100px]" title={activeVersion.users.email}>
                                                    {activeVersion.users.email.split('@')[0]}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                    <div className="border-t border-white/10 pt-4">
                                        <h4 className="text-[10px] font-bold text-zinc-500 uppercase mb-2 tracking-widest">Review Notes</h4>
                                        {!isVideoMode && (
                                            <textarea
                                                key={`pm-${review.id}`}
                                                ref={pmCommentRef}
                                                defaultValue={review.pm_comment || ''}
                                                className="w-full bg-black/40 text-zinc-200 p-3 rounded-lg border border-white/10 mb-2 min-h-24 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/50 resize-y"
                                                placeholder={userProfile?.role === 'PM' ? "Write review..." : "No review yet."}
                                                disabled={userProfile?.role !== 'PM'}
                                            />
                                        )}

                                        {/* PM Feedback: Image vs Video mode */}
                                        {isVideoMode ? (
                                            /* VIDEO MODE: Timestamp Comments */
                                            <div className="mb-3">
                                                <h4 className="text-[10px] font-bold text-zinc-500 uppercase mb-2 tracking-widest flex items-center gap-1">
                                                    <Clock size={10} /> Timestamp Notes
                                                </h4>
                                                {/* Existing timestamps */}
                                                <div className="space-y-1.5 mb-3 max-h-40 overflow-y-auto">
                                                    {pmTimestamps.map((ts, i) => (
                                                        <div key={i} className="flex items-start gap-2 bg-black/30 p-2 rounded border border-zinc-700 group">
                                                            <span className="text-[11px] font-mono text-cyan-400 bg-cyan-900/30 px-1.5 py-0.5 rounded shrink-0">
                                                                {formatTime(ts.time)}
                                                            </span>
                                                            <span className="text-xs text-zinc-300 flex-1">{ts.comment}</span>
                                                            {userProfile?.role === 'PM' && (
                                                                <button onClick={() => removeTimestamp('pm', i)} className="text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                                                    <Trash2 size={12} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    ))}
                                                    {pmTimestamps.length === 0 && (
                                                        <p className="text-[10px] text-zinc-600 italic">No timestamp notes yet.</p>
                                                    )}
                                                </div>
                                                {/* Add new timestamp */}
                                                {userProfile?.role === 'PM' && (
                                                    <div className="flex gap-2 items-end">
                                                        <div className="flex flex-col gap-1">
                                                            <label className="text-[9px] text-zinc-500 uppercase">Time (sec)</label>
                                                            <input
                                                                type="number"
                                                                step="0.1"
                                                                min="0"
                                                                value={activeTimestampRole === 'pm' ? newTimestamp.time : ''}
                                                                onFocus={() => setActiveTimestampRole('pm')}
                                                                onChange={e => { setActiveTimestampRole('pm'); setNewTimestamp(prev => ({ ...prev, time: e.target.value })); }}
                                                                className="w-16 bg-black/40 text-zinc-200 px-2 py-1 rounded border border-zinc-700 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                                                                placeholder="0"
                                                            />
                                                        </div>
                                                        <div className="flex-1 flex flex-col gap-1">
                                                            <label className="text-[9px] text-zinc-500 uppercase">Comment</label>
                                                            <input
                                                                type="text"
                                                                value={activeTimestampRole === 'pm' ? newTimestamp.comment : ''}
                                                                onFocus={() => setActiveTimestampRole('pm')}
                                                                onChange={e => { setActiveTimestampRole('pm'); setNewTimestamp(prev => ({ ...prev, comment: e.target.value })); }}
                                                                onKeyDown={e => { if (e.key === 'Enter') addTimestamp('pm'); }}
                                                                className="bg-black/40 text-zinc-200 px-2 py-1 rounded border border-zinc-700 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                                                                placeholder="Note at this timestamp..."
                                                            />
                                                        </div>
                                                        <button
                                                            onClick={() => addTimestamp('pm')}
                                                            className="p-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded transition-colors"
                                                            title="Add Timestamp Note"
                                                        >
                                                            <Plus size={14} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            /* IMAGE MODE: Original Image Attachments */
                                            <>
                                                {(userProfile?.role === 'PM' || review.pm_image_url || review.pm_annotation_url) && (
                                                    <div className="mb-3">
                                                        {userProfile?.role === 'PM' && (
                                                            <div className="flex items-center justify-between mb-2 gap-2">
                                                                <div className='flex gap-2'>
                                                                    <button
                                                                        onClick={() => pmFileInputRef.current?.click()}
                                                                        className="text-[10px] uppercase font-bold text-zinc-400 hover:text-white flex items-center gap-1 transition-colors bg-zinc-800 px-2 py-1 rounded-full border border-zinc-700 hover:border-zinc-500"
                                                                    >
                                                                        <ImageIcon size={12} /> Upload
                                                                    </button>
                                                                    <button
                                                                        onClick={() => startAnnotation('pm')}
                                                                        className="text-[10px] uppercase font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors bg-purple-900/30 px-2 py-1 rounded-full border border-purple-800 hover:border-purple-600"
                                                                    >
                                                                        <PenTool size={12} /> Annotate
                                                                    </button>
                                                                </div>
                                                                <input
                                                                    type="file"
                                                                    ref={pmFileInputRef}
                                                                    className="hidden"
                                                                    accept="image/*"
                                                                    multiple
                                                                    onChange={(e) => handleFileSelect(e, 'pm')}
                                                                />
                                                            </div>
                                                        )}

                                                        {/* Previews & Saved Images */}
                                                        <div className="flex gap-2 flex-wrap">
                                                            {/* New Uploads */}
                                                            {pmFiles.map((file, i) => (
                                                                <div key={`new-${i}`} className="relative group w-24 h-24 bg-black/50 rounded-lg overflow-hidden border border-white/10">
                                                                    <img src={URL.createObjectURL(file)} alt="New attachment" className="w-full h-full object-cover" />
                                                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                                                                        <button onClick={() => setViewImage({ url: URL.createObjectURL(file), prompt: 'Preview' })} className="p-1 bg-zinc-800 text-white rounded-full"><Maximize2 size={10} /></button>
                                                                        <button onClick={() => removeFile('pm', i, false)} className="p-1 bg-red-600 text-white rounded-full"><X size={10} /></button>
                                                                    </div>
                                                                </div>
                                                            ))}

                                                            {/* Saved Images */}
                                                            {[
                                                                ...(review.pm_image_urls || []),
                                                                ...(review.pm_image_url ? [review.pm_image_url] : [])
                                                            ].filter((url, index, self) => self.indexOf(url) === index).map((url, i) => (
                                                                <div key={`saved-${i}`} className="relative group w-24 h-24 bg-black/50 rounded-lg overflow-hidden border border-zinc-600 opacity-80">
                                                                    <img src={url} alt="Saved attachment" className="w-full h-full object-cover" />
                                                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                                        <button onClick={() => setViewImage({ url, prompt: 'PM Attachment' })} className="p-1 bg-zinc-800 text-white rounded-full"><Maximize2 size={10} /></button>
                                                                    </div>
                                                                </div>
                                                            ))}

                                                            {/* New Annotations */}
                                                            {pmAnnotationFiles.map((file, i) => (
                                                                <div key={`new-anno-${i}`} className="relative group w-24 h-24 bg-black/50 rounded-lg overflow-hidden border border-purple-500/50">
                                                                    <img src={URL.createObjectURL(file)} alt="New annotation" className="w-full h-full object-cover" />
                                                                    <div className="absolute bottom-0 inset-x-0 bg-purple-600/80 text-white text-[8px] text-center font-bold px-1">NEW ANNO</div>
                                                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                                                                        <button onClick={() => setViewImage({ url: URL.createObjectURL(file), prompt: 'Preview Annotation' })} className="p-1 bg-zinc-800 text-white rounded-full"><Maximize2 size={10} /></button>
                                                                        <button onClick={() => removeFile('pm', i, true)} className="p-1 bg-red-600 text-white rounded-full"><X size={10} /></button>
                                                                    </div>
                                                                </div>
                                                            ))}

                                                            {/* Saved Annotations */}
                                                            {[
                                                                ...(review.pm_annotation_urls || []),
                                                                ...(review.pm_annotation_url ? [review.pm_annotation_url] : [])
                                                            ].filter((url, index, self) => self.indexOf(url) === index).map((url, i) => (
                                                                <div key={`saved-anno-${i}`} className="relative group w-24 h-24 bg-black/50 rounded-lg overflow-hidden border border-purple-500/50 opacity-80">
                                                                    <img src={url} alt="Saved annotation" className="w-full h-full object-cover" />
                                                                    <div className="absolute bottom-0 inset-x-0 bg-purple-600/80 text-white text-[8px] text-center font-bold px-1">ANNO</div>
                                                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                                        <button onClick={() => setViewImage({ url, prompt: 'PM Annotation' })} className="p-1 bg-zinc-800 text-white rounded-full"><Maximize2 size={10} /></button>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </>
                                        )}

                                        {userProfile?.role === 'PM' && (
                                            <button
                                                onClick={() => {
                                                    if (isVideoMode && onSaveTimestamps) {
                                                        onSaveTimestamps('pm', pmTimestamps);
                                                    }
                                                    handleCommentSave('pm', pmFiles, pmAnnotationFiles);
                                                    setPmFiles([]);
                                                    setPmAnnotationFiles([]);
                                                }}
                                                className="glass-button w-full"
                                            >
                                                Save Review
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* CD Card */}
                                <div className="p-4 bg-zinc-900 rounded border border-zinc-700">
                                    <h3 className="font-bold mb-2 text-zinc-300">Creative Director</h3>
                                    <div className="flex space-x-2 mb-4">
                                        <button
                                            disabled={userProfile?.role !== 'CD'}
                                            onClick={() => handleVote('cd', true)}
                                            className={`flex-1 py-2 rounded-full border-2 font-bold transition-all ${review.cd_vote === true ? 'border-green-500 bg-green-500/20 text-white' : 'border-zinc-700 bg-zinc-800 text-zinc-500 hover:border-zinc-500'}`}
                                        >
                                            YES
                                        </button>
                                        <button
                                            disabled={userProfile?.role !== 'CD'}
                                            onClick={() => handleVote('cd', false)}
                                            className={`flex-1 py-2 rounded-full border-2 font-bold transition-all ${review.cd_vote === false ? 'border-red-500 bg-red-500/20 text-white' : 'border-zinc-700 bg-zinc-800 text-zinc-500 hover:border-zinc-500'}`}
                                        >
                                            NO
                                        </button>
                                    </div>
                                    {/* Approval status and email */}
                                    {review.cd_vote !== null && (
                                        <div className="mb-1 text-xs flex justify-between items-center bg-black/0 p-2 rounded-lg">
                                            <span className={review.cd_vote ? 'text-green-400 font-bold' : 'text-red-400 font-bold'}>
                                                {review.cd_vote ? 'Approved' : 'Rejected'} by CD
                                            </span>
                                            {activeVersion?.users?.email && (
                                                <span className="text-zinc-500 font-mono text-[10px] truncate max-w-[100px]" title={activeVersion.users.email}>
                                                    {activeVersion.users.email.split('@')[0]}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                    <div className="border-t border-white/10 pt-4">
                                        <h4 className="text-[10px] font-bold text-zinc-500 uppercase mb-2 tracking-widest">Review Notes</h4>
                                        {!isVideoMode && (
                                            <textarea
                                                key={`cd-${review.id}`}
                                                ref={cdCommentRef}
                                                defaultValue={review.cd_comment || ''}
                                                className="w-full bg-black/40 text-zinc-200 p-3 rounded-lg border border-white/10 mb-2 min-h-24 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/50 resize-y"
                                                placeholder={userProfile?.role === 'CD' ? "Write review..." : "No review yet."}
                                                disabled={userProfile?.role !== 'CD'}
                                            />
                                        )}

                                        {/* CD Feedback: Image vs Video mode */}
                                        {isVideoMode ? (
                                            /* VIDEO MODE: Timestamp Comments for CD */
                                            <div className="mb-3">
                                                <h4 className="text-[10px] font-bold text-zinc-500 uppercase mb-2 tracking-widest flex items-center gap-1">
                                                    <Clock size={10} /> Timestamp Notes
                                                </h4>
                                                <div className="space-y-1.5 mb-3 max-h-40 overflow-y-auto">
                                                    {cdTimestamps.map((ts, i) => (
                                                        <div key={i} className="flex items-start gap-2 bg-black/30 p-2 rounded border border-zinc-700 group">
                                                            <span className="text-[11px] font-mono text-cyan-400 bg-cyan-900/30 px-1.5 py-0.5 rounded shrink-0">
                                                                {formatTime(ts.time)}
                                                            </span>
                                                            <span className="text-xs text-zinc-300 flex-1">{ts.comment}</span>
                                                            {userProfile?.role === 'CD' && (
                                                                <button onClick={() => removeTimestamp('cd', i)} className="text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                                                    <Trash2 size={12} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    ))}
                                                    {cdTimestamps.length === 0 && (
                                                        <p className="text-[10px] text-zinc-600 italic">No timestamp notes yet.</p>
                                                    )}
                                                </div>
                                                {userProfile?.role === 'CD' && (
                                                    <div className="flex gap-2 items-end">
                                                        <div className="flex flex-col gap-1">
                                                            <label className="text-[9px] text-zinc-500 uppercase">Time (sec)</label>
                                                            <input
                                                                type="number"
                                                                step="0.1"
                                                                min="0"
                                                                value={activeTimestampRole === 'cd' ? newTimestamp.time : ''}
                                                                onFocus={() => setActiveTimestampRole('cd')}
                                                                onChange={e => { setActiveTimestampRole('cd'); setNewTimestamp(prev => ({ ...prev, time: e.target.value })); }}
                                                                className="w-16 bg-black/40 text-zinc-200 px-2 py-1 rounded border border-zinc-700 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                                                                placeholder="0"
                                                            />
                                                        </div>
                                                        <div className="flex-1 flex flex-col gap-1">
                                                            <label className="text-[9px] text-zinc-500 uppercase">Comment</label>
                                                            <input
                                                                type="text"
                                                                value={activeTimestampRole === 'cd' ? newTimestamp.comment : ''}
                                                                onFocus={() => setActiveTimestampRole('cd')}
                                                                onChange={e => { setActiveTimestampRole('cd'); setNewTimestamp(prev => ({ ...prev, comment: e.target.value })); }}
                                                                onKeyDown={e => { if (e.key === 'Enter') addTimestamp('cd'); }}
                                                                className="bg-black/40 text-zinc-200 px-2 py-1 rounded border border-zinc-700 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                                                                placeholder="Note at this timestamp..."
                                                            />
                                                        </div>
                                                        <button
                                                            onClick={() => addTimestamp('cd')}
                                                            className="p-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded transition-colors"
                                                            title="Add Timestamp Note"
                                                        >
                                                            <Plus size={14} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            /* IMAGE MODE: Original CD Attachments */
                                            <>
                                                {(userProfile?.role === 'CD' || review.cd_image_url || review.cd_annotation_url) && (
                                                    <div className="mb-3">
                                                        {userProfile?.role === 'CD' && (
                                                            <div className="flex items-center justify-between mb-2 gap-2">
                                                                <div className='flex gap-2'>
                                                                    <button
                                                                        onClick={() => cdFileInputRef.current?.click()}
                                                                        className="text-[10px] uppercase font-bold text-zinc-400 hover:text-white flex items-center gap-1 transition-colors bg-zinc-800 px-2 py-1 rounded-full border border-zinc-700 hover:border-zinc-500"
                                                                    >
                                                                        <ImageIcon size={12} /> Upload
                                                                    </button>
                                                                    <button
                                                                        onClick={() => startAnnotation('cd')}
                                                                        className="text-[10px] uppercase font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors bg-purple-900/30 px-2 py-1 rounded-full border border-purple-800 hover:border-purple-600"
                                                                    >
                                                                        <PenTool size={12} /> Annotate
                                                                    </button>
                                                                </div>
                                                                <input
                                                                    type="file"
                                                                    ref={cdFileInputRef}
                                                                    className="hidden"
                                                                    accept="image/*"
                                                                    multiple
                                                                    onChange={(e) => handleFileSelect(e, 'cd')}
                                                                />
                                                            </div>
                                                        )}


                                                        {/* Previews & Saved Images */}
                                                        <div className="flex gap-2 flex-wrap">
                                                            {/* New Uploads */}
                                                            {cdFiles.map((file, i) => (
                                                                <div key={`cd-new-${i}`} className="relative group w-24 h-24 bg-black/50 rounded-lg overflow-hidden border border-white/10">
                                                                    <img src={URL.createObjectURL(file)} alt="New attachment" className="w-full h-full object-cover" />
                                                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                                                                        <button onClick={() => setViewImage({ url: URL.createObjectURL(file), prompt: 'Preview' })} className="p-1 bg-zinc-800 text-white rounded-full"><Maximize2 size={10} /></button>
                                                                        <button onClick={() => removeFile('cd', i, false)} className="p-1 bg-red-600 text-white rounded-full"><X size={10} /></button>
                                                                    </div>
                                                                </div>
                                                            ))}

                                                            {/* Saved Images */}
                                                            {[
                                                                ...(review.cd_image_urls || []),
                                                                ...(review.cd_image_url ? [review.cd_image_url] : [])
                                                            ].filter((url, index, self) => self.indexOf(url) === index).map((url, i) => (
                                                                <div key={`cd-saved-${i}`} className="relative group w-24 h-24 bg-black/50 rounded-lg overflow-hidden border border-zinc-600 opacity-80">
                                                                    <img src={url} alt="Saved attachment" className="w-full h-full object-cover" />
                                                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                                        <button onClick={() => setViewImage({ url, prompt: 'CD Attachment' })} className="p-1 bg-zinc-800 text-white rounded-full"><Maximize2 size={10} /></button>
                                                                    </div>
                                                                </div>
                                                            ))}

                                                            {/* New Annotations */}
                                                            {cdAnnotationFiles.map((file, i) => (
                                                                <div key={`cd-new-anno-${i}`} className="relative group w-24 h-24 bg-black/50 rounded-lg overflow-hidden border border-purple-500/50">
                                                                    <img src={URL.createObjectURL(file)} alt="New annotation" className="w-full h-full object-cover" />
                                                                    <div className="absolute bottom-0 inset-x-0 bg-purple-600/80 text-white text-[8px] text-center font-bold px-1">NEW ANNO</div>
                                                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                                                                        <button onClick={() => setViewImage({ url: URL.createObjectURL(file), prompt: 'Preview Annotation' })} className="p-1 bg-zinc-800 text-white rounded-full"><Maximize2 size={10} /></button>
                                                                        <button onClick={() => removeFile('cd', i, true)} className="p-1 bg-red-600 text-white rounded-full"><X size={10} /></button>
                                                                    </div>
                                                                </div>
                                                            ))}

                                                            {/* Saved Annotations */}
                                                            {[
                                                                ...(review.cd_annotation_urls || []),
                                                                ...(review.cd_annotation_url ? [review.cd_annotation_url] : [])
                                                            ].filter((url, index, self) => self.indexOf(url) === index).map((url, i) => (
                                                                <div key={`cd-saved-anno-${i}`} className="relative group w-24 h-24 bg-black/50 rounded-lg overflow-hidden border border-purple-500/50 opacity-80">
                                                                    <img src={url} alt="Saved annotation" className="w-full h-full object-cover" />
                                                                    <div className="absolute bottom-0 inset-x-0 bg-purple-600/80 text-white text-[8px] text-center font-bold px-1">ANNO</div>
                                                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                                        <button onClick={() => setViewImage({ url, prompt: 'CD Annotation' })} className="p-1 bg-zinc-800 text-white rounded-full"><Maximize2 size={10} /></button>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </>
                                        )}

                                        {userProfile?.role === 'CD' && (
                                            <button
                                                onClick={() => {
                                                    if (isVideoMode && onSaveTimestamps) {
                                                        onSaveTimestamps('cd', cdTimestamps);
                                                    }
                                                    handleCommentSave('cd', cdFiles, cdAnnotationFiles);
                                                    setCdFiles([]);
                                                    setCdAnnotationFiles([]);
                                                }}
                                                className="glass-button w-full"
                                            >
                                                Save Review
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Master CD Card - Read Only */}
                                {(review.master_cd_vote !== null && review.master_cd_vote !== undefined) && (
                                    <div className="p-4 bg-zinc-900 rounded border border-purple-700/50">
                                        <div className="flex items-center justify-between mb-3">
                                            <h3 className="font-bold text-purple-300">Master CD Review</h3>
                                            <span className={`text-xs px-2 py-0.5 rounded-full ${review.master_cd_vote ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
                                                {review.master_cd_vote ? 'Approved & Synced' : 'Rejected'}
                                            </span>
                                        </div>

                                        {/* Rejection Feedback */}
                                        {review.master_cd_vote === false && (
                                            <div className="space-y-3">
                                                {review.master_cd_comment && (
                                                    <div className="bg-black/40 p-3 rounded-lg border border-white/10">
                                                        <h4 className="text-[10px] font-bold text-zinc-500 uppercase mb-1 tracking-widest">Feedback</h4>
                                                        <p className="text-sm text-zinc-300">{review.master_cd_comment}</p>
                                                    </div>
                                                )}

                                                <div className="flex gap-2 flex-wrap">
                                                    {review.master_cd_image_url && (
                                                        <div>
                                                            <h4 className="text-[10px] font-bold text-zinc-500 uppercase mb-2 tracking-widest">Reference Image</h4>
                                                            <div className="relative group w-24 h-24 bg-black/50 rounded-lg overflow-hidden border border-white/10">
                                                                <img
                                                                    src={review.master_cd_image_url}
                                                                    alt="Master CD feedback"
                                                                    className="w-full h-full object-cover"
                                                                />
                                                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                                    <button
                                                                        onClick={() => setViewImage({ url: review.master_cd_image_url!, prompt: 'Master CD Feedback' })}
                                                                        className="p-1.5 bg-zinc-800 text-white rounded-full hover:bg-zinc-700"
                                                                        title="View Full"
                                                                    >
                                                                        <Maximize2 size={12} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {review.master_cd_annotation_url && (
                                                        <div>
                                                            <h4 className="text-[10px] font-bold text-zinc-500 uppercase mb-2 tracking-widest">Annotation</h4>
                                                            <div className="relative group w-24 h-24 bg-black/50 rounded-lg overflow-hidden border border-purple-500/50">
                                                                <img
                                                                    src={review.master_cd_annotation_url}
                                                                    alt="Master CD Annotation"
                                                                    className="w-full h-full object-cover"
                                                                />
                                                                <div className="absolute bottom-0 inset-x-0 bg-purple-600/80 text-white text-[9px] text-center font-bold px-1">
                                                                    ANNOTATION
                                                                </div>
                                                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                                    <button
                                                                        onClick={() => setViewImage({ url: review.master_cd_annotation_url!, prompt: 'Master CD Annotation' })}
                                                                        className="p-1.5 bg-zinc-800 text-white rounded-full hover:bg-zinc-700"
                                                                        title="View Full"
                                                                    >
                                                                        <Maximize2 size={12} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {review.master_cd_vote === true && (
                                            <p className="text-sm text-zinc-500">This shot has been synced to Google Drive.</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">
                                Select a version to view feedback
                            </div>
                        )}
                    </>
                )
                }
            </div>

            {/* Modal for viewing image */}
            <ImageViewerModal
                isOpen={!!viewImage}
                onClose={() => setViewImage(null)}
                images={viewImage ? [viewImage] : []}
                initialIndex={0}
            />

            {/* Annotation Modal */}
            <ImageAnnotationModal
                isOpen={!!annotating}
                onClose={() => setAnnotating(null)}
                imageUrl={annotating ? annotating.url : ''}
                onSave={handleAnnotationSave}
            />
        </>
    );
};
