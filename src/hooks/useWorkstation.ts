import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import type { Shot, Version, Review } from '../types';
import { useAuth } from '../context/AuthContext';

import { useDialog } from '../context/DialogContext';
import { uploadAsset } from '../api';

export const useWorkstation = () => {
  const { shotId } = useParams<{ shotId: string }>();
  const { userProfile } = useAuth();
  const dialog = useDialog();

  const [shot, setShot] = useState<Shot | null>(null);
  const [versions, setVersions] = useState<Version[]>([]);
  const [activeVersion, setActiveVersion] = useState<Version | null>(null);
  const [review, setReview] = useState<Review | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadingRefs, setUploadingRefs] = useState<{
    storyboard: boolean;
    style: boolean;
  }>({ storyboard: false, style: false });

  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);

  const pmCommentRef = useRef<HTMLTextAreaElement>(null);
  const cdCommentRef = useRef<HTMLTextAreaElement>(null);

  // 1. Fetch Data on Mount or Shot Change
  useEffect(() => {
    if (shotId) {
      fetchShotData();
    }
  }, [shotId]);

  // 2. Handle Realtime Updates for Reviews
  useEffect(() => {
    if (!shotId) return;

    const subscription = supabase
      .channel('public:reviews')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reviews' }, (payload) => {
        if (activeVersion && payload.new && (payload.new as Review).version_id === activeVersion.id) {
          setReview(payload.new as Review);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(subscription); };
  }, [shotId, activeVersion?.id]);

  const fetchShotData = async () => {
    if (!shotId) return;

    // Fetch Shot
    const { data: shotData } = await supabase.from('shots').select('*').eq('id', shotId).single();
    setShot(shotData);

    // Fetch All Versions
    const { data: allVersions } = await supabase
      .from('versions')
      .select('*, users(email)')
      .eq('shot_id', shotId)
      .order('version_number', { ascending: false });

    if (allVersions) {
      // @ts-ignore - Supabase types might not automatically infer the joined 'users' property correctly without full generation
      setVersions(allVersions);
      // Default to active version, or latest if none active
      const active = allVersions.find(v => v.is_active) || allVersions[0];
      setActiveVersion(active || null);

      if (active) {
        fetchReview(active.id);
      }
    }
  };

  const fetchReview = async (versionId: string) => {
    const { data: reviewData } = await supabase
      .from('reviews')
      .select('*')
      .eq('version_id', versionId)
      .single();
    setReview(reviewData);
  };

  const handleReferenceUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'storyboard' | 'style') => {
    if (!e.target.files || !e.target.files[0] || !shot) return;
    setUploadingRefs(prev => ({ ...prev, [type]: true }));

    const file = e.target.files[0];

    try {
      await uploadAsset({
        file,
        folder_id: shot.gdrive_folder_id,
        db_id: shot.id,
        uploader_id: userProfile!.id,
        reference_type: type,
      });

      // Refresh
      fetchShotData();
    } catch (err) {
      console.error(`${type} upload failed:`, err);
      dialog.alert('Error', `${type} upload failed`, 'danger');
    } finally {
      setUploadingRefs(prev => ({ ...prev, [type]: false }));
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, mediaType?: 'image' | 'video' | 'dub') => {
    if (!e.target.files || !e.target.files[0] || !shot || !userProfile) return;

    const file = e.target.files[0];

    setUploadStatus('uploading');
    setUploadProgress(0);
    setUploading(true);

    try {
      await uploadAsset({
        file,
        folder_id: shot.gdrive_folder_id,
        db_id: shot.id,
        uploader_id: userProfile.id,
        is_storyboard: false,
        asset_type: mediaType // Pass media type (e.g., 'dub', 'video', 'image')
      }, (progressEvent) => {
        const total = progressEvent.total || progressEvent.loaded;
        const percentCompleted = Math.round((progressEvent.loaded * 100) / total);
        setUploadProgress(percentCompleted);
      });


      setUploadStatus('success');
      fetchShotData();
      notifyReviewers();

      setTimeout(() => {
        setUploadStatus('idle');
        setUploadProgress(null);
      }, 3000);

    } catch (err) {
      console.error('Upload failed:', err);
      setUploadStatus('error');
    } finally {
      setUploading(false);
    }
  };

  const handleVote = async (type: 'pm' | 'cd', vote: boolean) => {
    if (!review || !activeVersion || !shot) return;
    const update = type === 'pm'
      ? { pm_vote: vote, pm_voted_at: new Date().toISOString() }
      : { cd_vote: vote, cd_voted_at: new Date().toISOString() };

    await supabase.from('reviews').update(update).eq('id', review.id);

    // Note: Drive sync has been moved to Master CD approval flow
    // The version will be synced to Drive only when Master CD approves in MasterView

    notifyPE('feedback');
  };

  const handleCommentSave = async (type: 'pm' | 'cd', files?: File[], annotationFiles?: File[]) => {
    if (!review || !userProfile || !shot) return;

    const comment = type === 'pm'
      ? pmCommentRef.current?.value
      : cdCommentRef.current?.value;

    const imageUrls: string[] = [];
    const annotationUrls: string[] = [];

    setUploading(true);
    try {
      // 1. Upload Regular Files
      if (files && files.length > 0) {
        for (const file of files) {
          const fileExt = file.name.split('.').pop();
          const fileName = `review_${type}_${review.id}_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
          const filePath = `${shot.id}/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('assets')
            .upload(filePath, file);

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('assets')
            .getPublicUrl(filePath);

          imageUrls.push(publicUrl);
        }
      }

      // 2. Upload Annotation Files
      if (annotationFiles && annotationFiles.length > 0) {
        for (const file of annotationFiles) {
          const fileExt = file.name.split('.').pop() || 'png';
          const fileName = `review_${type}_anno_${review.id}_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
          const filePath = `${shot.id}/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('assets')
            .upload(filePath, file);

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('assets')
            .getPublicUrl(filePath);

          annotationUrls.push(publicUrl);
        }
      }
    } catch (err) {
      console.error('Review image upload failed:', err);
      dialog.alert('Warning', 'Failed to upload image(s), saving text only.', 'warning');
    } finally {
      setUploading(false);
    }

    const update: any = type === 'pm'
      ? { pm_comment: comment }
      : { cd_comment: comment };

    if (imageUrls.length > 0) {
      if (type === 'pm') {
        update.pm_image_urls = imageUrls;
        update.pm_image_url = imageUrls[0]; // Backward compatibility
      } else {
        update.cd_image_urls = imageUrls;
        update.cd_image_url = imageUrls[0]; // Backward compatibility
      }
    }

    if (annotationUrls.length > 0) {
      if (type === 'pm') {
        update.pm_annotation_urls = annotationUrls;
        update.pm_annotation_url = annotationUrls[0]; // Backward compatibility
      } else {
        update.cd_annotation_urls = annotationUrls;
        update.cd_annotation_url = annotationUrls[0]; // Backward compatibility
      }
    }

    const { error } = await supabase.from('reviews').update(update).eq('id', review.id);

    if (error) {
      console.error('Error saving comment:', error);
      dialog.alert('Error', 'Failed to save comment', 'danger');
    } else {
      dialog.alert('Success', 'Review saved!', 'success');
      notifyPE('review');
    }
  };

  const notifyPE = async (action: string) => {
    if (!shot || !userProfile || !shot.assigned_pe_id) return;
    if (shot.assigned_pe_id === userProfile.id) return;

    const { data: sceneData } = await supabase.from('scenes').select('name, project_id').eq('id', shot.scene_id).single();
    if (!sceneData) return;

    const { data: projectData } = await supabase.from('projects').select('name').eq('id', sceneData.project_id).single();
    if (!projectData) return;

    const message = `${userProfile.email} has added a ${action} on your ${projectData.name}/${sceneData.name}/${shot.name}`;

    await supabase.from('notifications').insert({
      user_id: shot.assigned_pe_id,
      message: message,
      link: `/shot/${shot.id}`
    });
  };

  const notifyReviewers = async () => {
    if (!shot || !userProfile) return;

    const { data: sceneData } = await supabase.from('scenes').select('name, project_id').eq('id', shot.scene_id).single();
    if (!sceneData) return;

    const { data: projectData } = await supabase.from('projects').select('name, assigned_pm_id').eq('id', sceneData.project_id).single();
    if (!projectData) return;

    const message = `${userProfile.email} has added a version on ${projectData.name}/${sceneData.name}/${shot.name}`;

    // Notify PM
    if (projectData.assigned_pm_id && projectData.assigned_pm_id !== userProfile.id) {
      await supabase.from('notifications').insert({
        user_id: projectData.assigned_pm_id,
        message: message,
        link: `/shot/${shot.id}`
      });
    }

    // Notify CDs (All CDs for now, as we don't track specific CD assignment per shot/project explicitly in a way that excludes others)
    const { data: cds } = await supabase.from('users').select('id').eq('role', 'CD');
    if (cds) {
      const notifications = cds
        .filter(cd => cd.id !== userProfile.id)
        .map(cd => ({
          user_id: cd.id,
          message: message,
          link: `/shot/${shot.id}`
        }));

      if (notifications.length > 0) {
        await supabase.from('notifications').insert(notifications);
      }
    }
  };

  const canUploadVersion = () => {
    if (!userProfile || !shot) return false;
    if (userProfile.role === 'CD' || userProfile.role === 'PM') return true;
    if (userProfile.role === 'PE' && shot.assigned_pe_id === userProfile.id) return true;
    return false;
  };

  const handleGenerateBackgroundGrid = async (file: File, context: string, aspectRatio: string) => {
    if (!shot || !userProfile) throw new Error("No shot or user");

    // Dynamic import to avoid circular dependency if any, though likely safe
    const { generateBackgroundGrid } = await import('../api');

    setUploading(true);
    try {
      const result = await generateBackgroundGrid({
        background_image: file,
        context,
        shot_id: shot.id,
        user_email: userProfile.email,
        aspect_ratio: aspectRatio
      });
      return result.urls; // Returns string[]
    } catch (e) {
      console.error("Background Grid Gen Error:", e);
      throw e;
    } finally {
      setUploading(false);
    }
  };

  const saveBackgroundReferences = async (urls: string[]) => {
    if (!shot) return;
    // Get current array or empty
    const current = shot.background_urls || [];

    // Filter out duplicates
    const toAdd = urls.filter(url => !current.includes(url));
    if (toAdd.length === 0) return;

    const newUrls = [...current, ...toAdd];

    const { error } = await supabase.from('shots').update({
      background_urls: newUrls
    }).eq('id', shot.id);

    if (error) {
      console.error("Failed to save background refs:", error);
      throw error;
    }
    // Refresh shot data
    fetchShotData();
  };

  return {
    shot,
    versions,
    activeVersion,
    setActiveVersion,
    fetchReview,
    review,
    uploading,
    uploadingRefs,
    fullScreenImage,
    setFullScreenImage,
    zoomLevel,
    setZoomLevel,
    pmCommentRef,
    cdCommentRef,
    handleReferenceUpload,
    handleUpload,
    handleVote,
    handleCommentSave,
    canUploadVersion,
    userProfile,
    uploadProgress,
    uploadStatus,
    setUploadStatus,
    setUploadingRefs,
    handleGenerateBackgroundGrid,
    saveBackgroundReferences
  };
};
