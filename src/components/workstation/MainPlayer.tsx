import React from 'react';
import { Maximize } from 'lucide-react';
import { DriveImage } from '../DriveImage';
import type { Generation, Version } from '../../types';

interface MainPlayerProps {
    selectedGeneration: Generation | null;
    activeVersion: Version | null;
    setFullScreenImage: (url: string | null) => void;
    setZoomLevel: (level: number) => void;
}

export const MainPlayer: React.FC<MainPlayerProps> = ({
    selectedGeneration,
    activeVersion,
    setFullScreenImage,
    setZoomLevel,
}) => {
    const handleFullScreen = (url: string | null) => {
        if (url) {
            setFullScreenImage(url);
            setZoomLevel(1);
        }
    };

    return (
        <div className="flex-1 flex items-center justify-center bg-black rounded overflow-hidden relative border border-zinc-800 group min-h-0">
            {selectedGeneration ? (
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
            ) : activeVersion ? (
                <>
                    <div
                        className="w-full h-full flex items-center justify-center cursor-zoom-in"
                        onClick={() => handleFullScreen(activeVersion.public_link || activeVersion.gdrive_link)}
                    >
                        <DriveImage
                            src={activeVersion.public_link || activeVersion.gdrive_link}
                            alt="Active Version"
                            className="w-full h-full"
                            imageClassName="object-contain"
                        />
                    </div>
                    <button
                        onClick={() => handleFullScreen(activeVersion.public_link || activeVersion.gdrive_link)}
                        className="absolute top-2 right-2 bg-black/50 hover:bg-black/80 text-white p-2 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        <Maximize size={20} />
                    </button>
                </>
            ) : (
                <p className="text-zinc-500">No version uploaded</p>
            )}
        </div>
    );
};
