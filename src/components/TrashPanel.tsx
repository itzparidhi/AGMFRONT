import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import type {  } from '../types';
import { Trash2, RotateCcw, Clock, Folder, Film, Image } from 'lucide-react';
import { restoreProject, restoreScene, restoreShot } from '../api';
import { useDialog } from '../context/DialogContext';

interface TrashPanelProps {
    onProjectRestored?: () => void;
}

interface DeletedItem {
    id: string;
    type: 'project' | 'scene' | 'shot';
    name: string;
    deletedAt: string;
    projectId?: string;
    projectName?: string;
    sceneName?: string;
}

interface GroupedTrash {
    [projectId: string]: {
        projectName: string;
        items: DeletedItem[];
    };
}

export const TrashPanel: React.FC<TrashPanelProps> = ({ onProjectRestored }) => {
    const [groupedTrash, setGroupedTrash] = useState<GroupedTrash>({});
    const [loading, setLoading] = useState(true);
    const [restoring, setRestoring] = useState<string | null>(null);
    const dialog = useDialog();

    useEffect(() => {
        fetchAllDeletedItems();
    }, []);

    const fetchAllDeletedItems = async () => {
        setLoading(true);
        try {
            // 1. Fetch Deleted Projects
            const { data: projects } = await supabase
                .from('projects')
                .select('*')
                .eq('is_deleted', true)
                .order('deleted_at', { ascending: false });

            // 2. Fetch Deleted Scenes
            const { data: scenes } = await supabase
                .from('scenes')
                .select('*, projects(name)')
                .eq('is_deleted', true)
                .order('deleted_at', { ascending: false });

            // 3. Fetch Deleted Shots
            const { data: shots } = await supabase
                .from('shots')
                .select('*, scenes(name, project_id, projects(name))')
                .eq('is_deleted', true)
                .order('deleted_at', { ascending: false });

            const groups: GroupedTrash = {};

            // Process Projects
            projects?.forEach((p: any) => {
                if (!groups[p.id]) {
                    groups[p.id] = { projectName: p.name, items: [] };
                }
                groups[p.id].items.push({
                    id: p.id,
                    type: 'project',
                    name: p.name,
                    deletedAt: p.deleted_at,
                    projectId: p.id,
                    projectName: p.name
                });
            });

            // Process Scenes
            scenes?.forEach((s: any) => {
                const pid = s.project_id;
                const pname = s.projects?.name || 'Unknown Project';
                if (!groups[pid]) {
                    groups[pid] = { projectName: pname, items: [] };
                }
                groups[pid].items.push({
                    id: s.id,
                    type: 'scene',
                    name: s.name,
                    deletedAt: s.deleted_at,
                    projectId: pid,
                    projectName: pname
                });
            });

            // Process Shots
            shots?.forEach((s: any) => {
                const pid = s.scenes?.project_id;
                const pname = s.scenes?.projects?.name || 'Unknown Project';
                const sname = s.scenes?.name;

                if (pid) {
                    if (!groups[pid]) {
                        groups[pid] = { projectName: pname, items: [] };
                    }
                    groups[pid].items.push({
                        id: s.id,
                        type: 'shot',
                        name: s.name,
                        deletedAt: s.deleted_at,
                        projectId: pid,
                        projectName: pname,
                        sceneName: sname
                    });
                }
            });

            setGroupedTrash(groups);

        } catch (err) {
            console.error('Error fetching trash items:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleRestore = async (item: DeletedItem) => {
        setRestoring(item.id);
        try {
            if (item.type === 'project') {
                await restoreProject(item.id);
                if (onProjectRestored) onProjectRestored();
            } else if (item.type === 'scene') {
                await restoreScene(item.id);
            } else if (item.type === 'shot') {
                await restoreShot(item.id);
            }

            // Remove from local state
            setGroupedTrash(prev => {
                const newGroups = { ...prev };
                if (newGroups[item.projectId!]) {
                    newGroups[item.projectId!].items = newGroups[item.projectId!].items.filter(i => i.id !== item.id);
                    if (newGroups[item.projectId!].items.length === 0) {
                        delete newGroups[item.projectId!];
                    }
                }
                return newGroups;
            });

        } catch (err: any) {
            console.error('Failed to restore item:', err);
            dialog.alert('Error', err.response?.data?.detail || 'Failed to restore item', 'danger');
        } finally {
            setRestoring(null);
        }
    };

    const getDaysRemaining = (deletedAt: string | undefined) => {
        if (!deletedAt) return 30;
        const deletedDate = new Date(deletedAt);
        const now = new Date();
        const diffTime = now.getTime() - deletedDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        return Math.max(0, 30 - diffDays);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
            </div>
        );
    }

    const hasItems = Object.keys(groupedTrash).length > 0;

    return (
        <div className="space-y-8 pb-10">
            <div className="flex items-center gap-3 mb-6">
                <Trash2 className="text-red-500" size={28} />
                <div>
                    <h2 className="text-2xl font-bold text-white">Recycle Bin</h2>
                    <p className="text-sm text-zinc-400">Deleted items are permanently removed after 30 days</p>
                </div>
            </div>

            {!hasItems ? (
                <div className="text-center py-16">
                    <Trash2 className="mx-auto text-zinc-600 mb-4" size={48} />
                    <p className="text-zinc-500 text-lg">Trash is empty</p>
                    <p className="text-zinc-600 text-sm mt-1">Deleted projects, scenes, and shots will appear here</p>
                </div>
            ) : (
                <div className="space-y-8">
                    {Object.entries(groupedTrash).map(([projectId, group]) => (
                        <div key={projectId} className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
                            <div className="px-6 py-4 bg-zinc-800/50 border-b border-zinc-800 flex items-center gap-2">
                                <Folder className="text-blue-400" size={18} />
                                <h3 className="text-lg font-bold text-white">{group.projectName}</h3>
                                <span className="text-xs text-zinc-500 ml-2">({group.items.length} items)</span>
                            </div>
                            
                            <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {group.items.map(item => {
                                    const daysRemaining = getDaysRemaining(item.deletedAt);
                                    const isRestoring = restoring === item.id;
                                    
                                    return (
                                        <div 
                                            key={item.id} 
                                            className="bg-black/40 border border-zinc-800 rounded-lg p-4 hover:border-zinc-700 transition-all group"
                                        >
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="flex items-center gap-2 overflow-hidden">
                                                    {item.type === 'project' && <Folder className="text-blue-500 shrink-0" size={16} />}
                                                    {item.type === 'scene' && <Film className="text-purple-500 shrink-0" size={16} />}
                                                    {item.type === 'shot' && <Image className="text-green-500 shrink-0" size={16} />}
                                                    
                                                    <div className="min-w-0">
                                                        <h4 className="font-medium text-zinc-200 truncate">{item.name}</h4>
                                                        <p className="text-xs text-zinc-500 uppercase tracking-wider">{item.type}</p>
                                                    </div>
                                                </div>
                                                
                                                <button
                                                    onClick={() => handleRestore(item)}
                                                    disabled={isRestoring}
                                                    className="p-1.5 rounded-md bg-zinc-800 text-zinc-400 hover:bg-green-900/30 hover:text-green-400 transition-colors disabled:opacity-50"
                                                    title="Restore"
                                                >
                                                    {isRestoring ? (
                                                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-green-400"></div>
                                                    ) : (
                                                        <RotateCcw size={14} />
                                                    )}
                                                </button>
                                            </div>

                                            {item.sceneName && (
                                                <p className="text-xs text-zinc-500 mb-3 pl-6">
                                                    in {item.sceneName}
                                                </p>
                                            )}

                                            <div className="flex items-center justify-between text-xs pt-3 border-t border-zinc-800/50 mt-2">
                                                <div className="flex items-center gap-1 text-zinc-500">
                                                    <Clock size={12} />
                                                    <span>{new Date(item.deletedAt).toLocaleDateString()}</span>
                                                </div>
                                                <span className={`${daysRemaining <= 7 ? 'text-red-400' : 'text-zinc-500'}`}>
                                                    {daysRemaining} days left
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
