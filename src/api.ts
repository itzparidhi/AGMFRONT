import axios from 'axios';

// API URL from environment variable - defaults to local backend for development
// To switch backends, update VITE_API_URL in .env:
//   Local:  VITE_API_URL=http://localhost:8000
//   Render: VITE_API_URL=https://itoolback.onrender.com
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_URL,
});

export const createStructure = async (payload: {
  name: string;
  type: 'project' | 'episode' | 'scene' | 'shot';
  parentFolderId?: string;
  parentDbId?: string;
  assignTo?: string;
  sequence?: number;
}) => {
  const response = await api.post('/structure', payload);
  return response.data;
};

export const createStructureWithSequence = async (payload: {
  name: string;
  type: 'project' | 'scene' | 'shot';
  parentFolderId?: string;
  parentDbId?: string;
  assignTo?: string;
  sequence?: number;
}) => {
  const response = await api.post('/structure', payload);
  return response.data;
};

export const insertShotAtPosition = async (payload: {
  scene_id: string;
  name: string;
  parent_folder_id: string;
  sequence: number;
  assign_to?: string;
}) => {
  const response = await api.post('/structure/shot/insert', payload);
  return response.data;
};

export const reorderShots = async (payload: {
  scene_id: string;
  shots: Array<{ id: string; sequence: number }>;
}) => {
  const response = await api.post('/structure/shots/reorder', payload);
  return response.data;
};

export const uploadAsset = async (payload: {
  file: File;
  folder_id: string;
  db_id: string;
  uploader_id: string;
  is_storyboard?: boolean;
  reference_type?: string;
  asset_type?: string;
  resource_type?: string;
  character_name?: string;
  asset_library_type?: 'script' | 'character' | 'moodboard' | 'storyboard' | 'audio' | 'miscellaneous';
}, onUploadProgress?: (progressEvent: any) => void) => {
  const formData = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      formData.append(key, value as any);
    }
  });

  const response = await api.post('/assets/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress,
  });
  return response.data;
};

export const getProjectAssets = async (projectId: string) => {
  const response = await api.get(`/assets/library/${projectId}`);
  return response.data; // Returns { script: [], character: [], moodboard: [] }
};

export const deleteProjectAsset = async (assetId: string) => {
  const response = await api.delete(`/assets/library/${assetId}`);
  return response.data;
};

export const setActiveVersion = async (payload: {
  version_id: string;
  shot_name: string;
  folder_id: string;
}) => {
  const response = await api.post('/assets/set_active_version', {
    version_id: payload.version_id,
    shot_name: payload.shot_name,
    target_folder_id: payload.folder_id
  });
  return response.data;
};

