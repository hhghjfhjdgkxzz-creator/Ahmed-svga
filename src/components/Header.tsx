import React, { useState, memo } from 'react';
import { 
  Search, 
  ShoppingCart, 
  Headphones, 
  LayoutDashboard, 
  Store, 
  PackageCheck,
  ChevronDown,
  MessageCircle,
  Sparkles,
  Info,
  RotateCcw,
  SlidersHorizontal,
  Phone,
  User as UserIcon,
  LogOut
} from 'lucide-react';
import { Language, CartItem, AuthUser, SiteSettings } from '../types';
import { translations } from '../utils/translations';
import { AboutModal } from './AboutModal';
import { LanguageModal } from './LanguageModal';

export interface HeaderProps {
  lang: Language;
  setLang: (lang: Language) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onSearch: () => void;
  currentView: 'store' | 'dashboard';
  setCurrentView: (view: 'store' | 'dashboard') => void;
  cartItems: CartItem[];
  setIsCartOpen: (open: boolean) => void;
  setIsAuthOpen: (open: boolean) => void;
  onOpenStaffAuth: () => void;
  onLogout: () => void;
  setIsDeliveriesOpen: (open: boolean) => void;
  setIsSupportOpen: (open: boolean) => void;
  user: AuthUser | null;
  siteSettings?: SiteSettings;
  onResetFilters?: () => void;
  onOpenSiteSettings?: () => void;
}

