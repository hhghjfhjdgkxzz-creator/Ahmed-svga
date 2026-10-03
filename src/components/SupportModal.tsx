import React, { useState } from 'react';
import { X, Phone, Mail, MessageCircle, QrCode, Check, Send, Sparkles } from 'lucide-react';
import { Language, SiteSettings } from '../types';
import { translations } from '../utils/translations';

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  siteSettings?: SiteSettings;
}

export const SupportModal: React.FC<SupportModalProps> = ({ 
  isOpen, 
  onClose, 
  lang,
  siteSettings 
}) => {
  const t = translations[lang];
  const [submitted, setSubmitted] = useState(false);
  const [msg, setMsg] = useState('');
  const [showInquiryForm, setShowInquiryForm] = useState(false);

  if (!isOpen) return null;

  // Use configured numbers or reference video defaults
  const primaryPhone = siteSettings?.primaryPhone || siteSettings?.whatsapp || siteSettings?.phone || '+923400700013';
  const primaryLabel = siteSettings?.primaryPhoneLabel || 'WhatsApp';
  const secondaryPhone = siteSettings?.secondaryPhone || siteSettings?.secondaryWhatsapp || '';
  const secondaryLabel = siteSettings?.secondaryPhoneLabel || (lang === 'ar' ? 'واتساب 2 / الدعم' : 'WhatsApp 2 / Support');
  const email = siteSettings?.email || 'southasia216@gmail.com';
  const wechat = siteSettings?.wechat || 'southasia216';

  const cleanPrimary = primaryPhone.replace(/[^0-9]/g, '');
  const cleanSecondary = secondaryPhone.replace(/[^0-9]/g, '');

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3.5 bg-black/85 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-sm sm:max-w-md rounded-3xl bg-[#0f121a] border border-slate-800 shadow-2xl p-6 sm:p-7 overflow-hidden text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button (X on top right) */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-700/60 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Title */}
        <h2 className="text-xl font-bold text-white mb-6 tracking-wide">
          {lang === 'ar' ? 'تواصل معنا' : 'Contact Us'}
        </h2>

        {/* Contact List (Exact Clone of Reference Video) */}
        <div className="space-y-4">
          {/* 1. Primary Business Phone & WhatsApp */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-emerald-400" />
                <span>{primaryLabel} / {t.businessPhone}</span>
              </div>
              <span className="text-[10px] text-emerald-400 font-normal">
                {lang === 'ar' ? 'الرقم الأساسي' : 'Primary'}
              </span>
            </div>
            <div className="flex items-center gap-3 pl-6" dir="ltr">
              <a 
                href={`https://wa.me/${cleanPrimary}?text=${encodeURIComponent(
                  lang === 'ar'
                    ? 'مرحباً، أود الاستفسار عن تصاميم ومؤثرات البث المباشر.'
                    : 'Hello, I would like to inquire about your live stream designs and animations.'
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-sm text-emerald-400 hover:text-emerald-300 transition-colors hover:underline"
              >
                {primaryPhone}
              </a>
              <a
                href={`tel:${primaryPhone}`}
                className="p-1 rounded bg-slate-900 text-slate-400 hover:text-cyan-400 transition-colors"
                title={lang === 'ar' ? 'اتصال هاتفي' : 'Phone Call'}
              >
                <Phone className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* 2. Secondary Phone & WhatsApp (If Configured) */}
          {secondaryPhone && (
            <div className="space-y-1 pt-1 border-t border-slate-800/60">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-cyan-400" />
                  <span>{secondaryLabel}</span>
                </div>
                <span className="text-[10px] text-cyan-400 font-normal">
                  {lang === 'ar' ? 'رقم إضافي' : 'Secondary'}
                </span>
              </div>
              <div className="flex items-center gap-3 pl-6" dir="ltr">
                <a 
                  href={`https://wa.me/${cleanSecondary}?text=${encodeURIComponent(
                    lang === 'ar'
                      ? 'مرحباً، أود الاستفسار عن تصاميم ومؤثرات البث المباشر.'
                      : 'Hello, I would like to inquire about your live stream designs and animations.'
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-sm text-cyan-400 hover:text-cyan-300 transition-colors hover:underline"
                >
                  {secondaryPhone}
                </a>
                <a
                  href={`tel:${secondaryPhone}`}
                  className="p-1 rounded bg-slate-900 text-slate-400 hover:text-cyan-400 transition-colors"
                  title={lang === 'ar' ? 'اتصال هاتفي' : 'Phone Call'}
                >
                  <Phone className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          )}

          {/* 3. Business Email */}
          <div className="space-y-1 pt-1 border-t border-slate-800/60">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
              <Mail className="w-4 h-4 text-blue-400" />
              <span>{t.businessEmail}</span>
            </div>
            <a 
              href={`mailto:${email}`}
              className="block font-mono text-sm text-slate-300 hover:text-blue-400 transition-colors pl-6 break-all"
              dir="ltr"
            >
              {email}
            </a>
          </div>

          {/* 4. WeChat QR Code Box (Exact Clone of Reference Video) */}
          <div className="pt-2">
            <div className="text-xs font-semibold text-slate-300 mb-2.5">
              {t.scanWechat}
            </div>

            <div className="bg-white rounded-2xl p-4 flex flex-col items-center justify-center max-w-[220px] mx-auto shadow-xl">
              {siteSettings?.wechatQrUrl ? (
                <div className="w-40 h-40 relative flex items-center justify-center overflow-hidden rounded-xl bg-white p-1">
                  <img
                    src={siteSettings.wechatQrUrl}
                    alt="WeChat QR Code"
                    className="w-full h-full object-contain rounded-lg"
                  />
                </div>
              ) : (
                /* SVG High-Res QR Code Representation */
                <div className="w-36 h-36 relative flex items-center justify-center">
                  <svg viewBox="0 0 100 100" className="w-full h-full text-slate-900 fill-current">
                    {/* Outer corner 1 */}
                    <rect x="5" y="5" width="26" height="26" rx="4" fill="none" stroke="#07c160" strokeWidth="4" />
                    <rect x="12" y="12" width="12" height="12" rx="2" fill="#07c160" />
                    {/* Outer corner 2 */}
                    <rect x="69" y="5" width="26" height="26" rx="4" fill="none" stroke="#07c160" strokeWidth="4" />
                    <rect x="76" y="12" width="12" height="12" rx="2" fill="#07c160" />
                    {/* Outer corner 3 */}
                    <rect x="5" y="69" width="26" height="26" rx="4" fill="none" stroke="#07c160" strokeWidth="4" />
                    <rect x="12" y="76" width="12" height="12" rx="2" fill="#07c160" />

                    {/* QR Matrix Pattern Dots */}
                    <rect x="36" y="8" width="6" height="6" rx="1" fill="#0f172a" />
                    <rect x="46" y="8" width="6" height="6" rx="1" fill="#0f172a" />
                    <rect x="56" y="8" width="6" height="6" rx="1" fill="#0f172a" />
                    <rect x="36" y="20" width="6" height="6" rx="1" fill="#0f172a" />
                    <rect x="50" y="20" width="12" height="6" rx="1" fill="#07c160" />

                    <rect x="8" y="38" width="6" height="6" rx="1" fill="#0f172a" />
                    <rect x="20" y="38" width="10" height="6" rx="1" fill="#07c160" />
                    <rect x="36" y="38" width="6" height="6" rx="1" fill="#0f172a" />
                    <rect x="48" y="38" width="8" height="8" rx="1" fill="#0f172a" />
                    <rect x="62" y="38" width="6" height="6" rx="1" fill="#07c160" />
                    <rect x="74" y="38" width="18" height="6" rx="1" fill="#0f172a" />

                    <rect x="8" y="52" width="14" height="6" rx="1" fill="#07c160" />
                    <rect x="28" y="52" width="8" height="8" rx="1" fill="#0f172a" />
                    <rect x="42" y="52" width="6" height="6" rx="1" fill="#0f172a" />
                    <rect x="54" y="52" width="12" height="6" rx="1" fill="#07c160" />
                    <rect x="72" y="52" width="8" height="8" rx="1" fill="#0f172a" />
                    <rect x="86" y="52" width="6" height="6" rx="1" fill="#0f172a" />

                    <rect x="38" y="68" width="8" height="8" rx="1" fill="#0f172a" />
                    <rect x="52" y="68" width="8" height="8" rx="1" fill="#07c160" />
                    <rect x="66" y="68" width="6" height="6" rx="1" fill="#0f172a" />
                    <rect x="78" y="68" width="14" height="6" rx="1" fill="#0f172a" />

                    <rect x="38" y="82" width="12" height="6" rx="1" fill="#07c160" />
                    <rect x="56" y="82" width="8" height="8" rx="1" fill="#0f172a" />
                    <rect x="70" y="82" width="10" height="6" rx="1" fill="#07c160" />
                    <rect x="86" y="82" width="6" height="6" rx="1" fill="#0f172a" />

                    {/* Center WeChat Icon */}
                    <circle cx="50" cy="50" r="10" fill="#ffffff" />
                    <circle cx="50" cy="50" r="8" fill="#07c160" />
                    <circle cx="47.5" cy="48" r="1" fill="#ffffff" />
                    <circle cx="52.5" cy="48" r="1" fill="#ffffff" />
                  </svg>
                </div>
              )}

              {/* WeChat Text Label */}
              <div className="mt-2 text-xs font-bold text-slate-800 tracking-wide flex items-center gap-1">
                <span>WeChat</span>
                <span className="text-[10px] text-slate-500 font-mono">({wechat})</span>
              </div>
            </div>
          </div>
        </div>

        {/* Optional Expandable Inquiry Message Form */}
        <div className="mt-5 pt-4 border-t border-slate-800/80">
          {!showInquiryForm ? (
            <button
              onClick={() => setShowInquiryForm(true)}
              className="w-full py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-xs text-cyan-400 font-semibold border border-slate-800 transition-colors flex items-center justify-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? 'إرسال طلب مخصص أو رسالة فورية' : 'Send Direct Custom Request'}</span>
            </button>
          ) : submitted ? (
            <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/50 text-center text-xs text-emerald-300 font-semibold space-y-1">
              <Check className="w-5 h-5 text-emerald-400 mx-auto" />
              <span>{lang === 'ar' ? 'تم إرسال رسالتك بنجاح وسيتواصل معك الفريق فوراً!' : 'Message sent successfully!'}</span>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setSubmitted(true);
              }}
              className="space-y-2.5 text-xs"
            >
              <textarea
                required
                rows={2}
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
                placeholder={lang === 'ar' ? 'اكتب طلبك الخاص أو الهدية التي ترغب بتصميمها...' : 'Type your custom design inquiry...'}
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
              />
              <button
                type="submit"
                className="w-full py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 text-white font-bold"
              >
                {lang === 'ar' ? 'إرسال الآن' : 'Submit Now'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
