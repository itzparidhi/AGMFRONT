import React, { useState, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';

interface ImageViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  images: { url: string; prompt?: string }[];
  initialIndex: number;
}

export const ImageViewerModal: React.FC<ImageViewerModalProps> = ({ isOpen, onClose, images, initialIndex }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Update index when initialIndex changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
      resetZoom();
    }
  }, [isOpen, initialIndex]);

  // Reset zoom when image changes
  useEffect(() => {
    resetZoom();
  }, [currentIndex]);

  const resetZoom = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleNext = () => {
    if (currentIndex < images.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  // Wheel listener for navigation
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      // If modal is not open, do nothing
      if (!isOpen) return;

      // If zoomed in, allow default behavior (maybe browser scroll?) or block? 
      // User asked: "when i scroll down/up the next and previous images are displayed"
      // Assuming this applies globally.

      // However, if we support zoom, usually wheel implies zoom.
      // But adhering to the specific request: Scroll = Next/Prev

      // Prevent default page scroll
      e.preventDefault();

      // Debounce logic could be added here, but simple check is okay for now
      // Use a small timeout to prevent rapid firing? 
      // React state updates might handle it, but raw wheel events are fast.

      // Checking for zoom state: if zoomed in, maybe we shouldn't switch images?
      // "when i scroll down/up the next and previous images are displayed properly zoomed in" 
      // -> This phrasing "displayed properly zoomed in" suggests the NEXT image might retain zoom? 
      // Or just that the "popup" allows them to be clicked.
      // Let's assume navigating resets zoom for now, as keeping pan position on a new image is weird.

      if (e.deltaY > 0) {
        // Scroll Down -> Next
        if (currentIndex < images.length - 1) setCurrentIndex(c => c + 1);
      } else {
        // Scroll Up -> Prev
        if (currentIndex > 0) setCurrentIndex(c => c - 1);
      }
    };

    if (isOpen) {
      window.addEventListener('wheel', handleWheel, { passive: false });
    }

    return () => {
      window.removeEventListener('wheel', handleWheel);
    };
  }, [isOpen, currentIndex, images.length]); // Dependencies needed to capture current state

  // Dragging logic
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      e.preventDefault();
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoomIn = (e: React.MouseEvent) => {
    e.stopPropagation();
    setScale(s => Math.min(s + 0.5, 4));
  };
  const handleZoomOut = (e: React.MouseEvent) => {
    e.stopPropagation();
    setScale(s => Math.max(s - 0.5, 1));
    if (scale <= 1.5) setPosition({ x: 0, y: 0 }); // Reset pos if zooming out to 1
  };

  if (!isOpen) return null;

  const currentImage = images[currentIndex];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start z-50 pointer-events-none">
        <div className="pointer-events-auto bg-black/50 px-3 py-1 rounded text-white text-sm">
          {currentIndex + 1} / {images.length}
        </div>
        <div className="flex space-x-2 pointer-events-auto">
          <button onClick={handleZoomIn} className="p-2 bg-zinc-800 text-white rounded-full hover:bg-zinc-700 transition-colors" title="Zoom In">
            <ZoomIn size={20} />
          </button>
          <button onClick={handleZoomOut} className="p-2 bg-zinc-800 text-white rounded-full hover:bg-zinc-700 transition-colors" title="Zoom Out">
            <ZoomOut size={20} />
          </button>
          <button onClick={resetZoom} className="p-2 bg-zinc-800 text-white rounded-full hover:bg-zinc-700 transition-colors" title="Reset">
            <RotateCcw size={20} />
          </button>
          <button onClick={onClose} className="p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors" title="Close">
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Navigation Arrows */}
      <button
        onClick={handlePrev}
        className={`absolute left-4 p-2 bg-black/50 rounded-full text-white hover:bg-zinc-700 transition-all z-50 ${currentIndex === 0 ? 'opacity-30 cursor-not-allowed' : 'opacity-100 hover:scale-110'}`}
        disabled={currentIndex === 0}
      >
        <ChevronLeft size={32} />
      </button>

      <button
        onClick={handleNext}
        className={`absolute right-4 p-2 bg-black/50 rounded-full text-white hover:bg-zinc-700 transition-all z-50 ${currentIndex === images.length - 1 ? 'opacity-30 cursor-not-allowed' : 'opacity-100 hover:scale-110'}`}
        disabled={currentIndex === images.length - 1}
      >
        <ChevronRight size={32} />
      </button>

      {/* Image Container */}
      <div
        className="relative w-full h-full flex items-center justify-center overflow-hidden"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        style={{ cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
      >
        {currentImage && (
          <img
            src={currentImage.url}
            alt={currentImage.prompt || 'Generated Image'}
            className="max-w-full max-h-full object-contain transition-transform duration-100 ease-out select-none"
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`
            }}
          />
        )}
      </div>

      {/* Prompt Caption (Optional) */}
      {currentImage?.prompt && (
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-black/70 px-6 py-3 rounded-xl text-white text-sm max-w-2xl text-center z-50 pointer-events-none">
          {currentImage.prompt}
        </div>
      )}
    </div>
  );
};
