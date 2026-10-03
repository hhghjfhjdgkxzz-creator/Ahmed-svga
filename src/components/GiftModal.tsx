import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Heart, 
  ShieldCheck, 
  Sparkles,
  MessageCircle,
  CheckCircle2,
  Share2,
  RefreshCw,
  AlertCircle,
  Film
} from 'lucide-react';
import { GiftItem, Language } from '../types';
import { translations } from '../utils/translations';
import { SvgaPlayer } from './SvgaPlayer';
import { resolveMediaUrl, getMediaFromIndexedDb, getProxyMediaUrl, getPlayableMediaUrl } from '../utils/mediaStorage';

interface GiftModalProps {
  gift: GiftItem | null;
  onClose: () => void;
  lang: Language;
  onAddToCart: (gift: GiftItem) => void;
  onOpenPurchase: (gift: GiftItem) => void;
  allGifts: GiftItem[];
  onSelectGift: (gift: GiftItem) => void;
}

export const GiftModal: React.FC<GiftModalProps> = ({
  gift,
  onClose,
  lang,
  onOpenPurchase,
  allGifts = [],
  onSelectGift
}) => {
  const t = translations[lang];
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(14);
  const [streamBg, setStreamBg] = useState<'dark' | 'stage' | 'green'>('dark');
  const [isFavorited, setIsFavorited] = useState(false);
  const [videoSrc, setVideoSrc] = useState<string>('');
  const [hasVideoError, setHasVideoError] = useState(false);

  useEffect(() => {
    if (!gift) return;

    setHasVideoError(false);
    setCurrentTime(0);
    setIsMuted(true);

    const initialUrl = getPlayableMediaUrl(gift.videoUrl);
    setVideoSrc(initialUrl);

    const timer = setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.muted = true;
        videoRef.current.play().then(() => {
          setIsPlaying(true);
        }).catch((err) => {
          console.warn('Autoplay prevented:', err);
          setIsPlaying(false);
        });
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [gift]);

  // If video fails to load, try recovery from IndexedDB
  const handleVideoError = async () => {
    if (!gift) return;
    try {
      // 1. Check if we have this media cached in IndexedDB
      const cachedBlob = await getMediaFromIndexedDb(gift.id) || await getMediaFromIndexedDb(gift.videoUrl);
      if (cachedBlob) {
        const localBlobUrl = URL.createObjectURL(cachedBlob);
        setVideoSrc(localBlobUrl);
        setHasVideoError(false);
        setTimeout(() => {
          videoRef.current?.play().catch(() => {});
        }, 100);
        return;
      }

      // 2. If videoSrc wasn't the clean playable URL, try it directly
      const cleanUrl = getPlayableMediaUrl(gift.videoUrl);
      if (cleanUrl && videoSrc !== cleanUrl) {
        setVideoSrc(cleanUrl);
        setHasVideoError(false);
        return;
      }
    } catch (e) {
      console.warn('Could not recover video from cache:', e);
    }
    setHasVideoError(true);
  };

  if (!gift) return null;

  const isSvga = Boolean(
    gift.videoUrl && (
      gift.videoUrl.toLowerCase().endsWith('.svga') ||
      gift.videoUrl.toLowerCase().endsWith('.svga2') ||
      gift.videoUrl.includes('.svga?') ||
      gift.videoUrl.includes('data:application/octet-stream') ||
      gift.videoUrl.includes('gifts/svga')
    ) && !gift.videoUrl.toLowerCase().includes('.mp4') && !gift.videoUrl.toLowerCase().includes('.webm')
  );

  const isImage = Boolean(
    !gift.videoUrl || (
      gift.videoUrl.match(/\.(jpeg|jpg|gif|png|webp|svg|bmp)(\?.*)?$/i) ||
      gift.videoUrl.startsWith('data:image/')
    )
  );

  const displayTitle = lang === 'ar' && gift.titleAr ? gift.titleAr : lang === 'en' && gift.titleEn ? gift.titleEn : gift.title;

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      if (videoRef.current.duration && !isNaN(videoRef.current.duration)) {
        setDuration(videoRef.current.duration);
      }
    }
  };

  const handleTogglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play().then(() => {
          setIsPlaying(true);
        }).catch(() => {
          setIsPlaying(false);
        });
      }
    }
  };

  const handleToggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    if (videoRef.current) {
      videoRef.current.muted = newMuted;
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleDownloadSample = () => {
    const element = document.createElement('a');
    const file = new Blob([
      `JIAWEI EFFECTS TEST SAMPLE PACKET\n` +
      `Gift: ${gift.title} (${gift.id})\n` +
      `Resolution: ${gift.resolution}\n` +
      `Formats: SVGA, VAP, MP4\n` +
      `Stream URL: ${gift.videoUrl}\n` +
      `License Notice: Genuine commercial test license.`
    ], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `${gift.id}_sample_spec.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const relatedGifts = (Array.isArray(allGifts) ? allGifts : []).filter((g) => g && gift && g.id !== gift.id).slice(0, 6);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6 bg-black/90 sm:bg-black/85 backdrop-blur-md overflow-hidden animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-5xl h-[95vh] sm:h-[90vh] md:h-[680px] bg-[#0a0d14] rounded-t-3xl sm:rounded-3xl border border-slate-700/80 shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Header Bar & Close Button */}
        <div className="flex sm:hidden items-center justify-between px-4 py-3 border-b border-slate-800 bg-[#0d111a] shrink-0 z-30">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-bold text-white truncate max-w-[200px]">
              {displayTitle}
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 shrink-0 font-bold">
              {gift.id}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsFavorited(!isFavorited)}
              className={`p-2 rounded-full border transition-colors ${
                isFavorited 
                  ? 'bg-pink-500/20 border-pink-500/40 text-pink-400' 
                  : 'bg-slate-800/80 border-slate-700 text-slate-400'
              }`}
            >
              <Heart className={`w-4 h-4 ${isFavorited ? 'fill-current' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Desktop Close Button */}
        <button
          onClick={onClose}
          className="hidden sm:flex absolute top-3 right-3 z-30 p-2.5 rounded-full bg-black/70 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 transition-colors shadow-lg cursor-pointer"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Content Grid: 2 columns on desktop (md:grid-cols-12), stacked and smoothly scrollable on mobile */}
        <div className="flex-1 flex flex-col md:grid md:grid-cols-12 min-h-0 overflow-y-auto md:overflow-hidden">
          
          {/* LEFT: Video Player Stage (Expansive, crystal clear, full viewport on mobile) */}
          <div className="md:col-span-7 bg-[#05070b] p-3 sm:p-4.5 flex flex-col justify-between items-center relative border-b md:border-b-0 md:border-r border-slate-800 shrink-0 w-full min-h-[340px] sm:min-h-[420px] md:min-h-0 md:h-full">
            
            {/* Top Toolbar / Background Simulator */}
            <div className="w-full flex items-center justify-between mb-2.5 z-10 shrink-0">
              <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-700/80 rounded-xl p-1 text-[11px] shadow-sm">
                <span className="text-slate-400 px-1.5 font-medium hidden xs:inline">{t.streamBgSim}:</span>
                <button
                  onClick={() => setStreamBg('dark')}
                  className={`px-2.5 py-1 rounded-lg transition-all text-xs font-semibold cursor-pointer ${
                    streamBg === 'dark' ? 'bg-cyan-500/30 text-cyan-300 shadow-sm border border-cyan-500/40' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {t.bgDark}
                </button>
                <button
                  onClick={() => setStreamBg('stage')}
                  className={`px-2.5 py-1 rounded-lg transition-all text-xs font-semibold cursor-pointer ${
                    streamBg === 'stage' ? 'bg-purple-500/30 text-purple-300 shadow-sm border border-purple-500/40' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {t.bgStage}
                </button>
                <button
                  onClick={() => setStreamBg('green')}
                  className={`px-2.5 py-1 rounded-lg transition-all text-xs font-semibold cursor-pointer ${
                    streamBg === 'green' ? 'bg-emerald-500/30 text-emerald-300 shadow-sm border border-emerald-500/40' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {t.bgGreen}
                </button>
              </div>

              <div className="text-[11px] text-cyan-400/90 font-mono font-bold bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-800">
                {gift.resolution || '1080x1920'} · {gift.fps || 60}FPS
              </div>
            </div>

            {/* Video / SVGA Canvas Stage with Centered Object Contain */}
            <div 
              className={`relative w-full flex-1 min-h-[220px] sm:min-h-[280px] md:min-h-0 rounded-2xl overflow-hidden shadow-2xl transition-colors flex items-center justify-center border border-slate-800/80 ${
                streamBg === 'dark' 
                  ? 'bg-black' 
                  : streamBg === 'stage' 
                  ? 'bg-gradient-to-b from-indigo-950 via-slate-950 to-purple-950' 
                  : 'bg-[#00b140]'
              }`}
            >
              {isSvga ? (
                <SvgaPlayer
                  src={videoSrc || gift.videoUrl}
                  autoPlay={isPlaying}
                  loop={true}
                  isMuted={isMuted}
                  backdrop={streamBg === 'stage' ? 'dark' : streamBg === 'dark' ? 'black' : 'checker'}
                  className="w-full h-full object-contain"
                />
              ) : isImage ? (
                <div className="relative w-full h-full flex items-center justify-center p-3">
                  <img
                    src={resolveMediaUrl(gift.posterUrl || gift.videoUrl)}
                    alt={displayTitle}
                    className="max-h-full max-w-full object-contain select-none drop-shadow-2xl"
                  />
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    key={videoSrc || gift.videoUrl}
                    src={videoSrc || getPlayableMediaUrl(gift.videoUrl)}
                    poster={gift.posterUrl ? getPlayableMediaUrl(gift.posterUrl) : undefined}
                    loop
                    autoPlay={isPlaying}
                    muted={isMuted}
                    playsInline
                    preload="metadata"
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={() => {
                      if (videoRef.current && videoRef.current.duration) {
                        setDuration(videoRef.current.duration);
                      }
                      if (isPlaying && videoRef.current) {
                        videoRef.current.play().catch(() => {});
                      }
                    }}
                    onCanPlay={() => {
                      if (isPlaying && videoRef.current) {
                        videoRef.current.play().catch(() => {});
                      }
                    }}
                    onError={handleVideoError}
                    onClick={handleTogglePlay}
                    className="w-full h-full object-contain cursor-pointer select-none transform-gpu"
                  />

                  {hasVideoError && (
                    <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-4 text-center z-20">
                      {gift.posterUrl ? (
                        <img 
                          src={resolveMediaUrl(gift.posterUrl)} 
                          alt={displayTitle} 
                          className="w-28 h-28 object-contain rounded-2xl border border-slate-700 mb-3 shadow-lg"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3">
                          <Film className="w-8 h-8" />
                        </div>
                      )}
                      <p className="text-xs font-semibold text-slate-300 mb-2">
                        {lang === 'ar' ? 'تعذر تشغيل الفيديو المباشر من الرابط' : 'Unable to play video directly'}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setHasVideoError(false);
                          const url = resolveMediaUrl(gift.videoUrl);
                          setVideoSrc(url + (url.includes('?') ? '&' : '?') + 't=' + Date.now());
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>{lang === 'ar' ? 'إعادة المحاولة' : 'Retry'}</span>
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* Pause icon overlay */}
              {!isPlaying && !hasVideoError && (
                <div 
                  onClick={handleTogglePlay}
                  className="absolute inset-0 bg-black/40 flex items-center justify-center cursor-pointer z-10 animate-fade-in"
                >
                  <div className="w-16 h-16 rounded-full bg-cyan-500/90 text-white flex items-center justify-center shadow-2xl hover:scale-110 transition-transform">
                    <Play className="w-8 h-8 ml-1 fill-current" />
                  </div>
                </div>
              )}
            </div>

            {/* Compact & Responsive Player Controls Bar */}
            <div className="w-full mt-3 space-y-1.5 shrink-0 bg-slate-950/70 p-2 rounded-xl border border-slate-800">
              <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                <span className="w-9 text-center font-bold text-cyan-300">{formatTime(currentTime)}</span>
                <input
                  type="range"
                  min="0"
                  max={duration || 14}
                  step="0.1"
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
                <span className="w-9 text-center font-bold text-slate-400">{formatTime(duration)}</span>
              </div>

              <div className="flex items-center justify-between text-slate-300 pt-0.5">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleTogglePlay}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
                    title={isPlaying ? 'Pause' : 'Play'}
                  >
                    {isPlaying ? <Pause className="w-4 h-4 text-cyan-400" /> : <Play className="w-4 h-4 text-slate-200" />}
                  </button>
                  <button
                    onClick={handleToggleMute}
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                      !isMuted ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-800 hover:bg-slate-700 text-slate-400'
                    }`}
                    title={isMuted ? 'Unmute' : 'Mute'}
                  >
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-emerald-400 animate-pulse" />}
                    <span className="text-[10px] font-bold hidden xs:inline">{!isMuted ? (lang === 'ar' ? 'صوت' : 'Sound') : ''}</span>
                  </button>
                </div>

                <div className="text-[10px] text-cyan-300 font-mono font-semibold bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40">
                  {isSvga ? 'SVGA 2.0 / Vector' : 'MP4 60FPS / HD'}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Product Specs & Direct WhatsApp Action (5 columns on desktop) */}
          <div className="md:col-span-5 flex flex-col flex-1 min-h-0 bg-[#0d1017]">
            
            {/* Scrollable details container */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 scrollbar-thin">
              
              {/* Title & Metadata Line */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-white leading-tight">
                    {displayTitle}
                  </h2>
                  <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-400 font-mono">
                    <span className="px-2 py-0.5 rounded-md bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 font-bold">
                      {gift.id}
                    </span>
                    <span className="text-slate-400">· {gift.effectType || '2D/3D'} · {gift.theme || 'VIP'}</span>
                  </div>
                </div>

                <button
                  onClick={() => setIsFavorited(!isFavorited)}
                  className={`hidden sm:flex p-2.5 rounded-xl border transition-colors ${
                    isFavorited 
                      ? 'bg-pink-500/20 border-pink-500/40 text-pink-400' 
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                  title={t.favorite}
                >
                  <Heart className={`w-4 h-4 ${isFavorited ? 'fill-current' : ''}`} />
                </button>
              </div>

              {/* Formats Info Bar */}
              <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800/90 space-y-2.5 shadow-sm">
                <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                  <span>{lang === 'ar' ? 'الصيغ الفنية المرفقة بالحزمة:' : 'Included Animation Formats:'}</span>
                  <span className="text-[10px] text-emerald-400 font-mono font-normal">HD 1080p</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {gift.formats.map((fmt, i) => {
                    const cleanName = fmt.name.replace(/\s*\([^)]*(MB|KB|GB|B|\d)[^)]*\)/gi, '').trim();
                    return (
                      <div key={i} className="flex items-center gap-2 p-2 rounded-xl bg-slate-800/80 border border-slate-700/60 text-slate-200 text-[11px] font-semibold hover:border-cyan-500/40 transition-colors">
                        <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0 shadow-sm shadow-cyan-400/50"></span>
                        <span className="truncate">{cleanName || fmt.name}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-800">
                  {['SVGA', 'VAP', 'MP4', 'PAG', 'JSON', 'WEBP', 'GIF', 'MOV'].map((fmt) => (
                    <span key={fmt} className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800/90 text-cyan-300 font-mono font-medium border border-slate-700/60">
                      {fmt}
                    </span>
                  ))}
                </div>
              </div>

              {/* Creator Card */}
              <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800/90 flex items-center justify-between gap-3 shadow-sm">
                <div className="flex items-center gap-2.5 min-w-0">
                  <img
                    src={gift.author.avatar}
                    alt={gift.author.name}
                    className="w-10 h-10 rounded-full object-cover border-2 border-cyan-500/40 shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs sm:text-sm font-bold text-white truncate">{gift.author.name}</span>
                      {gift.author.verified && <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">
                      {lang === 'ar' ? 'مصمم ومعد مؤثرات معتمد' : 'Verified Platform VFX Creator'}
                    </div>
                  </div>
                </div>

                {gift.author.whatsapp && (
                  <a
                    href={`https://wa.me/${gift.author.whatsapp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                      lang === 'ar'
                        ? `مرحباً، أنا مهتم بالحصول على مؤثر البث [${displayTitle} - ${gift.id}] وأود الاستفسار عن التفاصيل والترخيص.`
                        : `Hello! I am interested in your live stream effect [${displayTitle} - ${gift.id}].`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 rounded-xl bg-emerald-600/90 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-all shrink-0 active:scale-95"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>{lang === 'ar' ? 'واتساب المصمم' : 'WhatsApp'}</span>
                  </a>
                )}
              </div>

              {/* License Warranty Notice */}
              <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-800/30 text-[11px] text-amber-300/90 flex items-start gap-2 leading-relaxed">
                <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>{t.licenseNotice}</span>
              </div>

              {/* Related Gifts Strip */}
              {(relatedGifts?.length || 0) > 0 && (
                <div className="pt-2 border-t border-slate-800/80">
                  <div className="text-[11px] font-bold text-slate-400 mb-2">
                    {t.relatedGifts}
                  </div>
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                    {relatedGifts.map((rel) => (
                      <div
                        key={rel.id}
                        onClick={() => onSelectGift(rel)}
                        className="w-16 shrink-0 rounded-xl overflow-hidden border border-slate-800 hover:border-cyan-500/60 cursor-pointer group bg-slate-900"
                      >
                        <div className="aspect-square relative overflow-hidden bg-slate-950 flex items-center justify-center">
                          {rel.posterUrl ? (
                            <img
                              src={resolveMediaUrl(rel.posterUrl)}
                              alt={rel.title}
                              loading="lazy"
                              decoding="async"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-slate-900 text-slate-500">
                              <Film className="w-5 h-5 opacity-60" />
                            </div>
                          )}
                        </div>
                        <div className="p-1 text-[9px] text-slate-300 truncate text-center font-medium">
                          {rel.title}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Pinned Bottom Action Box with Price & Direct WhatsApp purchase */}
            <div className="p-4 bg-[#0a0d14] border-t border-slate-800/90 shrink-0 shadow-2xl">
              <div className="flex items-baseline justify-between mb-3">
                <div>
                  <div className="text-[10px] text-slate-400 font-medium">
                    {lang === 'ar' ? 'سعر الحزمة الكاملة:' : 'Full Package Price:'}
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">
                    $ {gift.price} <span className="text-xs text-slate-400 font-sans font-normal">USD</span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] text-slate-400">{t.vipEstPrice}:</div>
                  <div className="text-sm font-bold text-cyan-300 font-mono">
                    $ {gift.vipPrice} USD
                  </div>
                </div>
              </div>

              <button
                onClick={() => onOpenPurchase(gift)}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white text-sm font-extrabold flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 transition-all active:scale-95 cursor-pointer"
              >
                <MessageCircle className="w-5 h-5 fill-current" />
                <span>{t.buyNowBtn}</span>
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

