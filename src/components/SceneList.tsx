import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import type { Scene, Shot } from '../types';
import { useNavigate } from 'react-router-dom';
import { insertShotAtPosition, reorderShots, sendDailyReport } from '../api';
// import { Plus } from 'lucide-react';

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useSortable } from '@dnd-kit/sortable';
import { softDeleteShot, softDeleteScene, uploadAsset, createStructure } from '../api';
import { Trash, Mail, Loader2, UploadCloud } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { DriveImage } from './DriveImage';
import { useDialog } from '../context/DialogContext';

interface SceneListProps {
  projectId: string;
  episodeId?: string;
}

interface ShotWithStatus extends Shot {
  statusColor: 'gray' | 'yellow' | 'red' | 'green';
  imageUrl?: string | null;
}

interface ShotCardProps {
  shot: ShotWithStatus;
  onNavigate: (shotId: string) => void;
  onInsertBefore: (sceneId: string, sequence: number) => void;
  onDelete: (e: React.MouseEvent) => void;
  isDeleteEnabled: boolean;
  sceneId: string;
}

const SortableShotCard: React.FC<ShotCardProps> = ({
  shot,
  onNavigate,
  onInsertBefore,
  onDelete,
  isDeleteEnabled,
  sceneId,
}) => {
  const [isDragMode, setIsDragMode] = React.useState(false);
  const clickTimeoutRef = React.useRef<number | null>(null);
  const isDoubleClickRef = React.useRef(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: shot.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    console.log('✨ DOUBLE-CLICK! Toggling drag mode from', isDragMode);
    isDoubleClickRef.current = true;
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
    }

    setIsDragMode(prev => !prev);

    // If enabling drag mode, ensure we don't navigate
    if (!isDragMode) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const handleSingleClick = () => {
    if (isDragMode) {
      return; // Don't navigate in drag mode
    }

    // Delay navigation to allow double-click detection
    isDoubleClickRef.current = false;
    // Clear any existing timeout
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
    }

    clickTimeoutRef.current = window.setTimeout(() => {
      if (!isDoubleClickRef.current) {
        console.log('👆 Navigating to shot');
        onNavigate(shot.id);
      }
      clickTimeoutRef.current = null;
    }, 250);
  };

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative group flex items-center gap-2"
    >
      {/* Insert button before shot */}
      <button
        onClick={() => onInsertBefore(sceneId, shot.sequence)}
        className="opacity-0 group-hover:opacity-100 transition-opacity w-6 h-full text-xs bg-blue-500/20 hover:bg-blue-500/40 border border-blue-500/30 rounded flex items-center justify-center text-blue-300"
        title="Insert shot before this one"
      >
        +
      </button>

      <div
        {...(isDragMode ? attributes : {})}
        {...(isDragMode ? listeners : {})}
        onDoubleClick={handleDoubleClick}
        onClick={handleSingleClick}
        className={`w-32 h-20 !rounded-[20px] flex items-center justify-center border transition-all glass-panel bg-white/5 dark:bg-white/5 hover:scale-105 shadow-glass relative ${isDragMode
          ? 'cursor-grab active:cursor-grabbing border-blue-500/60 hover:border-blue-500'
          : 'cursor-pointer border-white/10 dark:border-white/10 hover:border-white/30'
          }`}
      >
        <div
          className={`
            w-2.5 h-2.5 rounded-full absolute top-3 right-3 shadow-sm
            ${shot.statusColor === 'green' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : ''}
            ${shot.statusColor === 'red' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]' : ''}
            ${shot.statusColor === 'yellow' ? 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.6)]' : ''}
            ${shot.statusColor === 'gray' ? 'bg-zinc-800' : ''}
          `}
        ></div>
        <span className={`text-sm font-medium truncate px-2 shot-text transition-opacity duration-300 ${shot.imageUrl ? 'group-hover:opacity-0' : ''}`}>
          {shot.name}
        </span>

        {/* Hover Image Background */}
        {shot.imageUrl && (
          <div className="absolute inset-0 rounded-[20px] overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
            <div className="w-full h-full bg-black">
              <DriveImage
                src={shot.imageUrl}
                alt={shot.name}
                className="w-full h-full"
                imageClassName="object-cover w-full h-full opacity-80" // Slightly dimmed to keep shape
              />
            </div>
            {/* Optional Status Indicator overlaid */}
            <div className={`absolute bottom-0 left-0 right-0 h-1 ${shot.statusColor === 'green' ? 'bg-green-500' : 'bg-zinc-600'
              }`}></div>
          </div>
        )}

        {/* Drag Mode Indicator */}
        {isDragMode && (
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[8px] text-white/60 bg-black/50 px-2 py-0.5 rounded-full backdrop-blur-sm">
            DRAG MODE
          </div>
        )}

        {/* Delete Button (CD Only) */}
        {isDeleteEnabled && (
          <button
            onClick={onDelete}
            className="absolute top-2 left-2 p-1 bg-black/50 hover:bg-red-500/80 rounded-full text-white/50 hover:text-white opacity-0 group-hover:opacity-100 transition-all z-10 backdrop-blur-sm"
            title="Delete Shot"
          >
            <Trash size={12} />
          </button>
        )}
      </div>
    </div>
  );
};

