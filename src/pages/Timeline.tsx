import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import type { Project, ViewMode } from '../types';
import { SceneList } from '../components/SceneList';
import { ResourcesPanel } from '../components/ResourcesPanel';
import { NotificationBell } from '../components/NotificationBell';
import { Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { CompletionStatusModal } from '../components/CompletionStatusModal';
import { ViewSelector } from '../components/ViewSelector';
import { createStructure, restoreShot } from '../api';
import { Trash2, RotateCcw, X, ArrowLeft } from 'lucide-react';
import { useDialog } from '../context/DialogContext';
// import type { Shot } from '../types';

export const Timeline: React.FC = () => {
  const { projectId, episodeId } = useParams<{ projectId: string; episodeId: string }>();
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const dialog = useDialog();
  const [project, setProject] = useState<Project | null>(null);
  const [episodeName, setEpisodeName] = useState<string>('');
  const [episodeFolderId, setEpisodeFolderId] = useState<string>('');
  const [creatingScene, setCreatingScene] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [unassignedCount, setUnassignedCount] = useState(0);
  const [migrating, setMigrating] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [showTrashBin, setShowTrashBin] = useState(false);
  const [deletedShots, setDeletedShots] = useState<any[]>([]); // Using any for joined data convenience

  useEffect(() => {
    if (episodeId) {
      fetchEpisode(episodeId);
    } else if (projectId) {
      fetchProject(projectId);
    }
  }, [projectId, episodeId]);

  const fetchProject = async (id: string) => {
    const { data } = await supabase.from('projects').select('*').eq('id', id).single();
    setProject(data);
  };

  const fetchEpisode = async (id: string) => {
    const { data } = await supabase
      .from('episodes')
      .select('*, projects(*)')
      .eq('id', id)
      .single();
    
    if (data) {
      setEpisodeName(data.name);
      setEpisodeFolderId(data.gdrive_folder_id);
      setProject(data.projects as unknown as Project);
      
      // Check for unassigned scenes
      if (data.projects) {
          checkUnassignedScenes((data.projects as any).id);
      }
    }
  };

  const checkUnassignedScenes = async (projectId: string) => {
    const { count } = await supabase
      .from('scenes')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', projectId)
      .is('episode_id', null);
    
    setUnassignedCount(count || 0);
  };

  const handleMigrateScenes = async () => {
    if (!episodeId || !project) return;
    
    try {
      setMigrating(true);
      const { error } = await supabase
        .from('scenes')
        .update({ episode_id: episodeId })
        .eq('project_id', project.id)
        .is('episode_id', null);

      if (error) throw error;

      dialog.alert('Success', 'Scenes moved to this episode successfully!', 'success');
      setUnassignedCount(0);
      setRefreshKey(prev => prev + 1);
    } catch (err) {
      console.error('Error migrating scenes:', err);
      dialog.alert('Error', 'Failed to migrate scenes', 'danger');
    } finally {
      setMigrating(false);
    }
  };

  useEffect(() => {
    if (showTrashBin && project) {
      fetchDeletedShots();
    }
  }, [showTrashBin, project]);

  const fetchDeletedShots = async () => {
    if (!project) return;
    try {
      // Fetch shots that are deleted and belong to scenes in this project
      const { data, error } = await supabase
        .from('shots')
        .select('*, scenes!inner(project_id)')
        .eq('scenes.project_id', project.id)
        .eq('is_deleted', true)
        .order('deleted_at', { ascending: false });

      if (error) throw error;
      setDeletedShots(data || []);
    } catch (err) {
      console.error("Error fetching deleted shots:", err);
    }
  };

  const handleRestore = async (shotId: string) => {
    try {
      await restoreShot(shotId);
      // Remove from list
      setDeletedShots(prev => prev.filter(s => s.id !== shotId));
      // Trigger refresh of main list
      setRefreshKey(prev => prev + 1);
    } catch (err: any) {
      console.error("Failed to restore shot:", err);
      alert(err.response?.data?.detail || "Failed to restore shot");
      dialog.alert('Error', err.response?.data?.detail || "Failed to restore shot", 'danger');
    }
  };

  const handleAddScene = async () => {
    const targetId = episodeId || project?.id;
    const targetFolderId = episodeFolderId || project?.gdrive_folder_id;

    if (!targetId || !targetFolderId) return;

    setCreatingScene(true);
    try {
      // 1. Get current scene count to determine name
      let query = supabase
        .from('scenes')
        .select('*', { count: 'exact', head: true });
      
      if (episodeId) {
        query = query.eq('episode_id', episodeId);
      } else {
        query = query.eq('project_id', targetId);
      }

      const { count } = await query;
      const nextSceneNumber = (count || 0) + 1;
      const sceneName = `Scene_${nextSceneNumber}`;

      // 2. Call backend API to create structure
      await createStructure({
        type: 'scene',
        name: sceneName,
        parentDbId: episodeId || targetId,
        parentFolderId: targetFolderId
      });

      // 3. Refresh SceneList
      setRefreshKey(prev => prev + 1);

    } catch (err) {
      console.error('Error creating scene:', err);
      dialog.alert('Error', 'Failed to create scene', 'danger');
    } finally {
      setCreatingScene(false);
    }
  };

  if (!project) return <div className="text-white p-8">Loading project...</div>;

  return (
    <div className="flex h-screen text-zinc-100 overflow-hidden">
      {/* Left Panel: Timeline */}
      <div className="w-3/4 flex flex-col border-r border-zinc-700">
        <div className="p-4 border-b border-zinc-700 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => navigate(`/project/${project.id}`)} 
              className="text-zinc-400 hover:text-white flex items-center gap-2 transition-colors"
            >
              <ArrowLeft size={20} /> 
              Back
            </button>
            <h1 className="text-2xl font-bold">{episodeName || project.name}</h1>
          </div>

          {/* <div className="p-6 border-b border-white/10 flex justify-between items-center bg-zinc-900/50 backdrop-blur-md z-10 shrink-0">
          <div className="flex items-center space-x-6">
            <button onClick={() => navigate('/')} className="text-zinc-400 hover:text-white transition-colors flex items-center gap-2">
              <ArrowLeft size={18} /> <span className="text-sm font-bold uppercase tracking-wide">Back</span>
            </button>
            <div className="h-8 w-px bg-white/10"></div>
            <h1 className="text-2xl font-display font-bold">{project.name}</h1>
          </div> */}
          <div className="flex items-center space-x-4">
            <ViewSelector currentMode={viewMode} onModeChange={setViewMode} />
            <NotificationBell />
            {/* Trash Bin Button (PM and CD Roles) */}

            {userProfile?.role === 'CD' && (
              <button
                onClick={handleAddScene}
                disabled={creatingScene}
                className="flex items-center space-x-2 px-4 py-2 glass-button hover:bg-white/10 rounded text-white font-medium disabled:opacity-50"
              >
                <Plus size={18} />
                <span>{creatingScene ? 'Creating...' : 'ADD SCENE'}</span>
              </button>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-8 relative z-10">
          <div className={`
        grid gap-6
        ${viewMode === 'list' ? 'grid-cols-1' : ''}
        ${viewMode === 'columns' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : ''}
        ${viewMode === 'gallery' ? 'grid-cols-1 md:grid-cols-2' : ''}
      `}>
             {/* Migration Banner */}
             {unassignedCount > 0 && episodeId && (
            <div className="mb-6 bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-full text-blue-400">
                  <RotateCcw size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-blue-100">Found {unassignedCount} Unassigned Scenes</h3>
                  <p className="text-sm text-blue-300">These scenes belong to the project but aren't in any episode yet.</p>
                </div>
              </div>
              <button
                onClick={handleMigrateScenes}
                disabled={migrating}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {migrating ? 'Moving...' : 'Move to This Episode'}
              </button>
            </div>
          )}
            <SceneList key={refreshKey} projectId={project.id} episodeId={episodeId} />
          </div>
        </div>

        <CompletionStatusModal
          isOpen={isStatusModalOpen}
          onClose={() => setIsStatusModalOpen(false)}
          projectId={project.id}
        />
      </div>

      {/* Trash Bin Modal */}
      {showTrashBin && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Trash2 size={24} className="text-red-500" />
                Recently Deleted (Project-wide)
              </h2>
              <button
                onClick={() => setShowTrashBin(false)}
                className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {deletedShots.length === 0 ? (
                <div className="text-center py-12 text-zinc-500">
                  Trash bin is empty.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {deletedShots.map(shot => (
                    <div key={shot.id} className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 flex items-center justify-between group">
                      <div>
                        <h4 className="font-medium text-zinc-300">{shot.name}</h4>
                        <span className="text-xs text-zinc-500">
                          Deleted: {shot.deleted_at ? new Date(shot.deleted_at).toLocaleDateString() : 'Unknown'}
                        </span>
                      </div>
                      <button
                        onClick={() => handleRestore(shot.id)}
                        className="p-2 bg-zinc-800 rounded text-zinc-400 hover:text-green-400 hover:bg-zinc-700 transition-colors flex items-center gap-2 text-xs font-bold uppercase tracking-wider"
                      >
                        <RotateCcw size={14} />
                        Restore
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Right Panel: Resources */}
      <div className="w-1/4 bg-zinc-800 flex flex-col">
        <ResourcesPanel
          projectId={project.id}
          projectFolderId={project.gdrive_folder_id}
          onShowCompletionStatus={() => setIsStatusModalOpen(true)}
        />
      </div>
    </div>
  );
};