export const generateImage = async (payload: {
  prompt: string;
  mode: 'manual' | 'automatic' | 'storyboard_enhancer' | 'angles';
  shot_id: string;
  user_email: string;
  model: string;
  aspect_ratio: string;
  resolution?: string;
  ref_images?: File[];
  auto_storyboard?: File | null;
  auto_lighting?: File | null;
  auto_background?: File | null;
  auto_characters?: File[];
  // Fallbacks
  auto_storyboard_url?: string;
  auto_lighting_url?: string;
  auto_background_url?: string;
  auto_characters_urls?: string[];
  // Angles Mode
  angles_angle?: string;
  angles_length?: string;
  angles_focus?: string;
  angles_background?: string;
  angles_anchor?: File | null;
  angles_target?: File | null;
}) => {
  const formData = new FormData();
  formData.append('prompt', payload.prompt);
  formData.append('mode', payload.mode);
  formData.append('shot_id', payload.shot_id);
  formData.append('user_email', payload.user_email);
  formData.append('model', payload.model);
  formData.append('aspect_ratio', payload.aspect_ratio);
  if (payload.resolution) formData.append('resolution', payload.resolution);

  // Manual Mode Images
  if (payload.ref_images) {
    payload.ref_images.forEach((file) => {
      formData.append('ref_images', file);
    });
  }

  // Automatic Mode Images
  if (payload.auto_storyboard) {
    formData.append('auto_storyboard', payload.auto_storyboard);
  } else if (payload.auto_storyboard_url) {
    formData.append('auto_storyboard_url', payload.auto_storyboard_url);
  }

  if (payload.auto_lighting) {
    formData.append('auto_lighting', payload.auto_lighting);
  } else if (payload.auto_lighting_url) {
    formData.append('auto_lighting_url', payload.auto_lighting_url);
  }

  if (payload.auto_background) {
    formData.append('auto_background', payload.auto_background);
  } else if (payload.auto_background_url) {
    formData.append('auto_background_url', payload.auto_background_url);
  }

  if (payload.auto_characters && payload.auto_characters.length > 0) {
    payload.auto_characters.forEach((file) => {
      formData.append('auto_characters', file);
    });
  }
  if (payload.auto_characters_urls && payload.auto_characters_urls.length > 0) {
    formData.append('auto_characters_urls', JSON.stringify(payload.auto_characters_urls));
  }

  // Angles Mode Inputs
  if (payload.angles_angle) formData.append('angles_angle', payload.angles_angle);
  if (payload.angles_length) formData.append('angles_length', payload.angles_length);
  if (payload.angles_focus) formData.append('angles_focus', payload.angles_focus);
  if (payload.angles_background) formData.append('angles_background', payload.angles_background);
  if (payload.angles_anchor) formData.append('angles_anchor', payload.angles_anchor);
  if (payload.angles_target) formData.append('angles_target', payload.angles_target);

  const response = await api.post('/generation/create', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

export const fetchGenerations = async (shotId: string) => {
  const response = await api.get(`/generation/${shotId}`);
  return response.data;
};

export const generateBackgroundGrid = async (payload: {
  background_image: File;
  context?: string;
  shot_id: string;
  user_email: string;
  aspect_ratio: string;
}) => {
  const formData = new FormData();
  formData.append('background_image', payload.background_image);
  if (payload.context) formData.append('context', payload.context);
  formData.append('shot_id', payload.shot_id);
  formData.append('user_email', payload.user_email);
  formData.append('aspect_ratio', payload.aspect_ratio);

  const response = await api.post('/generation/background-grid', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

export const renameProject = async (projectId: string, name: string) => {
  const response = await api.patch(`/structure/project/${projectId}`, {
    name,
    type: 'project' // Required by backend Pydantic model
  });
  return response.data;
};

export const deleteProject = async (projectId: string) => {
  const response = await api.delete(`/structure/project/${projectId}`);
  return response.data;
};

export const verifyDeleteProject = async (projectId: string, password: string) => {
  const response = await api.post(`/structure/project/${projectId}/confirm`, { password });
  return response.data;
};

export const restoreProject = async (projectId: string) => {
  const response = await api.post(`/structure/project/${projectId}/restore`);
  return response.data;
};

export const softDeleteShot = async (shotId: string) => {
  const response = await api.delete(`/structure/shot/${shotId}`);
  return response.data;
};

export const restoreShot = async (shotId: string) => {
  const response = await api.post(`/structure/shot/${shotId}/restore`);
  return response.data;
};

export const softDeleteScene = async (sceneId: string) => {
  const response = await api.delete(`/structure/scene/${sceneId}`);
  return response.data;
};

export const restoreScene = async (sceneId: string) => {
  const response = await api.post(`/structure/scene/${sceneId}/restore`);
  return response.data;
};

export const deleteEpisode = async (episodeId: string) => {
  const response = await api.delete(`/structure/episode/${episodeId}`);
  return response.data;
};

export const restoreEpisode = async (episodeId: string) => {
  const response = await api.post(`/structure/episode/${episodeId}/restore`);
  return response.data;
};

export const unassignShot = async (shotId: string) => {
  const response = await api.post(`/structure/shot/${shotId}/unassign`);
  return response.data;
};

// Master CD Functions
export const checkIsMasterCD = async (email: string) => {
  const response = await api.get(`/config/is-master-cd/${encodeURIComponent(email)}`);
  return response.data;
};

export const masterApproveVersion = async (
  versionId: string,
  userEmail: string,
  shotName: string,
  targetFolderId: string
) => {
  const formData = new FormData();
  formData.append('user_email', userEmail);
  formData.append('shot_name', shotName);
  formData.append('target_folder_id', targetFolderId);

  const response = await api.post(`/reviews/${versionId}/master-approve`, formData);
  return response.data;
};

export const masterRejectVersion = async (
  versionId: string,
  userEmail: string,
  comment: string,
  peUserId: string,
  shotId: string,
  images?: File[],
  annotationImages?: File[]
) => {
  const formData = new FormData();
  formData.append('user_email', userEmail);
  formData.append('comment', comment);
  formData.append('pe_user_id', peUserId);
  formData.append('shot_id', shotId);

  if (images && images.length > 0) {
    images.forEach((image) => {
      formData.append('images', image);
    });
  }

  if (annotationImages && annotationImages.length > 0) {
    annotationImages.forEach((image) => {
      formData.append('annotation_images', image);
    });
  }

  const response = await api.post(`/reviews/${versionId}/master-reject`, formData);
  return response.data;
};

export const sendDailyReport = async () => {
  const response = await api.post('/emails/trigger-daily-report');
  return response.data;
};

export const saveScriptVersion = async (episodeId: string, file: File, uploaderId: string) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('episode_id', episodeId);
  formData.append('uploader_id', uploaderId);

  const response = await api.post('/assets/script/save', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const getLatestScriptVersion = async (episodeId: string) => {
  const response = await api.get(`/assets/script/${episodeId}/latest`);
  return response.data;
};

export const getScriptVersions = async (episodeId: string) => {
  const response = await api.get(`/assets/script/${episodeId}/versions`);
  return response.data;
};

export const getMoodboardVersions = async (episodeId: string) => {
  const response = await api.get(`/assets/moodboard/${episodeId}/versions`);
  return response.data;
};

export const saveMoodboard = async (episodeId: string, files: File[], uploaderId: string) => {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append('files', file);
  });
  formData.append('episode_id', episodeId);
  formData.append('uploader_id', uploaderId);

  const response = await api.post('/assets/moodboard/save', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
  return response.data;
};

export const getAudioVersions = async (episodeId: string, category: 'sfx' | 'dialogue') => {
  const response = await api.get(`/assets/audio/${episodeId}/versions?category=${category}`);
  return response.data;
};

export const saveAudio = async (episodeId: string, category: 'sfx' | 'dialogue', files: File[], uploaderId: string) => {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append('files', file);
  });
  formData.append('episode_id', episodeId);
  formData.append('category', category);
  formData.append('uploader_id', uploaderId);

  const response = await api.post('/assets/audio/save', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

// Character API
export const getCharacters = async (projectId: string) => {
  const response = await api.get(`/characters/${projectId}`);
  return response.data;
};

export const createCharacter = async (name: string, ageGroup: string, projectId: string) => {
  const response = await api.post('/characters/create', {
    name,
    age_group: ageGroup,
    project_id: projectId
  });
  return response.data;
};

export const saveCharacterImages = async (characterId: string, files: File[], projectId: string, uploaderId: string) => {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append('files', file);
  });
  formData.append('character_id', characterId);
  formData.append('project_id', projectId);
  formData.append('uploader_id', uploaderId);

  const response = await api.post('/characters/save_images', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const deleteCharacter = async (characterId: string) => {
  const response = await api.delete(`/characters/${characterId}`);
  return response.data;
};

export const saveTimestampReview = async (
  versionId: string,
  role: 'pm' | 'cd' | 'master_cd',
  timestamps: { time: number; comment: string }[]
) => {
  const response = await api.post(`/reviews/${versionId}/timestamps`, {
    role,
    timestamps
  });
  return response.data;
};

export const getStoryboardEpisodes = async (projectId: string) => {
  const response = await api.get(`/storyboard/episodes/${projectId}`);
  return response.data;
};

export const getScenes = async (episodeId: string) => {
  const response = await api.get(`/storyboard/${episodeId}/scenes`);
  return response.data;
};

export const getShots = async (sceneId: string) => {
  const response = await api.get(`/storyboard/${sceneId}/shots`);
  return response.data;
};

export const uploadStoryboardImage = async (shotId: string, file: File, uploaderId: string) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('shot_id', shotId);
  formData.append('uploader_id', uploaderId);

  const response = await api.post('/storyboard/shot/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export default api;
