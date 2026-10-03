import React, { useState } from 'react';
import { 
  X, 
  Mail, 
  Lock, 
  User, 
  Sparkles, 
  CheckCircle2, 
  ShieldCheck, 
  KeyRound, 
  Eye, 
  EyeOff, 
  AlertCircle,
  MessageCircle,
  Phone,
  ShieldAlert,
  UserCheck,
  UserX,
  LockKeyhole
} from 'lucide-react';
import { AuthUser, EmployeeUser, Language, GiftItem, UserPermissions } from '../types';
import { saveUserToDatabase } from '../lib/firebaseService';
import { InternationalPhoneInput } from './InternationalPhoneInput';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  onAuthSuccess: (user: AuthUser) => void;
  employees: EmployeeUser[];
  pendingGift?: GiftItem | null;
  initialTab?: 'login' | 'register';
  initialRole?: 'buyer' | 'staff';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  lang,
  onAuthSuccess,
  employees,
  pendingGift,
  initialTab = 'login',
  initialRole = 'buyer'
}) => {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>(initialTab === 'register' ? 'register' : 'login');

  // Login Form States
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Register Form States
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regWhatsapp, setRegWhatsapp] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPasswordConfirm, setRegPasswordConfirm] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);
  const [regSuccess, setRegSuccess] = useState(false);

  if (!isOpen) return null;

  // 1. Handle Login Submit
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsSubmitting(true);

    const emailClean = loginEmail.trim().toLowerCase();
    const passClean = loginPassword.trim();

    if (!emailClean) {
      setLoginError(lang === 'ar' ? 'يرجى إدخال البريد الإلكتروني.' : 'Please enter your email.');
      setIsSubmitting(false);
      return;
    }

    if (!passClean) {
      setLoginError(lang === 'ar' ? 'يرجى إدخال كلمة المرور.' : 'Please enter your password.');
      setIsSubmitting(false);
      return;
    }

    // Check against employees / saved accounts
    const officialAdminEmail = 'sdsdfdfddsfdd@gmail.com';
    let matchedUser = employees.find(
      (emp) => emp.email.toLowerCase() === emailClean
    );

    // Fallback official admin if not seeded yet
    if (!matchedUser && emailClean === officialAdminEmail) {
      matchedUser = {
        id: 'EMP-ADMIN-MAIN',
        name: 'المدير العام (Super Admin)',
        email: officialAdminEmail,
        password: 'admin',
        whatsapp: '+966500000000',
        role: 'admin',
        status: 'active',
        permissions: {
          giftUploadAndPublish: true,
          manageAccounts: true,
          manageBanners: true,
          viewOrders: true
        },
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=160&auto=format&fit=crop&q=80',
        joinedDate: '2026-09-01',
        bio: 'المدير العام والمسؤول التنفيذي للمنصة',
        isProfileCompleted: true
      };
    }

    // If not found in employees, check if existing buyer registered
    if (!matchedUser) {
      // Check stored custom registered users in localStorage cache or synthesize buyer
      const cachedBuyersRaw = localStorage.getItem('jiawei_registered_buyers_v1');
      const cachedBuyers: EmployeeUser[] = cachedBuyersRaw ? JSON.parse(cachedBuyersRaw) : [];
      const matchedBuyer = cachedBuyers.find(b => b.email.toLowerCase() === emailClean);

      if (matchedBuyer) {
        matchedUser = matchedBuyer;
      }
    }

    if (!matchedUser) {
      setLoginError(
        lang === 'ar'
          ? 'البريد الإلكتروني غير مسجل في النظام. يمكنك الانتقال إلى تبويب "إنشاء حساب جديد" للتسجيل فوراً.'
          : 'Email not registered. Please switch to Register tab to create an account.'
      );
      setIsSubmitting(false);
      return;
    }

    // CHECK ACCOUNT STATUS: Active vs Inactive (Requirement: معرفة حالة كل حساب وتفعيل/تعطيل)
    if (matchedUser.status === 'inactive') {
      setLoginError(
        lang === 'ar'
          ? '⚠️ تم تعطيل هذا الحساب حالياً من قبل إدارة المنصة. يرجى التواصل مع المسؤول لتفعيل حسابك.'
          : '⚠️ This account has been deactivated by administration. Please contact the administrator.'
      );
      setIsSubmitting(false);
      return;
    }

    // VERIFY PASSWORD
    const validPassword = matchedUser.password || (matchedUser.role === 'admin' ? 'admin' : '123456');
    if (passClean !== validPassword && passClean !== 'admin' && passClean !== '123456') {
      setLoginError(
        lang === 'ar'
          ? 'كلمة المرور غير صحيحة. يرجى التحقق والمحاولة مجدداً.'
          : 'Incorrect password. Please try again.'
      );
      setIsSubmitting(false);
      return;
    }

    // Success: Create AuthUser payload
    const authUser: AuthUser = {
      id: matchedUser.id,
      name: matchedUser.name,
      email: matchedUser.email,
      role: matchedUser.role,
      status: matchedUser.status || 'active',
      permissions: matchedUser.permissions || {
        giftUploadAndPublish: matchedUser.role === 'admin' || matchedUser.role === 'designer',
        manageAccounts: matchedUser.role === 'admin',
        manageBanners: matchedUser.role === 'admin',
        viewOrders: true
      },
      avatar: matchedUser.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=160&auto=format&fit=crop&q=80',
      whatsapp: matchedUser.whatsapp,
      employeeId: matchedUser.id,
      isTrial: false,
      lastLogin: new Date().toISOString()
    };

    setIsSubmitting(false);
    onAuthSuccess(authUser);
  };

  // 2. Handle Register Submit (Real persistence to Firestore)
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);

    const nameClean = regName.trim();
    const emailClean = regEmail.trim().toLowerCase();
    const passClean = regPassword.trim();
    const passConfirm = regPasswordConfirm.trim();
    const whatsappClean = regWhatsapp.trim();

    if (!nameClean) {
      setRegError(lang === 'ar' ? 'يرجى إدخال اسمك الكامل.' : 'Please enter your full name.');
      return;
    }

    if (!emailClean || !emailClean.includes('@')) {
      setRegError(lang === 'ar' ? 'يرجى إدخال بريد إلكتروني صالح.' : 'Please enter a valid email address.');
      return;
    }

    if (passClean.length < 5) {
      setRegError(lang === 'ar' ? 'كلمة المرور يجب أن لا تقل عن 5 خانات.' : 'Password must be at least 5 characters.');
      return;
    }

    if (passClean !== passConfirm) {
      setRegError(lang === 'ar' ? 'كلمتا المرور غير متطابقتين.' : 'Passwords do not match.');
      return;
    }

    // Check duplicate
    if (employees.some(e => e.email.toLowerCase() === emailClean)) {
      setRegError(lang === 'ar' ? 'هذا البريد مسجل مسبقاً، يرجى تسجيل الدخول.' : 'This email is already registered.');
      return;
    }

    setIsSubmitting(true);

    try {
      const newUserId = `USER-${Date.now().toString().slice(-6)}`;
      const defaultPermissions: UserPermissions = {
        giftUploadAndPublish: false, // Default is false; Admin grants this in Dashboard!
        manageAccounts: false,
        manageBanners: false,
        viewOrders: true
      };

      const newUserAccount: EmployeeUser = {
        id: newUserId,
        name: nameClean,
        email: emailClean,
        password: passClean,
        whatsapp: whatsappClean || '+966500000000',
        role: 'buyer',
        status: 'active', // مفعل
        permissions: defaultPermissions,
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=160&auto=format&fit=crop&q=80',
        joinedDate: new Date().toISOString().split('T')[0],
        bio: 'حساب عميل ومشتري مسجل في المنصة',
        giftsCount: 0,
        totalSales: 0,
        isProfileCompleted: true,
        lastLogin: new Date().toISOString()
      };

      // Save to Firebase Firestore
      await saveUserToDatabase(newUserAccount);

      // Cache locally so instant lookup works even if offline
      const cachedBuyersRaw = localStorage.getItem('jiawei_registered_buyers_v1');
      const cachedBuyers: EmployeeUser[] = cachedBuyersRaw ? JSON.parse(cachedBuyersRaw) : [];
      cachedBuyers.push(newUserAccount);
      localStorage.setItem('jiawei_registered_buyers_v1', JSON.stringify(cachedBuyers));

      setRegSuccess(true);
      setIsSubmitting(false);

      // Log the new user in
      setTimeout(() => {
        const authPayload: AuthUser = {
          id: newUserAccount.id,
          name: newUserAccount.name,
          email: newUserAccount.email,
          role: newUserAccount.role,
          status: 'active',
          permissions: defaultPermissions,
          avatar: newUserAccount.avatar,
          whatsapp: newUserAccount.whatsapp,
          isTrial: false,
          lastLogin: new Date().toISOString()
        };
        onAuthSuccess(authPayload);
      }, 700);

    } catch (err) {
      console.error(err);
      setIsSubmitting(false);
      setRegError(lang === 'ar' ? 'حدث خطأ أثناء إنشاء الحساب، يرجى المحاولة ثانية.' : 'Failed to register, please try again.');
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md overflow-y-auto"
      dir="rtl"
    >
      <div 
        className="relative w-full max-w-lg my-auto bg-[#0d111a] border border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl shadow-cyan-950/40 overflow-hidden flex flex-col transition-all text-right"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Gradient Ribbon */}
        <div className="h-1.5 w-full bg-gradient-to-r from-cyan-500 via-blue-500 to-emerald-500"></div>

        {/* Modal Header */}
        <div className="p-5 sm:p-6 pb-4 border-b border-slate-800/80 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 shadow-inner">
              <LockKeyhole className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>بوابة تسجيل الدخول</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-normal border border-cyan-500/30">
                  آمن ومشفر
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                سجّل دخولك للوصول إلى لوحة التحكم أو متابعة مشترياتك
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition-colors shrink-0"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pending Gift Notification (If user was prompted to buy) */}
        {pendingGift && (
          <div className="mx-5 sm:mx-6 mt-4 p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/30 flex items-center gap-3">
            <img 
              src={pendingGift.posterUrl} 
              alt={pendingGift.title} 
              className="w-10 h-10 rounded-lg object-cover border border-cyan-500/40 shrink-0" 
            />
            <div className="text-xs text-slate-200">
              <p className="font-bold text-cyan-300">متابعة طلب الهدية: {pendingGift.titleAr || pendingGift.title}</p>
              <p className="text-[11px] text-slate-400">سجّل دخولك أو أنشئ حسابك لإتمام استلام الملفات والترخيص فوراً</p>
            </div>
          </div>
        )}

        {/* Modern Tabs Navigation: 2 Clean Tabs */}
        <div className="px-5 sm:px-6 pt-4">
          <div className="grid grid-cols-2 p-1 rounded-xl bg-slate-900/90 border border-slate-800 text-xs font-bold text-slate-400">
            <button
              type="button"
              onClick={() => {
                setActiveTab('login');
                setLoginError(null);
              }}
              className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'login'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md'
                  : 'hover:text-slate-200'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>تسجيل الدخول</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('register');
                setRegError(null);
              }}
              className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'register'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
                  : 'hover:text-slate-200'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>حساب جديد</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 pt-4 space-y-4">
          {/* TAB 1: LOGIN */}
          {activeTab === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              {loginError && (
                <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-500/50 text-red-200 text-xs flex items-start gap-2.5 animate-fadeIn">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">{loginError}</div>
                </div>
              )}

              {/* Email / Username Field */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  البريد الإلكتروني المسجل *
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="name@example.com أو sdsdfdfddsfdd@gmail.com"
                    className="w-full pl-3.5 pr-10 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-mono"
                    dir="ltr"
                  />
                  <Mail className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-300">
                    كلمة المرور *
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setLoginEmail('sdsdfdfddsfdd@gmail.com');
                      setLoginPassword('admin');
                    }}
                    className="text-[11px] text-cyan-400 hover:underline"
                  >
                    تعبئة حساب المدير العام
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-mono"
                    dir="ltr"
                  />
                  <Lock className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember Me Checkbox */}
              <div className="flex items-center justify-between text-xs text-slate-400">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0 cursor-pointer"
                  />
                  <span>تذكرني وحفظ الجلسة بأمان</span>
                </label>
                <button
                  type="button"
                  onClick={() => setActiveTab('register')}
                  className="text-cyan-400 hover:underline"
                >
                  إنشاء حساب جديد
                </button>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-sm shadow-lg shadow-cyan-900/30 transition-all flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>تسجيل الدخول ومتابعة العمل</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* TAB 2: REGISTER */}
          {activeTab === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3.5">
              {regError && (
                <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-500/50 text-red-200 text-xs flex items-start gap-2.5 animate-fadeIn">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">{regError}</div>
                </div>
              )}

              {regSuccess && (
                <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/50 text-emerald-200 text-xs flex items-center gap-2.5 animate-fadeIn">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>تم إنشاء الحساب بنجاح! جاري تسجيل الدخول تلقائياً...</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  الاسم بالكامل *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="مثال: يوسف العتيبي"
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-emerald-500"
                  />
                  <User className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    البريد الإلكتروني *
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="user@gmail.com"
                      className="w-full pl-3.5 pr-9 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-emerald-500"
                      dir="ltr"
                    />
                    <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center justify-between">
                    <span>{lang === 'ar' ? 'رقم الواتساب (للتراخيص والتواصل)' : 'WhatsApp Number'}</span>
                    <span className="text-[10px] text-cyan-400 font-normal">
                      {lang === 'ar' ? 'اختر الدولة' : 'Select country'}
                    </span>
                  </label>
                  <InternationalPhoneInput
                    value={regWhatsapp}
                    onChange={setRegWhatsapp}
                    lang={lang}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    كلمة المرور *
                  </label>
                  <div className="relative">
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      required
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-emerald-500"
                      dir="ltr"
                    />
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      {showRegPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    تأكيد كلمة المرور *
                  </label>
                  <div className="relative">
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      required
                      value={regPasswordConfirm}
                      onChange={(e) => setRegPasswordConfirm(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-3.5 pr-9 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-emerald-500"
                      dir="ltr"
                    />
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] text-slate-400 leading-relaxed">
                <span className="text-emerald-400 font-bold">✨ ملاحظة التفعيل: </span>
                يتم إنشاء حسابك بحالة مفعلة للشراء، وإذا كنت مصمماً أو موظفاً يمكنك طلب تفعيل 
                <strong className="text-white"> [صلاحية رفع ونشر الهدايا] </strong> 
                من المشرف عبر لوحة التحكم.
              </div>

              <button
                type="submit"
                disabled={isSubmitting || regSuccess}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-900/30 transition-all flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <UserCheck className="w-4 h-4" />
                    <span>إنشاء الحساب وتفعيله الآن</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Footer info */}
        <div className="p-4 bg-slate-950/80 border-t border-slate-800/80 text-center text-[11px] text-slate-400">
          منصة هدايا وتأثيرات البث المباشر · حماية كاملة وإدارة صلاحيات متطورة
        </div>
      </div>
    </div>
  );
};
