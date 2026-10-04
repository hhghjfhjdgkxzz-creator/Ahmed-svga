import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  X, 
  Check, 
  Circle, 
  Square, 
  Sparkles, 
  RotateCcw, 
  ZoomIn,
  ZoomOut,
  Move,
  SunMedium,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight
} from 'lucide-react';
import { Language } from '../types';

export interface ImageShapeEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  lang: Language;
  onApply: (processedDataUrl: string) => void;
}

export type ImageShape = 'circle' | 'rounded' | 'square';

export const ImageShapeEditorModal: React.FC<ImageShapeEditorModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  lang,
  onApply
}) => {
  // Shape mode: Circle, Rounded corners, or Square
  const [shape, setShape] = useState<ImageShape>('circle');
  const [cornerRadius, setCornerRadius] = useState<number>(25); // % from 5 to 50
  const [opacity, setOpacity] = useState<number>(100); // 10 to 100%
  const [feather, setFeather] = useState<number>(11); // 0 to 40% soft edge fade
  const [zoom, setZoom] = useState<number>(1);
  const [offsetX, setOffsetX] = useState<number>(0);
  const [offsetY, setOffsetY] = useState<number>(0);
  const [previewBg, setPreviewBg] = useState<'dark' | 'checker' | 'black' | 'white'>('dark');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageObjRef = useRef<HTMLImageElement | null>(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const animFrameRef = useRef<number | null>(null);

  const renderCanvas = useCallback((targetCanvas?: HTMLCanvasElement, exportSize = 600): string => {
    const canvas = targetCanvas || canvasRef.current;
    const img = imageObjRef.current;
    if (!canvas || !img) return '';

    const size = exportSize;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.clearRect(0, 0, size, size);

    // Save state for clipping and alpha
    ctx.save();

    // 1. Define clipping shape with anti-aliasing
    ctx.beginPath();
    if (shape === 'circle') {
      const radius = size / 2;
      ctx.arc(radius, radius, radius - 0.5, 0, Math.PI * 2);
    } else if (shape === 'rounded') {
      const r = Math.max(8, (cornerRadius / 100) * (size / 2));
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(0, 0, size, size, r);
      } else {
        // Fallback for browsers without native roundRect
        ctx.moveTo(r, 0);
        ctx.lineTo(size - r, 0);
        ctx.quadraticCurveTo(size, 0, size, r);
        ctx.lineTo(size, size - r);
        ctx.quadraticCurveTo(size, size, size - r, size);
        ctx.lineTo(r, size);
        ctx.quadraticCurveTo(0, size, 0, size - r);
        ctx.lineTo(0, r);
        ctx.quadraticCurveTo(0, 0, r, 0);
      }
    } else {
      ctx.rect(0, 0, size, size);
    }
    ctx.closePath();
    ctx.clip();

    // 2. Apply opacity to the image itself
    ctx.globalAlpha = Math.max(0.05, Math.min(1, opacity / 100));

    // 3. Draw Image maintaining aspect ratio, zoom and pan
    const imgAspect = (img.naturalWidth || img.width) / (img.naturalHeight || img.height);
    let drawW = size * zoom;
    let drawH = size * zoom;
    if (imgAspect > 1) {
      drawW = size * imgAspect * zoom;
    } else {
      drawH = (size / imgAspect) * zoom;
    }

    const drawX = (size - drawW) / 2 + offsetX * (size / 280);
    const drawY = (size - drawH) / 2 + offsetY * (size / 280);

    ctx.drawImage(img, drawX, drawY, drawW, drawH);

    // 4. Apply Edge Feather / Soft Fade Transparency if requested
    if (feather > 0) {
      ctx.globalCompositeOperation = 'destination-in';
      const featherGrad = ctx.createRadialGradient(
        size / 2,
        size / 2,
        Math.max(0, size / 2 - (feather * size) / 100),
        size / 2,
        size / 2,
        size / 2
      );
      featherGrad.addColorStop(0, 'rgba(0,0,0,1)');
      featherGrad.addColorStop(0.75, 'rgba(0,0,0,0.8)');
      featherGrad.addColorStop(1, 'rgba(0,0,0,0)');

      ctx.fillStyle = featherGrad;
      ctx.fillRect(0, 0, size, size);
    }

    ctx.restore();

    // Export in high-quality WebP format with alpha channel
    try {
      const webpUrl = canvas.toDataURL('image/webp', 0.92);
      if (webpUrl.startsWith('data:image/webp')) {
        return webpUrl;
      }
    } catch {}
    return canvas.toDataURL('image/png');
  }, [shape, cornerRadius, opacity, feather, zoom, offsetX, offsetY]);

  // Load image on mount/change
  useEffect(() => {
    if (!isOpen || !imageUrl) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageObjRef.current = img;
      renderCanvas();
    };
    img.src = imageUrl;
  }, [isOpen, imageUrl, renderCanvas]);

  // Re-render on control change smoothly
  useEffect(() => {
    if (imageObjRef.current) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = requestAnimationFrame(() => {
        renderCanvas();
      });
    }
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [shape, cornerRadius, opacity, feather, zoom, offsetX, offsetY, renderCanvas]);

  const handleApply = () => {
    setIsProcessing(true);
    try {
      const offscreen = document.createElement('canvas');
      const finalDataUrl = renderCanvas(offscreen, 512);
      if (finalDataUrl) {
        onApply(finalDataUrl);
        onClose();
      }
    } catch (e) {
      console.error('Error generating processed image:', e);
    } finally {
      setIsProcessing(false);
    }
  };

  // Mouse Drag Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX - offsetX, y: e.clientY - offsetY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    setOffsetX(e.clientX - dragStartRef.current.x);
    setOffsetY(e.clientY - dragStartRef.current.y);
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  // Mobile Touch Drag Handlers (Finger Touch Dragging)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    isDraggingRef.current = true;
    dragStartRef.current = { x: touch.clientX - offsetX, y: touch.clientY - offsetY };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingRef.current || e.touches.length !== 1) return;
    const touch = e.touches[0];
    setOffsetX(touch.clientX - dragStartRef.current.x);
    setOffsetY(touch.clientY - dragStartRef.current.y);
  };

  const handleTouchEnd = () => {
    isDraggingRef.current = false;
  };

  // Directional Position Fine-Tuning Buttons (Up, Down, Left, Right)
  const moveImage = (dir: 'up' | 'down' | 'left' | 'right', step = 15) => {
    if (dir === 'up') setOffsetY(prev => prev - step);
    if (dir === 'down') setOffsetY(prev => prev + step);
    if (dir === 'left') setOffsetX(prev => prev - step);
    if (dir === 'right') setOffsetX(prev => prev + step);
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in select-none"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-2xl rounded-3xl bg-[#0f131d] border border-cyan-500/30 shadow-2xl p-3.5 sm:p-6 overflow-hidden text-slate-100 flex flex-col max-h-[96vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300 shadow-md shadow-cyan-500/20 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <span>{lang === 'ar' ? 'معاينة وتشكيل لقطة الصورة' : 'Image Shape & Opacity Editor'}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono">
                  WebP HD
                </span>
              </h3>
              <p className="text-[10px] sm:text-[11px] text-slate-400">
                {lang === 'ar' 
                  ? 'اختر الشكل (دائري / حواف دائرية / مربع) وتحكم في موقع وشفافية الصورة بالكامل' 
                  : 'Crop, position (pan/drag), and adjust opacity with instant preview'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto py-3 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 items-center">
          {/* Controls Panel */}
          <div className="space-y-3 bg-slate-900/80 p-3 sm:p-4 rounded-2xl border border-slate-800">
            {/* 1. Shape Selection (3 Buttons) */}
            <div>
              <label className="block text-xs font-bold text-slate-200 mb-1.5">
                {lang === 'ar' ? '1. اختر شكل الصورة المطلوب:' : '1. Select Shape:'}
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setShape('circle')}
                  className={`p-2 sm:p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 text-xs font-bold transition-all cursor-pointer ${
                    shape === 'circle'
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-md shadow-cyan-500/20 ring-1 ring-cyan-400/50'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <Circle className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400" />
                  <span className="text-[10px] sm:text-xs text-center">{lang === 'ar' ? 'دائري\n(Circle)' : 'Circle'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShape('rounded')}
                  className={`p-2 sm:p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 text-xs font-bold transition-all cursor-pointer ${
                    shape === 'rounded'
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-md shadow-cyan-500/20 ring-1 ring-cyan-400/50'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-md border-2 border-cyan-400" />
                  <span className="text-[10px] sm:text-xs text-center">{lang === 'ar' ? 'حواف\nدائرية' : 'Rounded'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShape('square')}
                  className={`p-2 sm:p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 text-xs font-bold transition-all cursor-pointer ${
                    shape === 'square'
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-md shadow-cyan-500/20 ring-1 ring-cyan-400/50'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <Square className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400" />
                  <span className="text-[10px] sm:text-xs text-center">{lang === 'ar' ? 'مربع\nأصلي' : 'Square'}</span>
                </button>
              </div>
            </div>

            {/* Corner Radius Slider (If Rounded) */}
            {shape === 'rounded' && (
              <div className="space-y-1 p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
                <div className="flex justify-between text-xs font-semibold text-slate-300">
                  <span>{lang === 'ar' ? 'درجة انحناء الحواف:' : 'Corner Radius:'}</span>
                  <span className="font-mono text-cyan-400">{cornerRadius}%</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="50"
                  value={cornerRadius}
                  onChange={(e) => setCornerRadius(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
              </div>
            )}

            {/* 2. Edge Feather & Transparency */}
            <div className="space-y-1 p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
              <div className="flex justify-between text-xs font-semibold text-slate-300">
                <span className="flex items-center gap-1.5 text-emerald-300">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{lang === 'ar' ? 'شفافية وتلاشي الحواف (Feather Edge):' : 'Edge Feather & Blend:'}</span>
                </span>
                <span className="font-mono text-emerald-400">{feather}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="40"
                value={feather}
                onChange={(e) => setFeather(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
              />
              <p className="text-[10px] text-slate-400">
                {lang === 'ar'
                  ? 'يمنح أطراف الصورة تدرجاً شفافاً ناعماً يمتزج بشكل جذاب داخل المتجر'
                  : 'Softens and blends outer edges smoothly with background'}
              </p>
            </div>

            {/* 3. Image Opacity Control */}
            <div className="space-y-1 p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
              <div className="flex justify-between text-xs font-semibold text-slate-300">
                <span className="flex items-center gap-1.5 text-cyan-300">
                  <SunMedium className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{lang === 'ar' ? 'شفافية الصورة (Image Opacity):' : 'Image Opacity:'}</span>
                </span>
                <span className="font-mono text-cyan-400">{opacity}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                value={opacity}
                onChange={(e) => setOpacity(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>

            {/* 4. Zoom & Directional Movement Controls */}
            <div className="space-y-2 p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
              <div className="flex justify-between text-xs font-semibold text-slate-300">
                <span>{lang === 'ar' ? 'تكبير وتصغير (Zoom):' : 'Zoom:'}</span>
                <span className="font-mono text-cyan-400">{zoom.toFixed(1)}x</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setZoom(Math.max(0.5, Number((zoom - 0.1).toFixed(2))))}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                  title="تصغير"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <input
                  type="range"
                  min="0.5"
                  max="3"
                  step="0.05"
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="flex-1 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
                <button
                  type="button"
                  onClick={() => setZoom(Math.min(3, Number((zoom + 0.1).toFixed(2))))}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                  title="تكبير"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
              </div>

              {/* D-Pad Arrows for Easy Precise Positioning (فوق، تحت، شمال، يمين) */}
              <div className="pt-2 border-t border-slate-800/80">
                <span className="block text-[11px] font-bold text-slate-300 mb-1.5 text-center">
                  {lang === 'ar' ? '🎯 أزرار التحكم في اتجاه الصورة (فوق / تحت / شمال / يمين):' : 'Position Adjustment (Up / Down / Left / Right):'}
                </span>
                <div className="flex flex-col items-center justify-center gap-1">
                  {/* Up */}
                  <button
                    type="button"
                    onClick={() => moveImage('up', 15)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-cyan-600/40 hover:border-cyan-400 border border-slate-700 text-cyan-300 cursor-pointer transition-all active:scale-90"
                    title={lang === 'ar' ? 'تحريك للأعلى (فوق)' : 'Move Up'}
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  {/* Left - Reset - Right */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => moveImage(lang === 'ar' ? 'right' : 'left', 15)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-cyan-600/40 hover:border-cyan-400 border border-slate-700 text-cyan-300 cursor-pointer transition-all active:scale-90"
                      title={lang === 'ar' ? 'تحريك لليسار (شمال)' : 'Move Left'}
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => { setOffsetX(0); setOffsetY(0); }}
                      className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[10px] text-slate-300 font-mono font-bold cursor-pointer"
                      title="توسيط"
                    >
                      {lang === 'ar' ? 'توسيط' : 'Center'}
                    </button>
                    <button
                      type="button"
                      onClick={() => moveImage(lang === 'ar' ? 'left' : 'right', 15)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-cyan-600/40 hover:border-cyan-400 border border-slate-700 text-cyan-300 cursor-pointer transition-all active:scale-90"
                      title={lang === 'ar' ? 'تحريك لليمين' : 'Move Right'}
                    >
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                  {/* Down */}
                  <button
                    type="button"
                    onClick={() => moveImage('down', 15)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-cyan-600/40 hover:border-cyan-400 border border-slate-700 text-cyan-300 cursor-pointer transition-all active:scale-90"
                    title={lang === 'ar' ? 'تحريك الأسفل (تحت)' : 'Move Down'}
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Reset Button */}
            <button
              type="button"
              onClick={() => {
                setShape('circle');
                setCornerRadius(25);
                setOpacity(100);
                setFeather(11);
                setZoom(1);
                setOffsetX(0);
                setOffsetY(0);
              }}
              className="w-full py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? 'إعادة ضبط الأبعاد والموقع' : 'Reset All Controls'}</span>
            </button>
          </div>

          {/* Canvas Live Preview with Mouse & Mobile Touch Dragging */}
          <div className="flex flex-col items-center justify-center space-y-2.5">
            <div 
              className={`relative w-64 h-64 sm:w-72 sm:h-72 rounded-2xl border-2 border-dashed border-cyan-500/60 overflow-hidden flex items-center justify-center cursor-grab active:cursor-grabbing shadow-2xl select-none touch-none ${
                previewBg === 'checker' ? 'bg-[linear-gradient(45deg,#1e2433_25%,transparent_25%),linear-gradient(-45deg,#1e2433_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#1e2433_75%),linear-gradient(-45deg,transparent_75%,#1e2433_75%)] bg-[size:16px_16px] bg-[#0c1017]' :
                previewBg === 'black' ? 'bg-black' :
                previewBg === 'white' ? 'bg-white' : 'bg-[#090c12]'
              }`}
              style={{ touchAction: 'none' }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onTouchCancel={handleTouchEnd}
            >
              <canvas
                ref={canvasRef}
                className="w-full h-full object-contain pointer-events-none drop-shadow-2xl"
              />

              <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded-lg bg-black/80 backdrop-blur text-[10px] text-cyan-300 pointer-events-none flex items-center gap-1.5 border border-cyan-500/40 font-bold shadow-lg">
                <Move className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                <span>{lang === 'ar' ? 'اسحب بلمس إسبعك أو بالماوس لتحريك الصورة' : 'Drag with finger or mouse to adjust position'}</span>
              </div>
            </div>

            {/* Preview Backdrop Selector */}
            <div className="flex items-center gap-1.5 bg-slate-900/90 p-1 rounded-xl border border-slate-800 text-[11px]">
              <span className="text-slate-400 px-1.5">{lang === 'ar' ? 'الخلفية:' : 'BG:'}</span>
              {(['dark', 'checker', 'black', 'white'] as const).map((bg) => (
                <button
                  key={bg}
                  type="button"
                  onClick={() => setPreviewBg(bg)}
                  className={`px-2 py-0.5 rounded-lg font-medium transition-all ${
                    previewBg === bg
                      ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-500/50'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {bg === 'dark' ? (lang === 'ar' ? 'داكن' : 'Dark') :
                   bg === 'checker' ? (lang === 'ar' ? 'شفاف' : 'Checker') :
                   bg === 'black' ? (lang === 'ar' ? 'أسود' : 'Black') :
                   (lang === 'ar' ? 'أبيض' : 'White')}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
          >
            {lang === 'ar' ? 'إلغاء' : 'Cancel'}
          </button>

          <button
            type="button"
            onClick={handleApply}
            disabled={isProcessing}
            className="px-6 py-2 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-white font-extrabold text-xs shadow-lg shadow-emerald-500/30 flex items-center gap-2 cursor-pointer active:scale-95 transition-all"
          >
            <Check className="w-4 h-4" />
            <span>{lang === 'ar' ? 'تطبيق وحفظ الصورة في المتجر' : 'Apply & Save Image'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
