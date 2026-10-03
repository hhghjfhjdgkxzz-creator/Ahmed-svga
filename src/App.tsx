import React, { useState, useEffect, useMemo, useCallback, Suspense, lazy } from 'react';
import { GiftItem, Language, CartItem, DeliveryItem, EmployeeUser, AuthUser, HeroBannerItem, SiteSettings } from './types';
import { INITIAL_EMPLOYEES } from './data/initialEmployees';
import { INITIAL_BANNERS } from './data/initialBanners';
import { REAL_GIFTS_CATALOG } from './data/realGiftsCatalog';
import { Header } from './components/Header';
import { HeroBanners } from './components/HeroBanners';
import { CategoryBar } from './components/CategoryBar';
import { GiftCard } from './components/GiftCard';
import { Pagination } from './components/Pagination';
import { Footer } from './components/Footer';
import { 
  seedDatabase, 
  subscribeToGifts, 
  subscribeToDeliveries, 
  subscribeToEmployees, 
  subscribeToUsers,
  subscribeToBanners, 
  subscribeToCategories,
  subscribeToSiteSettings,
  addDelivery, 
  purgeDummyGifts, 
  isDummyGift 
} from './lib/firebaseService';
import { preloadImagesBatch } from './utils/imageCache';

// Code-split heavy administration & modals for instant initial page loading and zero lag
const Dashboard = lazy(() => import('./components/Dashboard').then(m => ({ default: m.Dashboard })));
const GiftModal = lazy(() => import('./components/GiftModal').then(m => ({ default: m.GiftModal })));
const PurchaseModal = lazy(() => import('./components/PurchaseModal').then(m => ({ default: m.PurchaseModal })));
const DeliveryBoxModal = lazy(() => import('./components/DeliveryBoxModal').then(m => ({ default: m.DeliveryBoxModal })));
const CartDrawer = lazy(() => import('./components/CartDrawer').then(m => ({ default: m.CartDrawer })));
const AuthModal = lazy(() => import('./components/AuthModal').then(m => ({ default: m.AuthModal })));
const SupportModal = lazy(() => import('./components/SupportModal').then(m => ({ default: m.SupportModal })));
const VipModal = lazy(() => import('./components/VipModal').then(m => ({ default: m.VipModal })));
const SiteSettingsModal = lazy(() => import('./components/SiteSettingsModal').then(m => ({ default: m.SiteSettingsModal })));

