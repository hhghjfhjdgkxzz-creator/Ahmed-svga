import React, { useState, useEffect, memo } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Sparkles, 
  MessageCircle,
  ExternalLink 
} from 'lucide-react';
import { Language, HeroBannerItem, CustomCategory, SiteSettings } from '../types';
import { translations } from '../utils/translations';
import { INITIAL_BANNERS } from '../data/initialBanners';
import { resolveMediaUrl } from '../utils/mediaStorage';
import { preloadImage } from '../utils/imageCache';

interface HeroBannersProps {
  lang: Language;
  banners?: HeroBannerItem[];
  categories?: CustomCategory[];
  selectedCategory?: string;
  onSelectQuickCategory: (catKey: string) => void;
  onOpenCustomDesignModal: () => void;
  siteSettings?: SiteSettings;
}

const HeroBannersComponent: React.FC<HeroBannersProps> = ({
  lang,
  banners = [],
  categories = [],
  selectedCategory = 'all',
  onSelectQuickCategory,
  onOpenCustomDesignModal,
  siteSettings
}) => {
  const t = translations[lang];
  const [currentSlide, setCurrentSlide] = useState(0);

  const whatsappNumber = siteSettings?.whatsapp || '+923400700013';
  const cleanWhatsapp = whatsappNumber.replace(/[^0-9]/g, '');

  // Active banners list from props or fallback
  const activeBanners = (Array.isArray(banners) && banners.length > 0)
    ? banners.filter(b => b && b.isActive !== false)
    : (INITIAL_BANNERS || []);

  // Preload all banner images in background so transitions are 100% instantaneous
  useEffect(() => {
    if (Array.isArray(activeBanners)) {
      activeBanners.forEach((b, idx) => {
        if (b.imageUrl) {
          preloadImage(resolveMediaUrl(b.imageUrl), idx === 0);
        }
      });
    }
  }, [activeBanners]);

  useEffect(() => {
    if (!activeBanners || activeBanners.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % (activeBanners.length || 1));
    }, 6000);
    return () => clearInterval(timer);
  }, [activeBanners?.length]);

  const current = (activeBanners && activeBanners[currentSlide]) || (activeBanners && activeBanners[0]) || null;
  const currentBannerUrl = current?.imageUrl ? resolveMediaUrl(current.imageUrl) : '';

  const handleBannerClick = () => {
    if (!current) return;
    if (current.btnLink) {
      const link = current.btnLink.trim();
      if (link === 'custom_design') {
        onOpenCustomDesignModal();
      } else if (link.startsWith('http://') || link.startsWith('https://') || link.startsWith('wa.me')) {
        const url = link.startsWith('wa.me') ? `https://${link}` : link;
        window.open(url, '_blank', 'noopener,noreferrer');
      } else {
        onSelectQuickCategory(link);
      }
    } else {
      // Default to WhatsApp inquiry
      window.open(`https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent(
        lang === 'ar' ? 'مرحباً، أود الاستفسار عن تصاميم البانر والعروض الحصرية.' : 'Hello, I want to inquire about custom designs.'
      )}`, '_blank');
    }
  };

  return (
    <section className="w-full mb-3 select-none">
      {/* 1. Animation Gallery Title & Subtitle (Exact Clone of Reference Video) */}
      <div className="text-center py-4 sm:py-5">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-wide mb-1.5 flex items-center justify-center gap-2">
          <span>{t.animationGallery}</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 font-medium">
          {t.gallerySubtitle}
        </p>
      </div>

      {/* 2. Featured Banner Card - Adapts to any uploaded size with zero empty borders and zero layout shift */}
      <div 
        onClick={handleBannerClick}
        className="group relative w-full min-h-[140px] sm:min-h-[180px] md:min-h-[220px] rounded-2xl sm:rounded-3xl overflow-hidden border border-cyan-500/40 hover:border-cyan-400 shadow-xl shadow-cyan-950/30 cursor-pointer transition-all duration-300 block p-0 m-0 bg-[#0a0d14]"
      >
        {/* Banner Graphic Image / Background */}
        {currentBannerUrl ? (
          <img
            src={currentBannerUrl}
            alt={current.title || 'Featured Design'}
            loading="eager"
            decoding="async"
            fetchPriority="high"
            className="w-full h-auto min-h-[140px] sm:min-h-[180px] md:min-h-[220px] object-cover block select-none rounded-2xl sm:rounded-3xl transition-transform duration-700 group-hover:scale-[1.003]"
          />
        ) : (
          /* Default Vibrant Visual Banner matching the video */
          <div className="w-full min-h-[140px] sm:min-h-[180px] md:min-h-[220px] bg-gradient-to-r from-slate-950 via-indigo-950 to-purple-950 flex items-center justify-between p-4 sm:p-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(6,182,212,0.2),transparent_60%)]" />
            
            <div className="relative z-10 space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-blue-200 to-purple-300 tracking-wider uppercase">
                  Destroy KING Designer
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40">
                  OFFICIAL
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-300">
                SVGA · GIF · VAP · Animated Frames
              </p>
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-mono font-bold pt-1">
                <MessageCircle className="w-3.5 h-3.5 fill-current" />
                <span>WhatsApp: {whatsappNumber}</span>
              </div>
            </div>

            <div className="relative z-10 hidden sm:flex items-center justify-center w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300">
              <Sparkles className="w-7 h-7 animate-pulse" />
            </div>
          </div>
        )}

        {/* Dynamic Title Overlay ONLY if text provided on custom banner */}
        {Boolean(current?.title?.trim()) && currentBannerUrl && (
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent flex flex-col justify-end p-3.5 sm:p-5">
            <h2 className="text-sm sm:text-base font-extrabold text-white line-clamp-1">
              {current.title}
            </h2>
            {Boolean(current?.subtitle?.trim()) && (
              <p className="text-[11px] sm:text-xs text-slate-300 line-clamp-1">
                {current.subtitle}
              </p>
            )}
          </div>
        )}

        {/* Carousel Slide Indicators */}
        {activeBanners.length > 1 && (
          <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 bg-slate-950/70 backdrop-blur-md px-2.5 py-1 rounded-full border border-slate-700/60">
            {activeBanners.map((_, idx) => (
              <span
                key={idx}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  currentSlide === idx ? 'w-4 bg-cyan-400' : 'w-1.5 bg-slate-600'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export const HeroBanners = memo(HeroBannersComponent);
