import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import type { Project, Scene, Shot, UserProfile } from '../types';
import { CheckSquare, Square, AlertCircle, ChevronDown } from 'lucide-react';
import { useDialog } from '../context/DialogContext';

export const AssignmentsPanel: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [pms, setPms] = useState<UserProfile[]>([]);
  const [pes, setPes] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // State
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [shots, setShots] = useState<Shot[]>([]);
  const [selectedShotIds, setSelectedShotIds] = useState<string[]>([]);
  const [targetPeId, setTargetPeId] = useState<string>('');
  const [expandedShotIds, setExpandedShotIds] = useState<string[]>([]);

  const dialog = useDialog();

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedProject) fetchProjectDetails(selectedProject);
  }, [selectedProject]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single();
      setUserProfile(profile);

      if (profile?.role === 'CD') {
        const { data: allProjects } = await supabase.from('projects').select('*');
        setProjects(allProjects || []);

        const { data: allPMs } = await supabase.from('users').select('*').eq('role', 'PM');
        setPms(allPMs || []);
      }

      if (profile?.role === 'PM' || profile?.role === 'CD') {
        // PM sees assigned projects (CD sees all via above logic, but let's ensure consistency)
        if (profile.role === 'PM') {
          const { data: assignedProjects } = await supabase.from('projects').select('*').eq('assigned_pm_id', user.id);
          setProjects(assignedProjects || []);
        }

        const { data: allPEs } = await supabase.from('users').select('*').eq('role', 'PE');
        setPes(allPEs || []);
      }

    } catch (error) {
      console.error('Error loading assignments:', error);
    } finally {
      setLoading(false);
    }
  };

  const assignPM = async (projectId: string, pmId: string) => {
    await supabase.from('projects').update({ assigned_pm_id: pmId }).eq('id', projectId);
    fetchData();
  };

  const fetchProjectDetails = async (projectId: string) => {
    const { data: projectScenes } = await supabase.from('scenes').select('*').eq('project_id', projectId).order('created_at', { ascending: true });
    setScenes(projectScenes || []);

    // Flatten shots with PE information
    if (projectScenes) {
      const sceneIds = projectScenes.map(s => s.id);
      const { data: projectShots } = await supabase
        .from('shots')
        .select(`
          *,
          assigned_pe:users!assigned_pe_id(id, email)
        `)
        .in('scene_id', sceneIds)
        .order('created_at', { ascending: true });
      setShots(projectShots || []);
    }
  };

  const toggleShot = (shotId: string) => {
    setSelectedShotIds(prev =>
      prev.includes(shotId) ? prev.filter(id => id !== shotId) : [...prev, shotId]
    );
  };

  const toggleSceneShots = (sceneId: string) => {
    const sceneShotIds = shots.filter(s => s.scene_id === sceneId).map(s => s.id);
    const allSelected = sceneShotIds.every(id => selectedShotIds.includes(id));

    if (allSelected) {
      setSelectedShotIds(prev => prev.filter(id => !sceneShotIds.includes(id)));
    } else {
      setSelectedShotIds(prev => [...new Set([...prev, ...sceneShotIds])]);
    }
  };

  const executeBulkAssign = async () => {
    try {
        const { error } = await supabase
          .from('shots')
          .update({ assigned_pe_id: targetPeId })
          .in('id', selectedShotIds);

        if (error) throw error;

        dialog.alert('Success', 'Assignments updated successfully!', 'success');
        setSelectedShotIds([]);
        if (selectedProject) fetchProjectDetails(selectedProject);
    } catch (err) {
        console.error(err);
        dialog.alert('Error', 'Assignment failed. Please try again.', 'danger');
    }
  };

  const handleBulkAssign = async () => {
    if (!targetPeId || selectedShotIds.length === 0) return;
    
    const peName = pes.find(p => p.id === targetPeId)?.email || 'the selected engineer';
    
    dialog.confirm(
        'Confirm Assignment', 
        `Are you sure you want to assign ${selectedShotIds.length} shots to ${peName}?`, 
        executeBulkAssign,
        'info'
    );
  };

  const executeUnassign = async (shotId: string) => {
      try {
        const { error } = await supabase
            .from('shots')
            .update({ assigned_pe_id: null })
            .eq('id', shotId);

        if (error) throw error;

        dialog.alert('Success', 'Shot unassigned successfully.', 'success');
        if (selectedProject) fetchProjectDetails(selectedProject); 
      } catch (err) {
        console.error(err);
        dialog.alert('Error', 'Unassignment failed.', 'danger');
      }
  };

  const handleUnassign = async (shotId: string) => {
      dialog.confirm(
          'Unassign Shot',
          'Are you sure you want to unassign this shot? The engineer will lose access.',
          () => executeUnassign(shotId),
          'danger'
      );
  };

  if (loading) return <div className="text-white p-8">Loading assignments...</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      
      {/* CD Only: Assign PMs */}
      {userProfile?.role === 'CD' && (
        <div className="glass-panel p-6">
          <h3 className="text-xl font-bold mb-6 text-white border-b border-white/10 pb-2">Assign Project Managers</h3>
          <div className="space-y-4">
            {projects.map(project => (
              <div key={project.id} className="flex justify-between items-center group">
                <span className="text-zinc-300 font-medium group-hover:text-white transition-colors">{project.name}</span>
                <select
                  value={project.assigned_pm_id || ''}
                  onChange={(e) => assignPM(project.id, e.target.value)}
                  className="bg-black/20 border border-white/10 rounded-lg px-3 py-1.5 focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/20 transition-all text-sm"
                >
                  <option value="" className="bg-zinc-900">Unassigned</option>
                  {pms.map(pm => (
                    <option key={pm.id} value={pm.id} className="bg-zinc-900">{pm.email}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-8 p-4">
        <div className="glass-panel p-8">
          <h3 className="text-2xl font-bold mb-8 flex items-center gap-3 text-white border-b border-white/10 pb-4">
            <CheckSquare className="text-white" />
            <span>Prompt Engineer Assignment</span>
          </h3>

          {/* 1. Project Selector */}
          <div className="mb-8">
            <label className="block text-xs font-bold uppercase text-zinc-500 mb-2 tracking-wider">Select Project</label>
            <select
              className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-white text-lg focus:ring-2 focus:ring-white/20 focus:border-white/30 transition-all cursor-pointer hover:bg-white/5"
              onChange={(e) => setSelectedProject(e.target.value)}
              value={selectedProject || ''}
            >
              <option value="" className="bg-zinc-900">Select Project / Movie</option>
              {projects.map(p => <option key={p.id} value={p.id} className="bg-zinc-900">{p.name}</option>)}
            </select>
          </div>

          {selectedProject && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* 2. Multi-Select Waterfall */}
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                {scenes.map(scene => (
                  <div key={scene.id} className="border border-white/5 rounded-xl overflow-hidden bg-white/5">
                    <div
                      className="bg-white/5 p-4 flex justify-between items-center cursor-pointer hover:bg-white/10 transition-colors border-b border-white/5"
                      onClick={() => toggleSceneShots(scene.id)}
                    >
                      <span className="font-bold text-zinc-200">Scene: {scene.name}</span>
                      <span className="text-[10px] uppercase tracking-wider bg-white/10 px-2 py-1 rounded text-zinc-400 hover:text-white transition-colors">Select All</span>
                    </div>

                    <div className="p-2 space-y-1 overflow-x-auto thin-scrollbar" style={{ scrollbarWidth: 'thin' }}>
                      {shots.filter(s => s.scene_id === scene.id).map(shot => {
                        const isExpanded = expandedShotIds.includes(shot.id);
                        return (
                          <div key={shot.id} className="space-y-0">
                            {/* Shot Row */}
                            <div
                              onClick={() => toggleShot(shot.id)}
                              className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200 min-w-max ${selectedShotIds.includes(shot.id)
                                  ? 'bg-white/10 border border-white/20 shadow-inner'
                                  : 'hover:bg-white/5 border border-transparent'
                                }`}
                            >
                              {selectedShotIds.includes(shot.id) ? (
                                <div className="bg-white text-black p-0.5 rounded">
                                  <CheckSquare size={14} />
                                </div>
                              ) : (
                                <Square size={16} className="text-zinc-500 fill-white/5" />
                              )}
                              <span className={`text-sm flex-1 ${selectedShotIds.includes(shot.id) ? 'text-white font-medium' : 'text-zinc-400'}`}>
                                {shot.name}
                              </span>
                              {shot.assigned_pe_id && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExpandedShotIds(prev =>
                                      prev.includes(shot.id)
                                        ? prev.filter(id => id !== shot.id)
                                        : [...prev, shot.id]
                                    );
                                  }}
                                  className="flex items-center gap-1 text-xs text-zinc-400 hover:text-white transition-colors"
                                >
                                  <ChevronDown
                                    size={16}
                                    className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                                  />
                                </button>
                              )}
                            </div>

                            {/* Collapsible Assignment Details */}
                            {shot.assigned_pe_id && isExpanded && (
                              <div className="ml-8 mr-2 mb-2 p-3 bg-white/5 rounded-lg border border-white/10 flex items-center gap-2 flex-wrap">
                                <span className="text-xs text-blue-300 font-medium bg-blue-900/30 px-2 py-1 rounded border border-blue-700/30 whitespace-nowrap">
                                  {(shot as any).assigned_pe?.email || 'Unknown PE'}
                                </span>
                                <span className="text-[9px] text-green-300 font-bold uppercase tracking-widest bg-green-900/40 px-2 py-1 rounded border border-green-700/50 shadow-sm whitespace-nowrap">
                                  Assigned
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleUnassign(shot.id);
                                  }}
                                  className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 hover:text-red-300 border border-white/5 hover:border-red-500/30 hover:bg-red-950/30 px-2.5 py-1 rounded-full transition-all duration-300 hover:scale-105 active:scale-95 whitespace-nowrap"
                                >
                                  Unassign
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* 3. Assignment Action Box */}
              <div className="relative">
                <div className="glass-panel p-6 sticky top-4 border border-white/20 shadow-2xl bg-gradient-to-br from-white/10 to-transparent">
                  <h4 className="font-medium text-white mb-6 flex items-center gap-2 text-sm uppercase tracking-widest opacity-80">
                    <AlertCircle size={16} /> Assignment Summary
                  </h4>

                  <div className="flex items-baseline gap-2 mb-8">
                    <span className="text-5xl font-display font-bold text-white">{selectedShotIds.length}</span>
                    <span className="text-sm font-medium text-zinc-500 uppercase tracking-wider">Shots Selected</span>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold uppercase text-zinc-500 mb-2 tracking-wider">Assign To</label>
                      <select
                        value={targetPeId}
                        onChange={(e) => setTargetPeId(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:ring-1 focus:ring-white/50 focus:outline-none transition-all"
                      >
                        <option value="" className="bg-zinc-900">Choose Engineer...</option>
                        {pes.map(pe => <option key={pe.id} value={pe.id} className="bg-zinc-900">{pe.email}</option>)}
                      </select>
                    </div>

                    <button
                      disabled={selectedShotIds.length === 0 || !targetPeId}
                      onClick={handleBulkAssign}
                      className="w-full glass-button hover:bg-white hover:text-black hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 disabled:bg-transparent disabled:text-zinc-500 font-bold py-4 rounded-xl transition-all shadow-glass mt-4 flex justify-center items-center gap-2"
                    >
                      <span>Confirm Assignment</span>
                      {selectedShotIds.length > 0 && targetPeId && <CheckSquare size={16} />}
                    </button>
                  </div>

                  {selectedShotIds.length > 0 && !targetPeId && (
                    <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2 text-red-200 text-xs">
                      <AlertCircle size={14} className="mt-0.5 shrink-0" />
                      <span>Please select a Prompt Engineer to proceed.</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