export const SceneList: React.FC<SceneListProps> = ({ projectId, episodeId }) => {
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [shotsByScene, setShotsByScene] = useState<Record<string, ShotWithStatus[]>>({});
  const [creatingShotFor, setCreatingShotFor] = useState<string | null>(null);
  const navigate = useNavigate();
  const [isSendingReport, setIsSendingReport] = useState(false);
  const { userProfile } = useAuth();
  const dialog = useDialog();

  const sensors = useSensors(
    useSensor(PointerSensor, {
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchScenes();
  }, [projectId, episodeId]);

  const fetchScenes = async () => {
    let query = supabase
      .from('scenes')
      .select('*')
      .eq('is_deleted', false)
      .order('created_at', { ascending: true });

    if (episodeId) {
      query = query.eq('episode_id', episodeId);
    } else {
      query = query.eq('project_id', projectId);
    }

    const { data: scenesData } = await query;

    if (scenesData) {
      setScenes(scenesData);
      scenesData.forEach(scene => fetchShotsForScene(scene.id));
    }
  };

  const fetchShotsForScene = async (sceneId: string) => {
    // Fetch shots ordered by sequence
    let query = supabase
      .from('shots')
      .select('*')
      .eq('scene_id', sceneId);

    // PE only sees assigned shots
    if (userProfile?.role === 'PE') {
      query = query.eq('assigned_pe_id', userProfile.id);
    }

    const { data: shotsData } = await query.order('sequence', { ascending: true });

    if (!shotsData) return;

    // Filter out deleted shots
    const activeShots = shotsData.filter(s => !s.is_deleted);
    const shotIds = activeShots.map(s => s.id);

    if (shotIds.length === 0) {
      setShotsByScene(prev => ({ ...prev, [sceneId]: [] }));
      return;
    }

    const { data: versionsData } = await supabase
      .from('versions')
      .select('*, reviews(*)')
      .in('shot_id', shotIds)
      .order('version_number', { ascending: false });

    const shotsWithStatus: ShotWithStatus[] = activeShots.map(shot => {
      const shotVersions = (versionsData?.filter(v => v.shot_id === shot.id) || []).sort((a, b) => b.version_number - a.version_number);
      const activeVersion = shotVersions.find(v => v.is_active);
      const latestVersion = shotVersions[0];

      let color: 'gray' | 'yellow' | 'red' | 'green' = 'gray';
      let imageUrl: string | null = null;

      if (activeVersion) {
        const review = activeVersion.reviews?.[0] || (activeVersion as any).reviews;
        const r = Array.isArray(review) ? review[0] : review;

        if (r?.cd_vote === true) {
          color = 'green';
          imageUrl = activeVersion.gdrive_link;
        }
        else if (r?.cd_vote === false || r?.pm_vote === false) color = 'red';
        else color = 'yellow';
      }

      // If not approved (green), show latest version image
      if (color !== 'green' && latestVersion) {
        imageUrl = latestVersion.gdrive_link || latestVersion.public_link;
      }

      return { ...shot, statusColor: color, imageUrl };
    });

    setShotsByScene(prev => ({ ...prev, [sceneId]: shotsWithStatus }));
  };

  // Mass Upload State
  const [uploadingSceneId, setUploadingSceneId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const massUploadInputRef = React.useRef<HTMLInputElement>(null);
  const [targetSceneForUpload, setTargetSceneForUpload] = useState<string | null>(null);

  const handleMassUploadClick = (sceneId: string) => {
    setTargetSceneForUpload(sceneId);
    if (massUploadInputRef.current) {
      massUploadInputRef.current.value = ''; // Reset
      massUploadInputRef.current.click();
    }
  };

  const extractNumber = (filename: string): number => {
    const match = filename.match(/(\d+)/);
    return match ? parseInt(match[1]) : 999999;
  };

  const handleMassUploadSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !targetSceneForUpload) return;

    const sceneId = targetSceneForUpload;
    const scene = scenes.find(s => s.id === sceneId);
    if (!scene) return;

    const files = Array.from(e.target.files);
    // Sort files
    const sortedFiles = [...files].sort((a, b) => extractNumber(a.name) - extractNumber(b.name));

    setUploadingSceneId(sceneId);
    setUploadProgress({ current: 0, total: sortedFiles.length });

    try {
      // Get current shot count
      const shots = shotsByScene[sceneId] || [];
      let nextShotNumber = shots.length + 1;

      for (let i = 0; i < sortedFiles.length; i++) {
        const file = sortedFiles[i];
        setUploadProgress({ current: i + 1, total: sortedFiles.length });

        const shotName = `Shot_${nextShotNumber}`;

        // Create structure using createStructure (consistent with handleAddShot logic logic but cleaner)
        // Note: createStructure is usually for the main API. helper insertShotAtPosition might be safer to keep sequence logic consistent?
        // Actually SceneDetail used createStructure. Let's use createStructure but we need to ensure sequence is right.
        // Backend's createShot (structure/shot) handles 'append to end' if sequence is null.

        const structureRes = await createStructure({
          type: 'shot',
          name: shotName,
          parentDbId: sceneId,
          parentFolderId: scene.gdrive_folder_id,
          // sequence: shots.length + i // Optional, backend handles append if null
        });

        const newShotId = structureRes.dbData?.id;
        const newFolderId = structureRes.driveId;

        if (newShotId && newFolderId) {
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

      dialog.alert('Success', `Uploaded ${sortedFiles.length} shots to ${scene.name}`, 'success');
      await fetchShotsForScene(sceneId);

    } catch (err: any) {
      console.error('Mass upload error:', err);
      dialog.alert('Error', err.response?.data?.detail || 'Failed during mass upload', 'danger');
    } finally {
      setUploadingSceneId(null);
      setUploadProgress(null);
      setTargetSceneForUpload(null);
    }
  };

  const handleAddShot = async (sceneId: string) => {
    const scene = scenes.find(s => s.id === sceneId);
    if (!scene) return;

    setCreatingShotFor(sceneId);
    try {
      // Get shots for this scene to count them
      const shots = shotsByScene[sceneId] || [];
      const nextShotNumber = shots.length + 1;
      const shotName = `Shot_${nextShotNumber}`;

      // Insert at the end
      await insertShotAtPosition({
        scene_id: sceneId,
        name: shotName,
        parent_folder_id: scene.gdrive_folder_id,
        sequence: shots.length,
      });

      // Refresh list
      await fetchShotsForScene(sceneId);
    } catch (err) {
      console.error('Error creating shot:', err);
      dialog.alert('Error', 'Failed to create shot', 'danger');
    } finally {
      setCreatingShotFor(null);
    }
  };

  const handleSoftDelete = async (e: React.MouseEvent, shotId: string, sceneId: string) => {
    e.stopPropagation();

    dialog.confirm(
      "Delete Shot?",
      "Are you sure you want to move this shot to the trash?",
      async () => {
        try {
          await softDeleteShot(shotId);
          // Refresh shots to get updated names/sequences from backend
          await fetchShotsForScene(sceneId);
        } catch (err: any) {
          console.error("Failed to delete shot:", err);
          dialog.alert("Error", err.response?.data?.detail || "Failed to delete shot", 'danger');
        }
      },
      'danger'
    );
  };

  const handleInsertShot = async (sceneId: string, beforeSequence: number) => {

    const scene = scenes.find(s => s.id === sceneId);
    if (!scene) return;

    setCreatingShotFor(sceneId);
    try {
      // Auto-generate shot name based on position
      const shotName = `Shot_${beforeSequence + 1}`;
      await insertShotAtPosition({
        scene_id: sceneId,
        name: shotName,
        parent_folder_id: scene.gdrive_folder_id,
        sequence: beforeSequence,
      });

      // Refresh and renumber shots
      await fetchShotsForScene(sceneId);
      await renumberShots(sceneId);
    } catch (err) {
      console.error('Error inserting shot:', err);
      dialog.alert('Error', 'Failed to insert shot', 'danger');
    } finally {
      setCreatingShotFor(null);
    }
  };

  const handleDragEnd = async (event: DragEndEvent, sceneId: string) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const shots = shotsByScene[sceneId];
    if (!shots) return;

    const oldIndex = shots.findIndex(s => s.id === active.id);
    const newIndex = shots.findIndex(s => s.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    // Optimistic update
    const newShots = arrayMove(shots, oldIndex, newIndex);
    setShotsByScene(prev => ({ ...prev, [sceneId]: newShots }));

    try {
      // Update sequences
      const updatedShots = newShots.map((shot, index) => ({
        ...shot,
        sequence: index,
      }));

      await reorderShots({
        scene_id: sceneId,
        shots: updatedShots.map(s => ({ id: s.id, sequence: s.sequence })),
      });

      // Refresh to ensure consistency

      // Refresh to ensure consistency
      await fetchShotsForScene(sceneId);
      // Renumber shots to update names (Shot_1, Shot_2, etc.)
      await renumberShots(sceneId);
    } catch (err) {
      console.error('Error reordering shots:', err);
      dialog.alert('Error', 'Failed to reorder shots', 'danger');
      // Revert on error
      await fetchShotsForScene(sceneId);
    }
  };

  const renumberShots = async (sceneId: string) => {
    try {
      // Fetch fresh shots from database
      const { data: shots } = await supabase
        .from('shots')
        .select('*')
        .eq('scene_id', sceneId)
        .eq('is_deleted', false)
        .order('sequence', { ascending: true });

      if (!shots || shots.length === 0) return;

      // Renumber shots based on their current sequence order
      const updatedShots = shots.map((shot, index) => ({
        id: shot.id,
        sequence: index,
        name: `Shot_${index + 1}`,
      }));


      // Update names and sequences in DB
      for (const shot of updatedShots) {
        await supabase
          .from('shots')
          .update({ name: shot.name, sequence: shot.sequence })
          .eq('id', shot.id);
      }
      // Refresh the UI
      await fetchShotsForScene(sceneId);
    } catch (err) {
      console.error('Error renumbering shots:', err);
    }
  };

  const handleDeleteScene = async (e: React.MouseEvent, sceneId: string) => {
    e.stopPropagation();
    dialog.confirm(
      "Delete Scene?",
      "Are you sure you want to move this scene and all its shots to the trash?",
      async () => {
        try {
          await softDeleteScene(sceneId);
          // Refresh list to update sequence names (e.g. Scene 3 -> Scene 2)
          await fetchScenes();
        } catch (err: any) {
          console.error("Failed to delete scene:", err);
          dialog.alert("Error", err.response?.data?.detail || "Failed to delete scene", 'danger');
        }
      },
      'danger'
    );
  };

  const handleSendReport = async () => {
    if (!window.confirm("Send the daily status report email now?")) return;

    setIsSendingReport(true);
    try {
      await sendDailyReport();
      alert("Daily report email triggered successfully!");
    } catch (err) {
      console.error("Failed to send report:", err);
      alert("Failed to trigger daily report.");
    } finally {
      setIsSendingReport(false);
    }
  };
  return (
    <div className="space-y-8">
      {/* PM Controls */}
      {userProfile?.role === 'PM' && (
        <div className="flex justify-end mb-4">
          <button
            onClick={handleSendReport}
            disabled={isSendingReport}
            className="glass-button flex items-center gap-2 disabled:opacity-50"
          >
            {isSendingReport ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
            <span>Send Daily Report</span>
          </button>
        </div>
      )}
      {scenes.map(scene => (
        <div key={scene.id} className="glass-panel p-4 rounded-lg border border-white/10">
          <div className="flex justify-between items-center mb-4">
            <h3
              onClick={() => navigate(`/project/${projectId}/scene/${scene.id}`)}
              className="text-lg font-semibold text-zinc-300 hover:text-white cursor-pointer transition-colors"
            >
              {scene.name}
            </h3>
            {(userProfile?.role === 'CD' || userProfile?.role === 'PM') && (
              <div className="flex items-center gap-2">
                {/* Mass Upload Button */}
                <button
                  onClick={() => handleMassUploadClick(scene.id)}
                  disabled={uploadingSceneId === scene.id}
                  className="p-2 rounded hover:bg-white/10 text-zinc-400 hover:text-white transition-all flex items-center gap-2"
                  title="Mass Upload Shots"
                >
                  {uploadingSceneId === scene.id ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span className="text-xs font-mono">{uploadProgress?.current}/{uploadProgress?.total}</span>
                    </>
                  ) : (
                    <UploadCloud size={18} />
                  )}
                </button>

                <button
                  onClick={(e) => handleDeleteScene(e, scene.id)}
                  className="p-2 rounded-full text-zinc-500 hover:bg-red-500/80 hover:text-white transition-all"
                  title="Delete Scene"
                >
                  <Trash size={16} />
                </button>
              </div>
            )}
          </div>
          {/* File Input for Mass Upload */}
          <input
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            ref={massUploadInputRef}
            onChange={handleMassUploadSelect}
          />
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={(e) => handleDragEnd(e, scene.id)}
          >
            <SortableContext
              items={shotsByScene[scene.id]?.map(s => s.id) || []}
              strategy={horizontalListSortingStrategy}
            >
              <div className="flex flex-wrap gap-4 items-center">
                {shotsByScene[scene.id]?.map(shot => (
                  <SortableShotCard
                    key={shot.id}
                    shot={shot}
                    onNavigate={() => navigate(`/shot/${shot.id}`)}
                    onInsertBefore={handleInsertShot}
                    onDelete={(e) => handleSoftDelete(e, shot.id, scene.id)}
                    isDeleteEnabled={userProfile?.role === 'CD' || userProfile?.role === 'PM'}
                    sceneId={scene.id}
                  />
                ))}

                {/* Add + tab after last shot or in empty scene */}
                <button
                  onClick={() => handleAddShot(scene.id)}
                  disabled={creatingShotFor === scene.id}
                  className="w-6 h-20 text-xs bg-blue-500/20 hover:bg-blue-500/40 border border-blue-500/30 rounded flex items-center justify-center text-blue-300 transition-all hover:scale-110 disabled:opacity-50"
                  title="Add new shot"
                >
                  {creatingShotFor === scene.id ? '...' : '+'}
                </button>
              </div>
            </SortableContext>
          </DndContext>
        </div>
      ))}
    </div>
  );
};
