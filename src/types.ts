export type UserRole = 'PE' | 'PM' | 'CD';
export type ViewMode = 'list' | 'columns' | 'gallery';

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
}

export interface Project {
  id: string;
  name: string;
  gdrive_folder_id: string;
  assigned_pm_id: string | null;
  created_at: string;
  is_deleted?: boolean;
  deleted_at?: string;
}

export interface Episode {
  id: string;
  project_id: string;
  name: string;
  episode_number: number | null;
  gdrive_folder_id: string;
  is_deleted?: boolean;
  deleted_at?: string;
  created_at: string;
}

export interface Scene {
  id: string;
  project_id: string;
  episode_id: string;
  name: string;
  gdrive_folder_id: string;
  status: 'pending' | 'in_progress' | 'changes_requested' | 'complete';
  created_at: string;
}

export interface Shot {
  id: string;
  scene_id: string;
  name: string;
  gdrive_folder_id: string;
  assigned_pe_id: string | null;
  storyboard_url: string | null;
  storyboard_uploader_id: string | null;
  style_url: string | null;
  background_urls?: string[] | null;
  sequence: number;
  created_at: string;
  is_deleted?: boolean;
  deleted_at?: string;
}

export interface Version {
  id: string;
  shot_id: string;
  uploader_id: string;
  version_number: number;
  gdrive_file_id: string | null;
  gdrive_link: string | null;
  public_link?: string; // Supabase Storage Link
  media_type?: 'image' | 'video';
  is_active: boolean;
  created_at: string;
  users?: {
    email: string;
  };
}

export interface Generation {
  id: string;
  shot_id: string;
  image_url: string;
  prompt: string;
  model: string;
  resolution: string;
  aspect_ratio: string;
  user_email?: string;
  status?: 'pending' | 'completed' | 'failed';
  created_at: string;
  ref_data?: {
    mode: 'manual' | 'automatic' | 'storyboard_enhancer' | 'angles';
    error?: string;
    manual_refs: { name: string; url: string; type: string }[];
    auto_refs: {
      storyboard?: string;
      lighting?: string;
      background?: string;
      characters?: { name: string; url: string }[];
      angles_anchor?: string;
      angles_target?: string;
    };
    angles_inputs?: {
      angle?: string;
      length?: string;
      focus?: string;
      background?: string;
    };
  };
}

export interface TimestampComment {
  time: number;
  comment: string;
}

export interface Review {
  id: string;
  version_id: string;
  pm_vote: boolean | null;
  pm_comment: string | null;
  pm_voted_at: string | null;
  cd_vote: boolean | null;
  cd_comment: string | null;
  cd_voted_at: string | null;
  pm_image_url?: string | null;
  pm_annotation_url?: string | null;
  cd_image_url?: string | null;
  cd_annotation_url?: string | null;
  master_cd_vote?: boolean | null;
  master_cd_comment?: string | null;
  master_cd_voted_at?: string | null;
  master_cd_image_url?: string | null;
  master_cd_annotation_url?: string | null;
  // Multiple image support
  pm_image_urls?: string[] | null;
  pm_annotation_urls?: string[] | null;
  cd_image_urls?: string[] | null;
  cd_annotation_urls?: string[] | null;
  master_cd_image_urls?: string[] | null;
  master_cd_annotation_urls?: string[] | null;
  // Timestamp-based video reviews
  pm_timestamps?: TimestampComment[] | null;
  cd_timestamps?: TimestampComment[] | null;
  master_cd_timestamps?: TimestampComment[] | null;
}

export interface Notification {
  id: string;
  user_id: string;
  message: string;
  link?: string;
  is_read: boolean;
  created_at: string;
}

export interface ScriptVersion {
  id: string;
  episode_id: string;
  content: string;
  version_number: number;
  is_active: boolean;
  uploader_id: string;
  created_at: string;
}

export interface Asset {
  id: string;
  name: string;
  type: 'script' | 'character' | 'moodboard' | 'storyboard' | 'audio' | 'miscellaneous' | 'folder';
  url: string;
  created_at: string;
  episode_number?: number; // For script type (which are episodes)
  version_number?: number; // For script versions
  content?: string; // For script versions
  uploader_id?: string;
  folder_id?: string; // For nested folders in miscellaneous
}

export interface Character {
  id: string;
  project_id: string;
  name: string;
  age_group: 'Kid' | 'Adult' | 'Senior';
  created_at: string;
  images: Asset[];
}
