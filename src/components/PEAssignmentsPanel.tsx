import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { Filter } from 'lucide-react';

interface Assignment {
  id: string;
  shot_name: string;
  scene_name: string;
  project_name: string;
  project_id: string;
  status: 'Not Started' | 'Pending' | 'Approved' | 'Rejected';
}

export const PEAssignmentsPanel: React.FC = () => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('All');

  useEffect(() => {
    if (userProfile) fetchAssignments();
  }, [userProfile]);

  const fetchAssignments = async () => {
    if (!userProfile) return;
    setLoading(true);

    try {
      // Fetch shots assigned to PE
      const { data: shots, error } = await supabase
        .from('shots')
        .select(`
          id,
          name,
          scene_id,
          assigned_pe_id,
          scenes (
            id,
            name,
            project_id,
            projects (
              id,
              name
            )
          ),
          versions (
            id,
            is_active,
            reviews (
              pm_vote,
              cd_vote
            )
          )
        `)
        .eq('assigned_pe_id', userProfile.id);

      if (error) {
        console.error('Error fetching assignments:', error);
        setLoading(false);
        return;
      }

      const formattedAssignments: Assignment[] = shots.map((shot: any) => {
        const activeVersion = shot.versions?.find((v: any) => v.is_active);
        let status: Assignment['status'] = 'Not Started';

        if (activeVersion) {
          status = 'Pending';
          const review = activeVersion.reviews?.[0];

          if (review) {
            if (review.cd_vote === true) status = 'Approved';
            else if (review.cd_vote === false) status = 'Rejected';
            else if (review.pm_vote === true) status = 'Approved';
            else if (review.pm_vote === false) status = 'Rejected';
          }
        }

        return {
          id: shot.id,
          shot_name: shot.name,
          scene_name: shot.scenes?.name || 'Unknown Scene',
          project_name: shot.scenes?.projects?.name || 'Unknown Project',
          project_id: shot.scenes?.projects?.id,
          status
        };
      });

      setAssignments(formattedAssignments);
    } catch (err) {
      console.error('Unexpected error:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredAssignments = statusFilter === 'All'
    ? assignments
    : assignments.filter(a => a.status === statusFilter);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Approved': return 'bg-green-900/50 text-green-200 border-green-700/50 dark:bg-green-900 dark:text-green-300';
      case 'Rejected': return 'bg-red-900/50 text-red-200 border-red-700/50 dark:bg-red-900 dark:text-red-300';
      case 'Pending': return 'bg-yellow-900/50 text-yellow-200 border-yellow-700/50 dark:bg-yellow-900 dark:text-yellow-300';
      default: return 'bg-zinc-200 text-zinc-800 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-600';
    }
  };

  if (loading) return <div>Loading assignments...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-zinc-100">My Assignments</h2>

        <div className="flex items-center space-x-2 bg-zinc-800 p-2 rounded border border-zinc-700">
          <Filter size={16} className="text-zinc-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-zinc-800 border-none focus:ring-0 text-sm text-zinc-200 cursor-pointer"
          >
            <option value="All" className="bg-zinc-800 text-zinc-200">All Status</option>
            <option value="Not Started" className="bg-zinc-800 text-zinc-200">Not Started</option>
            <option value="Pending" className="bg-zinc-800 text-zinc-200">Pending</option>
            <option value="Approved" className="bg-zinc-800 text-zinc-200">Approved</option>
            <option value="Rejected" className="bg-zinc-800 text-zinc-200">Rejected</option>
          </select>
        </div>
      </div>

      {filteredAssignments.length === 0 ? (
        <div className="text-zinc-500 italic">No assignments found.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAssignments.map((assignment) => (
            <div
              key={assignment.id}
              onClick={() => navigate(`/shot/${assignment.id}`)}
              className="glass-panel p-4 rounded-lg border border-white/10 hover:border-white/50 cursor-pointer transition-colors group"
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-bold text-lg group-hover:text-white">{assignment.shot_name}</h3>
                  <p className="text-sm text-zinc-400">{assignment.scene_name}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded border ${getStatusColor(assignment.status)}`}>
                  {assignment.status}
                </span>
              </div>
              <div className="text-xs text-zinc-500 mt-4 pt-2 border-t border-zinc-700">
                Project: {assignment.project_name}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
