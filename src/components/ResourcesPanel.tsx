import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { uploadAsset } from '../api';
import { Plus, X, ListChecks, LayoutGrid, Trash2, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDialog } from '../context/DialogContext';

interface ResourcesPanelProps {
  projectId: string;
  projectFolderId: string;
  onShowCompletionStatus: () => void;
}

interface Resource {
  id: string;
  name: string;
  type: string;
  gdrive_link: string;
}

export const ResourcesPanel: React.FC<ResourcesPanelProps> = ({ projectId, projectFolderId, onShowCompletionStatus }) => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const dialog = useDialog();
  const [resources, setResources] = useState<Resource[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(null);
  const [resourceType, setResourceType] = useState('reference');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [characterName, setCharacterName] = useState('');

  useEffect(() => {
    fetchResources();
  }, [projectId]);

  const fetchResources = async () => {
    const { data } = await supabase
      .from('resources')
      .select('*')
      .eq('project_id', projectId);
    if (data) setResources(data);
  };

  const openPreview = (url: string) => {
    // Direct link or Supabase
    if (url.includes('supabase.co') || !url.includes('google.com')) {
      setPreviewUrl(url);
      return;
    }
    // Google Drive Transform
    let embedUrl = url;
    if (url.includes('/view')) {
      embedUrl = url.replace(/\/view.*/, '/preview');
    }
    setPreviewUrl(embedUrl);
  };

  const handleDeleteResource = async () => {
    if (!selectedResourceId) return;

    dialog.confirm(
      'Delete Resource?',
      'Are you sure you want to delete this resource?',
      async () => {
        const { error } = await supabase
          .from('resources')
          .delete()
          .eq('id', selectedResourceId);

        if (error) {
          console.error('Error deleting resource:', error);
          dialog.alert('Error', 'Failed to delete resource', 'danger');
        } else {
          setSelectedResourceId(null);
          fetchResources();
        }
      },
      'danger'
    );
  };

  const handleAddResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !userProfile) return;



    /* Lines 1-52 omitted */
    setLoading(true);
    try {
      await uploadAsset({
        file: selectedFile,
        folder_id: projectFolderId,
        db_id: projectId,
        uploader_id: userProfile.id,
        asset_type: 'resource',
        resource_type: resourceType,
        character_name: resourceType === 'character' ? characterName : undefined,
      });

      setSelectedFile(null);
      setResourceType('reference');
      setCharacterName('');
      setIsAdding(false);
      fetchResources();
    } catch (err: any) {
      console.error('Error adding resource:', err);
      const errorMsg = err.response?.data?.detail || err.message || 'Failed to add resource';
      alert(`Failed to add resource: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Resources</h2>
        <div className="flex gap-2">
          {selectedResourceId && (userProfile?.role === 'CD' || userProfile?.role === 'PM') && (
            <button
              onClick={handleDeleteResource}
              className="p-1 hover:bg-zinc-700 rounded text-red-400 hover:text-red-300 transition-colors"
              title="Delete Selected Resource"
            >
              <Trash2 size={20} />
            </button>
          )}
          {(userProfile?.role === 'CD' || userProfile?.role === 'PM') && (
            <button
              onClick={() => setIsAdding(!isAdding)}
              className="p-1 hover:bg-zinc-700 rounded text-zinc-400 hover:text-white"
            >
              {isAdding ? <X size={20} /> : <Plus size={20} />}
            </button>
          )}
        </div>
      </div>

      {isAdding && (
        <form onSubmit={handleAddResource} className="mb-4 p-3 bg-zinc-900 rounded border border-zinc-700 space-y-3">
          <div className="relative">
            <select
              value={resourceType}
              onChange={e => setResourceType(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-600 rounded p-2 pr-10 text-sm appearance-none cursor-pointer focus:outline-none focus:border-zinc-500"
            >
              <option value="reference">Reference</option>
              <option value="script">Script</option>
              <option value="document">Document</option>
              {userProfile?.role === 'CD' && <option value="character">Character</option>}
              <option value="other">Other</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" size={16} />
          </div>

          {resourceType === 'character' && (
            <input
              type="text"
              value={characterName}
              onChange={e => setCharacterName(e.target.value)}
              placeholder="Character Name (e.g. Hero, Villain)"
              className="w-full bg-zinc-800 border border-zinc-600 rounded p-2 text-sm placeholder-zinc-500"
            />
          )}

          <input
            type="file"
            onChange={e => setSelectedFile(e.target.files ? e.target.files[0] : null)}
            className="w-full text-sm text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-white/10 file:text-white hover:file:bg-white/20 file:backdrop-blur-md"
          />

          <button
            type="submit"
            disabled={loading || !selectedFile}
            className="w-full glass-button hover:bg-white/10 text-white rounded py-2 text-sm font-medium disabled:opacity-50"
          >
            {loading ? 'Uploading...' : 'Upload Resource'}
          </button>
        </form>
      )}

      <div className="flex-1 overflow-y-auto space-y-2 ">
        {resources.map(res => (
          <div
            key={res.id}
            onClick={() => setSelectedResourceId(selectedResourceId === res.id ? null : res.id)}
            className={`p-3 rounded border cursor-pointer transition-colors ${selectedResourceId === res.id
              ? 'bg-zinc-800 border-blue-500'
              : 'bg-zinc-900 border-zinc-700 hover:border-zinc-600'
              }`}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                openPreview(res.gdrive_link);
              }}
              className="text-white hover:underline font-medium text-left break-all cursor-pointer"
            >
              {res.name}
            </button>
            <p className="text-xs text-zinc-500 mt-1">{res.type}</p>
          </div>
        ))}
        {resources.length === 0 && !isAdding && <p className="text-zinc-500">No resources.</p>}
      </div>

      {previewUrl && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-8">
          <div className="bg-zinc-900 w-full h-full rounded-lg flex flex-col relative border border-zinc-700 shadow-2xl">
            <button
              onClick={() => setPreviewUrl(null)}
              className="absolute -top-3 -right-3 bg-red-600 rounded-full p-1.5 hover:bg-red-700 text-white shadow-lg z-10"
            >
              <X size={20} />
            </button>
            <iframe
              src={previewUrl}
              className="w-full h-full rounded-lg bg-white"
              title="Resource Preview"
            />
          </div>
        </div>
      )}
      <div className="mt-auto pt-4 border-t border-zinc-700 space-y-2">
        <button
          onClick={() => navigate(`/project/${projectId}/master`)}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 glass-button hover:bg-white/10 text-white rounded-lg border border-white/20 transition-all shadow-glass"
        >
          <LayoutGrid size={20} />
          <span className="font-bold">MASTER VIEW</span>
        </button>

        <button
          onClick={onShowCompletionStatus}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg border border-zinc-600 transition-all shadow-lg hover:shadow-xl"
        >
          <ListChecks size={20} />
          <span className="font-bold">COMPLETION STATUS</span>
        </button>
      </div>
    </div>
  );
};
