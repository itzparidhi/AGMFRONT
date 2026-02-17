import React, { useRef } from 'react';
import { Maximize, Film } from 'lucide-react';
import { DriveImage } from '../DriveImage';
import type { Generation, Version } from '../../types';

interface MainPlayerProps {
    selectedGeneration: Generation | null;
    activeVersion: Version | null;
    setFullScreenImage: (url: string | null) => void;
    setZoomLevel: (level: number) => void;
    workstationMode: 'image' | 'video';
    onTimeUpdate?: (time: number) => void;
}

export const MainPlayer: React.FC<MainPlayerProps> = ({
    selectedGeneration,
    activeVersion,
    setFullScreenImage,
    setZoomLevel,
    workstationMode,
    onTimeUpdate,
}) => {
    const videoRef = useRef<HTMLVideoElement>(null);

    const handleFullScreen = (url: string | null) => {
        if (url) {
            setFullScreenImage(url);
            setZoomLevel(1);
        }
    };

    const isVideoMode = workstationMode === 'video';
    const versionUrl = activeVersion?.public_link || activeVersion?.gdrive_link;

    return (
        <div className="flex-1 flex items-center justify-center bg-black rounded overflow-hidden relative border border-zinc-800 group min-h-0">
            {/* Image mode: show generation or version image */}
            {!isVideoMode && selectedGeneration ? (
                <>
                    <div
                        className="w-full h-full flex items-center justify-center cursor-zoom-in"
                        onClick={() => handleFullScreen(selectedGeneration.image_url)}
                    >
                        <img
                            src={selectedGeneration.image_url}
                            alt="Selected Generation"
                            className="max-w-full max-h-full object-contain"
                        />
                    </div>
                    <button
                        onClick={() => handleFullScreen(selectedGeneration.image_url)}
                        className="absolute top-2 right-2 bg-black/50 hover:bg-black/80 text-white p-2 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        <Maximize size={20} />
                    </button>
                </>
            ) : !isVideoMode && activeVersion ? (
                <>
                    <div
                        className="w-full h-full flex items-center justify-center cursor-zoom-in"
                        onClick={() => handleFullScreen(versionUrl || null)}
                    >
                        <DriveImage
                            src={versionUrl}
                            alt="Active Version"
                            className="w-full h-full"
                            imageClassName="object-contain"
                        />
                    </div>
                    <button
                        onClick={() => handleFullScreen(versionUrl || null)}
                        className="absolute top-2 right-2 bg-black/50 hover:bg-black/80 text-white p-2 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        <Maximize size={20} />
                    </button>
                </>
            ) : isVideoMode && activeVersion && versionUrl ? (
                /* Video mode: show video player */
                <video
                    ref={videoRef}
                    src={versionUrl}
                    controls
                    className="max-w-full max-h-full object-contain"
                    style={{ width: '100%', height: '100%' }}
                    onTimeUpdate={(e) => onTimeUpdate?.(e.currentTarget.currentTime)}
                >
                    Your browser does not support the video tag.
                </video>
            ) : isVideoMode && !activeVersion ? (
                <div className="flex flex-col items-center gap-3 text-zinc-500">
                    <Film size={48} className="text-zinc-600" />
                    <p>No video version uploaded</p>
                </div>
            ) : (
                <p className="text-zinc-500">No version uploaded</p>
            )}
        </div>
    );
};
