import React, { useEffect, useState } from 'react';
import { X, ArrowLeft } from 'lucide-react';
import { supabase } from '../supabaseClient';
import type { Scene, Shot } from '../types';
import { useAuth } from '../context/AuthContext';

interface CompletionStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
}

interface ShotDetail extends Shot {
  pe_email?: string;
  cd_vote?: boolean | null;
  pm_vote?: boolean | null;
}

interface SceneDetail extends Scene {
  shots: ShotDetail[];
  sceneProgress: number;
}

export const CompletionStatusModal: React.FC<CompletionStatusModalProps> = ({ isOpen, onClose, projectId }) => {
  const { userProfile } = useAuth();
  const [data, setData] = useState<SceneDetail[]>([]);
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen, projectId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: scenes } = await supabase
        .from('scenes')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });

      if (!scenes) {
        setData([]);
        return;
      }

      const { data: users } = await supabase.from('users').select('id, email');
      const userMap = new Map(users?.map(u => [u.id, u.email]) || []);

      const scenesWithShots = await Promise.all(scenes.map(async (scene) => {
        const { data: shots } = await supabase
          .from('shots')
          .select('*')
          .eq('scene_id', scene.id)
          .order('created_at', { ascending: true });

        if (!shots) return { ...scene, shots: [], sceneProgress: 0 };

        const shotsWithDetails: ShotDetail[] = await Promise.all(shots.map(async (shot) => {
          const { data: versions } = await supabase
            .from('versions')
            .select('*, reviews(*)')
            .eq('shot_id', shot.id)
            .eq('is_active', true)
            .limit(1);

          const version = versions && versions.length > 0 ? versions[0] : null;
          const review = version ? (version.reviews?.[0] || (version as any).reviews) : null;
          const r = Array.isArray(review) ? review[0] : review;

          return {
            ...shot,
            pe_email: shot.assigned_pe_id ? userMap.get(shot.assigned_pe_id) : 'Unassigned',
            cd_vote: r?.cd_vote ?? null,
            pm_vote: r?.pm_vote ?? null
          };
        }));

        // --- PROGRESS CALCULATION LOGIC ---
        let sceneProgress = 0;
        const totalShots = shotsWithDetails.length;

        if (totalShots > 0) {
          if (userProfile?.role === 'PM') {
            // PM Progress = (Shots Approved by CD) / (Total Shots)
            const cdApprovals = shotsWithDetails.filter(s => s.cd_vote === true).length;
            sceneProgress = Math.round((cdApprovals / totalShots) * 100);
          } else if (userProfile?.role === 'PE') {
            // PE Progress = (Total PM Approvals + Total CD Approvals) / (Total Shots)
            // Note: This can exceed 100% if one shot has two approvals, 
            // so we cap it at 100% or calculate based on your specific weighted preference.
            const pmApprovals = shotsWithDetails.filter(s => s.pm_vote === true).length;
            const cdApprovals = shotsWithDetails.filter(s => s.cd_vote === true).length;
            const totalApprovals = pmApprovals + cdApprovals;

            // To match "divided by total shots" logic:
            sceneProgress = Math.min(Math.round((totalApprovals / totalShots) * 100), 100);
          }
        }

        const filteredShots = userProfile?.role === 'PE'
          ? shotsWithDetails.filter(s => s.assigned_pe_id === userProfile.id)
          : shotsWithDetails;

        return { ...scene, shots: filteredShots, sceneProgress };
      }));

      setData(scenesWithShots.filter(scene => scene.shots.length > 0));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const selectedScene = data.find(s => s.id === selectedSceneId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="bg-zinc-900 w-full max-w-4xl max-h-[90vh] rounded-lg border border-zinc-700 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-zinc-800">
          <div className="flex items-center gap-4">
            {selectedSceneId && (
              <button onClick={() => setSelectedSceneId(null)} className="text-zinc-400 hover:text-white transition-colors">
                <ArrowLeft size={20} />
              </button>
            )}
            <h2 className="text-2xl font-bold text-white">
              {selectedSceneId ? `Scene: ${selectedScene?.name}` : 'Project Completion Status'}
            </h2>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white-500"></div>
            </div>
          ) : (
            <>
              {!selectedSceneId ? (
                /* VIEW 1: SCENE LIST */
                <div className="bg-zinc-800/30 rounded-lg border border-zinc-800 overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-zinc-900/50 text-zinc-400">
                      <tr>
                        <th className="px-4 py-3 font-medium">Scene</th>
                        {userProfile?.role !== 'CD' && <th className="px-4 py-3 font-medium">Progress</th>}
                        <th className="px-4 py-3 font-medium">Assigned To</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                      {data.map(scene => (
                        <tr
                          key={scene.id}
                          className="hover:bg-zinc-800/50 cursor-pointer transition-colors"
                          onClick={() => setSelectedSceneId(scene.id)}
                        >
                          <td className="px-4 py-3 text-white-400 font-medium">{scene.name} →</td>
                          {userProfile?.role !== 'CD' && (
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="w-24 bg-zinc-700 rounded-full h-1.5 overflow-hidden">
                                  <div
                                    className="bg-white h-full transition-all"
                                    style={{ width: `${scene.sceneProgress}%` }}
                                  />
                                </div>
                                <span className="text-xs text-zinc-300">{scene.sceneProgress}%</span>
                              </div>
                            </td>
                          )}
                          <td className="px-4 py-3 text-zinc-400">
                            {[...new Set(scene.shots.map(s => s.pe_email))].filter(Boolean).join(', ')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                /* VIEW 2: SHOT LIST */
                <div className="bg-zinc-800/30 rounded-lg border border-zinc-800 overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-zinc-900/50 text-zinc-400">
                      <tr>
                        <th className="px-4 py-3 font-medium">Shot Name</th>
                        <th className="px-4 py-3 font-medium text-center">PM Approval</th>
                        <th className="px-4 py-3 font-medium text-center">CD Approval</th>
                        <th className="px-4 py-3 font-medium">Assigned PE</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                      {selectedScene?.shots.map(shot => (
                        <tr key={shot.id} className="hover:bg-zinc-800/50 transition-colors">
                          <td className="px-4 py-3 text-zinc-300 font-medium">{shot.name}</td>
                          <td className="px-4 py-3 text-center">
                            <VoteBadge vote={shot.pm_vote} />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <VoteBadge vote={shot.cd_vote} />
                          </td>
                          <td className="px-4 py-3 text-zinc-400">{shot.pe_email}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const VoteBadge = ({ vote }: { vote: boolean | null | undefined }) => {
  if (vote === true) return <span className="text-green-400 text-[10px] uppercase font-bold bg-green-900/30 px-2 py-0.5 rounded border border-green-800">Accepted</span>;
  if (vote === false) return <span className="text-red-400 text-[10px] uppercase font-bold bg-red-900/30 px-2 py-0.5 rounded border border-red-800">Rejected</span>;
  return <span className="text-zinc-500 text-[10px] uppercase bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700">Not Given</span>;
};