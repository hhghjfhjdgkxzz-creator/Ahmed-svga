import React from 'react';
import { 
  Sparkles, 
  Globe2, 
  Crown, 
  Package, 
  Layers
} from 'lucide-react';
import { Language } from '../types';
import { translations } from '../utils/translations';

interface SidebarProps {
  lang: Language;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  onOpenVipModal: () => void;
  categories?: { id: string; name: string; nameAr?: string }[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  lang,
  activeTab,
  setActiveTab,
  selectedCategory,
  setSelectedCategory,
  onOpenVipModal,
  categories = []
}) => {
  const t = translations[lang];

  const mainTabs = [
    { id: 'effects-store', label: t.effectsStore, icon: Sparkles, count: '5.7W+' },
    { id: 'overseas-picks', label: t.overseasPicks, icon: Globe2, count: 'HOT' },
    { id: 'vip-collection', label: t.vipCollection, icon: Crown, count: '6折' },
    { id: 'app-gift-packs', label: t.appGiftPacks, icon: Package }
  ];

  return (
    <aside className="w-60 shrink-0 hidden lg:block bg-[#0e121a]/80 border-r border-slate-800/80 p-3 h-[calc(100vh-61px)] sticky top-[61px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800">
      {/* Main Sections */}
      <div className="space-y-1 mb-5">
        {mainTabs.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                if (item.id === 'effects-store') setSelectedCategory('all');
                if (item.id === 'overseas-picks') setSelectedCategory('luxury');
                if (item.id === 'vip-collection') onOpenVipModal();
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all group ${
                isActive
                  ? 'bg-gradient-to-r from-blue-600/30 to-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/10'
                  : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-400 group-hover:text-cyan-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.count && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  item.count === 'HOT' 
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                    : item.count === '6折'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-slate-800 text-slate-400'
                }`}>
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Dynamic Categories */}
      <div className="mb-5 pt-3 border-t border-slate-800/60">
        <div className="flex items-center gap-1.5 px-3 mb-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          <Layers className="w-3.5 h-3.5 text-cyan-500" />
          <span>{lang === 'ar' ? 'الأقسام المخصصة' : '分类'}</span>
        </div>
        <div className="space-y-1">
          <div
            onClick={() => {
              setSelectedCategory('all');
              setActiveTab('effects-store');
            }}
            className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs cursor-pointer transition-colors ${
              selectedCategory === 'all'
                ? 'bg-slate-800/80 text-cyan-300 border border-slate-700/60' 
                : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-1.5 truncate">
              <span className="truncate">{lang === 'ar' ? 'القسم العام' : '通用分类'}</span>
            </div>
          </div>
          {categories.map((cat, idx) => (
            <div
              key={idx}
              onClick={() => {
                setSelectedCategory(cat.id);
                setActiveTab('effects-store');
              }}
              className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs cursor-pointer transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-slate-800/80 text-cyan-300 border border-slate-700/60' 
                  : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-1.5 truncate">
                <span className="truncate">{lang === 'ar' && cat.nameAr ? cat.nameAr : cat.name}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* VIP Upgrade Promo Card - 100% clone of the sidebar widget in video */}
      <div 
        onClick={onOpenVipModal}
        className="relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-900/60 via-indigo-950/60 to-purple-950/60 p-3.5 border border-cyan-500/30 shadow-lg cursor-pointer group hover:border-cyan-400/60 transition-all"
      >
        <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-cyan-500/10 rounded-full blur-xl group-hover:bg-cyan-500/20 transition-all"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-1.5 text-cyan-300 font-bold text-xs mb-1">
            <Crown className="w-4 h-4 text-amber-400" />
            <span>{t.vipPromoTitle}</span>
          </div>
          <p className="text-[11px] text-slate-300 mb-2.5 leading-relaxed">
            {t.vipPromoSub}
          </p>
          <button className="w-full py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-semibold shadow-md transition-all">
            {t.vipPromoBtn}
          </button>
        </div>
      </div>
    </aside>
  );
};
