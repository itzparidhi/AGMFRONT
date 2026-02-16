import React from 'react';
import { Maximize } from 'lucide-react';
import { DriveImage } from './DriveImage';

interface ReferenceThumbnailProps {
  title: string;
  url: string | null;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isUploading: boolean;
  canUpload: boolean;
  onExpand: (url: string) => void;
}

export const ReferenceThumbnail: React.FC<ReferenceThumbnailProps> = ({ 
  title, 
  url, 
  onUpload, 
  isUploading, 
  canUpload,
  onExpand
}) => (
  <div className="mb-4">
    <div className="flex justify-between items-center mb-2">
      <h3 className="text-sm font-bold text-zinc-400">{title}</h3>
      {canUpload && (
        <label className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2 py-1 rounded cursor-pointer border border-zinc-600">
          {isUploading ? '...' : 'Upload'}
          <input 
            type="file" 
            className="hidden" 
            onChange={onUpload} 
            disabled={isUploading} 
            accept="image/*" 
          />
        </label>
      )}
    </div>
    {url ? (
      <div 
        className="h-24 bg-zinc-800 rounded border border-zinc-700 overflow-hidden cursor-pointer hover:border-zinc-500 transition-colors relative group"
        onClick={() => onExpand(url)}
      >
        <DriveImage src={url} alt={title} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
          <Maximize size={16} className="text-white drop-shadow-md" />
        </div>
      </div>
    ) : (
      <div className="h-24 flex items-center justify-center bg-zinc-800 rounded border border-zinc-700 border-dashed text-zinc-600 text-xs">
        No {title}
      </div>
    )}
  </div>
);
