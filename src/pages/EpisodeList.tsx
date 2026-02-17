import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import type { Episode } from '../types';
import { useNavigate, useParams } from 'react-router-dom';
import { createStructure, deleteEpisode } from '../api';
import { Plus, Trash, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDialog } from '../context/DialogContext';

export const EpisodeList: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [projectName, setProjectName] = useState<string>('');
  const [projectFolderId, setProjectFolderId] = useState<string>('');
  const [isCreating, setIsCreating] = useState(false);
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const dialog = useDialog();

  useEffect(() => {
    if (projectId) {
      fetchProject();
      fetchEpisodes();
    }
  }, [projectId]);

  const fetchProject = async () => {
    const { data } = await supabase
      .from('projects')
      .select('name, gdrive_folder_id')
      .eq('id', projectId)
      .single();

    if (data) {
      setProjectName(data.name);
      setProjectFolderId(data.gdrive_folder_id);
    }
  };

  const fetchEpisodes = async () => {
    const { data } = await supabase
      .from('episodes')
      .select('*')
      .eq('project_id', projectId)
      .eq('is_deleted', false)
      .order('episode_number', { ascending: true });

    if (data) {
      setEpisodes(data);
    }
  };

  const handleCreateEpisode = async () => {
    if (!projectId || !projectFolderId) return;

    setIsCreating(true);
    try {
      const nextEpisodeNumber = episodes.length + 1;
      const episodeName = `Episode ${nextEpisodeNumber}`;

      await createStructure({
        name: episodeName,
        type: 'episode',
        parentDbId: projectId,
        parentFolderId: projectFolderId,
        sequence: nextEpisodeNumber,
      });

      await fetchEpisodes();
    } catch (err) {
      console.error('Error creating episode:', err);
      dialog.alert('Error', 'Failed to create episode', 'danger');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteEpisode = async (e: React.MouseEvent, episodeId: string) => {
    e.stopPropagation();
    
    dialog.confirm(
      "Delete Episode?",
      "Are you sure you want to move this episode and all its scenes to the trash?",
      async () => {
        try {
          await deleteEpisode(episodeId);
          // Refresh list to update sequence names (e.g. Episode 3 -> Episode 2)
          await fetchEpisodes();
        } catch (err: any) {
          console.error("Failed to delete episode:", err);
          dialog.alert("Error", err.response?.data?.detail || "Failed to delete episode", 'danger');
        }
      },
      'danger'
    );
  };

  const handleNavigateToEpisode = (episodeId: string) => {
    navigate(`/project/${projectId}/episode/${episodeId}`);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header with Back Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="text-zinc-400 hover:text-white flex items-center gap-2 transition-colors"
          >
            <ArrowLeft size={20} /> Back
          </button>
          <h1 className="text-2xl font-bold text-white">{projectName}</h1>
        </div>
        {(userProfile?.role === 'CD' || userProfile?.role === 'PM') && (
          <button
            onClick={handleCreateEpisode}
            disabled={isCreating}
            className="flex items-center space-x-2 px-4 py-2 glass-button hover:bg-white/10 rounded text-white font-medium disabled:opacity-50"
          >
            <Plus size={18} />
            <span>{isCreating ? 'Creating...' : 'NEW EPISODE'}</span>
          </button>
        )}
      </div>

      {/* Episodes Grid */}
      {episodes.length === 0 ? (
        <div className="glass-panel p-12 rounded-lg border border-white/10 text-center">
          <p className="text-zinc-400 mb-4">No episodes yet</p>
          {(userProfile?.role === 'CD' || userProfile?.role === 'PM') && (
            <button
              onClick={handleCreateEpisode}
              disabled={isCreating}
              className="flex items-center space-x-2 px-4 py-2 glass-button hover:bg-white/10 rounded text-white font-medium disabled:opacity-50"
            >
              <Plus size={18} />
              <span>CREATE FIRST EPISODE</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {episodes.map((episode) => (
            <div
              key={episode.id}
              onClick={() => handleNavigateToEpisode(episode.id)}
              className="glass-panel p-6 rounded-lg border border-white/10 hover:border-white/30 cursor-pointer transition-all hover:scale-105 group relative"
            >
              {/* Delete Button */}
              {(userProfile?.role === 'CD' || userProfile?.role === 'PM') && (
                <button
                  onClick={(e) => handleDeleteEpisode(e, episode.id)}
                  className="absolute top-3 right-3 p-2 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-full opacity-0 group-hover:opacity-100 transition-all z-10"
                  title="Delete Episode"
                >
                  <Trash size={16} />
                </button>
              )}

              <div className="flex flex-col items-center justify-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 font-bold text-2xl border border-blue-500/20">
                  {episode.episode_number || '#'}
                </div>
                <h3 className="text-xl font-bold text-white text-center">{episode.name}</h3>
                <p className="text-xs text-zinc-500">
                  Created {new Date(episode.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
