import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';
import type { Project } from '../types';
import { ProjectCard } from '../components/ProjectCard';
import { AssignmentsPanel } from '../components/AssignmentsPanel';
import { PEAssignmentsPanel } from '../components/PEAssignmentsPanel';
import { CreateProjectModal } from '../components/CreateProjectModal';
import { NotificationBell } from '../components/NotificationBell';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { deleteProject, renameProject } from '../api';
import { TrashPanel } from '../components/TrashPanel';


import { AssetLibrary } from '../components/AssetLibrary';

export const Dashboard: React.FC = () => {
  const { userProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'projects' | 'assignments' | 'trash' | 'assets'>('projects');
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectStats, setProjectStats] = useState<Record<string, { total: number; green: number }>>({});
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, [userProfile]);

  useEffect(() => {
    if (projects.length > 0) {
      calculateStats();
    }
  }, [projects]);

  const calculateStats = async () => {
    const projectIds = projects.map(p => p.id);

    // Fetch all shots for these projects
    const { data: shots } = await supabase
      .from('shots')
      .select(`
            id, 
            scene_id, 
            scenes!inner(project_id),
            versions(
                is_active,
                reviews(cd_vote)
            )
        `)
      .in('scenes.project_id', projectIds);

    if (shots) {
      const stats: Record<string, { total: number; green: number }> = {};

      // Initialize 0 for all projects
      projectIds.forEach(pid => {
        stats[pid] = { total: 0, green: 0 };
      });

      shots.forEach((shot: any) => {
        const pid = shot.scenes?.project_id;
        if (!pid) return;

        if (!stats[pid]) stats[pid] = { total: 0, green: 0 };

        stats[pid].total++;

        // Check if any active version has true cd_vote (Green status)
        const activeVersion = shot.versions?.find((v: any) => v.is_active);
        if (activeVersion) {
          const reviews = activeVersion.reviews;
          let isGreen = false;
          if (Array.isArray(reviews)) {
            if (reviews.some((r: any) => r.cd_vote === true)) isGreen = true;
          } else if (reviews) {
            if (reviews.cd_vote === true) isGreen = true;
          }
          if (isGreen) stats[pid].green++;
        }
      });
      setProjectStats(stats);
    }
  };

  const fetchProjects = async () => {
    if (!userProfile) return;
    setLoading(true);

    let query = supabase.from('projects').select('*').or('is_deleted.is.null,is_deleted.eq.false').order('created_at', { ascending: true });

    if (userProfile.role === 'PM') {
      query = query.eq('assigned_pm_id', userProfile.id);
    } else if (userProfile.role === 'PE') {
      // PE sees projects where they have at least one shot assigned
      // This is complex in Supabase without a join table or view.
      // Alternative: Fetch all shots assigned to PE, then fetch unique projects.
      const { data: shots } = await supabase.from('shots').select('scene_id').eq('assigned_pe_id', userProfile.id);
      if (shots && shots.length > 0) {
        const sceneIds = shots.map(s => s.scene_id);
        const { data: scenes } = await supabase.from('scenes').select('project_id').in('id', sceneIds);
        if (scenes) {
          const projectIds = [...new Set(scenes.map(s => s.project_id))];
          query = query.in('id', projectIds);
        } else {
          query = query.in('id', []); // No projects
        }
      } else {
        query = query.in('id', []); // No shots assigned
      }
    }

    const { data, error } = await query;
    if (error) console.error(error);
    else setProjects(data || []);

    setLoading(false);
  };


  const handleDeleteProject = async (projectId: string) => {
    const previousProjects = projects; // Save the previous state

    try {
      // Optimistic update - remove the project immediately from the UI
      setProjects(projects.filter(p => p.id !== projectId));

      // Then call the delete API
      await deleteProject(projectId);
    } catch (error) {
      // If deletion fails, restore the previous state
      setProjects(previousProjects);
      console.error('Error deleting project:', error);
      throw error;
    }
  };


  const handleRenameProject = async (projectId: string, newName: string) => {
    try {
      // Call the API which handles both DB update and Drive folder rename
      await renameProject(projectId, newName);



      // Update local state
      setProjects(projects.map(p => p.id === projectId ? { ...p, name: newName } : p));
    } catch (error) {
      console.error('Error renaming project:', error);
      alert('Failed to rename project');
    }
  };

  return (
    <div className="min-h-screen bg-zinc-900 text-zinc-100 p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold text-white tracking-tight ">Dashboard</h1>
        <div className="flex items-center space-x-4">
          <NotificationBell />



          {userProfile?.role === 'CD' && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="glass-button flex items-center space-x-2 px-4 py-2  font-medium shadow-lg hover:bg-white/10 text-white"
            >
              <Plus size={18} />
              <span>New Project</span>
            </button>
          )}
          <span className="text-zinc-400  text-lg ">{userProfile?.email} ({userProfile?.role})</span>
          <button onClick={signOut} className="px-6 py-2 glass-button hover:bg-white/10 rounded-full text-base transition-all active:scale-95 shadow-glass">Sign Out</button>
        </div>
      </div>

      <div className="flex space-x-4 mb-6 border-b border-zinc-700">
        <button
          className={`pb-2 px-4  ${activeTab === 'projects' ? 'border-b-2 border-white text-white' : 'text-zinc-400'}`}
          onClick={() => setActiveTab('projects')}
        >
          Projects
        </button>
        <button
          className={`pb-2 px-4  ${activeTab === 'assignments' ? 'border-b-2 border-white text-white' : 'text-zinc-400'}`}
          onClick={() => setActiveTab('assignments')}
        >
          Assignments
        </button>

        {/* Asset Library Tab */}
        {(userProfile?.role === 'CD' || userProfile?.role === 'PM') && (
          <button
            className={`pb-2 px-4  ${activeTab === 'assets' ? 'border-b-2 border-white text-white' : 'text-zinc-400'}`}
            onClick={() => setActiveTab('assets')}
          >
            Asset Library
          </button>
        )}

        {userProfile?.role === 'CD' && (
          <button
            className={`pb-2 px-4 flex items-center gap-2 ${activeTab === 'trash' ? 'border-b-2 border-white text-white' : 'text-zinc-400'}`}
            onClick={() => setActiveTab('trash')}
          >
            
            Recycle Bin
          </button>
        )}
      </div>

      {activeTab === 'projects' && (
        loading ? <div>Loading projects...</div> : (
          <div className="flex flex-wrap gap-6 ">
            {projects.length === 0 ? (
              <p className="text-zinc-500">No projects assigned.</p>
            ) : (
              projects.map(project => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onClick={() => navigate(`/project/${project.id}`)}
                  greenShots={projectStats[project.id]?.green || 0}
                  totalShots={projectStats[project.id]?.total || 0}
                  onDelete={handleDeleteProject}
                  onRename={userProfile?.role === 'CD' ? handleRenameProject : undefined}
                />
              ))
            )}
          </div>
        )
      )}

      {activeTab === 'assignments' && (
        userProfile?.role === 'PE' ? <PEAssignmentsPanel /> : <AssignmentsPanel />
      )}

      {activeTab === 'assets' && (
        <AssetLibrary projects={projects} />
      )}

      {activeTab === 'trash' && userProfile?.role === 'CD' && (
        <TrashPanel onProjectRestored={fetchProjects} />
      )}

      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onProjectCreated={fetchProjects}
      />
    </div>
  );
};
