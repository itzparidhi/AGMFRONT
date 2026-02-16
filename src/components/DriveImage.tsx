import React, { useState, useEffect } from 'react';
import { getDirectDriveLink, getLowResLink, getExportViewLink } from '../utils/drive';
import { ImageOff, Loader2 } from 'lucide-react';

interface DriveImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src?: string | null;
  imageClassName?: string;
}

export const DriveImage: React.FC<DriveImageProps> = ({ src, alt, className, imageClassName, onClick, ...props }) => {
  const [currentSrc, setCurrentSrc] = useState<string>(getDirectDriveLink(src || ''));
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (src) {
      const newSrc = getDirectDriveLink(src);
      setCurrentSrc(newSrc);
      if (newSrc) {
        setStatus('loading');
      } else {
        setStatus('error');
      }
      setRetryCount(0);
    } else {
      setStatus('error');
    }
  }, [src]);

  const handleError = () => {
    if (retryCount === 0 && src) {
      // First failure: Try low-res
      console.warn(`High-res image failed for ${src}, falling back to low-res.`);
      setCurrentSrc(getLowResLink(src));
      setRetryCount(1);
    } else if (retryCount === 1 && src) {
      // Second failure: Try export=view (handles 429s better sometimes)
      console.warn(`Low-res image failed for ${src}, falling back to export view.`);
      setCurrentSrc(getExportViewLink(src));
      setRetryCount(2);
    } else {
      // Final failure: Give up
      setStatus('error');
    }
  };

  const handleLoad = () => {
    setStatus('loaded');
  };

  if (!src || status === 'error') {
    return (
      <div className={`${className} bg-zinc-800 flex flex-col items-center justify-center text-zinc-600 border border-zinc-700`}>
        <ImageOff size={24} className="mb-2" />
        <span className="text-xs">Image Failed</span>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {status === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/50 z-10">
          <Loader2 className="w-6 h-6 text-white animate-spin" />
        </div>
      )}
      <img
        src={currentSrc}
        alt={alt}
        className={`w-full h-full ${imageClassName || 'object-contain'} transition-opacity duration-300 ${status === 'loaded' ? 'opacity-100' : 'opacity-0'}`}
        onError={handleError}
        onLoad={handleLoad}
        onClick={onClick}
        referrerPolicy="no-referrer"
        {...props}
      />
    </div>
  );
};
