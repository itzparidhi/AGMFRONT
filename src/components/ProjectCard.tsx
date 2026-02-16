import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import type { Project } from '../types';
import { Trash2, Edit2, Check, X } from 'lucide-react';
import { verifyDeleteProject } from '../api';

interface ProjectCardProps {
  project: Project;
  onClick: () => void;
  disabled?: boolean;
  greenShots?: number;
  totalShots?: number;
  onDelete?: (projectId: string) => void;
  onRename?: (projectId: string, newName: string) => Promise<void>;
  canDelete?: boolean;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ project, onClick, disabled, greenShots = 0, totalShots = 0, onDelete, onRename, canDelete = true }) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [password, setPassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Renaming State
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState('');

  const handleSaveRename = async (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    if (onRename && editedName.trim() && editedName !== project.name) {
      await onRename(project.id, editedName.trim());
      setIsEditing(false);
    } else {
      setIsEditing(false);
    }
  };


  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirm(true);
    setPassword('');
    setDeleteError('');
  };

  const handleConfirmDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!password) {
      setDeleteError('Enter password to confirm');
      return;
    }

    setIsDeleting(true);
    setDeleteError('');
    try {
      // Verify password with backend first
      await verifyDeleteProject(project.id, password);

      // On success, call the provided onDelete handler which performs API deletion
      if (onDelete) {
        await onDelete(project.id);
        setShowDeleteConfirm(false);
        setPassword('');
      }
    } catch (error: any) {
      // Extract error message from axios response or use fallback
      const errorMessage = error?.response?.data?.detail || 'Incorrect password or failed to delete project.';
      setDeleteError(errorMessage);
      setIsDeleting(false);
      console.error('Delete error:', error);
    }
  };

  const handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirm(false);
    setPassword('');
    setDeleteError('');
  };
  const percentage = totalShots > 0 ? Math.round((greenShots / totalShots) * 100) : 0;

  // // Dynamic font sizing based on name length
  // const getTitleSize = (name: string) => {
  //   const len = name.length;
  //   if (len > 25) return 'text-[9px]';
  //   if (len > 15) return 'text-[10px]';
  //   if (len > 8) return 'text-xs';
  //   return 'text-sm';
  // };

  return (
    <div
      onClick={disabled ? undefined : onClick}
      className={`group relative flex flex-col items-center justify-center p-8 transition-all duration-500 hover:scale-105 cursor-pointer
       ${disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
    >

      {/* Delete Button - Only visible if user can delete */}
      {canDelete && (
        <button
          onClick={handleDeleteClick}
          className="absolute top-4 right-4 z-20 p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-all opacity-0 group-hover:opacity-100 duration-300"
          title="Delete project"
        >
          <Trash2 size={18} />
        </button>
      )}
      <div className="absolute inset-0 blur-[80px] rounded-full opacity-10 group-hover:opacity-20 transition-opacity duration-700 bg-white" />

      {/* Folder Container - Scaled down by ~25% (w-64 -> w-48, h-48 -> h-36) */}
      <div className="relative w-48 h-36 flex flex-col">

        {/* 1. Folder Tab (Back Layer) */}
        <div className="absolute top-0 left-0 w-16 h-6 rounded-t-xl bg-[#2a2a2e] border-t border-l border-r border-white/10 shadow-sm" />

        {/* 2. Main Folder Body (Back) */}
        <div className="absolute bottom-0 w-full h-[85%] rounded-xl rounded-tl-none bg-[#1c1c1f] border border-white/5 shadow-2xl" />

        {/* 3. Paper Documents (Interactive) */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-[90%] h-full flex justify-center gap-1">
          {/* Back Paper */}
          <div className="w-full h-24 bg-white/10 backdrop-blur-md rounded-md border border-white/10 transform -rotate-3 translate-y-2 group-hover:-translate-y-3 transition-transform duration-500 ease-out shadow-lg" />
          {/* Middle Paper */}
          <div className="absolute w-[95%] h-24 bg-white/80 rounded-md border border-white/20 transform rotate-2 -translate-y-2 group-hover:-translate-y-6 transition-transform duration-500 delay-75 ease-out shadow-xl" />
          {/* Front Paper */}
          <div className="absolute w-[90%] h-24 bg-white rounded-md shadow-2xl transform -rotate-1 -translate-y-1 group-hover:-translate-y-8 transition-transform duration-500 delay-150 ease-out" />
        </div>

        {/* 4. Front Glass Flap (Obsidian Matte) */}
        <div className="absolute bottom-0 w-full h-[82%] rounded-xl bg-gradient-to-br from-[#3a3a3e]/90 to-[#18181b]/95 backdrop-blur-2xl border border-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] flex flex-col justify-end px-3 pb-3 pt-6 overflow-hidden">

          {/* Subtle Top Edge Highlight (Rim Light) */}
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent" />

          {/* Project Name / Edit Input */}
          <div className="relative group/title z-30">
            {isEditing ? (
              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  className="w-full bg-black/40 border border-white/20 rounded px-1 py-0.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveRename(e);
                    if (e.key === 'Escape') setIsEditing(false);
                  }}
                />
                <button
                  onClick={handleSaveRename}
                  className="p-1 hover:bg-green-500/20 text-green-400 rounded transition-colors"
                >
                  <Check size={12} />
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="p-1 hover:bg-red-500/20 text-red-400 rounded transition-colors"
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <div className="relative pr-6"> {/* Add padding for the absolute button */}
                <div className="text-sm font-medium text-white/90 tracking-wide select-none text-left leading-none break-words px-1 drop-shadow-lg transition-all line-clamp-2">
                  {project.name}
                </div>
                {onRename && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditedName(project.name);
                      setIsEditing(true);
                    }}
                    className="absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 rounded text-zinc-400 hover:text-white transition-opacity"
                  >
                    <Edit2 size={12} />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Progress Bar */}
          <div className="w-full mt-1 px-1 relative z-10 transition-all duration-300">
            <div className="flex justify-between items-end mb-1">
              <span className="text-[9px] font-mono text-zinc-400 uppercase tracking-widest">Progress</span>
              <span className={`text-[9px] font-mono font-bold ${percentage === 100 ? 'text-green-400' : 'text-zinc-500'}`}>
                {percentage}%
              </span>
            </div>
            <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full shadow-[0_0_10px_rgba(34,197,94,0.3)] transition-all duration-1000 ease-out ${percentage === 100 ? 'bg-green-400' : 'bg-green-600'}`}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
          {/* Glossy Sweep Effect on Hover */}
          <div className="absolute -inset-10 bg-gradient-to-tr from-transparent via-white/5 to-transparent rotate-45 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
        </div>
      </div>

      {/* External Label (Date Only) */}
      <div className="text-center mt-4">
        <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
          Created: {new Date(project.created_at).toLocaleDateString()}
        </p>
      </div>

      {/* Delete Confirmation Modal - Rendered via Portal */}
      {showDeleteConfirm && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={handleCancel}
        >
          <div
            className="bg-gradient-to-br from-zinc-800 to-zinc-900 rounded-2xl p-6 w-96 shadow-2xl border border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-white mb-2">Delete Project</h3>
            <p className="text-zinc-400 mb-4 text-sm">
              Are you sure you want to delete <span className="font-semibold text-white">{project.name}</span>? This action cannot be undone.
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Enter password to confirm:
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setDeleteError('');
                }}
                placeholder="Enter password"
                className="w-full px-4 py-2 bg-zinc-700/50 border border-white/10 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleConfirmDelete(e as any);
                  }
                }}
              />
              {deleteError && (
                <p className="text-red-400 text-xs mt-2">{deleteError}</p>
              )}
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={handleCancel}
                disabled={isDeleting}
                className="px-4 py-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-white font-medium transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting || !password}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-medium transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <span className="animate-spin">⌛</span>
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};