export default function App() {
  // Language (Default to Arabic with instant RTL toggle)
  const [lang, setLang] = useState<Language>('ar');

  // Sync HTML document direction and language dynamically
  useEffect(() => {
    document.documentElement.lang = lang === 'ar' ? 'ar' : lang === 'zh' ? 'zh-CN' : 'en';
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);

  // Main View: Storefront vs Admin Dashboard
  const [currentView, setCurrentView] = useState<'store' | 'dashboard'>('store');

  // Gifts State with Firebase persistence - loads real gifts immediately on frame 1 with ZERO delay!
  const [gifts, setGifts] = useState<GiftItem[]>(() => {
    try {
      const cached = localStorage.getItem('jiawei_custom_gifts_v1');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          const clean = parsed.filter(g => !isDummyGift(g));
          if (clean.length > 0) return clean;
        }
      }
    } catch(e) {}
    return REAL_GIFTS_CATALOG.filter(g => !isDummyGift(g));
  });

  // Pre-warm initial gifts posters into browser cache
  useEffect(() => {
    if (Array.isArray(gifts) && gifts.length > 0) {
      const topUrls = gifts.slice(0, 6).map(g => g.posterUrl).filter(Boolean);
      preloadImagesBatch(topUrls, 6);
    }
  }, [gifts]);

  useEffect(() => {
    // Purge any dummy test gifts immediately on app mount
    purgeDummyGifts().catch(() => {});

    // Save clean real catalog to localStorage for persistent offline/instant loads
    try {
      const current = localStorage.getItem('jiawei_custom_gifts_v1');
      if (!current || JSON.parse(current).length === 0) {
        localStorage.setItem('jiawei_custom_gifts_v1', JSON.stringify(REAL_GIFTS_CATALOG));
      }
    } catch(e) {}

    // Real-time synchronization in background without blinking or skeleton
    const unsubscribe = subscribeToGifts((newGifts) => {
      if (newGifts && newGifts.length > 0) {
        setGifts(newGifts.filter(g => !isDummyGift(g)));
      }
    });
    return () => unsubscribe();
  }, []);

  // Purchased Deliveries History
  const [deliveries, setDeliveries] = useState<DeliveryItem[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeToDeliveries((newDeliveries) => {
      setDeliveries(newDeliveries);
    });
    return () => unsubscribe();
  }, []);

  // Employees / Creators State with Firebase persistence
  const [employees, setEmployees] = useState<EmployeeUser[]>(INITIAL_EMPLOYEES);

  useEffect(() => {
    let currentEmployees: EmployeeUser[] = [];
    let currentUsers: EmployeeUser[] = [];

    const updateCombined = () => {
      const combined = [...currentEmployees, ...currentUsers];
      const unique = Array.from(new Map(combined.map(item => [item.id, item])).values());
      if (unique.length > 0) {
        setEmployees(unique);
      } else {
        setEmployees(INITIAL_EMPLOYEES);
      }
    };

    const unsubEmployees = subscribeToEmployees((newEmployees) => {
      currentEmployees = newEmployees;
      updateCombined();
    });
    const unsubUsers = subscribeToUsers((newUsers) => {
      currentUsers = newUsers;
      updateCombined();
    });

    return () => {
      unsubEmployees();
      unsubUsers();
    };
  }, []);

  // Hero Banners State
  const [banners, setBanners] = useState<HeroBannerItem[]>(INITIAL_BANNERS);

  useEffect(() => {
    const unsubscribe = subscribeToBanners((newBanners) => {
      if (newBanners && newBanners.length > 0) {
        setBanners(newBanners);
      }
    });
    return () => unsubscribe();
  }, []);

  const [activeEmployeeId, setActiveEmployeeId] = useState<string>(() => {
    const savedEmp = localStorage.getItem('jiawei_active_emp_id');
    const savedUserStr = localStorage.getItem('jiawei_current_user_v1');
    if (savedUserStr) {
      try {
        const u = JSON.parse(savedUserStr);
        if (u && ['admin', 'designer', 'employee'].includes(u.role)) {
          if (!savedEmp || savedEmp === 'EMP-001') {
            return u.employeeId || u.id;
          }
        }
      } catch(e) {}
    }
    return savedEmp || 'EMP-001';
  });

  useEffect(() => {
    localStorage.setItem('jiawei_active_emp_id', activeEmployeeId);
  }, [activeEmployeeId]);

  // Seed database once per browser session in background without blocking
  useEffect(() => {
    try {
      if (!sessionStorage.getItem('jiawei_db_seeded')) {
        sessionStorage.setItem('jiawei_db_seeded', '1');
        seedDatabase().catch(() => {});
      }
    } catch {
      seedDatabase().catch(() => {});
    }
  }, []);

  // Cart State
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  // User Authentication State
  const [user, setUser] = useState<AuthUser | null>(() => {
    const saved = localStorage.getItem('jiawei_current_user_v1');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  // Pre-warm dashboard chunk if user is administrator
  useEffect(() => {
    if (user && ['admin', 'designer', 'employee'].includes(user.role)) {
      import('./components/Dashboard').catch(() => {});
    }
  }, [user]);

  // Dynamic Categories & Site Settings State
  const [categories, setCategories] = useState<{ id: string; name: string; nameAr?: string; nameEn?: string }[]>([]);
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(() => {
    const cached = localStorage.getItem('jiawei_site_settings');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {}
    }
    return {
      siteName: 'Destroy KING Designer',
      primaryPhone: '+923400700013',
      whatsapp: '+923400700013',
      primaryPhoneLabel: 'WhatsApp',
      secondaryPhone: '',
      secondaryPhoneLabel: 'WhatsApp 2'
    };
  });
  const [isSiteSettingsOpen, setIsSiteSettingsOpen] = useState(false);

  useEffect(() => {
    const unsubCategories = subscribeToCategories((newCategories) => {
      setCategories(newCategories);
    });
    const unsubSettings = subscribeToSiteSettings((settings) => {
      if (settings) setSiteSettings(settings);
    });
    return () => {
      unsubCategories();
      unsubSettings();
    };
  }, []);

  useEffect(() => {
    if (user) {
      localStorage.setItem('jiawei_current_user_v1', JSON.stringify(user));
    } else {
      localStorage.removeItem('jiawei_current_user_v1');
    }
  }, [user]);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState('all');

  // Modals & Purchase Gate
  const [selectedGift, setSelectedGift] = useState<GiftItem | null>(null);
  const [inspectedGift, setInspectedGift] = useState<GiftItem | null>(null);
  const [purchaseGift, setPurchaseGift] = useState<GiftItem | null>(null);
  const [pendingPurchaseGift, setPendingPurchaseGift] = useState<GiftItem | null>(null);
  const [activeDelivery, setActiveDelivery] = useState<DeliveryItem | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authInitialRole, setAuthInitialRole] = useState<'buyer' | 'staff'>('buyer');
  const [isDeliveriesOpen, setIsDeliveriesOpen] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [isVipOpen, setIsVipOpen] = useState(false);

  // Pagination State: Configurable from Dashboard siteSettings (default 26)!
  const ITEMS_PER_PAGE = Math.max(1, siteSettings?.giftsPerPage || 26);
  const [currentPage, setCurrentPage] = useState(1);

  // Deduplicate and stable-sort gifts (newest first, avoids duplicates across pages)
  const uniqueGifts = useMemo(() => {
    const map = new Map<string, GiftItem>();
    (Array.isArray(gifts) ? gifts : []).forEach((g) => {
      if (g && g.id && !map.has(g.id)) {
        map.set(g.id, g);
      }
    });
    const list = Array.from(map.values());
    list.sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (timeA && timeB && timeA !== timeB) return timeB - timeA;
      return (b.id || '').localeCompare(a.id || '');
    });
    return list;
  }, [gifts]);

  // Filter Logic
  const filteredGifts = useMemo(() => {
    return (uniqueGifts || []).filter((gift) => {
      if (!gift) return false;

      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = (gift.title || '').toLowerCase().includes(q);
        const matchAr = (gift.titleAr || '').toLowerCase().includes(q);
        const matchEn = (gift.titleEn || '').toLowerCase().includes(q);
        const matchId = (gift.id || '').toLowerCase().includes(q);
        const matchTheme = (gift.theme || '').toLowerCase().includes(q);
        const matchFormat = gift.formats?.some(f => (f.name || '').toLowerCase().includes(q));
        if (!matchTitle && !matchAr && !matchEn && !matchId && !matchTheme && !matchFormat) return false;
      }

      // Category matching
      if (category !== 'all') {
        const giftCat = (gift.category || '').toLowerCase();
        const selectedCat = category.toLowerCase();
        
        if (selectedCat === 'frames') {
          if (giftCat !== 'frames' && !giftCat.includes('frame') && !gift.title?.includes('إطار') && !gift.titleAr?.includes('إطار')) return false;
        } else if (selectedCat === 'luxury_frame') {
          if (giftCat !== 'luxury_frame' && !(giftCat.includes('luxury') && giftCat.includes('frame')) && !gift.titleAr?.includes('إطار فاخر')) return false;
        } else if (selectedCat === 'medals') {
          if (giftCat !== 'medals' && !giftCat.includes('medal') && !giftCat.includes('badge') && !gift.titleAr?.includes('وسام') && !gift.titleAr?.includes('شارة')) return false;
        } else if (selectedCat === 'chat_bubbles') {
          if (giftCat !== 'chat_bubbles' && !giftCat.includes('bubble') && !giftCat.includes('chat') && !gift.titleAr?.includes('فقاع')) return false;
        } else if (selectedCat === 'luxury') {
          if (giftCat !== 'luxury' && !giftCat.includes('luxury') && !gift.titleAr?.includes('فاخر')) return false;
        } else if (selectedCat === 'levels') {
          if (giftCat !== 'levels' && !giftCat.includes('level') && !gift.titleAr?.includes('مستوى')) return false;
        } else if (selectedCat === 'banners') {
          if (giftCat !== 'banners' && !giftCat.includes('banner') && !gift.titleAr?.includes('بانر')) return false;
        } else if (selectedCat === 'management') {
          if (giftCat !== 'management' && !giftCat.includes('manage') && !gift.titleAr?.includes('إدارة')) return false;
        } else if (selectedCat === 'romance') {
          if (giftCat !== 'romance' && !giftCat.includes('roman') && !gift.titleAr?.includes('رومانسي') && !gift.titleAr?.includes('عشاق')) return false;
        } else if (selectedCat === 'tech') {
          if (giftCat !== 'tech' && !giftCat.includes('tech') && !giftCat.includes('sci') && !gift.titleAr?.includes('ميكا')) return false;
        } else {
          if (giftCat !== selectedCat) return false;
        }
      }

      return true;
    });
  }, [uniqueGifts, searchQuery, category]);

  // Reset pagination when filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [category, searchQuery]);

  // Set default inspected gift
  useEffect(() => {
    if (!inspectedGift && (filteredGifts?.length || 0) > 0) {
      setInspectedGift(filteredGifts[0]);
    }
  }, [filteredGifts, inspectedGift]);

  // Paginated gifts slice: Exactly 26 items per page!
  const totalPages = Math.max(1, Math.ceil((filteredGifts?.length || 0) / ITEMS_PER_PAGE));

  // Automatically clamp currentPage if totalPages shrinks
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const paginatedGifts = useMemo(() => {
    const list = Array.isArray(filteredGifts) ? filteredGifts : [];
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return list.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredGifts, currentPage, ITEMS_PER_PAGE]);

  const handleResetFilters = useCallback(() => {
    setCategory('all');
    setSearchQuery('');
    setCurrentPage(1);
  }, []);

  const generateWhatsAppLink = (gift: GiftItem, quantity: number = 1) => {
    const phone = siteSettings?.whatsapp || gift.author?.whatsapp || '+923400700013';
    const total = gift.price * quantity;
    
    const messageAr = `مرحبًا، أريد شراء هذا التصميم من الموقع.

اسم التصميم: ${gift.titleAr || gift.title}
كود الهدية ID: ${gift.id}
السعر: $${gift.price} USD
الصيغة: ${gift.formats?.[0]?.name || 'SVGA'}
الكمية: ${quantity}
الإجمالي: $${total} USD
${user ? `
اسم الحساب: ${user.name}
ID الحساب: ${user.id}` : ''}
`;

    const encodedMessage = encodeURIComponent(messageAr);
    return `https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${encodedMessage}`;
  };

  const handleAddToCart = useCallback((gift: GiftItem) => {
    window.open(generateWhatsAppLink(gift, 1), '_blank');
  }, [siteSettings, user]);

  const handleRemoveFromCart = useCallback((index: number) => {
    setCartItems((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleInitiatePurchase = useCallback((gift: GiftItem) => {
    window.open(generateWhatsAppLink(gift, 1), '_blank');
  }, [siteSettings, user]);

  const handleCheckoutAll = useCallback(() => {
    if (cartItems.length === 0) return;
    const phone = siteSettings?.whatsapp || '+923400700013';
    let totalAll = 0;
    let messageAr = `مرحبًا، أريد شراء هذه التصاميم من الموقع.\n\n`;
    
    cartItems.forEach((item, index) => {
      totalAll += item.price;
      messageAr += `${index + 1}. ${item.gift.titleAr || item.gift.title} (ID: ${item.gift.id}) - $${item.price} USD\n`;
    });
    
    messageAr += `\nالإجمالي الكلي: $${totalAll} USD\n`;
    if (user) {
      messageAr += `\nاسم الحساب: ${user.name}\nID الحساب: ${user.id}\n`;
    }

    const encodedMessage = encodeURIComponent(messageAr);
    window.open(`https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${encodedMessage}`, '_blank');
    setIsCartOpen(false);
    setCartItems([]);
  }, [cartItems, siteSettings, user]);

  const handleAuthSuccess = useCallback((authUser: AuthUser) => {
    setUser(authUser);
    localStorage.setItem('jiawei_current_user_v1', JSON.stringify(authUser));
    setIsAuthOpen(false);

    if (pendingPurchaseGift) {
      setPurchaseGift(pendingPurchaseGift);
      setPendingPurchaseGift(null);
    } else if (['admin', 'designer', 'employee'].includes(authUser.role)) {
      if (authUser.employeeId) {
        setActiveEmployeeId(authUser.employeeId);
      } else {
        setActiveEmployeeId(authUser.id);
      }
      setCurrentView('dashboard');
    }
  }, [pendingPurchaseGift]);

  const handleLogout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('jiawei_current_user_v1');
    setCurrentView('store');
  }, []);

  const handleStaffLogin = useCallback((emp: EmployeeUser) => {
    const staffUser: AuthUser = {
      id: emp.id,
      name: emp.name,
      email: emp.email,
      role: emp.role,
      status: emp.status || 'active',
      permissions: emp.permissions || {
        giftUploadAndPublish: emp.role === 'admin' || emp.role === 'designer',
        manageAccounts: emp.role === 'admin',
        manageBanners: emp.role === 'admin',
        viewOrders: true
      },
      avatar: emp.avatar,
      whatsapp: emp.whatsapp,
      employeeId: emp.id,
      isTrial: false,
      lastLogin: new Date().toISOString()
    };
    setUser(staffUser);
    localStorage.setItem('jiawei_current_user_v1', JSON.stringify(staffUser));
    setActiveEmployeeId(emp.id);
  }, []);

  const handlePaymentSuccess = useCallback(async (newDelivery: DeliveryItem) => {
    await addDelivery(newDelivery);
    setPurchaseGift(null);
    setSelectedGift(null);
    setActiveDelivery(newDelivery);
  }, []);

  const handleQuickCategorySelect = useCallback((key: string) => {
    if (key === 'vip') setIsVipOpen(true);
    if (key === 'featured') {
      setCategory('all');
    } else {
      setCategory(key);
    }
  }, []);

  const handleSelectGift = useCallback((g: GiftItem) => {
    setInspectedGift(g);
    setSelectedGift(g);
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    const el = document.getElementById('gifts-gallery-section');
    if (el) {
      const y = el.getBoundingClientRect().top + window.pageYOffset - 85;
      window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 250, behavior: 'smooth' });
    }
  }, []);

  // Smart background prefetching for the hovered / targeted pagination page
  const handlePrefetchPage = useCallback((page: number) => {
    if (!filteredGifts || filteredGifts.length === 0) return;
    const start = (page - 1) * ITEMS_PER_PAGE;
    const nextSlice = filteredGifts.slice(start, start + 6);
    const urls = nextSlice.map(g => g.posterUrl).filter(Boolean);
    preloadImagesBatch(urls, 6);
  }, [filteredGifts, ITEMS_PER_PAGE]);

  return (
    <div className={`min-h-screen flex flex-col bg-[#07090e] text-slate-100 font-sans selection:bg-cyan-500 selection:text-black ${lang === 'ar' ? 'rtl font-[Cairo]' : 'ltr'}`}>
      {/* 1. Header (Mobile First, Exactly Like Reference Video) */}
      <Header
        lang={lang}
        setLang={setLang}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onSearch={() => {}}
        currentView={currentView}
        setCurrentView={setCurrentView}
        cartItems={cartItems}
        setIsCartOpen={setIsCartOpen}
        setIsAuthOpen={setIsAuthOpen}
        onOpenStaffAuth={() => {
          setAuthInitialRole('staff');
          setIsAuthOpen(true);
        }}
        onLogout={handleLogout}
        setIsDeliveriesOpen={setIsDeliveriesOpen}
        setIsSupportOpen={setIsSupportOpen}
        user={user}
        siteSettings={siteSettings}
        onResetFilters={handleResetFilters}
        onOpenSiteSettings={() => setIsSiteSettingsOpen(true)}
      />

      {/* 2. Main Body Content */}
      {currentView === 'store' ? (
        <main className="flex-1 w-full max-w-[1720px] mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-2 sm:py-4 flex flex-col min-w-0 overflow-x-hidden">
          {/* Gallery Title, Subtitle & Featured Banner */}
          <HeroBanners
            lang={lang}
            banners={banners}
            onSelectQuickCategory={handleQuickCategorySelect}
            onOpenCustomDesignModal={() => setIsSupportOpen(true)}
            siteSettings={siteSettings}
          />

          {/* Horizontal Scrollable Categories Bar */}
          <CategoryBar
            selectedCategory={category}
            onSelectCategory={setCategory}
            categories={categories}
            lang={lang}
          />

          {/* Design Cards Grid Section */}
          <section id="gifts-gallery-section" className="w-full flex flex-col scroll-mt-20">
            {(filteredGifts?.length || 0) === 0 ? (
              <div className="py-20 text-center text-slate-500 space-y-3">
                <p className="text-sm">
                  {lang === 'ar' ? 'لم يتم العثور على تصاميم تطابق خيارات التصفية' : '未找到匹配的设计或动效'}
                </p>
                <button
                  onClick={handleResetFilters}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-cyan-400 text-xs font-semibold border border-slate-800 cursor-pointer"
                >
                  {lang === 'ar' ? 'إعادة ضبط البحث' : '重置搜索与分类'}
                </button>
              </div>
            ) : (
              <>
                {/* Clean Responsive Cards Grid with priority eager loading for first 4 cards */}
                <div className="grid grid-cols-2 min-[480px]:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4 md:gap-5 mt-4">
                  {paginatedGifts.map((gift, idx) => (
                    <GiftCard
                      key={gift.id}
                      gift={gift}
                      priority={idx < 4}
                      lang={lang}
                      isSelected={inspectedGift?.id === gift.id}
                      onSelectGift={handleSelectGift}
                      onQuickBuy={handleInitiatePurchase}
                      onAddToCart={handleAddToCart}
                    />
                  ))}
                </div>

                {/* Pagination Controls with smart prefetching */}
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={filteredGifts.length}
                  itemsPerPage={ITEMS_PER_PAGE}
                  onPageChange={handlePageChange}
                  onPrefetchPage={handlePrefetchPage}
                  lang={lang}
                />
              </>
            )}
          </section>
        </main>
      ) : (
        /* DASHBOARD VIEW (Admin / Staff with Full Permissions) */
        <main className="flex-1 w-full">
          {(!user || (!['admin', 'employee', 'designer'].includes(user.role) && !user.permissions?.giftUploadAndPublish)) ? (
            <div className="max-w-xl mx-auto my-16 p-8 rounded-3xl bg-[#111520] border border-slate-800 text-center space-y-5 shadow-2xl">
              <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mx-auto text-cyan-400">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-black text-white">
                  {lang === 'ar' ? 'منطقة لوحة التحكم خاصة بالمسؤولين والمصرح لهم فقط' : '管理后台仅对超级管理员或授权用户开放'}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed max-w-md mx-auto">
                  {lang === 'ar'
                    ? 'يتطلب الوصول إلى لوحة التحكم تسجيل الدخول بحساب معتمد بصلاحيات لإدارة ونشر الهدايا.'
                    : '访问管理后台需要使用拥有完整权限的账号登录。'}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setAuthInitialRole('staff');
                    setIsAuthOpen(true);
                  }}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-cyan-500/20"
                >
                  {lang === 'ar' ? 'تسجيل الدخول' : '管理员登录'}
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentView('store')}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700"
                >
                  {lang === 'ar' ? 'العودة للمتجر' : '返回素材商城'}
                </button>
              </div>
            </div>
          ) : (
            <Suspense fallback={
              <div className="min-h-[400px] flex flex-col items-center justify-center gap-3 text-slate-400">
                <div className="w-10 h-10 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-mono">{lang === 'ar' ? 'جارٍ تحميل لوحة التحكم...' : 'Loading Dashboard...'}</span>
              </div>
            }>
              <Dashboard
                lang={lang}
                gifts={gifts}
                setGifts={setGifts}
                onPreviewGift={(g) => setSelectedGift(g)}
                deliveries={deliveries}
                setDeliveries={setDeliveries}
                onOpenDeliveryBox={(d) => setActiveDelivery(d)}
                employees={employees}
                setEmployees={setEmployees}
                activeEmployeeId={activeEmployeeId}
                setActiveEmployeeId={setActiveEmployeeId}
                onStaffLogin={handleStaffLogin}
                banners={banners}
                setBanners={setBanners}
                currentUser={user}
                categories={categories}
                siteSettings={siteSettings}
                onOpenSiteSettingsModal={() => setIsSiteSettingsOpen(true)}
              />
            </Suspense>
          )}
        </main>
      )}

      {/* Footer */}
      <Footer
        lang={lang}
        onOpenSupport={() => setIsSupportOpen(true)}
        onOpenTool={() => setIsSupportOpen(true)}
      />

      {/* Lazy Modals with Suspense wrappers to keep main thread light */}
      <Suspense fallback={null}>
        {/* MODAL 1: Gift Details & Animation Specs Modal */}
        {selectedGift && (
          <GiftModal
            gift={selectedGift}
            onClose={() => setSelectedGift(null)}
            lang={lang}
            onAddToCart={(g) => handleAddToCart(g)}
            onOpenPurchase={(g) => handleInitiatePurchase(g)}
            allGifts={gifts}
            onSelectGift={(g) => {
              setInspectedGift(g);
              setSelectedGift(g);
            }}
          />
        )}

        {/* MODAL 2: Purchase Box ("صندوق شراء") */}
        {purchaseGift && (
          <PurchaseModal
            gift={purchaseGift}
            onClose={() => setPurchaseGift(null)}
            lang={lang}
            onPaymentSuccess={handlePaymentSuccess}
          />
        )}

        {/* MODAL 3: Instant Delivery & Receiving Box ("صندوق استلام") */}
        {activeDelivery && (
          <DeliveryBoxModal
            delivery={activeDelivery}
            onClose={() => setActiveDelivery(null)}
            lang={lang}
            allDeliveries={deliveries}
            onSelectDelivery={(del) => setActiveDelivery(del)}
          />
        )}

        {/* MODAL 4: Cart Drawer */}
        {isCartOpen && (
          <CartDrawer
            isOpen={isCartOpen}
            onClose={() => setIsCartOpen(false)}
            lang={lang}
            cartItems={cartItems}
            onRemoveItem={handleRemoveFromCart}
            onCheckoutAll={handleCheckoutAll}
          />
        )}

        {/* MODAL 5: Auth Modal */}
        {isAuthOpen && (
          <AuthModal
            isOpen={isAuthOpen}
            onClose={() => {
              setIsAuthOpen(false);
              setPendingPurchaseGift(null);
            }}
            lang={lang}
            employees={employees}
            onAuthSuccess={handleAuthSuccess}
            initialRole={authInitialRole}
            pendingGift={pendingPurchaseGift}
          />
        )}

        {/* MODAL 6: Contact Us Modal */}
        {isSupportOpen && (
          <SupportModal
            isOpen={isSupportOpen}
            onClose={() => setIsSupportOpen(false)}
            lang={lang}
            siteSettings={siteSettings}
          />
        )}

        {/* MODAL 7: VIP Club Upgrade */}
        {isVipOpen && (
          <VipModal
            isOpen={isVipOpen}
            onClose={() => setIsVipOpen(false)}
            lang={lang}
            onUpgrade={() => {
              alert(lang === 'ar' ? 'مبروك! تم تفعيل عضوية VIP بنجاح.' : '恭喜！平台 VIP 黄金会员已成功激活。');
            }}
          />
        )}

        {/* MODAL 8: My Deliveries Box Shortcut Modal */}
        {isDeliveriesOpen && (
          <DeliveryBoxModal
            delivery={deliveries[0] || null}
            onClose={() => setIsDeliveriesOpen(false)}
            lang={lang}
            allDeliveries={deliveries}
            onSelectDelivery={(del) => setActiveDelivery(del)}
          />
        )}

        {/* MODAL 9: Site Identity & Contact Numbers Modal */}
        {isSiteSettingsOpen && (
          <SiteSettingsModal
            isOpen={isSiteSettingsOpen}
            onClose={() => setIsSiteSettingsOpen(false)}
            lang={lang}
            siteSettings={siteSettings}
            onSettingsSaved={(newSettings) => setSiteSettings(newSettings)}
          />
        )}
      </Suspense>
    </div>
  );
}
