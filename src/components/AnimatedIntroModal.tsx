import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, ArrowLeft, ArrowRight, Zap, ShieldCheck, Box, Film, Layers } from 'lucide-react';
import { Language } from '../types';
import logoImage from '../assets/images/svga_ahmed_logo_1790609432453.jpg';

interface AnimatedIntroModalProps {
  lang: Language;
  logoUrl?: string;
  onComplete?: () => void;
}

export const AnimatedIntroModal: React.FC<AnimatedIntroModalProps> = ({
  lang,
  logoUrl,
  onComplete
}) => {
  // Always show intro on page load / entry as requested
  const [isVisible, setIsVisible] = useState<boolean>(true);

  const [progress, setProgress] = useState(0);
  const [loadingStage, setLoadingStage] = useState(0);

  const displayLogo = logoUrl || logoImage || '/logo.webp';

  const stages = lang === 'ar' ? [
    'تجهيز محرّك الهدايا والمؤثرات...',
    'تهيأة محرك SVGA و Layer Render...',
    'تحميل القوالب ثلاثية الأبعاد والتصاميم...',
    'الموقع جاهز الآن لخدمتك بلمسة واحدة!'
  ] : [
    'Initializing Gift & Effects Engine...',
    'Preparing SVGA & Layer Render System...',
    'Loading 3D Templates & Motion Graphics...',
    'Site ready for ultimate experience!'
  ];

  useEffect(() => {
    if (!isVisible) return;

    // Progress timer smooth over 5.0 seconds (50ms interval x 100 steps = 5000ms)
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        const next = prev + 1;
        if (next >= 75) setLoadingStage(3);
        else if (next >= 50) setLoadingStage(2);
        else if (next >= 25) setLoadingStage(1);
        return next;
      });
    }, 50);

    const autoCloseTimer = setTimeout(() => {
      handleClose();
    }, 5000);

    return () => {
      clearInterval(interval);
      clearTimeout(autoCloseTimer);
    };
  }, [isVisible]);

  const handleClose = () => {
    setIsVisible(false);
    if (onComplete) onComplete();
  };

  if (!isVisible) return null;

  const isRtl = lang === 'ar';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, scale: 1.05, filter: 'blur(10px)', transition: { duration: 0.6, ease: 'easeInOut' } }}
        className="fixed inset-0 z-[99999] bg-[#06080e] flex flex-col items-center justify-center overflow-hidden select-none"
      >
        {/* Animated Background Gradients & Ambient Spheres */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Top Radial Glow */}
          <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-gradient-to-b from-cyan-500/20 via-purple-600/10 to-transparent rounded-full blur-[120px] animate-pulse" />

          {/* Bottom Emerald Glow */}
          <div className="absolute bottom-[-10%] left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-gradient-to-t from-emerald-500/15 via-teal-600/10 to-transparent rounded-full blur-[140px]" />

          {/* Grid Overlay */}
          <div 
            className="absolute inset-0 opacity-[0.08]"
            style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.2) 1px, transparent 0)`,
              backgroundSize: '32px 32px'
            }}
          />

          {/* Floating 3D Graphic Frames */}
          <motion.div
            animate={{
              rotateZ: [0, 360],
              rotateX: [0, 20, 0],
              scale: [0.9, 1.1, 0.9],
            }}
            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] h-[480px] sm:w-[620px] sm:h-[620px] border border-cyan-500/15 rounded-[4rem] pointer-events-none"
          />

          <motion.div
            animate={{
              rotateZ: [360, 0],
              rotateY: [0, 30, 0],
            }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[360px] h-[360px] sm:w-[480px] sm:h-[480px] border border-purple-500/20 rounded-[3rem] pointer-events-none"
          />
        </div>

        {/* Skip Button Top Right */}
        <motion.button
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          onClick={handleClose}
          className={`absolute top-6 ${isRtl ? 'left-6' : 'right-6'} z-50 px-4 py-2 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 text-xs font-bold text-slate-300 hover:text-white flex items-center gap-2 shadow-2xl backdrop-blur-md transition-all cursor-pointer group active:scale-95`}
        >
          <span>{isRtl ? 'تخطي ودخول الموقع' : 'Skip & Enter Site'}</span>
          {isRtl ? (
            <ArrowLeft className="w-4 h-4 text-cyan-400 group-hover:-translate-x-1 transition-transform" />
          ) : (
            <ArrowRight className="w-4 h-4 text-cyan-400 group-hover:translate-x-1 transition-transform" />
          )}
        </motion.button>

        {/* Central 3D Logo Stage */}
        <div className="relative z-10 flex flex-col items-center justify-center p-6 text-center max-w-lg w-full">
          {/* Logo Container with 3D perspective and light sweep */}
          <motion.div
            initial={{ scale: 0.3, opacity: 0, rotateY: -30, rotateX: 20 }}
            animate={{ 
              scale: 1, 
              opacity: 1, 
              rotateY: [0, 5, -5, 0],
              rotateX: [0, -3, 3, 0] 
            }}
            transition={{ 
              duration: 1.2, 
              ease: [0.16, 1, 0.3, 1],
              rotateY: { duration: 6, repeat: Infinity, ease: "easeInOut" },
              rotateX: { duration: 5, repeat: Infinity, ease: "easeInOut" }
            }}
            className="relative mb-8 group cursor-pointer"
            style={{ perspective: 1000 }}
          >
            {/* Ambient Ring Glow */}
            <div className="absolute -inset-4 rounded-[2.5rem] bg-gradient-to-r from-cyan-500 via-emerald-400 to-purple-600 opacity-40 blur-xl group-hover:opacity-75 transition-opacity duration-500 animate-pulse" />

            {/* Logo Box */}
            <div className="relative w-32 h-32 sm:w-40 sm:h-40 rounded-[2.2rem] bg-[#0c101d] border-2 border-cyan-400/40 p-2 shadow-[0_0_50px_rgba(6,182,212,0.3)] flex items-center justify-center overflow-hidden">
              <img
                src={displayLogo}
                alt="Site Logo"
                className="w-full h-full object-cover rounded-[1.8rem] shadow-inner"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = '/logo.png';
                }}
              />

              {/* Light Sweep Effect */}
              <motion.div
                animate={{
                  x: ['-100%', '200%'],
                }}
                transition={{
                  repeat: Infinity,
                  duration: 2.2,
                  repeatDelay: 0.8,
                  ease: 'easeInOut',
                }}
                className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 pointer-events-none"
              />
            </div>

            {/* Floating Badges surrounding 3D logo */}
            <motion.div 
              animate={{ y: [-4, 4, -4] }} 
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -top-3 -right-3 px-2.5 py-1 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 text-[10px] font-black text-white shadow-lg border border-cyan-300/40 flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3" />
              <span>3D SVGA</span>
            </motion.div>

            <motion.div 
              animate={{ y: [4, -4, 4] }} 
              transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -bottom-2 -left-3 px-2.5 py-1 rounded-full bg-slate-900/90 text-[10px] font-extrabold text-emerald-400 border border-emerald-500/40 shadow-lg flex items-center gap-1"
            >
              <Zap className="w-3 h-3 text-emerald-400" />
              <span>ULTRA HD</span>
            </motion.div>
          </motion.div>

          {/* Title & Tagline */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-2 mb-8"
          >
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-cyan-300 drop-shadow-md">
              {isRtl ? 'منصة الهدايا والمؤثرات الاحترافية' : 'Premium Gifts & Motion Studio'}
            </h1>
            <p className="text-xs sm:text-sm font-semibold text-slate-400 max-w-sm mx-auto leading-relaxed">
              {isRtl 
                ? 'عالم متكامل لتصميم ومعاينة واستخراج هدايا الفيديوهات وتأثيرات SVGA بأعلى جودة' 
                : 'Complete ecosystem for designing, viewing, and exporting SVGA gifts'}
            </p>
          </motion.div>

          {/* Feature Badges Grid */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="grid grid-cols-3 gap-2 sm:gap-3 w-full mb-8 max-w-sm"
          >
            <div className="p-2 sm:p-2.5 rounded-2xl bg-slate-900/60 border border-slate-800 text-center flex flex-col items-center justify-center gap-1">
              <Box className="w-4 h-4 text-cyan-400" />
              <span className="text-[10px] font-bold text-slate-300">{isRtl ? 'هدايا 3D' : '3D Gifts'}</span>
            </div>
            <div className="p-2 sm:p-2.5 rounded-2xl bg-slate-900/60 border border-slate-800 text-center flex flex-col items-center justify-center gap-1">
              <Layers className="w-4 h-4 text-purple-400" />
              <span className="text-[10px] font-bold text-slate-300">{isRtl ? 'محرك SVGA' : 'SVGA Engine'}</span>
            </div>
            <div className="p-2 sm:p-2.5 rounded-2xl bg-slate-900/60 border border-slate-800 text-center flex flex-col items-center justify-center gap-1">
              <Film className="w-4 h-4 text-emerald-400" />
              <span className="text-[10px] font-bold text-slate-300">{isRtl ? 'تكييش فوري' : 'Zero Lag'}</span>
            </div>
          </motion.div>

          {/* Progress Bar & Stage Description */}
          <div className="w-full max-w-sm space-y-2">
            <div className="flex justify-between items-center text-[11px] font-bold text-slate-400 px-1">
              <span className="text-cyan-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                <span>{stages[loadingStage]}</span>
              </span>
              <span className="font-mono text-cyan-300 font-extrabold">{progress}%</span>
            </div>

            {/* Glowing Bar */}
            <div className="w-full h-2.5 rounded-full bg-slate-900 border border-slate-800 p-0.5 overflow-hidden shadow-inner">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 shadow-[0_0_12px_rgba(6,182,212,0.8)]"
                style={{ width: `${progress}%` }}
                transition={{ ease: 'easeOut' }}
              />
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