const HeaderComponent: React.FC<HeaderProps> = ({
  lang,
  setLang,
  searchQuery,
  setSearchQuery,
  onSearch,
  currentView,
  setCurrentView,
  cartItems = [],
  setIsCartOpen,
  setIsAuthOpen,
  onOpenStaffAuth,
  onLogout,
  setIsDeliveriesOpen,
  setIsSupportOpen,
  user,
  siteSettings,
  onResetFilters,
  onOpenSiteSettings
}) => {
  const t = translations[lang];
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);

  const brandName = siteSettings?.siteName?.trim() || 'Destroy KING Designer';
  const primaryPhone = siteSettings?.primaryPhone || siteSettings?.whatsapp || '+923400700013';
  const primaryLabel = siteSettings?.primaryPhoneLabel || 'WhatsApp';
  const cleanPrimary = primaryPhone.replace(/[^0-9]/g, '');

  const secondaryPhone = siteSettings?.secondaryPhone || siteSettings?.secondaryWhatsapp || '';
  const secondaryLabel = siteSettings?.secondaryPhoneLabel || (lang === 'ar' ? 'واتساب 2' : 'WhatsApp 2');
  const cleanSecondary = secondaryPhone.replace(/[^0-9]/g, '');

  const langLabels: Record<Language, string> = {
    en: 'English',
    zh: '中文',
    ar: 'العربية'
  };

  const handleDashboardToggle = () => {
    if (!user) {
      onOpenStaffAuth();
      return;
    }
    const hasUploadPermission = user.permissions?.giftUploadAndPublish;
    const isAdmin = user.role === 'admin' || user.role === 'employee' || user.role === 'designer';
    
    if (!isAdmin && !hasUploadPermission) {
      alert(lang === 'ar' 
        ? '⚠️ ليس لديك صلاحية للدخول إلى لوحة التحكم. يمكنك طلب ترقية حسابك من الإدارة.' 
        : '您没有权限进入控制台。');
      return;
    }
    setCurrentView(currentView === 'store' ? 'dashboard' : 'store');
  };

  const handleBackToWebsite = () => {
    if (currentView === 'dashboard') {
      setCurrentView('store');
    }
    if (onResetFilters) {
      onResetFilters();
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <header className="w-full bg-[#0a0d14] border-b border-slate-800/80 pt-2.5 pb-2.5 px-3 sm:px-6 transition-all sticky top-0 z-30 backdrop-blur-md bg-[#0a0d14]/95">
        <div className="max-w-[1720px] mx-auto flex flex-col gap-2">
          
          {/* Main Top Row: Brand Info + Primary Actions */}
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            {/* Brand Logo & Name */}
            <div 
              onClick={handleBackToWebsite}
              className="flex items-center gap-2 sm:gap-3 cursor-pointer group shrink-0"
            >
              {siteSettings?.logoUrl ? (
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden border-2 border-amber-400/80 shadow-md shadow-amber-500/20 group-hover:scale-105 transition-transform bg-slate-900 shrink-0">
                  <img
                    src={siteSettings.logoUrl}
                    alt={brandName}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-amber-400 via-amber-600 to-yellow-600 p-0.5 shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform shrink-0">
                  <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center overflow-hidden">
                    <span className="text-xs sm:text-sm font-black text-amber-300">👑</span>
                  </div>
                </div>
              )}

              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-sm sm:text-base text-white tracking-wide group-hover:text-cyan-400 transition-colors truncate">
                    {brandName}
                  </span>
                  {/* Site Settings Edit Button - ONLY visible to logged-in Admin/Staff */}
                  {onOpenSiteSettings && user && (user.role === 'admin' || user.role === 'employee' || user.role === 'designer' || user.permissions?.siteSettings) && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenSiteSettings();
                      }}
                      className="p-1 rounded-lg text-slate-500 hover:text-amber-400 hover:bg-slate-800 transition-colors cursor-pointer"
                      title={lang === 'ar' ? 'تعديل لوجو واسم الموقع وأرقام التواصل (للمدير فقط)' : 'Edit site info (Admin only)'}
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Primary WhatsApp Link */}
                <a
                  href={`https://wa.me/${cleanPrimary}?text=${encodeURIComponent(
                    lang === 'ar'
                      ? 'مرحباً، أود الاستفسار عن تصاميم ومؤثرات البث المباشر.'
                      : 'Hello, I want to inquire about your live stream designs.'
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 transition-colors font-mono"
                  dir="ltr"
                >
                  <MessageCircle className="w-3 h-3 fill-current text-emerald-400 shrink-0" />
                  <span className="truncate">{primaryLabel}: {primaryPhone}</span>
                </a>
              </div>
            </div>

            {/* Desktop Search in Top Row */}
            <div className="hidden md:flex flex-1 max-w-md mx-2">
              <div className="relative w-full">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t.searchDesigns}
                  className="w-full h-9 px-3.5 pr-9 rounded-xl bg-[#131722] border border-slate-800 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500/80 transition-all shadow-inner"
                />
                <button
                  type="button"
                  onClick={onSearch}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-cyan-400 transition-colors cursor-pointer"
                  aria-label="Search"
                >
                  <Search className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* System Shortcuts */}
            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              {/* Language Selector */}
              <button
                onClick={() => setIsLangOpen(true)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 text-xs font-medium border border-slate-800 transition-colors cursor-pointer"
                title={lang === 'ar' ? 'تغيير اللغة' : 'Change Language'}
              >
                <span className="text-cyan-400 font-semibold">{langLabels[lang]}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {/* Support / Help */}
              <button
                onClick={() => setIsSupportOpen(true)}
                className="p-2 sm:px-2.5 sm:py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 border border-slate-800 transition-colors flex items-center gap-1 text-xs cursor-pointer"
                title={t.contactSupport}
              >
                <Headphones className="w-4 h-4 text-cyan-400" />
                <span className="hidden lg:inline text-[11px] font-medium">{t.contactSupport}</span>
              </button>

              {/* Deliveries Box shortcut */}
              <button
                onClick={() => setIsDeliveriesOpen(true)}
                className="p-2 sm:px-2.5 sm:py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors flex items-center gap-1 text-xs cursor-pointer"
                title={t.myDeliveries}
              >
                <PackageCheck className="w-4 h-4 text-emerald-400" />
                <span className="hidden xl:inline text-[11px] font-medium">{t.myDeliveries}</span>
              </button>

              {/* Cart Drawer shortcut */}
              {(cartItems?.length || 0) > 0 && (
                <button
                  onClick={() => setIsCartOpen(true)}
                  className="relative p-2 sm:px-2.5 sm:py-1.5 rounded-xl bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border border-cyan-800/80 transition-colors flex items-center gap-1 text-xs cursor-pointer"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span className="font-bold text-[11px]">{cartItems?.length || 0}</span>
                </button>
              )}

              {/* User Account / Login Button */}
              {user ? (
                <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-800 rounded-xl p-0.5 sm:p-1">
                  <div 
                    onClick={() => {
                      if (user.role === 'admin' || user.role === 'designer' || user.role === 'employee') {
                        handleDashboardToggle();
                      }
                    }}
                    className="flex items-center gap-1.5 px-1.5 py-0.5 cursor-pointer hover:opacity-90 transition-opacity"
                    title={user.name}
                  >
                    <div className="w-5 h-5 rounded-full bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center text-[10px] text-cyan-300 font-bold shrink-0">
                      {user.avatar ? (
                        <img src={user.avatar} alt={user.name} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        user.name.charAt(0)
                      )}
                    </div>
                    <span className="text-[11px] font-semibold text-slate-200 hidden sm:inline max-w-[80px] truncate">
                      {user.name}
                    </span>
                  </div>
                  <button
                    onClick={onLogout}
                    className="p-1 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                    title={lang === 'ar' ? 'تسجيل الخروج' : 'Logout'}
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsAuthOpen(true)}
                  className="p-2 sm:px-2.5 sm:py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 border border-slate-800 transition-colors flex items-center gap-1 text-xs cursor-pointer"
                  title={lang === 'ar' ? 'تسجيل الدخول' : 'Login'}
                >
                  <UserIcon className="w-4 h-4 text-cyan-400" />
                  <span className="hidden sm:inline text-[11px] font-medium">
                    {lang === 'ar' ? 'تسجيل الدخول' : 'Login'}
                  </span>
                </button>
              )}

              {/* Staff / Admin Dashboard Toggle */}
              {user && (
                user.role === 'admin' || 
                user.role === 'designer' || 
                user.permissions?.giftUploadAndPublish || 
                user.permissions?.viewOrders
              ) && (
                <button
                  onClick={handleDashboardToggle}
                  onMouseEnter={() => {
                    import('./Dashboard').catch(() => {});
                  }}
                  className={`p-2 sm:px-2.5 sm:py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1 cursor-pointer ${
                    currentView === 'dashboard'
                      ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-800'
                  }`}
                  title={currentView === 'dashboard' ? t.backToStore : t.dashboard}
                >
                  {currentView === 'dashboard' ? (
                    <>
                      <Store className="w-4 h-4 text-cyan-400" />
                      <span className="hidden md:inline text-[11px]">{t.backToStore}</span>
                    </>
                  ) : (
                    <>
                      <LayoutDashboard className="w-4 h-4 text-cyan-400" />
                      <span className="hidden md:inline text-[11px]">{t.dashboard}</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Mobile Search Row (visible only on mobile screens < md) */}
          <div className="flex md:hidden items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.searchDesigns}
                className="w-full h-9 px-3 pr-8 rounded-xl bg-[#131722] border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500/80 transition-all"
              />
              <button
                type="button"
                onClick={onSearch}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-cyan-400"
                aria-label="Search"
              >
                <Search className="w-3.5 h-3.5" />
              </button>
            </div>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="px-2 py-1 rounded-lg bg-slate-900 text-slate-400 hover:text-white text-[11px] border border-slate-800 shrink-0"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Modals for About Us and Language */}
      <AboutModal
        isOpen={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
        lang={lang}
        siteSettings={siteSettings}
        onOpenContact={() => {
          setIsAboutOpen(false);
          setIsSupportOpen(true);
        }}
      />

      <LanguageModal
        isOpen={isLangOpen}
        onClose={() => setIsLangOpen(false)}
        lang={lang}
        setLang={setLang}
      />
    </>
  );
};

export const Header = memo(HeaderComponent);
