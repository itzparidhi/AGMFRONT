import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import type { Scene, Shot, ViewMode } from '../types';
import { Plus, ArrowLeft } from 'lucide-react';
import { ViewSelector } from '../components/ViewSelector';
import { useAuth } from '../context/AuthContext';
import { getDirectDriveLink } from '../utils/drive';
import { NotificationBell } from '../components/NotificationBell';
import { createStructure, softDeleteShot, restoreShot, uploadAsset } from '../api';
import { Trash2, RotateCcw, Trash, X, UploadCloud, Loader2 } from 'lucide-react';
import { useDialog } from '../context/DialogContext';

export const SceneDetail: React.FC = () => {
  const { projectId, sceneId } = useParams<{ projectId: string; sceneId: string }>();
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const dialog = useDialog();
  const [scene, setScene] = useState<Scene | null>(null);
  const [shots, setShots] = useState<Shot[]>([]);
  const [creatingShot, setCreatingShot] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [showTrashBin, setShowTrashBin] = useState(false);

  // Filter shots for main view
  const activeShots = shots.filter(s => !s.is_deleted);
  const deletedShots = shots.filter(s => s.is_deleted);

  useEffect(() => {
    if (sceneId) {
      fetchScene(sceneId);
      fetchShots(sceneId);
    }
  }, [sceneId]);

  const fetchScene = async (id: string) => {
    const { data } = await supabase.from('scenes').select('*').eq('id', id).single();
    setScene(data);
  };

  const fetchShots = async (id: string) => {
    let query = supabase
      .from('shots')
      .select('*')
      .eq('scene_id', id);

    // PE only sees assigned shots
    if (userProfile?.role === 'PE') {
      query = query.eq('assigned_pe_id', userProfile.id);
    }

    const { data } = await query.order('created_at', { ascending: true });
    if (data) setShots(data);
  };

  const [isMassUploading, setIsMassUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number; filename: string } | null>(null);
  const massUploadInputRef = React.useRef<HTMLInputElement>(null);

  const handleMassUploadSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleMassUpload(Array.from(e.target.files));
      // Reset input
      e.target.value = '';
    }
  };

  const extractNumber = (filename: string): number => {
    const match = filename.match(/(\d+)/);
    return match ? parseInt(match[1]) : 999999;
  };

  const handleMassUpload = async (files: File[]) => {
    if (!scene || !projectId) return;

    // Sort files by number in filename
    const sortedFiles = [...files].sort((a, b) => extractNumber(a.name) - extractNumber(b.name));

    setIsMassUploading(true);
    setUploadProgress({ current: 0, total: sortedFiles.length, filename: '' });

    try {
      // 1. Get current shot count
      const { count } = await supabase
        .from('shots')
        .select('*', { count: 'exact', head: true })
        .eq('scene_id', scene.id);

      let nextShotNumber = (count || 0) + 1;

      for (let i = 0; i < sortedFiles.length; i++) {
        const file = sortedFiles[i];
        setUploadProgress({ current: i + 1, total: sortedFiles.length, filename: file.name });

        const shotName = `Shot_${nextShotNumber}`;

        // 2. Create Shot Structure
        const structureRes = await createStructure({
          type: 'shot',
          name: shotName,
          parentDbId: scene.id,
          parentFolderId: scene.gdrive_folder_id
        });

        const newShotId = structureRes.dbData?.id;
        const newFolderId = structureRes.driveId;

        if (newShotId && newFolderId) {
          // 3. Upload Storyboard Image
          await uploadAsset({
            file: file,
            folder_id: newFolderId,
            db_id: newShotId,
            uploader_id: userProfile?.id || '',
            is_storyboard: true
          });
        }

        nextShotNumber++;
      }

      dialog.alert('Success', `Successfully created ${sortedFiles.length} shots from images.`, 'success');
      fetchShots(scene.id);

    } catch (err: any) {
      console.error('Mass upload error:', err);
      dialog.alert('Error', err.response?.data?.detail || 'Failed during mass upload', 'danger');
    } finally {
      setIsMassUploading(false);
      setUploadProgress(null);
    }
  };

  const handleAddShot = async () => {
    if (!scene || !projectId) return;
    setCreatingShot(true);
    try {
      // 1. Get current shot count to determine name
      const { count } = await supabase
        .from('shots')
        .select('*', { count: 'exact', head: true })
        .eq('scene_id', scene.id);
      const nextShotNumber = (count || 0) + 1;
      const shotName = `Shot_${nextShotNumber}`;

      // 2. Call backend API to create structure
      await createStructure({
        type: 'shot',
        name: shotName,
        parentDbId: scene.id,
        parentFolderId: scene.gdrive_folder_id
      });

      // 3. Refresh list
      fetchShots(scene.id);
    } catch (err) {
      console.error('Error creating shot:', err);
      dialog.alert('Error', 'Failed to create shot', 'danger');
    } finally {
      setCreatingShot(false);
    }
  };

  const handleSoftDelete = async (e: React.MouseEvent, shotId: string) => {
    e.stopPropagation();

    dialog.confirm(
      "Delete Shot?",
      "Are you sure you want to move this shot to the trash?",
      async () => {
        try {
          await softDeleteShot(shotId);
          // Refresh shots to get updated names/sequences from backend
          if (sceneId) fetchShots(sceneId);
        } catch (err: any) {
          console.error("Failed to delete shot:", err);
          dialog.alert("Error", err.response?.data?.detail || "Failed to delete shot", 'danger');
        }
      },
      'danger'
    );
  };

  const handleRestore = async (shotId: string) => {
    try {
      await restoreShot(shotId);
      // Refresh shots to get updated names/sequences from backend
      if (sceneId) fetchShots(sceneId);
    } catch (err: any) {
      console.error("Failed to restore shot:", err);
      dialog.alert("Error", err.response?.data?.detail || "Failed to restore shot", 'danger');
    }
  };

  if (!scene) return <div className="text-white p-8">Loading...</div>;

  return (
    <>
      <div className="h-screen flex flex-col bg-zinc-950 text-white overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b border-white/10 flex items-center justify-between px-6 bg-zinc-900/50 backdrop-blur-md z-10 shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(`/project/${projectId}`)}
              className="text-zinc-400 hover:text-white flex items-center gap-2 transition-colors"
            >
              <ArrowLeft size={20} /> Back
            </button>
            <h1 className="text-xl font-bold">{scene.name}</h1>
          </div>
          <div className="flex items-center gap-4">
            <ViewSelector currentMode={viewMode} onModeChange={setViewMode} />
          </div>
          <div className="flex items-center gap-4">
            <NotificationBell />
            {/* Trash Bin Button (CD Role Only) */}
            {userProfile?.role === 'CD' && (
              <button
                onClick={() => setShowTrashBin(true)}
                className="text-zinc-400 hover:text-white relative"
                title="Recently Deleted"
              >
                <Trash2 size={20} />
                {deletedShots.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] flex items-center justify-center text-white">
                    {deletedShots.length}
                  </span>
                )}
              </button>
            )}
            {(userProfile?.role === 'CD' || userProfile?.role === 'PM') && (
              <button
                onClick={handleAddShot}
                disabled={creatingShot}
                className="glass-button hover:bg-white/10 text-white px-4 py-2 rounded flex items-center gap-2 disabled:opacity-50"
              >
                <Plus size={18} />
                {creatingShot ? 'Creating...' : 'Add Shot'}
              </button>
            )}

            {/* Mass Upload Button (CD/PM) */}
            {(userProfile?.role === 'CD' || userProfile?.role === 'PM') && (
              <>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  ref={massUploadInputRef}
                  className="hidden"
                  onChange={handleMassUploadSelect}
                />
                <button
                  onClick={() => massUploadInputRef.current?.click()}
                  disabled={isMassUploading || creatingShot}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded flex items-center gap-2 disabled:opacity-50 font-medium transition-colors"
                >
                  {isMassUploading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      {uploadProgress
                        ? `${uploadProgress.current}/${uploadProgress.total}`
                        : 'Uploading...'}
                    </>
                  ) : (
                    <>
                      <UploadCloud size={18} />
                      Mass Upload
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </header>


        {/* Content */}
        <div className="flex-1 p-8 overflow-y-auto">
          <div className={`
          grid gap-6 
          ${viewMode === 'list' ? 'grid-cols-1' : ''}
          ${viewMode === 'columns' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : ''}
          ${viewMode === 'gallery' ? 'grid-cols-1 md:grid-cols-2' : ''}
        `}>
            {activeShots.map(shot => (
              <div
                key={shot.id}
                onClick={() => navigate(`/shot/${shot.id}`)}
                className="glass-panel border-white/10 rounded-lg p-6 hover:border-white/50 cursor-pointer transition-colors group relative"
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-semibold group-hover:text-white">{shot.name}</h3>

                  {/* Delete Button (CD Role Only) */}
                  {userProfile?.role === 'CD' && (
                    <button
                      onClick={(e) => handleSoftDelete(e, shot.id)}
                      className="p-1 text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Delete Shot"
                    >
                      <Trash size={16} />
                    </button>
                  )}
                </div>

                <div className="text-sm text-zinc-500">
                  {/* Placeholder for status or thumbnail */}
                  <div className="aspect-video bg-zinc-800 rounded mb-2 flex items-center justify-center overflow-hidden">
                    {shot.storyboard_url ? (
                      <img src={getDirectDriveLink(shot.storyboard_url)} alt="Storyboard" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-zinc-600">No Preview</span>
                    )}
                  </div>
                  <p>Click to open workstation</p>
                </div>
              </div>
            ))}

            {activeShots.length === 0 && (
              <div className="col-span-full text-center py-12 text-zinc-500">
                No shots in this scene yet. Click "Add Shot" to get started.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Trash Bin Modal */}
      {showTrashBin && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Trash2 size={24} className="text-red-500" />
                Recently Deleted
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
    </>
  );
};
