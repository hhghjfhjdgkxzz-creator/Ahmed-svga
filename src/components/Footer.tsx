import React from 'react';
import { ShieldCheck, Heart } from 'lucide-react';
import { Language } from '../types';
import { translations } from '../utils/translations';

interface FooterProps {
  lang: Language;
  onOpenSupport: () => void;
  onOpenTool: (name: string) => void;
}

export const Footer: React.FC<FooterProps> = ({
  lang,
  onOpenSupport,
  onOpenTool
}) => {
  const t = translations[lang];

  return (
    <footer className="w-full bg-[#07090e] border-t border-slate-900 text-xs text-slate-500 py-6 px-4 mt-8 select-none">
      <div className="max-w-[1720px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-start">
        <div className="flex items-center gap-2 text-[11px] text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            {lang === 'ar'
              ? '© 2026 جميع الحقوق محفوظة · تصاميم هدايا ومؤثرات البث المباشر الأصلية والمرخصة'
              : '© 2026 All Rights Reserved · Licensed Live Stream VFX & Animation Studio'}
          </span>
        </div>

        <div className="flex items-center gap-3 text-[11px] text-slate-400">
          <button 
            onClick={onOpenSupport}
            className="hover:text-cyan-400 transition-colors"
          >
            {t.contactSupport}
          </button>
          <span>·</span>
          <button 
            onClick={onOpenSupport}
            className="hover:text-cyan-400 transition-colors"
          >
            {t.aboutUs}
          </button>
        </div>
      </div>
    </footer>
  );
};
