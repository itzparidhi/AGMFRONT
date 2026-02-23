import React, { useRef, useEffect, useState, useCallback } from 'react';
import { X, Save, Undo, Redo, PenTool, FilePlus, Eraser, Type } from 'lucide-react';

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
    const canvasRef = useRef<HTMLCanvasElement>(null); // Drawing layer
    const bgCanvasRef = useRef<HTMLCanvasElement>(null); // Background layer
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [color, setColor] = useState('#ef4444'); // Red default
    const [lineWidth, setLineWidth] = useState(3);
    const [tool, setTool] = useState<'pen' | 'eraser' | 'text'>('pen');

    // Text state
    const [textInput, setTextInput] = useState<{ 
        x: number, 
        y: number, 
        width: number, 
        height: number, 
        text: string, 
        active: boolean,
        isDragging: boolean
    }>({
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        text: '',
        active: false,
        isDragging: false
    });
    const textInputRef = useRef<HTMLTextAreaElement>(null);

    // History Management (stores ImageData of the Drawing layer only)
    const [history, setHistory] = useState<ImageData[]>([]);
    const [historyStep, setHistoryStep] = useState(0);
    const [imageLoaded, setImageLoaded] = useState(false);

    // Initialize canvas with image
    useEffect(() => {
        if (isOpen) {
            if (imageUrl) {
                loadImage(imageUrl);
            } else {
                initBlankCanvas();
            }
        } else {
            setImageLoaded(false);
            setHistory([]);
            setHistoryStep(0);
            setTool('pen');
            setTextInput({ x: 0, y: 0, width: 0, height: 0, text: '', active: false, isDragging: false });
        }
    }, [isOpen, imageUrl]);

    useEffect(() => {
        if (textInput.active && textInputRef.current) {
            textInputRef.current.focus();
        }
    }, [textInput.active]);

    const loadImage = (url: string) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = url;
        img.onload = () => {
            if (canvasRef.current && bgCanvasRef.current && containerRef.current) {
                const canvas = canvasRef.current;
                const bgCanvas = bgCanvasRef.current;
                const container = containerRef.current;

                const maxWidth = container.clientWidth - 40;
                const maxHeight = container.clientHeight - 180;

                let width = img.width;
                let height = img.height;

                const ratio = Math.min(maxWidth / width, maxHeight / height);

                // Set internal resolution
                canvas.width = width;
                canvas.height = height;
                bgCanvas.width = width;
                bgCanvas.height = height;

                // Sync display sizes
                const displayWidth = `${width * ratio}px`;
                const displayHeight = `${height * ratio}px`;
                canvas.style.width = displayWidth;
                canvas.style.height = displayHeight;
                bgCanvas.style.width = displayWidth;
                bgCanvas.style.height = displayHeight;

                const bgCtx = bgCanvas.getContext('2d');
                if (bgCtx) {
                    bgCtx.drawImage(img, 0, 0);
                }

                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.clearRect(0, 0, width, height);
                    saveInitialState(ctx, width, height);
                    setImageLoaded(true);
                }
            }
        };
    };

    const initBlankCanvas = () => {
        if (canvasRef.current && bgCanvasRef.current && containerRef.current) {
            const canvas = canvasRef.current;
            const bgCanvas = bgCanvasRef.current;
            const container = containerRef.current;

            const width = 1920;
            const height = 1080;

            const maxWidth = container.clientWidth - 40;
            const maxHeight = container.clientHeight - 180;
            const ratio = Math.min(maxWidth / width, maxHeight / height);

            canvas.width = width;
            canvas.height = height;
            bgCanvas.width = width;
            bgCanvas.height = height;

            const displayWidth = `${width * ratio}px`;
            const displayHeight = `${height * ratio}px`;
            canvas.style.width = displayWidth;
            canvas.style.height = displayHeight;
            bgCanvas.style.width = displayWidth;
            bgCanvas.style.height = displayHeight;

            const bgCtx = bgCanvas.getContext('2d');
            if (bgCtx) {
                bgCtx.fillStyle = '#ffffff';
                bgCtx.fillRect(0, 0, width, height);
            }

            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.clearRect(0, 0, width, height);
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

        const clientX = 'touches' in e ? (e as React.TouchEvent).touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? (e as React.TouchEvent).touches[0].clientY : (e as React.MouseEvent).clientY;

        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY,
            clientX,
            clientY
        };
    };

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        if (!imageLoaded) return;
        
        const coords = getCoordinates(e);
        const { x, y } = coords;

        if (tool === 'text') {
            if (textInput.active) {
                commitText();
            }
            setTextInput({
                x,
                y,
                width: 0,
                height: 0,
                text: '',
                active: false,
                isDragging: true
            });
            return;
        }

        setIsDrawing(true);
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx) {
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.lineWidth = lineWidth;
            
            if (tool === 'eraser') {
                ctx.globalCompositeOperation = 'destination-out';
            } else {
                ctx.globalCompositeOperation = 'source-over';
                ctx.strokeStyle = color;
            }
        }
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!imageLoaded) return;
        
        const { x, y } = getCoordinates(e);

        if (tool === 'text' && textInput.isDragging) {
            setTextInput(prev => ({
                ...prev,
                width: x - prev.x,
                height: y - prev.y
            }));
            return;
        }

        if (!isDrawing) return;
        e.preventDefault();

        const ctx = canvasRef.current?.getContext('2d');
        if (ctx) {
            ctx.lineTo(x, y);
            ctx.stroke();
        }
    };

    const stopDrawing = () => {
        if (tool === 'text' && textInput.isDragging) {
            // Check if it's a click or a small drag
            const minSize = 5;
            if (Math.abs(textInput.width) < minSize && Math.abs(textInput.height) < minSize) {
                // If it's just a click, create a default size box
                setTextInput(prev => ({
                    ...prev,
                    width: 200,
                    height: 100,
                    isDragging: false,
                    active: true
                }));
            } else {
                setTextInput(prev => ({
                    ...prev,
                    isDragging: false,
                    active: true
                }));
            }
            return;
        }

        if (isDrawing) {
            setIsDrawing(false);
            const ctx = canvasRef.current?.getContext('2d');
            ctx?.closePath();
            saveState();
        }
    };

    const saveState = useCallback(() => {
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                const newState = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const newHistory = history.slice(0, historyStep + 1);
                newHistory.push(newState);
                setHistory(newHistory);
                setHistoryStep(newHistory.length - 1);
            }
        }
    }, [history, historyStep]);

    const handleUndo = () => {
        if (historyStep <= 0) return;
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

    const calculateFontSize = (text: string, boxWidth: number, boxHeight: number) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return 14;

        const minFontSize = 10;
        const maxFontSize = 500;
        
        const lines = text.split('\n');
        const padding = 20; // Increased safety margin
        const targetWidth = Math.abs(boxWidth) - padding;
        const targetHeight = Math.abs(boxHeight) - padding;

        const checkFits = (size: number) => {
            ctx.font = `${size}px Arial`;
            const totalHeight = lines.length * size * 1.1; // Balanced line height
            if (totalHeight > targetHeight) return false;

            for (const line of lines) {
                if (ctx.measureText(line).width > targetWidth) return false;
            }
            return true;
        };

        // Binary search for optimal font size
        let low = minFontSize;
        let high = maxFontSize;
        let result = minFontSize;

        while (low <= high) {
            let mid = Math.floor((low + high) / 2);
            if (checkFits(mid)) {
                result = mid;
                low = mid + 1;
            } else {
                high = mid - 1;
            }
        }

        return Math.min(result, (Math.abs(boxHeight) - 10) / Math.max(1, lines.length));
    };

    const commitText = () => {
        if (!textInput.text.trim()) {
            setTextInput({ ...textInput, active: false });
            return;
        }

        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (ctx) {
            ctx.globalCompositeOperation = 'source-over';
            
            const boxWidth = Math.abs(textInput.width);
            const boxHeight = Math.abs(textInput.height);
            const startX = textInput.width < 0 ? textInput.x + textInput.width : textInput.x;
            const startY = textInput.height < 0 ? textInput.y + textInput.height : textInput.y;

            const fontSize = calculateFontSize(textInput.text, boxWidth, boxHeight);
            ctx.font = `${fontSize}px Arial`;
            ctx.fillStyle = color;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            const lines = textInput.text.split('\n');
            const lineHeight = fontSize * 1.1;
            const totalTextHeight = lines.length * lineHeight;
            
            // Calculate starting Y for vertical centering
            const centerY = startY + (boxHeight / 2) - (totalTextHeight / 2) + (lineHeight / 2);
            const centerX = startX + (boxWidth / 2);
            
            lines.forEach((line, index) => {
                ctx.fillText(line, centerX, centerY + (index * lineHeight));
            });
            
            saveState();
        }
        setTextInput({ ...textInput, text: '', active: false });
    };

    const handleSave = () => {
        // If there's an active text input, commit it first
        if (textInput.active) {
            commitText();
        }
        
        const canvas = canvasRef.current;
        const bgCanvas = bgCanvasRef.current;
        if (canvas && bgCanvas) {
            // Create a temporary canvas to merge layers
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = canvas.width;
            tempCanvas.height = canvas.height;
            const tempCtx = tempCanvas.getContext('2d');
            if (tempCtx) {
                tempCtx.drawImage(bgCanvas, 0, 0);
                tempCtx.drawImage(canvas, 0, 0);
                
                tempCanvas.toBlob((blob) => {
                    if (blob) {
                        const file = new File([blob], "annotation.png", { type: "image/png" });
                        onSave(file);
                        onClose();
                    }
                }, 'image/png');
            }
        }
    };

    if (!isOpen) return null;

    // Helper to get relative style for overlay elements
    const getCanvasRelativeStyle = (x: number, y: number, w: number, h: number) => {
        if (!canvasRef.current) return {};
        const rect = canvasRef.current.getBoundingClientRect();
        const scaleX = rect.width / canvasRef.current.width;
        const scaleY = rect.height / canvasRef.current.height;

        return {
            left: (w < 0 ? x + w : x) * scaleX,
            top: (h < 0 ? y + h : y) * scaleY,
            width: Math.abs(w) * scaleX,
            height: Math.abs(h) * scaleY,
        };
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div
                ref={containerRef}
                className="relative bg-zinc-900 border border-zinc-700 rounded-xl w-full h-full max-w-6xl max-h-[95vh] flex flex-col shadow-2xl text-zinc-100"
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
                            className={`p-2 rounded transition-colors ${tool === 'pen' ? 'bg-blue-900/50 text-blue-300' : 'text-zinc-400 hover:text-zinc-100'}`}
                            title="Pen"
                        >
                            <PenTool size={20} />
                        </button>
                        <button
                            onClick={() => setTool('eraser')}
                            className={`p-2 rounded transition-colors ${tool === 'eraser' ? 'bg-blue-900/50 text-blue-300' : 'text-zinc-400 hover:text-zinc-100'}`}
                            title="Eraser"
                        >
                            <Eraser size={20} />
                        </button>
                        <button
                            onClick={() => setTool('text')}
                            className={`p-2 rounded transition-colors ${tool === 'text' ? 'bg-blue-900/50 text-blue-300' : 'text-zinc-400 hover:text-zinc-100'}`}
                            title="Text"
                        >
                            <Type size={20} />
                        </button>
                    </div>

                    {/* Colors */}
                    <div className="flex gap-3 items-center bg-zinc-800 px-4 py-2 rounded-lg border border-zinc-700 shadow-sm">
                        {['#ef4444', '#22c55e', '#3b82f6', '#eab308', '#000000', '#ffffff'].map((c) => (
                            <button
                                key={c}
                                onClick={() => setColor(c)}
                                className={`w-6 h-6 rounded-full border shadow-sm transition-transform ${color === c ? 'border-zinc-100 ring-2 ring-blue-400 ring-offset-2 scale-110' : 'border-zinc-600 hover:scale-110'}`}
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
                            max="50"
                            value={lineWidth}
                            onChange={(e) => setLineWidth(parseInt(e.target.value))}
                            className="w-32 h-1.5 bg-zinc-600 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                        <span className="text-xs font-mono text-zinc-400 w-4">{lineWidth}</span>
                    </div>
                </div>

                {/* Canvas Area */}
                <div className="flex-1 overflow-hidden bg-zinc-950 flex items-center justify-center p-8 relative">
                    {!imageLoaded && <div className="text-zinc-500 font-medium animate-pulse">Loading canvas...</div>}
                    
                    <div className="relative shadow-2xl overflow-hidden" style={{ touchAction: 'none' }}>
                        {/* Layer 1: Background Image */}
                        <canvas
                            ref={bgCanvasRef}
                            className="bg-white"
                            style={{ display: 'block' }}
                        />
                        
                        {/* Layer 2: Drawing Layer */}
                        <canvas
                            ref={canvasRef}
                            onMouseDown={startDrawing}
                            onMouseMove={draw}
                            onMouseUp={stopDrawing}
                            onMouseLeave={stopDrawing}
                            onTouchStart={startDrawing}
                            onTouchMove={draw}
                            onTouchEnd={stopDrawing}
                            className="absolute top-0 left-0 cursor-crosshair"
                            style={{ display: 'block' }}
                        />

                        {/* Text Input Overlay */}
                        {(textInput.active || textInput.isDragging) && (
                            <div 
                                className={`absolute pointer-events-none z-20 flex items-center justify-center overflow-hidden`}
                                style={{
                                    ...getCanvasRelativeStyle(textInput.x, textInput.y, textInput.width, textInput.height),
                                    outline: textInput.isDragging ? '2px dashed #3b82f6' : 'none',
                                    backgroundColor: textInput.isDragging ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                                    border: textInput.isDragging ? '1px solid #3b82f6' : 'none'
                                }}
                            >
                                {textInput.active && (
                                    <textarea
                                        ref={textInputRef}
                                        value={textInput.text}
                                        onChange={(e) => setTextInput({ ...textInput, text: e.target.value })}
                                        onBlur={commitText}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                                                commitText();
                                            }
                                        }}
                                        className="w-full bg-transparent text-white p-0 outline-none pointer-events-auto resize-none text-center"
                                        placeholder="type here"
                                        style={{ 
                                            color: color,
                                            fontSize: `${calculateFontSize(textInput.text || 'type here', textInput.width, textInput.height) * (canvasRef.current?.getBoundingClientRect().width || 1) / (canvasRef.current?.width || 1)}px`,
                                            lineHeight: '1.1',
                                            overflow: 'hidden',
                                            fontFamily: 'Arial',
                                            height: `${(textInput.text || 'type here').split('\n').length * calculateFontSize(textInput.text || 'type here', textInput.width, textInput.height) * 1.1 * (canvasRef.current?.getBoundingClientRect().width || 1) / (canvasRef.current?.width || 1)}px`
                                        }}
                                    />
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
