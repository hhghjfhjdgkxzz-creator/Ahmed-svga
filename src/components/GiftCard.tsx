import React, { useState, useRef, useEffect, memo } from 'react';
import { Play, Video, Volume2, Sparkles, ArrowRight, ArrowLeft } from 'lucide-react';
import { GiftItem, Language } from '../types';
import { translations } from '../utils/translations';
import { SvgaPlayer } from './SvgaPlayer';
import { resolveMediaUrl, getMediaFromIndexedDb } from '../utils/mediaStorage';
import { OptimizedImage } from './common/OptimizedImage';

export interface GiftCardProps {
  gift: GiftItem;
  lang: Language;
  onSelectGift: (gift: GiftItem) => void;
  onQuickBuy?: (gift: GiftItem) => void;
  onAddToCart?: (gift: GiftItem) => void;
  isSelected?: boolean;
  priority?: boolean;
}

const GiftCardComponent: React.FC<GiftCardProps> = ({
  gift,
  lang,
  onSelectGift,
  isSelected = false,
  priority = false
}) => {
  const t = translations[lang];
  const [isHovered, setIsHovered] = useState(false);
  const [videoSrc, setVideoSrc] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const hasPoster = Boolean(gift.posterUrl && gift.posterUrl.trim());
  const isSvga = Boolean(
    gift.videoUrl && (
      gift.videoUrl.toLowerCase().endsWith('.svga') ||
      gift.videoUrl.toLowerCase().endsWith('.svga2') ||
      gift.videoUrl.includes('.svga?') ||
      gift.videoUrl.includes('data:application/octet-stream') ||
      gift.videoUrl.includes('gifts/svga')
    ) && !gift.videoUrl.toLowerCase().includes('.mp4') && !gift.videoUrl.toLowerCase().includes('.webm')
  );

  const isVideo = Boolean(
    gift.videoUrl && (
      gift.videoUrl.toLowerCase().includes('.mp4') ||
      gift.videoUrl.toLowerCase().includes('.webm') ||
      gift.videoUrl.includes('video/')
    )
  );

  const hasAudio = Boolean(
    gift.formats?.some(f => f.name.includes('声音') || f.name.includes('Sound') || f.name.includes('صوت')) ||
    gift.videoUrl ||
    gift.tags?.some(tag => tag.includes('صوت') || tag.includes('音效') || tag.includes('Audio')) ||
    true // Most live streaming gifts have sound effects
  );

  useEffect(() => {
    if (gift.videoUrl) {
      setVideoSrc(resolveMediaUrl(gift.videoUrl));
    }
  }, [gift.videoUrl]);

  const handleMouseEnter = () => {
    setIsHovered(true);
    if (videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (videoRef.current && hasPoster) {
      videoRef.current.pause();
    }
  };

  const handleVideoError = async () => {
    try {
      const cached = await getMediaFromIndexedDb(gift.id) || await getMediaFromIndexedDb(gift.videoUrl);
      if (cached) {
        setVideoSrc(URL.createObjectURL(cached));
        return;
      }
    } catch (e) {}
  };

  const displayTitle = lang === 'ar' && gift.titleAr ? gift.titleAr : lang === 'en' && gift.titleEn ? gift.titleEn : gift.title;
  const categoryTag = gift.category === 'frames' 
    ? (lang === 'ar' ? 'إطار' : 'Frame')
    : gift.category === 'luxury'
    ? (lang === 'ar' ? 'فاخر' : 'Luxury')
    : gift.category === 'medals'
    ? (lang === 'ar' ? 'وسام' : 'Medal')
    : gift.category === 'chat_bubbles'
    ? (lang === 'ar' ? 'فقاعة شات' : 'Chat Bubble')
    : (lang === 'ar' ? 'مؤثر' : 'Effect');
  const effectTag = isSvga ? 'SVGA' : isVideo ? 'MP4' : 'VFX';

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={() => onSelectGift(gift)}
      className={`group relative flex flex-col rounded-2xl bg-[#0e131d] border transition-all duration-300 overflow-hidden cursor-pointer shadow-lg hover:shadow-cyan-950/40 min-w-0 w-full ${
        isSelected 
          ? 'border-amber-400 ring-2 ring-amber-400/40 shadow-amber-400/20 shadow-xl scale-[1.01]' 
          : 'border-slate-800/90 hover:border-cyan-500/70'
      }`}
    >
      {/* 1. Preview Container with Badges */}
      <div className="relative aspect-square w-full overflow-hidden bg-gradient-to-b from-[#0a0d14] to-[#06080d] flex items-center justify-center p-2 sm:p-3">
        {/* Top-Right: Sound Effect badge if present */}
        {hasAudio && (
          <div className="absolute top-2 right-2 z-20 flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-950/85 backdrop-blur-md border border-cyan-500/30 text-cyan-300 text-[10px] font-semibold shadow-sm">
            <Volume2 className="w-3 h-3 text-cyan-400" />
            <span>{lang === 'ar' ? 'صوت' : 'Audio'}</span>
          </div>
        )}

        {/* Top-Left: Format Badge */}
        <div className="absolute top-2 left-2 z-20 flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-950/85 backdrop-blur-md border border-slate-700/60 text-slate-300 text-[10px] font-mono font-bold">
          <span>{effectTag}</span>
        </div>

        {/* Media Preview:
            - At rest: Show posterUrl with zero layout shift via OptimizedImage
            - On Hover: Mount & play video/SVGA dynamically without network socket exhaustion
        */}
        {hasPoster ? (
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Background Playable Video / SVGA on Hover only */}
            {(isVideo || isSvga || gift.videoUrl) && isHovered && (
              <div className="absolute inset-0 w-full h-full transition-opacity duration-300 opacity-100 z-10">
                {isSvga ? (
                  <SvgaPlayer
                    src={videoSrc || gift.videoUrl}
                    autoPlay={true}
                    loop={true}
                    isMuted={true}
                    backdrop="dark"
                    className="w-full h-full object-contain pointer-events-none drop-shadow-2xl"
                  />
                ) : (
                  <video
                    ref={videoRef}
                    src={videoSrc || resolveMediaUrl(gift.videoUrl)}
                    autoPlay={true}
                    loop
                    muted
                    playsInline
                    preload="auto"
                    onError={handleVideoError}
                    className="w-full h-full object-contain pointer-events-none drop-shadow-2xl transform-gpu"
                  />
                )}
              </div>
            )}

            {/* Front Poster Image (Visible at rest, with skeleton & browser cache) */}
            <div className={`w-full h-full transition-all duration-300 ${
              isHovered && (isVideo || isSvga || gift.videoUrl) ? 'opacity-0 scale-105' : 'opacity-100 group-hover:scale-105'
            }`}>
              <OptimizedImage
                src={gift.posterUrl}
                alt={displayTitle}
                priority={priority}
                aspectRatioClass="aspect-square"
                className="w-full h-full object-contain pointer-events-none drop-shadow-2xl"
              />
            </div>
          </div>
        ) : isHovered && isSvga && gift.videoUrl ? (
          <div className="w-full h-full flex items-center justify-center">
            <SvgaPlayer
              src={videoSrc || gift.videoUrl}
              autoPlay={true}
              loop={true}
              isMuted={true}
              backdrop="dark"
              className="w-full h-full object-contain pointer-events-none drop-shadow-2xl"
            />
          </div>
        ) : isHovered && (isVideo || gift.videoUrl) && videoSrc && !gift.videoUrl?.match(/\.(jpeg|jpg|gif|png|webp|svg|bmp)(\?.*)?$/i) ? (
          <video
            ref={videoRef}
            src={videoSrc}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            onError={handleVideoError}
            className="w-full h-full object-contain pointer-events-none drop-shadow-2xl transform-gpu"
          />
        ) : gift.videoUrl && gift.videoUrl.match(/\.(jpeg|jpg|gif|png|webp|svg|bmp)(\?.*)?$/i) ? (
          <OptimizedImage
            src={gift.videoUrl}
            alt={displayTitle}
            priority={priority}
            aspectRatioClass="aspect-square"
            className="w-full h-full object-contain pointer-events-none transition-transform duration-500 group-hover:scale-105 filter-none drop-shadow-2xl"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-500">
            <Video className="w-7 sm:w-8 h-7 sm:h-8 opacity-40 mb-1" />
            <span className="text-[10px] font-mono">{effectTag}</span>
          </div>
        )}
      </div>

      {/* 2. Content Info Section */}
      <div className="p-3 sm:p-3.5 flex flex-col gap-2 bg-[#0e131d] min-w-0">
        {/* Title & Price Row */}
        <div className="flex items-start justify-between gap-2 min-w-0">
          <h3 className="text-xs sm:text-sm font-bold text-white group-hover:text-cyan-300 transition-colors truncate leading-snug">
            {displayTitle}
          </h3>
          <span className="text-emerald-400 font-black text-xs sm:text-sm whitespace-nowrap shrink-0 font-mono">
            ${gift.price}
          </span>
        </div>

        {/* Category & Action Row */}
        <div className="flex items-center justify-between gap-1 pt-1 border-t border-slate-800/60">
          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800/80 text-slate-300 border border-slate-700/60 truncate">
            {categoryTag}
          </span>
          <span className="text-[11px] font-semibold text-cyan-400 group-hover:text-cyan-300 flex items-center gap-0.5">
            {lang === 'ar' ? 'عرض التفاصيل ←' : 'View Details →'}
          </span>
        </div>
      </div>
    </div>
  );
};

export const GiftCard = memo(GiftCardComponent, (prev, next) => {
  return (
    prev.gift.id === next.gift.id &&
    prev.gift.posterUrl === next.gift.posterUrl &&
    prev.gift.videoUrl === next.gift.videoUrl &&
    prev.gift.price === next.gift.price &&
    prev.gift.title === next.gift.title &&
    prev.gift.titleAr === next.gift.titleAr &&
    prev.isSelected === next.isSelected &&
    prev.priority === next.priority &&
    prev.lang === next.lang
  );
});
