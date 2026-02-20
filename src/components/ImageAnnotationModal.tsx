import React, { useRef, useEffect, useState } from 'react';
import { X, Save, Undo, Redo, PenTool, FilePlus } from 'lucide-react';

interface ImageAnnotationModalProps {
    isOpen: boolean;
    onClose: () => void;
    imageUrl: string;
    onSave: (file: File) => void;
}

export const ImageAnnotationModal: React.FC<ImageAnnotationModalProps> = ({
    isOpen,
    onClose,
    imageUrl,
    onSave,
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [color, setColor] = useState('#ef4444'); // Red default
    const [lineWidth, setLineWidth] = useState(3);
    const [tool, setTool] = useState<'pen' | 'eraser'>('pen');

    // History Management
    const [history, setHistory] = useState<ImageData[]>([]);
    const [historyStep, setHistoryStep] = useState(0);
    const [imageLoaded, setImageLoaded] = useState(false);

    // Initialize canvas with image
    useEffect(() => {
        if (isOpen) {
            if (imageUrl) {
                loadImage(imageUrl);
            } else {
                // If no image provided, start blank
                initBlankCanvas();
            }
        } else {
            setImageLoaded(false);
            setHistory([]);
            setHistoryStep(0);
        }
    }, [isOpen, imageUrl]);

    const loadImage = (url: string) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = url;
        img.onload = () => {
            if (canvasRef.current && containerRef.current) {
                const canvas = canvasRef.current;
                const container = containerRef.current;

                // Calculate aspect ratio fit
                const maxWidth = container.clientWidth - 40;
                const maxHeight = container.clientHeight - 100;

                let width = img.width;
                let height = img.height;

                const ratio = Math.min(maxWidth / width, maxHeight / height);

                canvas.width = width;
                canvas.height = height;

                // We display it scaled via CSS, but draw on full resolution
                canvas.style.width = `${width * ratio}px`;
                canvas.style.height = `${height * ratio}px`;

                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, 0, 0);

                    // Initial state
                    saveInitialState(ctx, width, height);
                    setImageLoaded(true);
                }
            }
        };
    };

    const initBlankCanvas = () => {
        if (canvasRef.current && containerRef.current) {
            const canvas = canvasRef.current;
            const container = containerRef.current;

            // Default blank size (e.g., HD or match container)
            const width = 1920;
            const height = 1080;

            const maxWidth = container.clientWidth - 40;
            const maxHeight = container.clientHeight - 100;
            const ratio = Math.min(maxWidth / width, maxHeight / height);

            canvas.width = width;
            canvas.height = height;
            canvas.style.width = `${width * ratio}px`;
            canvas.style.height = `${height * ratio}px`;

            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, width, height);
                saveInitialState(ctx, width, height);
                setImageLoaded(true);
            }
        }
    };

    const handleNewBlank = () => {
        if (confirm("Start a new blank canvas? Current progress will be lost.")) {
            initBlankCanvas();
        }
    };

    const saveInitialState = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
        const initialState = ctx.getImageData(0, 0, w, h);
        setHistory([initialState]);
        setHistoryStep(0);
    };

    const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
        if (!canvasRef.current) return { x: 0, y: 0 };

        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();

        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    };

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        if (!imageLoaded) return;
        setIsDrawing(true);
        const { x, y } = getCoordinates(e);

        const ctx = canvasRef.current?.getContext('2d');
        if (ctx) {
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color;
            if (tool === 'eraser') {
                // For blank canvas (white bg), painting white effectively erases
                ctx.strokeStyle = '#ffffff';
            }
            ctx.lineWidth = lineWidth;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
        }
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing || !imageLoaded) return;
        e.preventDefault(); // Prevent scrolling on touch

        const { x, y } = getCoordinates(e);
        const ctx = canvasRef.current?.getContext('2d');

        if (ctx) {
            ctx.lineTo(x, y);
            ctx.stroke();
        }
    };

    const stopDrawing = () => {
        if (isDrawing) {
            setIsDrawing(false);
            const ctx = canvasRef.current?.getContext('2d');
            ctx?.closePath();
            saveState();
        }
    };

    const saveState = () => {
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                const newState = ctx.getImageData(0, 0, canvas.width, canvas.height);

                // If we are in the middle of history, discard futures
                const newHistory = history.slice(0, historyStep + 1);

                // Limit history size (optional, keep last 20?)
                if (newHistory.length > 20) {
                    // newHistory.shift(); 
                }

                newHistory.push(newState);
                setHistory(newHistory);
                setHistoryStep(newHistory.length - 1);
            }
        }
    };

    const handleUndo = () => {
        if (historyStep <= 0) return; // Keep initial state

        const newStep = historyStep - 1;
        setHistoryStep(newStep);
        const previousState = history[newStep];

        const ctx = canvasRef.current?.getContext('2d');
        if (ctx && previousState) {
            ctx.putImageData(previousState, 0, 0);
        }
    };

    const handleRedo = () => {
        if (historyStep >= history.length - 1) return;

        const newStep = historyStep + 1;
        setHistoryStep(newStep);
        const nextState = history[newStep];

        const ctx = canvasRef.current?.getContext('2d');
        if (ctx && nextState) {
            ctx.putImageData(nextState, 0, 0);
        }
    };

    const handleSave = () => {
        const canvas = canvasRef.current;
        if (canvas) {
            canvas.toBlob((blob) => {
                if (blob) {
                    const file = new File([blob], "annotation.png", { type: "image/png" });
                    onSave(file);
                    onClose();
                }
            }, 'image/png');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div
                ref={containerRef}
                className="relative bg-zinc-900 border border-zinc-700 rounded-xl w-full h-full max-w-6xl max-h-[90vh] flex flex-col shadow-2xl text-zinc-100"
            >
                {/* Header */}
                <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900 rounded-t-xl z-10">
                    <h3 className="font-bold flex items-center gap-2 text-xl text-zinc-100">
                        <PenTool size={20} className="text-blue-500" />
                        Annotate Image
                    </h3>
                    <div className="flex gap-2 items-center">
                        <button
                            onClick={handleNewBlank}
                            className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg border border-zinc-600 text-sm font-medium mr-4 transition-colors"
                        >
                            <FilePlus size={16} />
                            New Blank Canvas
                        </button>

                        <div className="flex gap-1 bg-zinc-800 rounded-lg p-1 border border-zinc-700">
                            <button
                                onClick={handleUndo}
                                disabled={historyStep <= 0}
                                className="p-2 text-zinc-400 hover:text-zinc-100 disabled:opacity-30 transition-colors hover:bg-zinc-700 rounded"
                                title="Undo"
                            >
                                <Undo size={20} />
                            </button>
                            <button
                                onClick={handleRedo}
                                disabled={historyStep >= history.length - 1}
                                className="p-2 text-zinc-400 hover:text-zinc-100 disabled:opacity-30 transition-colors hover:bg-zinc-700 rounded"
                                title="Redo"
                            >
                                <Redo size={20} />
                            </button>
                        </div>

                        <div className="w-px h-6 bg-zinc-700 mx-3" />

                        <button
                            onClick={handleSave}
                            className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-sm transition-colors"
                        >
                            <Save size={18} /> Save
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 text-zinc-400 hover:text-red-500 transition-colors ml-2"
                        >
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="p-3 bg-zinc-900 border-b border-zinc-800 flex justify-center gap-8 items-center shadow-inner">
                    {/* Tools */}
                    <div className="flex bg-zinc-800 rounded-lg p-1 border border-zinc-700 shadow-sm">
                        <button
                            onClick={() => setTool('pen')}
                            className={`p-2 rounded ${tool === 'pen' ? 'bg-blue-900/50 text-blue-300' : 'text-zinc-400 hover:text-zinc-100'}`}
                            title="Pen"
                        >
                            <PenTool size={20} />
                        </button>
                    </div>

                    {/* Colors */}
                    <div className="flex gap-3 items-center bg-zinc-800 px-4 py-2 rounded-lg border border-zinc-700 shadow-sm">
                        {['#ef4444', '#22c55e', '#3b82f6', '#eab308', '#000000', '#ffffff'].map((c) => (
                            <button
                                key={c}
                                onClick={() => { setColor(c); setTool('pen'); }}
                                className={`w-6 h-6 rounded-full border shadow-sm ${color === c && tool === 'pen' ? 'border-zinc-400 ring-2 ring-blue-400 ring-offset-2' : 'border-zinc-600 hover:scale-110'}`}
                                style={{ backgroundColor: c }}
                                title={c}
                            />
                        ))}
                    </div>

                    {/* Size */}
                    <div className="flex items-center gap-3 bg-zinc-800 px-4 py-2 rounded-lg border border-zinc-700 shadow-sm">
                        <span className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Size</span>
                        <input
                            type="range"
                            min="1"
                            max="20"
                            value={lineWidth}
                            onChange={(e) => setLineWidth(parseInt(e.target.value))}
                            className="w-32 h-1.5 bg-zinc-600 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                        <span className="text-xs font-mono text-zinc-400 w-4">{lineWidth}</span>
                    </div>
                </div>

                {/* Canvas Area */}
                <div className="flex-1 overflow-auto bg-zinc-950 flex items-center justify-center p-8 cursor-crosshair relative">
                    {!imageLoaded && <div className="text-zinc-500 font-medium animate-pulse">Loading canvas...</div>}
                    <canvas
                        ref={canvasRef}
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onTouchStart={startDrawing}
                        onTouchMove={draw}
                        onTouchEnd={stopDrawing}
                        className="shadow-xl bg-white"
                        style={{ maxWidth: '100%', maxHeight: '100%', touchAction: 'none' }}
                    />
                </div>
            </div>
        </div>
    );
};
