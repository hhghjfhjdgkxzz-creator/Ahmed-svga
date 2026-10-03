import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  PlusCircle, 
  Trash2, 
  Edit3, 
  Sparkles, 
  Video, 
  UploadCloud, 
  Check, 
  AlertCircle, 
  ExternalLink, 
  Search, 
  Eye, 
  EyeOff,
  Lock,
  Copy,
  Layers, 
  DollarSign, 
  PackageCheck,
  TrendingUp,
  FileCode,
  Globe,
  Play,
  Printer,
  FileText,
  Award,
  Package,
  Plus,
  User,
  Mail,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  MessageCircle,
  UserCheck,
  UserPlus,
  PhoneCall,
  Phone,
  Shield,
  Briefcase,
  X,
  Image as ImageIcon,
  SlidersHorizontal,
  Camera,
  Scissors,
  Clock,
  RotateCcw,
  Crosshair,
  Pause,
  Loader2,
  BookmarkCheck,
  Bookmark,
  Pin,
  Tag,
  Upload,
  Circle,
  Square,
  LayoutGrid,
  List
} from 'lucide-react';
import { GiftItem, Language, DeliveryItem, GiftFormat, EmployeeUser, HeroBannerItem, AuthUser, UserRole, UserPermissions, SavedGiftName, MediaAssetItem, SiteSettings } from '../types';
import { translations } from '../utils/translations';
import { INITIAL_EMPLOYEES } from '../data/initialEmployees';
import { INITIAL_BANNERS } from '../data/initialBanners';
import { INITIAL_SAVED_GIFT_NAMES } from '../data/initialSavedNames';
import { PrintDocumentModal } from './PrintDocumentModal';
import { BannerManager } from './BannerManager';
import { InternationalPhoneInput } from './InternationalPhoneInput';
import { GiftMediaOptimizer } from './GiftMediaOptimizer';
import { SvgaPlayer } from './SvgaPlayer';
import { uploadMediaToServer, saveMediaToIndexedDb, resolveMediaUrl, getMediaFromIndexedDb, getProxyMediaUrl } from '../utils/mediaStorage';
import { extractVideoMetadata, calculateSHA256 } from '../utils/svgaOptimizer';
import { 
  addGift, 
  updateGift, 
  deleteGift, 
  deleteAllGiftsFromDb,
  updateCreatorGiftsWhatsapp,
  updateEmployee, 
  changeEmployeeRole,
  deleteEmployee, 
  toggleEmployeeStatus,
  toggleEmployeeGiftPermission,
  updateEmployeePermissions,
  addDelivery, 
  deleteDelivery,
  saveCategory,
  deleteCategory,
  saveSiteSettings,
  subscribeToSiteSettings,
  subscribeToSavedGiftNames,
  saveGiftNamesList,
  addSavedGiftName,
  deleteSavedGiftName,
  addGiftsBatch,
  purgeDummyGifts,
  isDummyGift
} from '../lib/firebaseService';
import { SiteSettingsModal } from './SiteSettingsModal';
import { DeleteAllGiftsModal } from './DeleteAllGiftsModal';
import { ImageShapeEditorModal } from './ImageShapeEditorModal';
import { SELECTABLE_GIFT_CATEGORIES } from '../data/categories';

interface DashboardProps {
  lang: Language;
  gifts: GiftItem[];
  setGifts: React.Dispatch<React.SetStateAction<GiftItem[]>>;
  onPreviewGift: (gift: GiftItem) => void;
  deliveries: DeliveryItem[];
  setDeliveries?: React.Dispatch<React.SetStateAction<DeliveryItem[]>>;
  onOpenDeliveryBox: (item: DeliveryItem) => void;
  employees?: EmployeeUser[];
  setEmployees?: React.Dispatch<React.SetStateAction<EmployeeUser[]>>;
  activeEmployeeId?: string;
  setActiveEmployeeId?: (id: string) => void;
  onStaffLogin?: (employee: EmployeeUser) => void;
  banners?: HeroBannerItem[];
  setBanners?: React.Dispatch<React.SetStateAction<HeroBannerItem[]>>;
  currentUser?: AuthUser | null;
  categories?: { id: string; name: string }[];
  siteSettings?: SiteSettings;
  onOpenSiteSettingsModal?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  lang,
  gifts,
  setGifts,
  onPreviewGift,
  deliveries,
  setDeliveries,
  onOpenDeliveryBox,
  employees,
  setEmployees,
  activeEmployeeId,
  setActiveEmployeeId,
  onStaffLogin,
  banners,
  setBanners,
  currentUser,
  categories = [],
  siteSettings: propSiteSettings,
  onOpenSiteSettingsModal
}) => {
  const t = translations[lang];

  const [activeTab, setActiveTab] = useState<'create' | 'list' | 'orders' | 'staff' | 'banners' | 'guide' | 'settings' | 'categories' | 'optimizer'>('create');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isDeleteAllModalOpen, setIsDeleteAllModalOpen] = useState(false);
  const [isSiteSettingsModalOpen, setIsSiteSettingsModalOpen] = useState(false);
  const settingsLogoInputRef = useRef<HTMLInputElement>(null);
  const settingsWechatQrInputRef = useRef<HTMLInputElement>(null);

  const bannersList = banners || INITIAL_BANNERS;

  // Fallback Employees state if not passed from parent
  const [localEmployees, setLocalEmployees] = useState<EmployeeUser[]>(() => {
    const saved = localStorage.getItem('jiawei_employees_v1');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return INITIAL_EMPLOYEES;
      }
    }
    return INITIAL_EMPLOYEES;
  });

  const staffList = employees || localEmployees;
  const setStaffList = setEmployees || setLocalEmployees;

  // Account filter in Staff/Accounts Tab
  const [accountFilter, setAccountFilter] = useState<'all' | 'active' | 'inactive' | 'upload_allowed'>('all');
  const [newStaffCanUpload, setNewStaffCanUpload] = useState<boolean>(true);

  const [localActiveEmpId, setLocalActiveEmpId] = useState<string>(() => {
    return localStorage.getItem('jiawei_active_emp_id') || 'EMP-001';
  });

  const currentEmpId = activeEmployeeId || localActiveEmpId;

  const handleSwitchStaff = (id: string) => {
    if (setActiveEmployeeId) {
      setActiveEmployeeId(id);
    } else {
      setLocalActiveEmpId(id);
    }
    localStorage.setItem('jiawei_active_emp_id', id);

    const targetEmp = staffList.find((e) => e.id === id);
    if (targetEmp && !targetEmp.isProfileCompleted) {
      setIsProfileModalOpen(true);
    }
  };

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'employee' || currentUser?.role === 'designer';
  
  const activeStaff = isAdmin 
    ? (staffList.find((e) => e.id === currentEmpId) || staffList[0]) 
    : (currentUser as unknown as EmployeeUser) || staffList[0];

  const currentUserPermissions: Partial<UserPermissions> = (currentUser as unknown as EmployeeUser)?.permissions || {};
  const isSuperAdmin = currentUser?.role === 'admin';

  const canManageGifts = isSuperAdmin || currentUserPermissions.giftUploadAndPublish !== false;
  const canManageAccounts = isSuperAdmin || !!currentUserPermissions.manageAccounts;
  const canManageBanners = isSuperAdmin || !!currentUserPermissions.manageBanners;
  const canViewOrders = isSuperAdmin || !!currentUserPermissions.viewOrders;
  const canManageSettings = isSuperAdmin || !!currentUserPermissions.manageSettings;

  // If user lands here, ensure activeTab is one they have access to
  useEffect(() => {
    if (!isAdmin) {
      if (activeTab !== 'create' && activeTab !== 'list') setActiveTab('create');
    } else {
      if (!canManageGifts && (activeTab === 'create' || activeTab === 'list')) {
        if (canViewOrders) setActiveTab('orders');
        else if (canManageAccounts) setActiveTab('staff');
        else setActiveTab('settings');
      }
    }
  }, [isAdmin, activeTab, canManageGifts, canViewOrders, canManageAccounts]);

  // First-Time / Profile Setup Modal State
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [editingStaffTarget, setEditingStaffTarget] = useState<EmployeeUser | null>(null);
  const [profileName, setProfileName] = useState('');
  const [profileWhatsapp, setProfileWhatsapp] = useState('');
  const [profileBio, setProfileBio] = useState('');
  const [profileAvatar, setProfileAvatar] = useState('');

  const handleOpenProfileModal = (targetEmployee?: EmployeeUser) => {
    const emp = targetEmployee || activeStaff;
    setEditingStaffTarget(emp);
    setProfileName(emp.name || '');
    setProfileWhatsapp(emp.whatsapp || '');
    setProfileBio(emp.bio || '');
    setProfileAvatar(emp.avatar || '');
    setIsProfileModalOpen(true);
  };

  // Sync profile form when active employee changes
  useEffect(() => {
    if (activeStaff) {
      setProfileName(activeStaff.name);
      setProfileWhatsapp(activeStaff.whatsapp || '');
      setProfileBio(activeStaff.bio || '');
      setProfileAvatar(activeStaff.avatar || '');
      // Automatically prompt profile setup if not completed yet (as requested: لأول مرة فقط)
      if (!activeStaff.isProfileCompleted) {
        setEditingStaffTarget(activeStaff);
        setIsProfileModalOpen(true);
      }
    }
  }, [activeStaff?.id]);

  // Form State for Gifts (Default in USD as requested) - Automatically restores pinned/draft name across sessions
  const [title, setTitle] = useState(() => localStorage.getItem('jiawei_draft_gift_title') || '');
  const [titleAr, setTitleAr] = useState(() => localStorage.getItem('jiawei_draft_gift_title_ar') || '');
  const [price, setPrice] = useState<number>(35);
  const [vipPrice, setVipPrice] = useState<number>(20);
  const [exclusivePrice, setExclusivePrice] = useState<number>(180);
  const [videoUrl, setVideoUrl] = useState('');
  const [posterUrl, setPosterUrl] = useState('');
  const [usePosterImage, setUsePosterImage] = useState<boolean>(true);
  const [posterLoadError, setPosterLoadError] = useState(false);

  // Bulk Upload by Links State (رفع جماعي لعدة روابط بتسعيرة موحدة تلقائياً)
  const [uploadMode, setUploadMode] = useState<'single' | 'bulk'>('single');
  const [bulkLinksText, setBulkLinksText] = useState('');
  const [bulkPrice, setBulkPrice] = useState<number>(35);
  const [bulkVipPrice, setBulkVipPrice] = useState<number>(20);
  const [bulkExclusivePrice, setBulkExclusivePrice] = useState<number>(149);
  const [bulkCategory, setBulkCategory] = useState<string>('general');
  const [bulkTheme, setBulkTheme] = useState<string>('مؤثرات VIP');
  const [bulkTitlePrefix, setBulkTitlePrefix] = useState<string>('تصميم رقم');
  const [bulkEffectType, setBulkEffectType] = useState<'2D' | '3D'>('2D');
  const [isBulkUploading, setIsBulkUploading] = useState<boolean>(false);
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number } | null>(null);
  const [bulkSuccessList, setBulkSuccessList] = useState<GiftItem[]>([]);

  // List View Display Mode (Grid of Large Cards vs Table)
  const [listDisplayMode, setListDisplayMode] = useState<'grid' | 'table'>('grid');
  const [customGiftsPerPage, setCustomGiftsPerPage] = useState<number>(() => {
    return propSiteSettings?.giftsPerPage || 26;
  });
  const [isSavingGiftsPerPage, setIsSavingGiftsPerPage] = useState<boolean>(false);
  const [copiedGiftId, setCopiedGiftId] = useState<string | null>(null);

  useEffect(() => {
    if (propSiteSettings?.giftsPerPage) {
      setCustomGiftsPerPage(propSiteSettings.giftsPerPage);
    }
  }, [propSiteSettings?.giftsPerPage]);

  const handleSaveGiftsPerPage = async () => {
    try {
      setIsSavingGiftsPerPage(true);
      const updated: SiteSettings = {
        ...(propSiteSettings || { siteName: 'Destroy KING Designer', primaryPhone: '+923400700013', whatsapp: '+923400700013' }),
        giftsPerPage: Math.max(1, customGiftsPerPage)
      };
      await saveSiteSettings(updated);
      setSuccessMessage(
        lang === 'ar'
          ? `✓ تم حفظ وتطبيق عدد هدايا الصفحة (${customGiftsPerPage} هدية لكل صفحة) بنجاح على المتجر!`
          : `✓ Successfully saved gifts per page (${customGiftsPerPage})!`
      );
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (e) {
      console.error(e);
      alert(lang === 'ar' ? 'حدث خطأ أثناء حفظ الإعدادات' : 'Failed to save settings');
    } finally {
      setIsSavingGiftsPerPage(false);
    }
  };

  const handleCopyGiftLink = (gift: GiftItem) => {
    const linkToCopy = gift.videoUrl || gift.deliveryUrl || gift.posterUrl || '';
    if (linkToCopy) {
      navigator.clipboard.writeText(linkToCopy).then(() => {
        setCopiedGiftId(gift.id);
        setTimeout(() => setCopiedGiftId(null), 2500);
      });
    }
  };

  // Automatically purge dummy gifts on initial load
  useEffect(() => {
    purgeDummyGifts().then((purged) => {
      if (purged > 0) {
        setGifts(prev => prev.filter(g => !isDummyGift(g)));
      }
    }).catch(() => {});
  }, []);

  // Parse bulk links in real-time
  const parsedBulkLinks = useMemo(() => {
    if (!bulkLinksText.trim()) return [];
    return bulkLinksText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && (
        line.startsWith('http://') || 
        line.startsWith('https://') || 
        line.startsWith('data:') || 
        line.includes('.')
      ));
  }, [bulkLinksText]);

  // Saved Names Presets Library (Persistent in Firestore & localStorage)
  const [savedNamesList, setSavedNamesList] = useState<SavedGiftName[]>(() => {
    const local = localStorage.getItem('jiawei_saved_gift_names_v1');
    if (local) {
      try {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return INITIAL_SAVED_GIFT_NAMES;
  });
  const [pinnedNameId, setPinnedNameId] = useState<string | null>(() => {
    return localStorage.getItem('jiawei_pinned_name_id') || null;
  });
  const [isNameSaveSuccess, setIsNameSaveSuccess] = useState<boolean>(false);
  const [isAddingNewPresetInline, setIsAddingNewPresetInline] = useState<boolean>(false);
  const [newPresetTitle, setNewPresetTitle] = useState('');
  const [newPresetTitleAr, setNewPresetTitleAr] = useState('');

  // Real-time synchronization of saved gift names with Firestore
  useEffect(() => {
    const unsubscribe = subscribeToSavedGiftNames((names) => {
      if (names && names.length > 0) {
        setSavedNamesList(names);
      }
    });
    return () => unsubscribe();
  }, []);

  // Handle Save & Pin Current Name (حفظ وتثبيت هذا الاسم في القائمة وقاعدة البيانات)
  const handleSaveAndPinCurrentName = async () => {
    const trimmedTitle = title.trim();
    const trimmedTitleAr = titleAr.trim();

    if (!trimmedTitle && !trimmedTitleAr) {
      alert(lang === 'ar' ? 'يرجى كتابة اسم الهدية أو الاسم بالعربية أولاً لتثبيته وحفظه في القائمة' : '请先输入礼物名称');
      return;
    }

    try {
      const savedEntry = await addSavedGiftName({
        title: trimmedTitle || trimmedTitleAr,
        titleAr: trimmedTitleAr || ''
      });
      
      setPinnedNameId(savedEntry.id);
      localStorage.setItem('jiawei_pinned_name_id', savedEntry.id);
      localStorage.setItem('jiawei_draft_gift_title', trimmedTitle || trimmedTitleAr);
      if (trimmedTitleAr) {
        localStorage.setItem('jiawei_draft_gift_title_ar', trimmedTitleAr);
      }

      setIsNameSaveSuccess(true);
      setTimeout(() => setIsNameSaveSuccess(false), 4500);
    } catch (err) {
      console.error('Failed to save name preset:', err);
      setIsNameSaveSuccess(true);
      setTimeout(() => setIsNameSaveSuccess(false), 4500);
    }
  };

  // Handle direct addition to presets list
  const handleAddNewPresetDirectly = async () => {
    const trimmedTitle = newPresetTitle.trim();
    const trimmedTitleAr = newPresetTitleAr.trim();

    if (!trimmedTitle && !trimmedTitleAr) {
      alert(lang === 'ar' ? 'يرجى كتابة الاسم قبل الحفظ' : '请输入名称');
      return;
    }

    try {
      const savedEntry = await addSavedGiftName({
        title: trimmedTitle || trimmedTitleAr,
        titleAr: trimmedTitleAr || ''
      });
      
      // Also apply as current title
      setTitle(savedEntry.title);
      setTitleAr(savedEntry.titleAr || '');
      setPinnedNameId(savedEntry.id);
      localStorage.setItem('jiawei_pinned_name_id', savedEntry.id);
      localStorage.setItem('jiawei_draft_gift_title', savedEntry.title);
      localStorage.setItem('jiawei_draft_gift_title_ar', savedEntry.titleAr || '');

      setNewPresetTitle('');
      setNewPresetTitleAr('');
      setIsAddingNewPresetInline(false);
      setIsNameSaveSuccess(true);
      setTimeout(() => setIsNameSaveSuccess(false), 4500);
    } catch (err) {
      console.error('Failed to add preset:', err);
    }
  };

  // Handle selecting a preset from the list
  const handleSelectNamePreset = (preset: SavedGiftName) => {
    setTitle(preset.title);
    setTitleAr(preset.titleAr || '');
    setPinnedNameId(preset.id);
    localStorage.setItem('jiawei_pinned_name_id', preset.id);
    localStorage.setItem('jiawei_draft_gift_title', preset.title);
    localStorage.setItem('jiawei_draft_gift_title_ar', preset.titleAr || '');

    setIsNameSaveSuccess(true);
    setTimeout(() => setIsNameSaveSuccess(false), 3000);
  };

  // Handle deleting a preset
  const handleDeleteNamePreset = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm(lang === 'ar' ? 'هل أنت متأكد من حذف هذا الاسم من القائمة الدائمة؟' : '确定从永久列表中删除此名称？')) {
      try {
        await deleteSavedGiftName(id);
        if (pinnedNameId === id) {
          setPinnedNameId(null);
          localStorage.removeItem('jiawei_pinned_name_id');
        }
      } catch (err) {
        console.error('Failed to delete name preset:', err);
      }
    }
  };

  // Handle creating a new gift directly from an Optimized Media Asset
  const handleCreateGiftFromAsset = (asset: MediaAssetItem) => {
    setActiveTab('create');
    setTitle(asset.name);
    if (asset.dataUrl) {
      setVideoUrl(asset.dataUrl);
    }
    if (asset.posterUrl) {
      setPosterUrl(asset.posterUrl);
      setUsePosterImage(true);
    }
    if (asset.type === 'svga' || asset.type === 'svga2') {
      setFormatsText('SVGA 2.0动效 (Optimized), MP4带声音, VAP透明通道');
      setTheme('SVGA 2.0');
    } else {
      setFormatsText('MP4带声音, VAP透明通道, WEBP');
    }
    setSuccessMessage(
      lang === 'ar'
        ? `تم تحميل بيانات الأصل المحسّن (${asset.name}) إلى نموذج إنشاء الهدية بنجاح!`
        : `Successfully loaded optimized asset (${asset.name}) into create form!`
    );
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  useEffect(() => {
    setPosterLoadError(false);
  }, [posterUrl]);
  const [formatsText, setFormatsText] = useState('SVGA动效文件, MP4带声音透明通道, VAP特效, PAG文件');
  
  // Dynamic categories combined with standard store categories (إطارات الأفاتار، الأوسمة، فقاعات الشات، إلخ)
  const availableCategories = useMemo(() => {
    const map = new Map<string, { id: string; name: string; nameAr?: string; nameEn?: string; icon?: string }>();
    SELECTABLE_GIFT_CATEGORIES.forEach(c => map.set(c.id, c));
    (categories || []).forEach(c => {
      if (c.id !== 'all' && !map.has(c.id)) {
        map.set(c.id, {
          id: c.id,
          name: c.name,
          nameAr: (c as any).nameAr || c.name,
          nameEn: (c as any).nameEn || c.name,
          icon: '📁'
        });
      }
    });
    return Array.from(map.values());
  }, [categories]);

  const [category, setCategory] = useState<string>('frames');
  const [theme, setTheme] = useState('国风仙侠');
  const [effectType, setEffectType] = useState<'2D' | '3D'>('3D');
  const [authorName, setAuthorName] = useState(activeStaff?.name || 'سارة المهندس');
  const [deliveryUrl, setDeliveryUrl] = useState('');
  const [cloudDiskCode, setCloudDiskCode] = useState('JW6688');

  // New Staff Creation Form State (in Staff tab)
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffWhatsapp, setNewStaffWhatsapp] = useState('');
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffPassword, setNewStaffPassword] = useState('123456');
  const [showStaffPassword, setShowStaffPassword] = useState(false);
  const [visibleStaffPasswords, setVisibleStaffPasswords] = useState<{ [id: string]: boolean }>({});
  const [newStaffRole, setNewStaffRole] = useState<'designer' | 'admin'>('designer');
  const [newStaffBio, setNewStaffBio] = useState('');
  const [newStaffAvatar, setNewStaffAvatar] = useState('https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=160&auto=format&fit=crop&q=80');

  // Video Testing & Snapshot Controls
  const [isTestingVideo, setIsTestingVideo] = useState(false);
  const [videoTestError, setVideoTestError] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const previewVideoRef = React.useRef<HTMLVideoElement | null>(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(true);
  const [videoScrubTime, setVideoScrubTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(14);
  const [isCapturingSnapshot, setIsCapturingSnapshot] = useState(false);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [videoUploadStatus, setVideoUploadStatus] = useState<string>('');
  const [isUploadingPoster, setIsUploadingPoster] = useState(false);
  
  // Image Shape & Crop Editor State (شكل دائري، حواف دائرية، شفافية الحواف)
  const [isShapeEditorOpen, setIsShapeEditorOpen] = useState(false);
  const [shapeEditorImage, setShapeEditorImage] = useState<string>('');
  const [monitorAspect, setMonitorAspect] = useState<'9/16' | '1/1' | '4/3'>('1/1');
  const [monitorBg, setMonitorBg] = useState<'dark' | 'checker' | 'black'>('dark');

  // Auto-play and reset video monitor whenever videoUrl changes
  useEffect(() => {
    if (videoUrl) {
      setIsVideoPlaying(true);
      setVideoTestError(false);
      setVideoScrubTime(0);
      const timer = setTimeout(() => {
        if (previewVideoRef.current) {
          previewVideoRef.current.currentTime = 0;
          previewVideoRef.current.muted = true;
          previewVideoRef.current.defaultMuted = true;
          previewVideoRef.current.load();
          previewVideoRef.current.play().catch(() => {});
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [videoUrl]);

  const handleVideoFileUpload = async (file: File) => {
    if (!file) return;
    setIsUploadingVideo(true);
    const isImage = file.type.startsWith('image/') || file.name.match(/\.(jpeg|jpg|gif|png|webp|svg)$/i);
    setVideoUploadStatus(
      lang === 'ar' 
        ? (isImage ? 'جارِ معالجة ورفع صورة الهدية وحفظها...' : 'جارِ معالجة ورفع الفيديو إلى السيرفر وحفظه...')
        : '正在上传并永久保存...'
    );
    setVideoTestError(false);

    try {
      const safeName = (isImage ? 'img_' : 'media_') + `${Date.now()}_` + file.name.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
      const uploadRes = await uploadMediaToServer(file, safeName);
      
      const hash = await calculateSHA256(file);
      await saveMediaToIndexedDb(hash, file, safeName);
      await saveMediaToIndexedDb(uploadRes.url, file, safeName);

      setVideoUrl(uploadRes.url);

      if (isImage) {
        setPosterUrl(uploadRes.url);
        setUsePosterImage(true);
        setVideoUploadStatus(lang === 'ar' ? '✓ تم رفع وحفظ صورة الهدية بنجاح!' : '图片上传保存成功！');
      } else {
        // Extract metadata for video/svga if applicable
        try {
          const meta = await extractVideoMetadata(file);
          if (meta.duration) {
            setVideoDuration(meta.duration);
          }
          if (meta.posterUrl && !posterUrl) {
            setPosterUrl(meta.posterUrl);
          }
        } catch (mErr) {}
        setIsTestingVideo(true);
        setVideoUploadStatus(lang === 'ar' ? '✓ تم رفع وحفظ الفيديو الدائم بنجاح!' : '视频上传保存成功！');
      }
      setTimeout(() => setVideoUploadStatus(''), 4000);
    } catch (err: any) {
      console.error('File upload error:', err);
      if (isImage) {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            setVideoUrl(reader.result);
            setPosterUrl(reader.result);
            setUsePosterImage(true);
          }
        };
        reader.readAsDataURL(file);
        setVideoUploadStatus(lang === 'ar' ? 'تم تجهيز الصورة بنجاح' : '图片已就绪');
      } else {
        const blobUrl = URL.createObjectURL(file);
        setVideoUrl(blobUrl);
        setVideoUploadStatus(lang === 'ar' ? 'تم تجهيز الفيديو محلياً' : '视频已就绪');
      }
      setTimeout(() => setVideoUploadStatus(''), 3000);
    } finally {
      setIsUploadingVideo(false);
    }
  };

  const handlePosterFileUpload = async (file: File) => {
    if (!file) return;
    setIsUploadingPoster(true);
    try {
      const safeName = `poster_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9_\-\.]/g, '_')}`;
      const uploadRes = await uploadMediaToServer(file, safeName);
      await saveMediaToIndexedDb(uploadRes.url, file, safeName);
      setPosterUrl(uploadRes.url);
      setUsePosterImage(true);
      if (!videoUrl) {
        setVideoUrl(uploadRes.url);
      }
    } catch (err) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setPosterUrl(reader.result);
          setUsePosterImage(true);
          if (!videoUrl) {
            setVideoUrl(reader.result);
          }
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setIsUploadingPoster(false);
    }
  };

  // Manual Order Upload State
  const [isOrderFormOpen, setIsOrderFormOpen] = useState(false);
  const [orderGiftId, setOrderGiftId] = useState<string>(gifts[0]?.id || '');
  const [orderCustomTitle, setOrderCustomTitle] = useState('');
  const [orderBuyerName, setOrderBuyerName] = useState('');
  const [orderBuyerContact, setOrderBuyerContact] = useState('');
  const [orderLicenseType, setOrderLicenseType] = useState<'standard' | 'exclusive'>('standard');
  const [orderPrice, setOrderPrice] = useState<number>(360);
  const [orderPaymentMethod, setOrderPaymentMethod] = useState<'wechat' | 'alipay' | 'card' | 'bank' | 'cash'>('card');
  const [orderNotes, setOrderNotes] = useState('');

  // Site Settings State (Full support for name, logo, primary & secondary phone)
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(() => {
    if (propSiteSettings) return propSiteSettings;
    const cached = localStorage.getItem('jiawei_site_settings');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {}
    }
    return {
      siteName: 'Destroy KING Designer',
      siteSlogan: '',
      logoUrl: '',
      primaryPhone: '+923400700013',
      primaryPhoneLabel: 'WhatsApp',
      secondaryPhone: '',
      secondaryPhoneLabel: 'WhatsApp 2'
    };
  });

  useEffect(() => {
    if (propSiteSettings) {
      setSiteSettings(propSiteSettings);
    }
  }, [propSiteSettings]);

  useEffect(() => {
    const unsubscribe = subscribeToSiteSettings((settings) => {
      if (settings) setSiteSettings(settings);
    });
    return () => unsubscribe();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const saved = await saveSiteSettings(siteSettings);
      setSiteSettings(saved);
      setSuccessMessage(
        lang === 'ar'
          ? '✓ تم حفظ وتثبيت لوجو واسم الموقع وأرقام التواصل بشكل دائم في قاعدة البيانات بنجاح!'
          : '✓ Site settings and phone numbers permanently saved successfully!'
      );
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      setSuccessMessage(
        lang === 'ar'
          ? 'تم حفظ الإعدادات محلياً بنجاح'
          : 'Settings saved locally'
      );
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };

  // Categories State for UI
  const [newCatName, setNewCatName] = useState('');
  const [newCatNameAr, setNewCatNameAr] = useState('');

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    
    const id = newCatName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    await saveCategory({ id, name: newCatName, nameAr: newCatNameAr || newCatName });
    
    setNewCatName('');
    setNewCatNameAr('');
    setSuccessMessage(lang === 'ar' ? 'تمت إضافة القسم بنجاح' : 'Category added successfully');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleDeleteCategory = async (id: string) => {
    if (id === 'all') return;
    if (confirm(lang === 'ar' ? 'هل أنت متأكد من حذف هذا القسم؟' : 'Are you sure you want to delete this category?')) {
      await deleteCategory(id);
      setSuccessMessage(lang === 'ar' ? 'تم حذف القسم بنجاح' : 'Category deleted');
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };

  // Print Document Modal State
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printDelivery, setPrintDelivery] = useState<DeliveryItem | null>(null);
  const [printDocType, setPrintDocType] = useState<'invoice' | 'certificate' | 'voucher' | 'report'>('invoice');

  const openPrintModal = (delivery: DeliveryItem | null, type: 'invoice' | 'certificate' | 'voucher' | 'report' = 'invoice') => {
    setPrintDelivery(delivery);
    setPrintDocType(type);
    setIsPrintModalOpen(true);
  };

  const handleCreateManualOrder = (e: React.FormEvent) => {
    e.preventDefault();

    const selectedGift = gifts.find((g) => g.id === orderGiftId);
    const giftTitle = orderCustomTitle.trim() || selectedGift?.title || 'مؤثر بث مباشر مخصص (Custom VFX Gift)';
    const randomOrder = 'JW' + Date.now().toString().slice(-8);
    const randomLicense = 'CERT-JW-' + Math.floor(100000 + Math.random() * 900000);

    const newDelivery: DeliveryItem = {
      id: 'DEL-' + Math.random().toString(36).substring(2, 9),
      orderId: randomOrder,
      giftId: selectedGift?.id || 'CUSTOM-VFX',
      giftTitle: giftTitle,
      posterUrl: selectedGift?.posterUrl || 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=800&auto=format&fit=crop&q=80',
      videoUrl: selectedGift?.videoUrl || 'https://assets.mixkit.co/videos/preview/mixkit-bright-light-particles-loop-32943-large.mp4',
      format: selectedGift?.formats.map(f => f.name).join(', ') || 'SVGA + MP4 شفاف + VAP + PAG',
      licenseType: orderLicenseType,
      licenseKey: randomLicense,
      downloadUrl: selectedGift?.deliveryUrl || `https://cdn.jwtexiao.com/downloads/order-${randomOrder.toLowerCase()}.zip`,
      fileSize: '48.2 MB',
      cloudDiskCode: selectedGift?.cloudDiskCode || 'JW' + Math.floor(1000 + Math.random() * 9000),
      purchaseDate: new Date().toISOString().split('T')[0],
      price: Number(orderPrice),
      buyerName: orderBuyerName.trim() || (lang === 'ar' ? 'عميل معتمد' : 'VIP Client'),
      buyerContact: orderBuyerContact.trim() || 'streamer@live.com',
      paymentMethod: orderPaymentMethod,
      notes: orderNotes.trim() || undefined,
      status: 'completed'
    };

    // Save to Firestore real-time collection so all users see it immediately!
    addDelivery(newDelivery);

    if (setDeliveries) {
      setDeliveries((prev) => [newDelivery, ...prev]);
    }

    setSuccessMessage(
      lang === 'ar'
        ? `تم رفع الطلب [${newDelivery.orderId}] بنجاح وتوليد شهادة الترخيص وسماع التحديث لجميع المستخدمين فورياً!`
        : `订单 [${newDelivery.orderId}] 上传录入成功，全网实时同步！`
    );

    // Reset Order Form
    setOrderBuyerName('');
    setOrderBuyerContact('');
    setOrderNotes('');
    setIsOrderFormOpen(false);

    setTimeout(() => {
      setSuccessMessage(null);
    }, 4000);
  };

  const handleDeleteOrder = (orderId: string) => {
    if (confirm(lang === 'ar' ? 'هل أنت متأكد من حذف هذا الطلب من السجل؟' : '确认删除该订单记录？')) {
      deleteDelivery(orderId);
      if (setDeliveries) {
        setDeliveries((prev) => prev.filter((d) => d.id !== orderId));
      }
    }
  };

  // Search in list
  const [searchFilter, setSearchFilter] = useState('');

  // Sample Working Video Links for quick insertion
  const sampleVideos = [
    {
      name: 'Glowing Light Orb / كرة ضوئية مشعة',
      url: 'https://assets.mixkit.co/videos/preview/mixkit-bright-light-particles-loop-32943-large.mp4',
      poster: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=800&auto=format&fit=crop&q=80'
    },
    {
      name: 'Golden Dust Whirlwind / عاصفة الغبار الذهبي',
      url: 'https://assets.mixkit.co/videos/preview/mixkit-golden-dust-particles-in-motion-33008-large.mp4',
      poster: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80'
    },
    {
      name: 'Purple Cosmic Nebula / سديم كوني بنفسجي',
      url: 'https://assets.mixkit.co/videos/preview/mixkit-purple-and-blue-light-particles-in-dark-space-41271-large.mp4',
      poster: 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=800&auto=format&fit=crop&q=80'
    },
    {
      name: 'Cyber Neon Tunnel / نفق نيون مستقبلي',
      url: 'https://assets.mixkit.co/videos/preview/mixkit-spinning-around-in-a-futuristic-tunnel-with-neon-lights-42571-large.mp4',
      poster: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80'
    }
  ];

  const handleApplySample = (sample: typeof sampleVideos[0]) => {
    setVideoUrl(sample.url);
    if (!posterUrl) {
      setPosterUrl(sample.poster);
    }
    setIsTestingVideo(true);
  };

  const handleSaveGift = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      alert(lang === 'ar' ? 'يرجى إدخال اسم الهدية' : '请输入礼物名称');
      return;
    }

    const finalMediaUrl = videoUrl.trim() || posterUrl.trim();

    if (!finalMediaUrl) {
      alert(lang === 'ar' ? 'يرجى إدخال رابط أو رفع ملف للهدية (فيديو أو صورة أو SVGA)' : '请输入外链视频或图片URL');
      return;
    }

    const isImageMedia = Boolean(
      finalMediaUrl.match(/\.(jpeg|jpg|gif|png|webp|svg|bmp)(\?.*)?$/i) ||
      finalMediaUrl.startsWith('data:image/') ||
      finalMediaUrl.includes('image')
    );

    const finalPosterUrl = (usePosterImage && posterUrl.trim()) 
      ? posterUrl.trim() 
      : (isImageMedia ? finalMediaUrl : (posterUrl.trim() || ''));

    // Check Gift Upload & Publishing Permission (صلاحية رفع ونشر الهدايا)
    const canUploadGifts = (activeStaff?.permissions?.giftUploadAndPublish !== false) && (activeStaff?.status !== 'inactive');
    if (!canUploadGifts) {
      alert(
        lang === 'ar'
          ? '⚠️ تم رفض العملية: ليس لديك صلاحية رفع ونشر الهدايا (Gift Upload & Publishing Permission) أو تم إيقاف هذا الحساب. يرجى مراجعة إدارة المنصة لتفعيل الصلاحية.'
          : 'Permission Denied: You do not have Gift Upload & Publishing Permission or account is inactive.'
      );
      return;
    }

    // Enforce profile completion for first-time uploaders as requested
    if (!activeStaff.isProfileCompleted) {
      setIsProfileModalOpen(true);
      return;
    }

    // Parse formats
    const parsedFormats: GiftFormat[] = formatsText.split(',').map((f) => {
      const trimmed = f.trim();
      const cleanName = trimmed.replace(/\s*\([^)]*(MB|KB|GB|B|\d)[^)]*\)/gi, '').trim();
      return {
        name: cleanName || trimmed,
        size: ''
      };
    });

    if (editingId) {
      // Update existing
      const existing = gifts.find(g => g.id === editingId);
      if (existing) {
        const updatedGift: GiftItem = {
          ...existing,
          title: title.trim(),
          titleAr: titleAr.trim() || undefined,
          price: Number(price),
          vipPrice: Number(vipPrice),
          exclusivePrice: Number(exclusivePrice),
          videoUrl: finalMediaUrl,
          posterUrl: finalPosterUrl,
          formats: parsedFormats,
          category,
          theme: theme.trim() || '精品',
          effectType,
          deliveryUrl: deliveryUrl.trim() || existing.deliveryUrl,
          cloudDiskCode: cloudDiskCode.trim() || existing.cloudDiskCode
        };
        setGifts(prev => prev.map(g => g.id === editingId ? updatedGift : g));
        try {
          await updateGift(updatedGift);
        } catch (uErr) {
          console.error('Update gift cloud sync note:', uErr);
        }
      }

      setEditingId(null);
      setSuccessMessage(lang === 'ar' ? 'تم تحديث الهدية وحفظها في السيرفر بنجاح!' : '素材更新成功！');
    } else {
      // Create new - Automatically linked to current active staff & WhatsApp!
      const newId = 'NO.' + Math.floor(200000 + Math.random() * 700000);
      const newGift: GiftItem = {
        id: newId,
        title: title.trim(),
        titleAr: titleAr.trim() || undefined,
        price: Number(price),
        vipPrice: Number(vipPrice),
        exclusivePrice: Number(exclusivePrice),
        videoUrl: finalMediaUrl,
        posterUrl: finalPosterUrl,
        formats: parsedFormats,
        tags: ['AI原创', theme.trim() || '精选', '礼物', effectType, '新秀'],
        category,
        theme: theme.trim() || '定制精选',
        effectType,
        author: {
          id: activeStaff.id,
          name: activeStaff.name || authorName.trim() || 'سارة المهندس',
          avatar: activeStaff.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
          verified: true,
          whatsapp: activeStaff.whatsapp
        },
        duration: 12,
        resolution: '1080x1920',
        fps: 60,
        deliveryUrl: deliveryUrl.trim() || `https://cdn.jwtexiao.com/downloads/${newId.toLowerCase()}.zip`,
        cloudDiskCode: cloudDiskCode.trim() || 'JW8866',
        downloadsCount: 0,
        favoritesCount: 0,
        isNew: true,
        isFeatured: true,
        createdAt: new Date().toISOString()
      };

      setGifts(prev => [newGift, ...prev]);
      try {
        await addGift(newGift);
      } catch (aErr) {
        console.error('Add gift cloud sync note:', aErr);
      }

      // Increment employee's gifts count
      updateEmployee({ ...activeStaff, giftsCount: (activeStaff.giftsCount || 0) + 1 });

      setSuccessMessage(lang === 'ar' ? `تم نشر وتسميع الهدية [${newGift.title}] بنجاح في السيرفر والمتجر لكل المستخدمين!` : `礼物 [${newGift.title}] 成功发布并在服务器实时同步！`);
    }

    // Reset Form
    setTitle('');
    setTitleAr('');
    localStorage.removeItem('jiawei_draft_gift_title');
    localStorage.removeItem('jiawei_draft_gift_title_ar');
    setVideoUrl('');
    setPosterUrl('');
    setIsTestingVideo(false);

    // Keep user on the current screen without closing or switching tabs! (CRITICAL USER REQUEST)
    setTimeout(() => {
      setSuccessMessage(null);
    }, 5000);
  };

  // Purge Dummy / Fake Gifts explicitly
  const handlePurgeDummyGifts = async () => {
    try {
      const purged = await purgeDummyGifts();
      setGifts(prev => prev.filter(g => !isDummyGift(g)));
      setSuccessMessage(
        lang === 'ar'
          ? `✓ تم تنظيف وإزالة أي هدايا وهمية بنجاح (${purged} عنصر تم فحصه وحذفه)!`
          : `✓ 已成功清理所有虚假与测试礼物！`
      );
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      console.error(err);
    }
  };

  // Bulk Upload by Multiple Links with Unified Price (رفع جماعي لعدة روابط بتسعيرة موحدة تلقائياً)
  const handleBulkUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedBulkLinks.length === 0) {
      alert(lang === 'ar' ? 'يرجى لصق رابط واحد على الأقل في مربع الروابط' : '请至少输入一条有效链接');
      return;
    }

    const canUploadGifts = (activeStaff?.permissions?.giftUploadAndPublish !== false) && (activeStaff?.status !== 'inactive');
    if (!canUploadGifts) {
      alert(
        lang === 'ar'
          ? '⚠️ تم رفض العملية: ليس لديك صلاحية رفع ونشر الهدايا (Gift Upload & Publishing Permission) أو تم إيقاف هذا الحساب.'
          : 'Permission Denied: You do not have Gift Upload Permission.'
      );
      return;
    }

    if (!activeStaff.isProfileCompleted) {
      setIsProfileModalOpen(true);
      return;
    }

    setIsBulkUploading(true);
    setBulkProgress({ current: 0, total: parsedBulkLinks.length });

    const newGiftsBatch: GiftItem[] = [];
    const dateStr = new Date().toISOString().split('T')[0];
    const defaultFormats: GiftFormat[] = [
      { name: 'MP4带声音', size: '5.0MB' },
      { name: 'SVGA动效文件', size: '10.0MB' },
      { name: 'VAP透明通道', size: '12.0MB' },
      { name: 'PAG文件', size: '7.5MB' }
    ];

    for (let i = 0; i < parsedBulkLinks.length; i++) {
      const url = parsedBulkLinks[i];
      const seqNumber = String(i + 1).padStart(2, '0');
      const newId = 'NO.' + Math.floor(250000 + Math.random() * 80000);

      // Check if image link
      const isImg = Boolean(
        url.match(/\.(jpeg|jpg|gif|png|webp|svg|bmp)(\?.*)?$/i) ||
        url.startsWith('data:image/')
      );

      // Generate title
      let itemTitle = '';
      if (bulkTitlePrefix.trim()) {
        itemTitle = `${bulkTitlePrefix.trim()} #${seqNumber}`;
      } else {
        try {
          const pathname = new URL(url).pathname;
          const cleanName = pathname.split('/').pop()?.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
          if (cleanName && cleanName.length > 2) {
            itemTitle = cleanName;
          } else {
            itemTitle = `تصميم حصري #${seqNumber}`;
          }
        } catch(e) {
          itemTitle = `تصميم حصري #${seqNumber}`;
        }
      }

      const giftItem: GiftItem = {
        id: newId,
        title: itemTitle,
        titleAr: itemTitle,
        titleEn: `Design #${seqNumber}`,
        price: Number(bulkPrice) || 35,
        vipPrice: Number(bulkVipPrice) || Math.round((Number(bulkPrice) || 35) * 0.65),
        exclusivePrice: Number(bulkExclusivePrice) || Math.round((Number(bulkPrice) || 35) * 4.5),
        videoUrl: url,
        posterUrl: isImg ? url : '',
        formats: defaultFormats,
        tags: ['AI原创', bulkTheme.trim() || 'VIP', 'دفعة_سريعة', bulkEffectType, 'جديد'],
        category: bulkCategory,
        theme: bulkTheme.trim() || 'VIP',
        effectType: bulkEffectType,
        author: {
          id: activeStaff.id,
          name: activeStaff.name || authorName.trim() || 'سارة المهندس',
          avatar: activeStaff.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
          verified: true,
          whatsapp: activeStaff.whatsapp
        },
        duration: 12,
        resolution: '1080x1920',
        fps: 60,
        deliveryUrl: url,
        cloudDiskCode: 'JW8866',
        downloadsCount: 0,
        favoritesCount: 0,
        isNew: true,
        isFeatured: true,
        createdAt: dateStr
      };

      newGiftsBatch.push(giftItem);
      setBulkProgress({ current: i + 1, total: parsedBulkLinks.length });
    }

    try {
      await addGiftsBatch(newGiftsBatch);
      setGifts(prev => [...newGiftsBatch, ...prev]);

      updateEmployee({
        ...activeStaff,
        giftsCount: (activeStaff.giftsCount || 0) + newGiftsBatch.length
      });

      setBulkSuccessList(newGiftsBatch);
      setBulkLinksText('');

      setSuccessMessage(
        lang === 'ar'
          ? `✓ تم رفع وتنزيل ${newGiftsBatch.length} هدية بنجاح في المتجر دفعة واحدة وبنفس التسعيرة (${bulkPrice} $)!`
          : `✓ 成功批量发布 ${newGiftsBatch.length} 件礼物素材！`
      );
      // CRITICAL: Do NOT close or reopen page/modal! Keep user on screen!
      setTimeout(() => setSuccessMessage(null), 7000);
    } catch (uploadErr) {
      console.error('Error during bulk upload:', uploadErr);
      alert(lang === 'ar' ? 'حدث خطأ أثناء الرفع الجماعي' : '批量发布失败');
    } finally {
      setIsBulkUploading(false);
      setBulkProgress(null);
    }
  };

  // Save First-Time / Profile Setup & Sync WhatsApp to all gifts
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim()) {
      alert(lang === 'ar' ? 'يرجى إدخال اسمك أو لقبك كمصمم' : '请输入设计师姓名');
      return;
    }
    if (!profileWhatsapp.trim()) {
      alert(lang === 'ar' ? 'يرجى إدخال رقم الواتساب مع كود الدولة' : '请输入WhatsApp号码');
      return;
    }

    const targetStaff = editingStaffTarget || activeStaff;
    const cleanWhatsapp = profileWhatsapp.trim();

    const updatedStaff: EmployeeUser = {
      ...targetStaff,
      name: profileName.trim(),
      whatsapp: cleanWhatsapp,
      bio: profileBio.trim() || targetStaff.bio,
      avatar: profileAvatar.trim() || targetStaff.avatar,
      isProfileCompleted: true
    };

    // Update in Firestore
    await updateEmployee(updatedStaff);

    // Update in local staff list (activeStaff will automatically update because it is derived from staffList)
    setStaffList((prev) => {
      const nextList = prev.map((e) => (e.id === updatedStaff.id ? updatedStaff : e));
      try {
        localStorage.setItem('jiawei_employees_v1', JSON.stringify(nextList));
      } catch (err) {
        console.error('Failed to cache employees in localStorage:', err);
      }
      return nextList;
    });

    if (targetStaff.id === activeStaff?.id) {
      setAuthorName(profileName.trim());
      // Also sync current logged-in user in localStorage if matching
      try {
        const savedUserStr = localStorage.getItem('jiawei_current_user_v1');
        if (savedUserStr) {
          const parsedUser = JSON.parse(savedUserStr);
          if (parsedUser.id === updatedStaff.id || parsedUser.employeeId === updatedStaff.id) {
            parsedUser.whatsapp = cleanWhatsapp;
            parsedUser.name = updatedStaff.name;
            localStorage.setItem('jiawei_current_user_v1', JSON.stringify(parsedUser));
          }
        }
      } catch (err) {
        console.error('Failed to sync auth user in localStorage:', err);
      }
    }

    // Update WhatsApp across ALL gifts created/uploaded by this user in local state
    let updatedGiftsCount = 0;
    setGifts((prevGifts) =>
      prevGifts.map((gift) => {
        const matchById = gift.author?.id && (gift.author.id === targetStaff.id || gift.author.id === activeStaff.id);
        const matchByName = gift.author?.name && (
          gift.author.name.trim().toLowerCase() === targetStaff.name?.trim().toLowerCase() ||
          gift.author.name.trim().toLowerCase() === profileName.trim().toLowerCase()
        );
        if (matchById || matchByName) {
          updatedGiftsCount++;
          return {
            ...gift,
            author: {
              ...gift.author,
              whatsapp: cleanWhatsapp
            }
          };
        }
        return gift;
      })
    );

    // Update WhatsApp on all gifts in Firestore database
    try {
      const cloudUpdated = await updateCreatorGiftsWhatsapp(
        targetStaff.id,
        profileName.trim() || targetStaff.name,
        cleanWhatsapp
      );
      console.log(`Successfully synced WhatsApp across ${cloudUpdated} gifts in cloud database.`);
    } catch (err) {
      console.error('Error syncing gifts WhatsApp in Firestore:', err);
    }

    setIsProfileModalOpen(false);
    setEditingStaffTarget(null);
    setSuccessMessage(
      lang === 'ar'
        ? `تم حفظ وتأكيد رقم الواتساب (${cleanWhatsapp}) وتحديثه بنجاح على جميع هداياك (${updatedGiftsCount} هدية)!`
        : `WhatsApp number (${cleanWhatsapp}) confirmed and synced across all ${updatedGiftsCount} gifts!`
    );
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  // Capture snapshot from current video frame and automatically add to poster image field
  const handleCaptureSnapshot = async () => {
    if (!videoUrl) {
      alert(lang === 'ar' ? 'يرجى وضع رابط الفيديو أو رفع ملفه أولاً' : 'Please provide or upload a video first');
      return;
    }

    setIsCapturingSnapshot(true);
    const vid = previewVideoRef.current;
    if (vid) {
      vid.pause();
      setIsVideoPlaying(false);
    }
    const targetTime = vid ? (vid.currentTime || 0) : videoScrubTime || 0;

    // Helper: draw video element to canvas and return compact WebP base64
    const drawVideoToDataUrl = (targetVideo: HTMLVideoElement): string => {
      const maxDim = 400;
      let w = targetVideo.videoWidth || 720;
      let h = targetVideo.videoHeight || 1280;
      if (w > maxDim || h > maxDim) {
        if (w > h) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        } else {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, w);
      canvas.height = Math.max(1, h);
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Cannot get canvas context');
      ctx.drawImage(targetVideo, 0, 0, canvas.width, canvas.height);

      // Export as WebP for ultra-lightweight size as requested ("بصيغه الويفي عشان تكون خفيفه")
      try {
        const webpData = canvas.toDataURL('image/webp', 0.82);
        if (webpData.startsWith('data:image/webp')) {
          return webpData;
        }
      } catch {}
      return canvas.toDataURL('image/jpeg', 0.80);
    };

    try {
      let capturedDataUrl = '';

      // Attempt 1: Direct capture from existing video if same-origin, blob, or host allows CORS
      if (vid && vid.readyState >= 2) {
        try {
          capturedDataUrl = drawVideoToDataUrl(vid);
        } catch (directErr) {
          console.warn('Direct canvas draw tainted by CORS. Trying snapshot gateway...', directErr);
        }
      }

      // Attempt 2: Use CORS snapshot gateway with Range header support
      if (!capturedDataUrl) {
        const tempVid = document.createElement('video');
        tempVid.crossOrigin = 'anonymous';
        tempVid.muted = true;
        tempVid.playsInline = true;
        tempVid.preload = 'auto';

        // Local blob or dedicated snapshot CORS gateway
        const gatewayUrl = videoUrl.startsWith('blob:') 
          ? videoUrl 
          : `/api/snapshot?url=${encodeURIComponent(videoUrl)}`;
        
        tempVid.src = gatewayUrl;

        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Video frame capture timeout')), 10000);
          tempVid.onloadedmetadata = () => {
            const seekTo = Math.min(targetTime, tempVid.duration || targetTime);
            tempVid.currentTime = seekTo;
          };
          tempVid.onseeked = () => {
            clearTimeout(timeout);
            resolve();
          };
          tempVid.onerror = (e) => {
            clearTimeout(timeout);
            reject(new Error('Failed to load video frame via gateway'));
          };
        });

        capturedDataUrl = drawVideoToDataUrl(tempVid);
        tempVid.src = '';
        tempVid.remove();
      }

      // Attempt 3: Direct blob fetch fallback
      if (!capturedDataUrl) {
        let blobUrl = '';
        let isLocalBlob = false;

        if (videoUrl.startsWith('blob:')) {
          blobUrl = videoUrl;
          isLocalBlob = true;
        } else {
          const resp = await fetch(`/api/snapshot?url=${encodeURIComponent(videoUrl)}`);
          if (!resp.ok) {
            throw new Error(`Failed to fetch media blob (${resp.status})`);
          }
          const blob = await resp.blob();
          blobUrl = URL.createObjectURL(blob);
        }

        const tempVid = document.createElement('video');
        tempVid.muted = true;
        tempVid.playsInline = true;
        tempVid.preload = 'auto';
        tempVid.src = blobUrl;

        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Blob video timeout')), 8000);
          tempVid.onloadedmetadata = () => {
            tempVid.currentTime = Math.min(targetTime, tempVid.duration || targetTime);
          };
          tempVid.onseeked = () => {
            clearTimeout(timeout);
            resolve();
          };
          tempVid.onerror = (e) => {
            clearTimeout(timeout);
            reject(e);
          };
        });

        capturedDataUrl = drawVideoToDataUrl(tempVid);

        if (blobUrl && !isLocalBlob) {
          URL.revokeObjectURL(blobUrl);
        }
        tempVid.src = '';
        tempVid.remove();
      }

      if (capturedDataUrl) {
        // Automatically populate the Poster Image box, enable it, and open shape editor modal
        setPosterUrl(capturedDataUrl);
        setUsePosterImage(true);
        setPosterLoadError(false);
        setShapeEditorImage(capturedDataUrl);
        setIsShapeEditorOpen(true);
        setSuccessMessage(
          lang === 'ar'
            ? `✓ تم التقاط لقطة الفيديو بنجاح! تم فتح نافذة المعاينة لاختيار الشكل والشفافية.`
            : `✓ Video snapshot captured! Preview modal opened for shape & opacity adjustment.`
        );
        setTimeout(() => setSuccessMessage(null), 5000);
      } else {
        throw new Error('Frame extraction returned empty');
      }
    } catch (err: any) {
      console.warn('Frame capture error:', err);
      alert(
        lang === 'ar'
          ? '⚠️ تعذر التقاط الصورة تلقائياً من هذا الرابط الخارجي. يمكنك رفع ملف الفيديو من جهازك عبر [رفع ملف فيديو] أو اختيار صورة جاهزة عبر [رفع صورة]!'
          : 'Could not extract frame automatically from this URL. Please use [Upload Video File] or [Upload Image].'
      );
    } finally {
      setIsCapturingSnapshot(false);
    }
  };

  // Create New Staff Member (انشاء حساب موظف داخل المنصة)
  const handleCreateStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName.trim()) {
      alert(lang === 'ar' ? 'يرجى كتابة اسم الموظف / المصمم' : '请输入员工姓名');
      return;
    }
    if (!newStaffWhatsapp.trim()) {
      alert(lang === 'ar' ? 'يرجى إدخال رقم الواتساب' : '请输入WhatsApp号码');
      return;
    }

    const newEmpId = 'EMP-' + Math.floor(100 + Math.random() * 900);
    const assignedPassword = newStaffPassword.trim() || '123456';
    const newEmp: EmployeeUser = {
      id: newEmpId,
      name: newStaffName.trim(),
      email: newStaffEmail.trim() || `staff_${newEmpId.toLowerCase()}@streamgifts.com`,
      password: assignedPassword,
      whatsapp: newStaffWhatsapp.trim(),
      role: newStaffRole,
      status: 'active',
      permissions: {
        giftUploadAndPublish: newStaffCanUpload,
        manageAccounts: newStaffRole === 'admin',
        manageBanners: newStaffRole === 'admin',
        viewOrders: true
      },
      avatar: newStaffAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=160&auto=format&fit=crop&q=80',
      bio: newStaffBio.trim() || (newStaffRole === 'designer' ? 'مصمم ومعدل مؤثرات بصرية' : 'مشرف إداري بالمنصة'),
      joinedDate: new Date().toISOString().split('T')[0],
      giftsCount: 0,
      totalSales: 0,
      isProfileCompleted: true
    };

    // Save to Firestore
    updateEmployee(newEmp);

    setStaffList((prev) => [newEmp, ...prev]);
    handleSwitchStaff(newEmpId);
    setAuthorName(newEmp.name);
    if (onStaffLogin) {
      onStaffLogin(newEmp);
    }

    // Clear form
    setNewStaffName('');
    setNewStaffWhatsapp('');
    setNewStaffEmail('');
    setNewStaffPassword('123456');
    setNewStaffBio('');

    setSuccessMessage(
      lang === 'ar'
        ? `تم إنشاء حساب [${newEmp.name}] بنجاح، وكلمة المرور: (${assignedPassword}). ${newStaffCanUpload ? 'مع منح صلاحية رفع ونشر الهدايا.' : 'بدون صلاحية رفع الهدايا.'}`
        : `新员工 [${newEmp.name}] 创建成功 (初始密码: ${assignedPassword})！`
    );

    // If granted upload permission, take them to upload panel
    if (newStaffCanUpload) {
      setActiveTab('create');
    }
    setTimeout(() => setSuccessMessage(null), 3500);
  };

  // Toggle Account Active / Inactive Status (تفعيل أو إلغاء تفعيل الحساب)
  const handleToggleStaffStatus = async (empId: string, currentStatus: 'active' | 'inactive', role: UserRole) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      await toggleEmployeeStatus(empId, newStatus, role);
      setStaffList((prev) => prev.map((e) => e.id === empId ? { ...e, status: newStatus } : e));
      setSuccessMessage(
        lang === 'ar'
          ? `تم تحديث حالة الحساب بنجاح إلى: [${newStatus === 'active' ? 'مفعل ✅' : 'غير مفعل / معطل ❌'}]`
          : `账号状态已更新为: ${newStatus}`
      );
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error(err);
      alert(lang === 'ar' ? 'حدث خطأ أثناء تغيير حالة الحساب' : '更新账号状态失败');
    }
  };

  // Toggle specific permission
  const handleTogglePermission = async (empId: string, permKey: keyof UserPermissions, currentValue: boolean, role: UserRole) => {
    const newValue = !currentValue;
    try {
      // Find the employee to get current permissions
      const emp = staffList.find(e => e.id === empId);
      if (!emp) return;
      
      const newPermissions = {
        ...(emp.permissions || {
          giftUploadAndPublish: false,
          manageAccounts: false,
          manageBanners: false,
          viewOrders: false,
          manageSettings: false
        }),
        [permKey]: newValue
      };

      await updateEmployeePermissions(empId, newPermissions, role);
      setStaffList((prev) => prev.map((e) => e.id === empId ? { ...e, permissions: newPermissions } : e));
      setSuccessMessage(
        lang === 'ar'
          ? `تم تحديث الصلاحيات بنجاح`
          : `Permissions updated successfully`
      );
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error(err);
      alert(lang === 'ar' ? 'حدث خطأ أثناء تعديل الصلاحيات' : 'Failed to update permissions');
    }
  };

  // Delete Staff
  const handleDeleteStaff = (empId: string, role: UserRole) => {
    if (staffList.length <= 1) {
      alert(lang === 'ar' ? 'لا يمكن حذف الموظف الوحيد في المنصة.' : '不能删除唯一的员工账号');
      return;
    }
    if (confirm(lang === 'ar' ? 'هل أنت متأكد من حذف هذا الحساب؟' : '确认删除此账号？')) {
      deleteEmployee(empId, role);
      setStaffList((prev) => prev.filter((e) => e.id !== empId));
      if (activeStaff.id === empId) {
        const remaining = staffList.filter((e) => e.id !== empId);
        if (remaining.length > 0) {
          handleSwitchStaff(remaining[0].id);
        }
      }
    }
  };

  const handleStartEdit = (gift: GiftItem) => {
    setEditingId(gift.id);
    setTitle(gift.title);
    setTitleAr(gift.titleAr || '');
    setPrice(gift.price);
    setVipPrice(gift.vipPrice);
    setExclusivePrice(gift.exclusivePrice);
    setVideoUrl(gift.videoUrl);
    setPosterUrl(gift.posterUrl || '');
    setUsePosterImage(Boolean(gift.posterUrl && gift.posterUrl.trim()));
    setFormatsText(gift.formats.map((f) => f.name.replace(/\s*\([^)]*(MB|KB|GB|B|\d)[^)]*\)/gi, '').trim()).join(', '));
    setCategory(gift.category);
    setTheme(gift.theme);
    setEffectType(gift.effectType);
    setAuthorName(gift.author.name);
    setDeliveryUrl(gift.deliveryUrl || '');
    setCloudDiskCode(gift.cloudDiskCode || 'JW8866');
    setActiveTab('create');
  };

  const [isDeletingAll, setIsDeletingAll] = useState(false);

  const handleDeleteGift = (id: string) => {
    if (confirm(lang === 'ar' ? 'هل أنت متأكد من حذف هذه الهدية؟' : '确认删除该礼物素材？')) {
      setGifts(prev => prev.filter(g => g.id !== id));
      deleteGift(id).catch(() => {});
    }
  };

  const handleDeleteAllGifts = async () => {
    const count = gifts.length;
    if (count === 0) {
      alert(lang === 'ar' ? 'لا توجد أي منتجات أو هدايا مرفوعة لحذفها.' : '没有可删除的产品');
      return;
    }

    const confirmMsg = lang === 'ar'
      ? `⚠️ تحذير مهم جداً: هل أنت متأكد من رغبتك في حذف جميع المنتجات والهدايا المرفوعة (${count} هدية) نهائياً من قاعدة البيانات والمتجر؟\n\nلن يمكن التراجع عن هذا الإجراء وسيتم إفراغ المتجر فوراً.`
      : `⚠️ 警告：确定要永久清空并删除所有已上传的 (${count} 件) 产品与礼物吗？此操作无法撤销。`;

    if (window.confirm(confirmMsg)) {
      try {
        setIsDeletingAll(true);
        const deletedCount = await deleteAllGiftsFromDb();
        setGifts([]);
        setSuccessMessage(
          lang === 'ar'
            ? `✓ تم حذف جميع المنتجات المرفوعة بنجاح (${deletedCount || count} هدية) وإفراغ المتجر بالكامل!`
            : `✓ 已成功删除所有已上传产品 (${deletedCount || count} 件)！`
        );
        setTimeout(() => setSuccessMessage(null), 5000);
      } catch (err: any) {
        console.error('Error deleting all gifts:', err);
        alert(lang === 'ar' ? 'حدث خطأ أثناء محاولة حذف المنتجات' : '删除失败，请稍后重试');
      } finally {
        setIsDeletingAll(false);
      }
    }
  };

  const filteredGifts = gifts.filter((g) => {
    // Search filter
    const matchesSearch = g.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
      g.id.toLowerCase().includes(searchFilter.toLowerCase()) ||
      (g.titleAr && g.titleAr.includes(searchFilter));
      
    // Permission filter
    const matchesPermission = isAdmin || (currentUser && g.author.id === currentUser.id);
    
    return matchesSearch && matchesPermission;
  });

  return (
    <div className="max-w-[1720px] mx-auto p-4 sm:p-6 space-y-6">
      {/* Top Banner Stats Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-[#121724] to-blue-950/70 border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse"></span>
            <h1 className="text-xl sm:text-2xl font-black text-white">
              {t.dashTitle}
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-3xl">
            {t.dashSub}
          </p>
        </div>

        {/* Quick Stats Grid & Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <div className="px-3.5 py-2 rounded-xl bg-slate-900/90 border border-slate-700/80 text-center">
            <div className="text-[10px] text-slate-400 font-medium">{t.totalGiftsCount}</div>
            <div className="text-lg font-black text-cyan-300 font-mono">{gifts.length}</div>
          </div>
          <div className="px-3.5 py-2 rounded-xl bg-slate-900/90 border border-slate-700/80 text-center">
            <div className="text-[10px] text-slate-400 font-medium">{t.totalSales}</div>
            <div className="text-lg font-black text-emerald-400 font-mono">{deliveries.length}</div>
          </div>

          {/* Quick Site Identity & Phone Numbers Button */}
          <button
            type="button"
            onClick={() => setIsSiteSettingsModalOpen(true)}
            className="px-3.5 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95"
            title={lang === 'ar' ? 'تعديل لوجو واسم الموقع وأرقام التواصل' : 'Edit site identity & phone numbers'}
          >
            <SlidersHorizontal className="w-4 h-4 text-amber-400" />
            <span>{lang === 'ar' ? 'هوية الموقع والأرقام' : 'Site & Numbers'}</span>
          </button>

          {/* Quick Delete All Uploaded Products Button */}
          <button
            type="button"
            disabled={gifts.length === 0}
            onClick={() => setIsDeleteAllModalOpen(true)}
            className="px-3.5 py-2.5 rounded-xl bg-red-950/70 hover:bg-red-900 text-red-300 hover:text-white border border-red-800/80 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-sm disabled:opacity-40 disabled:pointer-events-none active:scale-95"
            title={lang === 'ar' ? 'حذف جميع المنتجات المرفوعة نهائياً' : 'Delete all uploaded products'}
          >
            <Trash2 className="w-4 h-4 text-red-400" />
            <span>{lang === 'ar' ? `حذف جميع المنتجات (${gifts.length})` : `Delete All (${gifts.length})`}</span>
          </button>
        </div>
      </div>

      {/* Success Alert */}
      {successMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-950/70 border border-emerald-500/60 text-emerald-200 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 text-xs font-semibold overflow-x-auto">
        {canManageGifts && (
          <>
            <button
              onClick={() => setActiveTab('create')}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl transition-all whitespace-nowrap ${
                activeTab === 'create'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              <span>{editingId ? (lang === 'ar' ? 'تعديل الهدية' : '编辑礼物素材') : t.addNewGift}</span>
            </button>

            <button
              onClick={() => setActiveTab('list')}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl transition-all whitespace-nowrap ${
                activeTab === 'list'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>{t.manageGifts} ({gifts.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('optimizer')}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl transition-all whitespace-nowrap font-bold cursor-pointer ${
                activeTab === 'optimizer'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20'
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Gift Media Optimizer</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-400/20 text-amber-200 border border-amber-400/30 font-mono">
                SVGA 2.0
              </span>
            </button>
          </>
        )}

        {(isAdmin && canViewOrders) && (
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl transition-all whitespace-nowrap ${
              activeTab === 'orders'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <PackageCheck className="w-4 h-4" />
            <span>{t.ordersLog} ({deliveries.length})</span>
          </button>
        )}

        {isAdmin && (
          <>
            {canManageAccounts && (
              <button
                onClick={() => setActiveTab('staff')}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl transition-all whitespace-nowrap ${
                  activeTab === 'staff'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <UserCheck className="w-4 h-4 text-emerald-400" />
                <span>{lang === 'ar' ? 'إدارة الحسابات والصلاحيات' : t.staffManagement} ({staffList.length})</span>
              </button>
            )}

            {canManageBanners && (
              <button
                onClick={() => setActiveTab('banners')}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'banners'
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <ImageIcon className="w-4 h-4 text-purple-400" />
                <span>{lang === 'ar' ? 'إدارة البنرات (Banners)' : '横幅广告管理'} ({bannersList.length})</span>
              </button>
            )}

            {canManageSettings && (
              <>
                <button
                  onClick={() => setActiveTab('guide')}
                  className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl transition-all whitespace-nowrap ${
                    activeTab === 'guide'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Globe className="w-4 h-4" />
                  <span>{t.cdnGuide}</span>
                </button>

                <button
                  onClick={() => setActiveTab('categories')}
                  className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl transition-all whitespace-nowrap ${
                    activeTab === 'categories'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Layers className="w-4 h-4 text-emerald-400" />
                  <span>{lang === 'ar' ? 'إدارة الأقسام' : '分类管理'}</span>
                </button>

                <button
                  onClick={() => setActiveTab('settings')}
                  className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl transition-all whitespace-nowrap ${
                    activeTab === 'settings'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <SlidersHorizontal className="w-4 h-4 text-amber-400" />
                  <span>{lang === 'ar' ? 'إعدادات الموقع' : '网站设置'}</span>
                </button>
              </>
            )}
          </>
        )}
      </div>

      {/* TAB 1: ADD / EDIT GIFT FORM (Part 2 of user request) */}
      {activeTab === 'create' && (
        <div className="space-y-4">
          {/* Active Creator & WhatsApp Linkage Header Banner (CRITICAL USER REQUEST) */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-[#131929] to-cyan-950/40 border border-slate-700/80 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="relative shrink-0">
                <img
                  src={activeStaff.avatar}
                  alt={activeStaff.name}
                  className="w-13 h-13 rounded-2xl object-cover border-2 border-cyan-500/70 shadow-md"
                />
                <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-[#111520] flex items-center justify-center shadow">
                  <Check className="w-2.5 h-2.5 text-white" />
                </span>
              </div>

              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-slate-400 font-medium">{lang === 'ar' ? 'المصمم / المشرف النشط:' : 'Active Staff:'}</span>
                  <span className="text-sm font-black text-white">{activeStaff.name}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold">
                    {activeStaff.role === 'admin' ? (lang === 'ar' ? 'مسؤول / أدمن' : 'Admin') : (lang === 'ar' ? 'مصمم معتمد' : 'Designer')}
                  </span>

                  {/* Account Status Badge */}
                  {activeStaff.status === 'inactive' ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/40 font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                      <span>{lang === 'ar' ? 'الحساب غير مفعل (معطل)' : '账号已停用'}</span>
                    </span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                      <span>{lang === 'ar' ? 'حساب مفعل' : '账号正常'}</span>
                    </span>
                  )}

                  {/* Gift Upload & Publishing Permission Badge */}
                  {activeStaff.permissions?.giftUploadAndPublish !== false && activeStaff.status !== 'inactive' ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-purple-400" />
                      <span>{lang === 'ar' ? 'صلاحية رفع ونشر الهدايا: مصرح ومفعل ✅' : '礼品上传权限: 已开启'}</span>
                    </span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 text-amber-400" />
                      <span>{lang === 'ar' ? 'صلاحية رفع الهدايا: مسحوبة وموقوفة ⛔' : '礼品上传权限: 已禁用'}</span>
                    </span>
                  )}

                  {activeStaff.isProfileCompleted ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 font-semibold">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      <span>{lang === 'ar' ? 'الملف مكتمل' : 'Profile Complete'}</span>
                    </span>
                  ) : (
                    <button
                      onClick={() => setIsProfileModalOpen(true)}
                      className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1 font-semibold animate-pulse hover:bg-amber-500/30"
                    >
                      <AlertCircle className="w-3 h-3 text-amber-400" />
                      <span>{lang === 'ar' ? 'أكمل ملفك الآن' : 'Complete Profile'}</span>
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40">
                    <MessageCircle className="w-4 h-4 text-emerald-400" />
                    <span className="text-slate-300 font-medium">{lang === 'ar' ? 'رقم الواتساب:' : 'WhatsApp:'}</span>
                    <span className="font-mono text-emerald-300 font-extrabold dir-ltr text-xs tracking-wider">
                      {activeStaff.whatsapp || (lang === 'ar' ? 'لم يحدد بعد' : 'Not set')}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold ml-1">
                      {lang === 'ar' ? '✓ يثبت تلقائياً في كل فيديو' : '✓ Auto-synced on all videos'}
                    </span>
                  </div>

                  {activeStaff.whatsapp && (
                    <a
                      href={`https://wa.me/${activeStaff.whatsapp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent('مرحباً، أود الاستفسار عن تصاميم ومؤثرات الهدايا في متجر جياوي')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full bg-emerald-950/80 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-500/50 transition-colors"
                      title={lang === 'ar' ? 'محادثة واتساب' : 'WhatsApp'}
                    >
                      <MessageCircle className="w-3 h-3 text-emerald-400" />
                      <span>{lang === 'ar' ? 'محادثة واتساب' : 'WhatsApp'}</span>
                    </a>
                  )}

                  <span className="text-slate-500 text-[11px]">|</span>
                  <span className="text-slate-400 text-[11px]">{lang === 'ar' ? 'الهدايا المرفوعة' : 'Uploaded Gifts'}: <strong className="text-cyan-300 font-bold">{activeStaff.giftsCount || 0}</strong></span>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <span className="text-emerald-400">⚡</span>
                  <p>
                    {lang === 'ar' 
                      ? 'رقم الواتساب ثابت ومثبت على حسابك تلقائياً: سيتم دمجه ونزوله مباشرة في كل فيديو ترفعه دون الحاجة لإدخاله يدوياً كل مرة.' 
                      : '⚡ 您的WhatsApp号码已锁定并永久绑定，每次发布视频时将自动附加生效，无需重复手动输入。'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
              <button
                type="button"
                onClick={() => setIsProfileModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 hover:border-slate-600 transition-colors flex items-center gap-1.5 shadow"
              >
                <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
                <span>{lang === 'ar' ? 'تعديل الملف' : 'Edit Profile'}</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('staff')}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600/30 to-cyan-600/30 hover:from-blue-600/40 hover:to-cyan-600/40 text-cyan-300 text-xs font-semibold border border-cyan-500/50 transition-all flex items-center gap-1.5 shadow"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>{lang === 'ar' ? 'تبديل الحساب' : 'Switch Staff'}</span>
              </button>
            </div>
          </div>

          {/* Permission Lock Warning Banner (when permission is disabled) */}
          {(activeStaff.permissions?.giftUploadAndPublish === false || activeStaff.status === 'inactive') && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-red-950/70 via-amber-950/40 to-slate-900 border border-red-500/50 text-slate-200 space-y-2 shadow-lg">
              <div className="flex items-center gap-2 text-red-300 font-bold text-sm">
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                <span>
                  {lang === 'ar'
                    ? '⚠️ تنبيه الصلاحية: تم إيقاف أو سحب [صلاحية رفع ونشر الهدايا - Gift Upload & Publishing Permission] لهذا الحساب'
                    : '⚠️ Permission Notice: Gift Upload & Publishing Permission is Revoked for this Account'}
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {lang === 'ar'
                  ? activeStaff.status === 'inactive'
                    ? 'هذا الحساب معطل حالياً من قِبل إدارة المنصة. لا يمكنك رفع ملفات أو إضافة هدايا جديدة حتى يتم تفعيل الحساب من لوحة إدارة الحسابات.'
                    : 'تم سحب صلاحية رفع ونشر الهدايا من هذا الحساب. يمكنك استعراض الهدايا أو مراجعة المسؤول لتفعيل الصلاحية من لوحة إدارة الحسابات والصلاحيات.'
                  : 'You do not have permission to upload or publish gifts. Please contact the administrator to enable this permission.'}
              </p>
              <div className="pt-1 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('staff')}
                  className="px-4 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-xs font-bold border border-cyan-500/40 flex items-center gap-1.5 transition-colors"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>{lang === 'ar' ? 'الانتقال إلى لوحة إدارة الحسابات والصلاحيات' : 'Open Accounts & Permissions'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Mode Switch: Single Gift vs Bulk Links Upload */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#111520] border border-slate-800 shadow-md">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse"></span>
              <span className="text-xs font-bold text-slate-200">
                {lang === 'ar' ? 'اختر طريقة الرفع والنشر للمتجر:' : '选择素材发布模式：'}
              </span>
            </div>

            <div className="flex items-center gap-2 bg-slate-900/90 p-1 rounded-xl border border-slate-700/80">
              <button
                type="button"
                onClick={() => setUploadMode('single')}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  uploadMode === 'single'
                    ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <PlusCircle className="w-4 h-4" />
                <span>{lang === 'ar' ? 'رفع فردي (هدية واحدة)' : '单品上传'}</span>
              </button>

              <button
                type="button"
                onClick={() => setUploadMode('bulk')}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  uploadMode === 'bulk'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 shadow-md shadow-emerald-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <UploadCloud className="w-4 h-4" />
                <span>{lang === 'ar' ? '⚡ رفع جماعي بالروابط (20 - 30+ رابط)' : '⚡ 批量外链上传'}</span>
                <span className="px-1.5 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 text-[9px] font-black border border-emerald-400/40">
                  {lang === 'ar' ? 'تسعيرة موحدة' : '统一定价'}
                </span>
              </button>
            </div>
          </div>

          {uploadMode === 'bulk' ? (
            <div className="bg-[#111520] border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-6">
              {/* Header Info */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/70 via-slate-900 to-cyan-950/70 border border-emerald-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300 shrink-0 shadow">
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white flex items-center gap-2">
                      <span>{lang === 'ar' ? 'نظام الرفع الجماعي الفوري لعدة روابط مع تسعيرة موحدة' : '批量外链极速导入系统'}</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                        {lang === 'ar' ? 'تلقائي 100%' : '100% Auto'}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      {lang === 'ar'
                        ? 'ضع حتى 20 إلى 30+ رابط مباشر، وحدد تسعيرة موحدة للمجموعة، وسيتم رفعها ونشرها تلقائياً بالكامل بدون إغلاق هذه الصفحة أو وميض الشاشة!'
                        : '粘贴 20 至 30+ 条直链，设定统一价格，一键全自动批量发布，页面不关闭、不闪烁刷新！'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                  <span className="text-xs font-mono font-bold text-emerald-300 bg-emerald-950/80 px-3 py-1.5 rounded-xl border border-emerald-500/40 flex items-center gap-1.5">
                    <span>{lang === 'ar' ? 'الروابط المرصودة:' : '已识别直链:'}</span>
                    <strong className="text-sm text-white font-extrabold">{parsedBulkLinks.length}</strong>
                  </span>
                </div>
              </div>

              <form onSubmit={handleBulkUpload} className="space-y-6">
                {/* 1. Multi Links Textarea */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-200 flex items-center gap-2">
                      <Video className="w-4 h-4 text-cyan-400" />
                      <span>{lang === 'ar' ? 'ضع الروابط هنا (رابط واحد في كل سطر - يدعم 20، 30، حتى 50+ رابط معاً):' : '输入外链地址列表（每行一条链接，支持50+条）：'} *</span>
                    </label>
                    <div className="flex items-center gap-2">
                      {parsedBulkLinks.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setBulkLinksText('')}
                          className="text-[11px] text-red-400 hover:text-red-300 flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>{lang === 'ar' ? 'مسح الروابط' : '清空'}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <textarea
                    rows={8}
                    required
                    value={bulkLinksText}
                    onChange={(e) => setBulkLinksText(e.target.value)}
                    placeholder={
                      lang === 'ar'
                        ? "ضع الروابط هنا، رابط واحد لكل سطر:\nhttps://assets.mixkit.co/videos/preview/mixkit-bright-light-particles-loop-32943-large.mp4\nhttps://assets.mixkit.co/videos/preview/mixkit-golden-dust-particles-in-motion-33008-large.mp4\nhttps://assets.mixkit.co/videos/preview/mixkit-purple-and-blue-light-particles-in-dark-space-41271-large.mp4\n..."
                        : "每行粘贴一条直接可访问的视频或动效直链...\nhttps://cdn.example.com/video01.mp4\nhttps://cdn.example.com/video02.mp4"
                    }
                    className="w-full px-4 py-3 rounded-2xl bg-slate-900 border border-slate-700 text-xs font-mono text-cyan-300 focus:outline-none focus:border-emerald-500 leading-relaxed transition-colors dir-ltr"
                  />

                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-400 font-bold">✓</span>
                      <span>{lang === 'ar' ? 'يدعم روابط MP4، SVGA، VAP، PAG وروابط الصور المباشرة (CDN).' : '支持直接 MP4/SVGA/图片 直链。'}</span>
                    </div>
                    <div>
                      {parsedBulkLinks.length > 0 ? (
                        <span className="text-emerald-400 font-bold font-mono">
                          {lang === 'ar' ? `جاهز لرفع ${parsedBulkLinks.length} هدية دفعة واحدة 🚀` : `已就绪 ${parsedBulkLinks.length} 件 🚀`}
                        </span>
                      ) : (
                        <span className="text-slate-500">
                          {lang === 'ar' ? 'الصق الروابط لتفعيل زر الرفع الموحد' : '粘贴链接后即可发布'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. Unified Pricing Card ("وضع تسعيرة واحدة") */}
                <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-emerald-400" />
                      <h4 className="text-xs font-bold text-white">
                        {lang === 'ar' ? 'التسعيرة الموحدة لجميع الروابط المرفوعة:' : '统一设定整批素材价格：'}
                      </h4>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      {lang === 'ar' ? 'ستطبق هذه الأسعار على كل الهدايا المنشورة دفعة واحدة' : '该定价将统一应用于本批次所有素材'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">
                        {lang === 'ar' ? 'السعر العادي الموحد ($ / ريال)' : '统一常规价格 (CNY)'} *
                      </label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={bulkPrice}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setBulkPrice(val);
                          setBulkVipPrice(Math.max(1, Math.round(val * 0.65)));
                          setBulkExclusivePrice(Math.round(val * 4.5));
                        }}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm font-bold text-white focus:outline-none focus:border-emerald-500 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-purple-300 mb-1.5">
                        {lang === 'ar' ? 'سعر VIP الموحد (تلقائي)' : '统一VIP专属价'}
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={bulkVipPrice}
                        onChange={(e) => setBulkVipPrice(Number(e.target.value))}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-purple-500/40 text-sm font-bold text-purple-200 focus:outline-none focus:border-purple-400 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-amber-300 mb-1.5">
                        {lang === 'ar' ? 'السعر الحصري الموحد (تلقائي)' : '统一独家授权价'}
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={bulkExclusivePrice}
                        onChange={(e) => setBulkExclusivePrice(Number(e.target.value))}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-amber-500/40 text-sm font-bold text-amber-200 focus:outline-none focus:border-amber-400 font-mono"
                      />
                    </div>
                  </div>

                  {/* Quick price presets */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="text-[11px] text-slate-400">{lang === 'ar' ? 'تسعيرات سريعة جاهزة:' : '快速套用：'}</span>
                    {[25, 35, 49, 69, 99].map((pVal) => (
                      <button
                        key={pVal}
                        type="button"
                        onClick={() => {
                          setBulkPrice(pVal);
                          setBulkVipPrice(Math.max(1, Math.round(pVal * 0.65)));
                          setBulkExclusivePrice(Math.round(pVal * 4.5));
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono transition-colors ${
                          bulkPrice === pVal
                            ? 'bg-emerald-500 text-slate-950 font-black'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {pVal} $
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Batch Options (Category, Theme, Title Prefix, Effect Type) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-4 sm:p-5 rounded-2xl bg-slate-900/80 border border-slate-800">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      {lang === 'ar' ? 'القسم / التصنيف الموحد' : '统一分类'}
                    </label>
                    <select
                      value={bulkCategory}
                      onChange={(e) => setBulkCategory(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="general">{lang === 'ar' ? 'القسم العام (الأساسي)' : '通用分类'}</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      {lang === 'ar' ? 'بادئة الاسم (Prefix)' : '统一名称前缀'}
                    </label>
                    <input
                      type="text"
                      value={bulkTitlePrefix}
                      onChange={(e) => setBulkTitlePrefix(e.target.value)}
                      placeholder="مثال: مؤثر لايف / تصميم VIP"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      {lang === 'ar' ? 'الثيم / الطابع' : '主题标签'}
                    </label>
                    <input
                      type="text"
                      value={bulkTheme}
                      onChange={(e) => setBulkTheme(e.target.value)}
                      placeholder="مثال: مؤثرات VIP / حصرية"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      {lang === 'ar' ? 'نوع المؤثر الموحد' : '动效类型'}
                    </label>
                    <select
                      value={bulkEffectType}
                      onChange={(e) => setBulkEffectType(e.target.value as '2D' | '3D')}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="2D">2D (ثنائي الأبعاد)</option>
                      <option value="3D">3D (ثلاثي الأبعاد)</option>
                    </select>
                  </div>
                </div>

                {/* Progress Indicator when uploading */}
                {isBulkUploading && bulkProgress && (
                  <div className="p-4 rounded-2xl bg-slate-900 border border-emerald-500/50 space-y-2 animate-pulse">
                    <div className="flex items-center justify-between text-xs font-bold text-emerald-300">
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                        <span>{lang === 'ar' ? 'جاري الرفع التلقائي للهدايا ونشرها في المتجر...' : '正在自动批量发布与导入...'}</span>
                      </span>
                      <span className="font-mono text-white text-sm">
                        {bulkProgress.current} / {bulkProgress.total} ({Math.round((bulkProgress.current / bulkProgress.total) * 100)}%)
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300"
                        style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Action Submit Button */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                  <div className="text-xs text-slate-400">
                    <span>
                      {lang === 'ar'
                        ? 'سيتم ربط جميع الهدايا تلقائياً برقم الواتساب الخاص بك، وستبقى في نفس الصفحة للمتابعة.'
                        : '所有素材将自动绑定您的官方WhatsApp，发布后停留在当前页面。'}
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={isBulkUploading || parsedBulkLinks.length === 0}
                    className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 disabled:opacity-40 disabled:pointer-events-none text-white font-extrabold text-sm shadow-xl shadow-emerald-600/30 transition-all flex items-center justify-center gap-2.5 active:scale-95 cursor-pointer"
                  >
                    {isBulkUploading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>{lang === 'ar' ? 'جاري الرفع التلقائي...' : '正在上传...'}</span>
                      </>
                    ) : (
                      <>
                        <UploadCloud className="w-5 h-5" />
                        <span>
                          {lang === 'ar'
                            ? `🚀 رفع ونشر الـ (${parsedBulkLinks.length}) هدية تلقائياً دفعة واحدة`
                            : `🚀 一键自动批量发布 (${parsedBulkLinks.length}) 件礼物`}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Uploaded Summary Section (Stays right here!) */}
              {bulkSuccessList.length > 0 && (
                <div className="mt-6 p-5 rounded-2xl bg-slate-900/90 border border-emerald-500/40 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      <h4 className="text-sm font-bold text-white">
                        {lang === 'ar'
                          ? `✓ تم رفع ونشر ${bulkSuccessList.length} هدية بنجاح في المتجر!`
                          : `✓ 成功批量发布 ${bulkSuccessList.length} 件礼物素材！`}
                      </h4>
                    </div>
                    <span className="text-[11px] text-emerald-400 font-mono">
                      {lang === 'ar' ? 'تمت إضافة جميع العناصر للمتجر فورياً' : '已即时同步至全站'}
                    </span>
                  </div>

                  <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                    {bulkSuccessList.map((item, idx) => (
                      <div
                        key={item.id}
                        className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs gap-3"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-[10px] font-mono text-cyan-400 font-bold shrink-0">
                            #{idx + 1}
                          </span>
                          <span className="font-bold text-white truncate">
                            {item.title}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono shrink-0">
                            {item.price} $
                          </span>
                        </div>
                        <a
                          href={item.videoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-cyan-400 hover:text-cyan-300 shrink-0 flex items-center gap-1 font-mono"
                        >
                          <span>{lang === 'ar' ? 'رابط الميديا' : '链接'}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Main Form Fields */}
            <div className="lg:col-span-8 bg-[#111520] border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-5">
              <form onSubmit={handleSaveGift} className="space-y-5">
              {/* Special Zero-Server-Load Notice Banner */}
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-blue-950/70 to-cyan-950/70 border border-cyan-500/40 flex items-start gap-3">
                <Video className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                <div className="text-xs leading-relaxed text-slate-300">
                  <strong className="text-cyan-300 block mb-0.5">
                    {lang === 'ar' ? 'ميزة ربط الفيديو الخارجي (0% استهلاك لمساحة وباندويث السيرفر):' : '外链视频直连（零服务器存储与带宽负载）：'}
                  </strong>
                  {t.videoUrlHelp}
                </div>
              </div>

              {/* Title & Arabic Title Section with Persistent Saved Names & Checkmark Pinning */}
              <div className="space-y-3 p-4 rounded-2xl bg-slate-900/70 border border-slate-800/90 shadow-inner">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-800/70">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse"></span>
                    <span className="text-xs font-bold text-slate-200">
                      {lang === 'ar' ? 'اسم الهدية وتثبيته الدائم (الرئيسي وبالعربية):' : '设定并固定礼物名称（主名称与阿拉伯语）：'}
                    </span>
                  </div>

                  {/* Status Indicator when pinned/saved */}
                  {isNameSaveSuccess && (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-300 font-bold bg-emerald-950/80 border border-emerald-500/50 px-3 py-1 rounded-lg">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{lang === 'ar' ? '✓ تم تثبيت وحفظ الاسم في قاعدة البيانات بنجاح' : '✓ 名称已成功保存并固定'}</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      {t.giftNameInput} *
                    </label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => {
                        setTitle(e.target.value);
                        localStorage.setItem('jiawei_draft_gift_title', e.target.value);
                      }}
                      placeholder="如: 簪花扑月 / 金龙盘霄 / 幻影跑车"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      {lang === 'ar' ? 'الاسم بالعربية (اختياري)' : '阿拉伯语名称 (可选)'}
                    </label>
                    <input
                      type="text"
                      value={titleAr}
                      onChange={(e) => {
                        setTitleAr(e.target.value);
                        localStorage.setItem('jiawei_draft_gift_title_ar', e.target.value);
                      }}
                      placeholder="مثال: زهرة القمر الطائر / التنين الذهبي"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
                    />
                  </div>
                </div>

                {/* Save / Pin with Checkmark Button Row */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSaveAndPinCurrentName}
                      disabled={!title.trim() && !titleAr.trim()}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all cursor-pointer ${
                        (title.trim() || titleAr.trim())
                          ? 'bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white border-emerald-400/50 shadow-lg shadow-emerald-950/40 active:scale-95'
                          : 'bg-slate-800/80 text-slate-500 border-slate-700/60 cursor-not-allowed'
                      }`}
                      title={lang === 'ar' ? 'تثبيت وحفظ هذا الاسم في القائمة وقاعدة البيانات' : '保存并固定此名称到永久列表'}
                    >
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>{lang === 'ar' ? 'صح (✓) حفظ وتثبيت هذا الاسم في القائمة الدائمة' : '确认 (✓) 保存并固定此名称'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsAddingNewPresetInline(!isAddingNewPresetInline)}
                      className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800/80 hover:bg-slate-700 text-cyan-300 border border-slate-700/70 flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{lang === 'ar' ? 'إضافة اسم جديد للقائمة' : '添加新名称到列表'}</span>
                    </button>
                  </div>

                  <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>
                      {lang === 'ar'
                        ? 'محفوظ في قاعدة البيانات: يبقى الاسم ثابتاً حتى لو خرجت ودخلت'
                        : '名称已自动持久化存储在云端数据库与本地缓存中'}
                    </span>
                  </div>
                </div>

                {/* Inline Add New Preset Form */}
                {isAddingNewPresetInline && (
                  <div className="p-3.5 rounded-xl bg-slate-950/90 border border-cyan-500/40 space-y-2.5 mt-2 shadow-xl">
                    <div className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{lang === 'ar' ? 'إضافة اسم هدية جديد إلى القائمة الدائمة وحفظه في السيرفر:' : '直接添加新礼物名称到永久列表并保存到云端：'}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <input
                        type="text"
                        value={newPresetTitle}
                        onChange={(e) => setNewPresetTitle(e.target.value)}
                        placeholder="الاسم الأصلي / الصيني أو الإنجليزي (مثال: Cyber Phoenix)"
                        className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-400"
                      />
                      <input
                        type="text"
                        value={newPresetTitleAr}
                        onChange={(e) => setNewPresetTitleAr(e.target.value)}
                        placeholder="الاسم بالعربية (مثال: العنقاء الإلكترونية الخارقة)"
                        className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-400"
                      />
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsAddingNewPresetInline(false)}
                        className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                      >
                        {lang === 'ar' ? 'إلغاء' : '取消'}
                      </button>
                      <button
                        type="button"
                        onClick={handleAddNewPresetDirectly}
                        disabled={!newPresetTitle.trim() && !newPresetTitleAr.trim()}
                        className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{lang === 'ar' ? 'حفظ وتثبيت في القائمة' : '保存到列表'}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Persistent Saved Names Presets Library (Interactive Chips) */}
                <div className="pt-2 border-t border-slate-800/60">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                      <BookmarkCheck className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span>{lang === 'ar' ? 'قائمة الأسماء الدائمة المحفوظة (اضغط على أي اسم لتحديده وتثبيته):' : '已保存的永久名称列表（点击即可选定并填充）：'}</span>
                      <span className="text-[10px] bg-slate-800 text-cyan-300 px-2 py-0.5 rounded-full font-mono font-bold">
                        {savedNamesList.length}
                      </span>
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 max-h-40 overflow-y-auto pr-1">
                    {savedNamesList.map((preset) => {
                      const isSelected = 
                        (preset.id && preset.id === pinnedNameId) || 
                        (title && preset.title.trim().toLowerCase() === title.trim().toLowerCase()) ||
                        (titleAr && preset.titleAr && preset.titleAr.trim() === titleAr.trim());

                      return (
                        <div
                          key={preset.id}
                          onClick={() => handleSelectNamePreset(preset)}
                          className={`group relative px-3 py-1.5 rounded-xl text-xs font-medium border flex items-center gap-2 cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-emerald-950/90 border-emerald-500 text-emerald-300 font-bold shadow-md shadow-emerald-950/40 ring-1 ring-emerald-500/50'
                              : 'bg-slate-800/70 hover:bg-slate-700/80 border-slate-700/80 text-slate-300 hover:text-white'
                          }`}
                          title={lang === 'ar' ? 'اضغط لتطبيق وتثبيت هذا الاسم' : '点击应用并锁定此名称'}
                        >
                          {isSelected ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          ) : (
                            <Tag className="w-3 h-3 text-slate-400 group-hover:text-cyan-400 shrink-0" />
                          )}

                          <span>{preset.titleAr ? `${preset.titleAr} (${preset.title})` : preset.title}</span>

                          {/* Delete button from preset list */}
                          <button
                            type="button"
                            onClick={(e) => handleDeleteNamePreset(e, preset.id)}
                            className="opacity-40 hover:opacity-100 hover:text-red-400 p-0.5 rounded transition-all shrink-0 ml-1"
                            title={lang === 'ar' ? 'حذف من القائمة' : '删除'}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Price Row: Regular, VIP, Exclusive */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    {t.giftPriceInput} *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-amber-400 font-mono font-bold focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    {t.giftVipPriceInput}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={vipPrice}
                    onChange={(e) => setVipPrice(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-cyan-300 font-mono font-bold focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    {t.giftExcPriceInput}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={exclusivePrice}
                    onChange={(e) => setExclusivePrice(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-purple-300 font-mono font-bold focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* External Video Direct URL (CRITICAL USER REQUEST) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                    <Video className="w-4 h-4 text-cyan-400" />
                    <span>{t.videoUrlInput} *</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsTestingVideo(true)}
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 underline font-medium"
                  >
                    {t.testVideoBtn}
                  </button>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    required
                    value={videoUrl}
                    onChange={(e) => {
                      const val = e.target.value;
                      setVideoUrl(val);
                      setVideoTestError(false);
                      if (val.match(/\.(jpeg|jpg|gif|png|webp|svg|bmp)(\?.*)?$/i) || val.startsWith('data:image/')) {
                        if (!posterUrl) setPosterUrl(val);
                        setUsePosterImage(true);
                      }
                    }}
                    placeholder="https://... أو رابط فيديو أو صورة مباشرة"
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-900 border border-cyan-500/50 text-xs text-white font-mono focus:outline-none focus:border-cyan-400"
                  />
                  <label className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-semibold border border-slate-700 cursor-pointer flex items-center justify-center gap-1.5 shrink-0 transition-colors">
                    {isUploadingVideo ? (
                      <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
                    ) : (
                      <UploadCloud className="w-4 h-4 text-cyan-400" />
                    )}
                    <span>{isUploadingVideo ? (lang === 'ar' ? 'جارِ الرفع...' : '上传中...') : (lang === 'ar' ? 'رفع ملف فيديو أو صورة' : '上传视频/图片')}</span>
                    <input
                      type="file"
                      disabled={isUploadingVideo}
                      accept="video/mp4,video/webm,video/ogg,video/quicktime,.svga,.svga2,image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleVideoFileUpload(file);
                        }
                      }}
                    />
                  </label>
                </div>

                {videoUploadStatus && (
                  <p className="mt-1.5 text-xs text-cyan-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                    <span>{videoUploadStatus}</span>
                  </p>
                )}

                {/* Quick Presets for User to test without hunting for URLs */}
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] text-slate-400 font-medium mr-1">
                    {lang === 'ar' ? 'نماذج سريعة جاهزة:' : '快速填入测试直链:'}
                  </span>
                  {sampleVideos.map((sample, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleApplySample(sample)}
                      className="text-[10px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-300 border border-slate-700 transition-colors"
                    >
                      {sample.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Poster Image / Cover Section with Checkmark (✓) and Cross (✕) Toggle */}
              <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-cyan-400" />
                      <span>{t.posterUrlInput}</span>
                    </label>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {lang === 'ar'
                        ? 'اختر [صح ✓] لتعيين صورة غلاف، أو [إكس ✕] لعرض الفيديو نفسه مباشرة كواجهة رئيسية للهدية'
                        : '选择 [✓ 启用] 设置封面图，或 [✕ 禁用] 直接以视频首帧作为展台主界面'}
                    </p>
                  </div>

                  {/* Toggle Controls: Checkmark (✓) vs Cross (✕) */}
                  <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-700 shrink-0">
                    <button
                      type="button"
                      onClick={() => setUsePosterImage(true)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        usePosterImage
                          ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                      }`}
                      title={lang === 'ar' ? 'تفعيل صورة الغلاف المخصصة' : '启用图片封面'}
                    >
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>{lang === 'ar' ? 'صح (✓) تفعيل الصورة' : '启用图片 (✓)'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setUsePosterImage(false);
                        setPosterUrl('');
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        !usePosterImage
                          ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                      }`}
                      title={lang === 'ar' ? 'إلغاء الصورة - سيظهر الفيديو فقط في واجهة العرض' : '禁用图片 - 仅显示视频'}
                    >
                      <X className="w-4 h-4 stroke-[3]" />
                      <span>{lang === 'ar' ? 'إكس (✕) فيديو فقط' : '仅视频 (✕)'}</span>
                    </button>
                  </div>
                </div>

                {usePosterImage ? (
                  <div className="space-y-2 pt-1">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        value={posterUrl}
                        onChange={(e) => setPosterUrl(e.target.value)}
                        placeholder="https://... أو /uploads/... أو رابط صورة"
                        className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                      />
                      <button
                        type="button"
                        disabled={isCapturingSnapshot}
                        onClick={handleCaptureSnapshot}
                        className="px-3.5 py-2.5 rounded-xl bg-cyan-950/90 hover:bg-cyan-900 disabled:opacity-60 text-cyan-300 text-xs font-bold border border-cyan-500/50 cursor-pointer flex items-center justify-center gap-1.5 shrink-0 transition-all active:scale-95 shadow-sm"
                        title={lang === 'ar' ? 'أخذ لقطة من الفيديو الحالي وتعيينها تلقائياً كصورة غلاف' : '截取当前视频帧作为封面'}
                      >
                        {isCapturingSnapshot ? (
                          <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
                        ) : (
                          <Camera className="w-4 h-4 text-cyan-400" />
                        )}
                        <span>
                          {isCapturingSnapshot
                            ? (lang === 'ar' ? 'جارِ الالتقاط...' : '截图中...')
                            : (lang === 'ar' ? 'أخذ لقطة من الفيديو' : '从视频截取')}
                        </span>
                      </button>
                      <label className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-semibold border border-slate-700 cursor-pointer flex items-center justify-center gap-1.5 shrink-0 transition-colors">
                        {isUploadingPoster ? (
                          <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
                        ) : (
                          <UploadCloud className="w-4 h-4 text-cyan-400" />
                        )}
                        <span>{isUploadingPoster ? (lang === 'ar' ? 'جارِ الرفع...' : '上传中...') : (lang === 'ar' ? 'رفع صورة' : '上传图片')}</span>
                        <input
                          type="file"
                          disabled={isUploadingPoster}
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handlePosterFileUpload(file);
                            }
                          }}
                        />
                      </label>
                    </div>

                    {posterUrl && (
                      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2.5 rounded-xl bg-slate-950/90 border shadow-inner ${
                        posterLoadError ? 'border-amber-500/50' : 'border-emerald-500/40'
                      }`}>
                        <div className="flex items-center gap-3 min-w-0">
                          {!posterLoadError ? (
                            <img
                              src={posterUrl}
                              alt="Cover Thumbnail"
                              onError={() => setPosterLoadError(true)}
                              className="w-12 h-12 object-contain rounded-lg border border-emerald-500/60 shrink-0 shadow-sm bg-slate-900"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-amber-950/60 border border-amber-500/50 flex items-center justify-center text-amber-400 shrink-0">
                              <ImageIcon className="w-5 h-5 opacity-60" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            {posterLoadError ? (
                              <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                                <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                                {lang === 'ar' ? 'تعذر تحميل رابط الصورة' : '图片链接无法加载'}
                              </span>
                            ) : (
                              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                                <Check className="w-3.5 h-3.5 stroke-[3] text-emerald-400" />
                                {lang === 'ar' ? '✓ تم تعيين صورة الغلاف بنجاح' : '✓ 封面图已就绪'}
                              </span>
                            )}
                            <p className="text-[10px] text-slate-400 truncate font-mono mt-0.5">
                              {posterLoadError
                                ? (lang === 'ar' ? 'اضغط [أخذ لقطة من الفيديو] أو [رفع صورة] لاستبدالها' : '请点击“从视频截取”或“上传图片”')
                                : posterUrl.startsWith('data:')
                                ? (lang === 'ar' ? '📷 صورة/لقطة معالجة ومخصصة' : '📷 视频截取/定制图像')
                                : posterUrl}
                            </p>
                          </div>
                        </div>

                        {/* Shape & Crop Editor Action Button */}
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setShapeEditorImage(posterUrl || videoUrl);
                              setIsShapeEditorOpen(true);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-xs font-bold border border-purple-500/40 flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
                            title={lang === 'ar' ? 'قص الصورة بشكل دائري أو حواف دائرية وتطبيق شفافية الحواف' : '圆形裁剪 / 圆角 / 边缘羽化'}
                          >
                            <Scissors className="w-3.5 h-3.5 text-purple-400" />
                            <span>{lang === 'ar' ? '✂️ تشكيل وقص (دائري / حواف)' : 'Crop & Shape'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setPosterUrl('')}
                            className="text-xs text-red-400 hover:text-red-300 hover:bg-red-950/40 px-2.5 py-1.5 rounded-xl border border-transparent hover:border-red-900 transition-colors"
                            title={lang === 'ar' ? 'حذف الصورة' : '删除'}
                          >
                            {lang === 'ar' ? 'حذف' : '移除'}
                          </button>
                        </div>
                      </div>
                    )}

                    <p className="text-[11px] text-slate-400">
                      {lang === 'ar'
                        ? 'ستظهر صورة الغلاف كواجهة أولية، وعند تمرير الماوس فوق الهدية يتم تشغيل الفيديو.'
                        : '封面图为常态展示，悬停时转换为视频播放。'}
                    </p>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-gradient-to-r from-cyan-950/70 via-slate-900 to-slate-950 border border-cyan-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-300 flex items-center justify-center shrink-0 mt-0.5">
                        <Video className="w-4 h-4" />
                      </div>
                      <div className="text-xs leading-relaxed text-slate-300">
                        <strong className="text-cyan-300 block mb-0.5">
                          {lang === 'ar' ? '✓ تم تفعيل وضع الفيديو فقط (✕ إخفاء الصورة تماماً):' : '已开启仅视频模式 (✕ 隐藏封面图)：'}
                        </strong>
                        <span>
                          {lang === 'ar'
                            ? 'لن تظهر أي صورة غلاف، وسيأخذ الفيديو نفسه نفس الواجهة الرئيسية للهدية في شاشة العرض وبطاقة المتجر مباشرة.'
                            : '卡片将完全不显示任何图片，直接呈现视频首帧作为主界面并自动生效。'}
                        </span>
                      </div>
                    </div>
                    {videoUrl && (
                      <button
                        type="button"
                        onClick={handleCaptureSnapshot}
                        className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-500/20 flex items-center gap-1.5 shrink-0 transition-transform active:scale-95 cursor-pointer whitespace-nowrap"
                      >
                        <Camera className="w-4 h-4" />
                        <span>{lang === 'ar' ? '📸 أخذ لقطة وتعيينها كصورة' : '📸 截取一帧设为图片'}</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Formats included (صيغ الهدية: SVGA, MP4, VAP, PAG, etc.) */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  {t.formatInclude}
                </label>
                <input
                  type="text"
                  value={formatsText}
                  onChange={(e) => setFormatsText(e.target.value)}
                  placeholder="SVGA动效, MP4透明带声, VAP, PAG, JSON"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Category, Theme & Effect 2D/3D */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    {t.categorySelect}
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-500 font-semibold"
                  >
                    {availableCategories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.icon ? `${cat.icon} ` : ''}
                        {lang === 'ar' && cat.nameAr ? cat.nameAr : cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    {t.themeInput}
                  </label>
                  <input
                    type="text"
                    value={theme}
                    onChange={(e) => setTheme(e.target.value)}
                    placeholder="如: 中秋专属 / 豪华座驾"
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    {t.effectTypeSelect}
                  </label>
                  <select
                    value={effectType}
                    onChange={(e) => setEffectType(e.target.value as any)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="2D">{t.effect2D}</option>
                    <option value="3D">{t.effect3D}</option>
                  </select>
                </div>
              </div>

              {/* Delivery Box Assets Configuration (صندوق استلام عند الشراء) */}
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                  <PackageCheck className="w-4 h-4 text-emerald-400" />
                  <span>{lang === 'ar' ? 'إعدادات صندوق الاستلام والتسليم التلقائي:' : '自动交付盒资源设置:'}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      {t.deliveryUrlInput}
                    </label>
                    <input
                      type="text"
                      value={deliveryUrl}
                      onChange={(e) => setDeliveryUrl(e.target.value)}
                      placeholder="https://cdn.example.com/gifts/gift-bundle.zip"
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      {t.cloudCodeInput}
                    </label>
                    <input
                      type="text"
                      value={cloudDiskCode}
                      onChange={(e) => setCloudDiskCode(e.target.value)}
                      placeholder="JW8866"
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-amber-400 font-mono focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
              </div>

              {/* Automatic Phone / WhatsApp Attachment Status Badge */}
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                    <MessageCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">
                        {lang === 'ar' ? 'رقم الواتساب المثبت لهذا الفيديو:' : '已固定的收款与咨询WhatsApp:'}
                      </span>
                      <span className="font-mono text-emerald-400 font-extrabold text-xs bg-slate-950 px-2 py-0.5 rounded border border-emerald-500/30 dir-ltr">
                        {activeStaff.whatsapp || (lang === 'ar' ? 'غير محدد بعد' : 'Not specified')}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {lang === 'ar'
                        ? '✓ سينزل هذا الرقم تلقائياً في بيانات الهدية دون الحاجة لإدخاله يدوياً كل مرة.'
                        : '✓ 发布后此号码将自动作为作者直连与客服联系方式，无需每次手动键入。'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsProfileModalOpen(true)}
                  className="self-start sm:self-center px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 text-xs font-semibold border border-emerald-500/30 hover:border-emerald-500/50 flex items-center gap-1.5 transition-colors shrink-0"
                >
                  <Edit3 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{lang === 'ar' ? 'تغيير أو تثبيت رقم آخر' : '更换固定的号码'}</span>
                </button>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 flex items-center gap-3">
                {(() => {
                  const canUpload = (activeStaff?.permissions?.giftUploadAndPublish !== false) && (activeStaff?.status !== 'inactive');
                  return (
                    <button
                      type="submit"
                      disabled={!canUpload}
                      className={`px-6 py-3 rounded-xl text-xs sm:text-sm font-extrabold shadow-lg transition-all flex items-center gap-2 ${
                        canUpload
                          ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-cyan-500/20 active:scale-95 cursor-pointer'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                      }`}
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>
                        {!canUpload
                          ? (lang === 'ar' ? '⚠️ صلاحية رفع الهدايا موقوفة لهذا الحساب' : '无上传权限')
                          : (editingId ? (lang === 'ar' ? 'حفظ التعديلات' : '保存修改') : t.submitGiftBtn)
                        }
                      </span>
                    </button>
                  );
                })()}

                {editingId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(null);
                      setTitle('');
                      setVideoUrl('');
                    }}
                    className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                  >
                    {lang === 'ar' ? 'إلغاء التعديل' : '取消'}
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Video Preview Column & Live Test Monitor */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-[#111520] border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Play className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{lang === 'ar' ? 'معاينة الفيديو والبث' : '实时外链预览测试'}</span>
                </h3>
                {videoUrl && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 font-mono">
                    ONLINE
                  </span>
                )}
              </div>

              {/* Aspect Ratio & Backdrop Selector Controls */}
              <div className="flex items-center justify-between gap-1.5 mb-3 p-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px]">
                {/* Aspect Ratio Buttons */}
                <div className="flex items-center gap-1">
                  {(['1/1', '9/16', '4/3'] as const).map((asp) => (
                    <button
                      key={asp}
                      type="button"
                      onClick={() => setMonitorAspect(asp)}
                      className={`px-2 py-0.5 rounded-lg font-mono font-bold transition-all ${
                        monitorAspect === asp
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                          : 'text-slate-400 hover:text-white'
                      }`}
                      title={asp === '1/1' ? 'Square 1:1' : asp === '9/16' ? 'Vertical 9:16' : 'Classic 4:3'}
                    >
                      {asp === '1/1' ? (lang === 'ar' ? '1:1 مربع' : '1:1') :
                       asp === '9/16' ? (lang === 'ar' ? '9:16 عمودي' : '9:16') : '4:3'}
                    </button>
                  ))}
                </div>

                {/* Backdrop Buttons */}
                <div className="flex items-center gap-1">
                  {(['dark', 'checker', 'black'] as const).map((bg) => (
                    <button
                      key={bg}
                      type="button"
                      onClick={() => setMonitorBg(bg)}
                      className={`px-1.5 py-0.5 rounded text-[10px] transition-all ${
                        monitorBg === bg
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                          : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      {bg === 'dark' ? (lang === 'ar' ? 'داكن' : 'Dark') :
                       bg === 'checker' ? (lang === 'ar' ? 'شفاف' : 'Grid') :
                       (lang === 'ar' ? 'أسود' : 'Black')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Video Monitor Box */}
              <div className={`relative w-full max-w-[290px] mx-auto rounded-2xl overflow-hidden border border-slate-700 shadow-2xl flex items-center justify-center group transition-all duration-300 ${
                monitorAspect === '1/1' ? 'aspect-square' :
                monitorAspect === '9/16' ? 'aspect-[9/16]' : 'aspect-[4/3]'
              } ${
                monitorBg === 'checker' ? 'bg-[linear-gradient(45deg,#1e2433_25%,transparent_25%),linear-gradient(-45deg,#1e2433_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#1e2433_75%),linear-gradient(-45deg,transparent_75%,#1e2433_75%)] bg-[size:16px_16px] bg-[#0c1017]' :
                monitorBg === 'black' ? 'bg-black' : 'bg-[#080b11]'
              }`}>
                {videoUrl ? (
                  (
                    (videoUrl.toLowerCase().endsWith('.svga') ||
                      videoUrl.toLowerCase().endsWith('.svga2') ||
                      videoUrl.toLowerCase().includes('.svga?') ||
                      videoUrl.includes('data:application/octet-stream') ||
                      videoUrl.includes('gifts/svga')) &&
                    !videoUrl.toLowerCase().includes('.mp4') &&
                    !videoUrl.toLowerCase().includes('.webm') &&
                    !videoUrl.toLowerCase().includes('.mov')
                  ) ? (
                    <SvgaPlayer
                      key={videoUrl}
                      src={resolveMediaUrl(videoUrl)}
                      autoPlay={isVideoPlaying}
                      loop={true}
                      className="w-full h-full object-contain"
                      backdrop={monitorBg === 'checker' ? 'checker' : 'dark'}
                      onError={() => setVideoTestError(true)}
                      onLoaded={() => setVideoTestError(false)}
                    />
                  ) : (
                    <>
                      <video
                        key={videoUrl}
                        ref={previewVideoRef}
                        src={resolveMediaUrl(videoUrl)}
                        autoPlay
                        loop
                        muted
                        playsInline
                        preload="metadata"
                        onLoadedData={() => setVideoTestError(false)}
                        onCanPlay={() => {
                          setVideoTestError(false);
                          if (isVideoPlaying && previewVideoRef.current) {
                            previewVideoRef.current.play().catch(() => {});
                          }
                        }}
                        onTimeUpdate={() => {
                          if (previewVideoRef.current) {
                            setVideoScrubTime(previewVideoRef.current.currentTime);
                          }
                        }}
                        onLoadedMetadata={() => {
                          if (previewVideoRef.current) {
                            setVideoDuration(previewVideoRef.current.duration || 14);
                            if (isVideoPlaying) {
                              previewVideoRef.current.play().catch(() => {});
                            }
                          }
                        }}
                        onError={async () => {
                          try {
                            const cached = await getMediaFromIndexedDb(videoUrl);
                            if (cached && previewVideoRef.current) {
                              previewVideoRef.current.src = URL.createObjectURL(cached);
                              previewVideoRef.current.play().catch(() => {});
                              setVideoTestError(false);
                              return;
                            }
                          } catch (e) {}
                          setVideoTestError(true);
                        }}
                        className="w-full h-full object-contain cursor-pointer"
                        onClick={() => {
                          if (!previewVideoRef.current) return;
                          if (isVideoPlaying) {
                            previewVideoRef.current.pause();
                            setIsVideoPlaying(false);
                          } else {
                            previewVideoRef.current.play().catch(() => {});
                            setIsVideoPlaying(true);
                          }
                        }}
                      />

                      {/* Overlay Play Indicator when paused */}
                      {!isVideoPlaying && (
                        <div
                          onClick={() => {
                            if (previewVideoRef.current) {
                              previewVideoRef.current.play().catch(() => {});
                              setIsVideoPlaying(true);
                            }
                          }}
                          className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center cursor-pointer transition-opacity"
                        >
                          <div className="w-12 h-12 rounded-full bg-cyan-500/90 text-white flex items-center justify-center shadow-2xl backdrop-blur">
                            <Play className="w-6 h-6 ml-0.5 fill-current" />
                          </div>
                          <span className="text-[11px] font-bold text-cyan-200 mt-2 bg-black/60 px-2 py-0.5 rounded-full">
                            {lang === 'ar' ? 'الفيديو متوقف مؤقتاً' : '已暂停'}
                          </span>
                        </div>
                      )}
                    </>
                  )
                ) : (
                  <div className="text-center p-4 text-slate-500 text-xs space-y-2">
                    <Video className="w-8 h-8 mx-auto opacity-40" />
                    <p>{lang === 'ar' ? 'ضع رابط الفيديو أو ملف SVGA بالأعلى لعرض المعاينة المباشرة هنا فوراً' : '在此处实时预览外链播放效果'}</p>
                  </div>
                )}

                {videoTestError && (
                  <div className="absolute inset-0 bg-red-950/85 p-4 flex flex-col items-center justify-center text-center text-xs text-red-200 z-10">
                    <AlertCircle className="w-6 h-6 mb-1.5 text-red-400" />
                    <span className="font-bold mb-1">
                      {lang === 'ar' ? 'تعذر تشغيل الفيديو من الرابط المحدد' : 'Failed to load video'}
                    </span>
                    <span className="text-[10px] text-red-300/80 mb-2.5 max-w-[220px]">
                      {lang === 'ar' ? 'تأكد من أن الرابط مباشر وينتهي بـ .mp4 أو .webm أو جرب رفع ملف الفيديو مباشرة' : 'Ensure direct MP4/WebM URL or upload file'}
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setVideoTestError(false);
                          if (previewVideoRef.current) {
                            previewVideoRef.current.load();
                          }
                        }}
                        className="px-2.5 py-1 rounded bg-red-900 hover:bg-red-800 text-white text-[10px] font-bold"
                      >
                        {lang === 'ar' ? 'إعادة المحاولة' : 'Retry'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setVideoTestError(false)}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px]"
                      >
                        {lang === 'ar' ? 'تجاهل' : 'Dismiss'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Video Timeline Scrubber & Frame Snapshot Tool */}
              {videoUrl && (
                <div className="p-3.5 rounded-xl bg-slate-900/95 border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between text-[11px] text-slate-300 font-mono">
                    <span className="text-cyan-400 font-bold">
                      {Math.floor(videoScrubTime / 60)}:{Math.floor(videoScrubTime % 60).toString().padStart(2, '0')}.{Math.floor((videoScrubTime % 1) * 10)}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {lang === 'ar' ? 'أوقف الفيديو عند اللقطة المناسبة' : '定格最心仪的画面'}
                    </span>
                    <span className="text-slate-400">
                      {Math.floor(videoDuration / 60)}:{Math.floor(videoDuration % 60).toString().padStart(2, '0')}
                    </span>
                  </div>

                  {/* Scrubber Range Bar */}
                  <input
                    type="range"
                    min="0"
                    max={videoDuration || 14}
                    step="0.05"
                    value={videoScrubTime}
                    onChange={(e) => {
                      const time = parseFloat(e.target.value);
                      setVideoScrubTime(time);
                      if (previewVideoRef.current) {
                        previewVideoRef.current.currentTime = time;
                      }
                    }}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />

                  {/* Transport Controls (Play/Pause & Steppers) */}
                  <div className="flex items-center justify-between gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        if (!previewVideoRef.current) return;
                        if (isVideoPlaying) {
                          previewVideoRef.current.pause();
                          setIsVideoPlaying(false);
                        } else {
                          previewVideoRef.current.play().catch(() => {});
                          setIsVideoPlaying(true);
                        }
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1 border border-slate-700 transition-colors"
                    >
                      {isVideoPlaying ? <Pause className="w-3.5 h-3.5 text-cyan-400" /> : <Play className="w-3.5 h-3.5 text-cyan-400" />}
                      <span>{isVideoPlaying ? (lang === 'ar' ? 'إيقاف' : '暂停') : (lang === 'ar' ? 'تشغيل' : '播放')}</span>
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          if (!previewVideoRef.current) return;
                          previewVideoRef.current.pause();
                          setIsVideoPlaying(false);
                          const newTime = Math.max(0, previewVideoRef.current.currentTime - 0.5);
                          previewVideoRef.current.currentTime = newTime;
                          setVideoScrubTime(newTime);
                        }}
                        className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-mono border border-slate-700"
                        title="-0.5s"
                      >
                        -0.5s
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (!previewVideoRef.current) return;
                          previewVideoRef.current.pause();
                          setIsVideoPlaying(false);
                          const newTime = Math.min(videoDuration, previewVideoRef.current.currentTime + 0.5);
                          previewVideoRef.current.currentTime = newTime;
                          setVideoScrubTime(newTime);
                        }}
                        className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-mono border border-slate-700"
                        title="+0.5s"
                      >
                        +0.5s
                      </button>
                    </div>
                  </div>

                  {/* Quick Timeline Frame Jumpers */}
                  <div className="flex items-center justify-between gap-1 pt-1">
                    <span className="text-[10px] text-slate-400 font-medium">
                      {lang === 'ar' ? 'القفز السريع للقطات:' : '快速跳帧:'}
                    </span>
                    <div className="flex items-center gap-1">
                      {[
                        { label: '0%', ratio: 0 },
                        { label: '25%', ratio: 0.25 },
                        { label: '50%', ratio: 0.5 },
                        { label: '75%', ratio: 0.75 },
                        { label: '90%', ratio: 0.9 }
                      ].map((pos) => (
                        <button
                          key={pos.label}
                          type="button"
                          onClick={() => {
                            if (!previewVideoRef.current) return;
                            const target = (videoDuration || 10) * pos.ratio;
                            previewVideoRef.current.currentTime = target;
                            setVideoScrubTime(target);
                          }}
                          className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-cyan-950 hover:text-cyan-300 text-slate-400 text-[10px] font-mono border border-slate-700/60 transition-colors"
                        >
                          {pos.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* HERO BUTTON: TAKE SNAPSHOT & ADD AUTOMATICALLY */}
                  <button
                    type="button"
                    disabled={isCapturingSnapshot}
                    onClick={handleCaptureSnapshot}
                    className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 disabled:opacity-60 text-white font-extrabold text-xs shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-98 cursor-pointer"
                  >
                    {isCapturingSnapshot ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Camera className="w-4 h-4 stroke-[2.5]" />
                    )}
                    <span>
                      {isCapturingSnapshot
                        ? (lang === 'ar' ? 'جارِ التقاط الصورة من الفيديو...' : '正在截取视频帧...')
                        : (lang === 'ar' ? '📸 أخذ لقطة وإضافتها تلقائياً لخانة الصورة' : '📸 截取当前帧自动填入封面')}
                    </span>
                  </button>
                </div>
              )}

              {/* Quick Info */}
              <div className="mt-4 p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                <div className="flex justify-between">
                  <span>{lang === 'ar' ? 'استهلاك خادمك:' : '本站服务器带宽占用:'}</span>
                  <strong className="text-emerald-400 font-mono">0 KB/s (Zero)</strong>
                </div>
                <div className="flex justify-between">
                  <span>{lang === 'ar' ? 'المصدر المضيف:' : '视频数据源:'}</span>
                  <span className="text-cyan-300 truncate max-w-[140px] font-mono">
                    {(() => {
                      if (!videoUrl) return 'External CDN';
                      if (videoUrl.startsWith('blob:')) return 'Local File';
                      try { return new URL(videoUrl).hostname; } catch { return 'Custom URL'; }
                    })()}
                  </span>
                </div>
              </div>

              {/* Store Card Face Preview (معاينة واجهة العرض في المتجر) */}
              <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-2.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-200">
                  <span>{lang === 'ar' ? 'واجهة العرض في المتجر:' : '商场卡片展示形态:'}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    !usePosterImage || !posterUrl
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  }`}>
                    {!usePosterImage || !posterUrl
                      ? (lang === 'ar' ? '🎬 واجهة الفيديو مباشرة (فيديو فقط)' : '仅视频直出')
                      : (lang === 'ar' ? '🖼️ صورة غلاف مع تشغيل بالماوس' : '封面图+悬停动效')}
                  </span>
                </div>

                <div className="relative aspect-[4/5] w-full max-w-[200px] mx-auto rounded-xl overflow-hidden bg-[#07090e] border border-slate-700 shadow-lg flex items-center justify-center p-2">
                  {(() => {
                    const isVideoUrlImage = Boolean(
                      videoUrl && (
                        videoUrl.match(/\.(jpeg|jpg|gif|png|webp|svg|bmp)(\?.*)?$/i) ||
                        videoUrl.startsWith('data:image/')
                      )
                    );
                    const imageToDisplay = (usePosterImage && posterUrl && !posterLoadError) ? posterUrl : (isVideoUrlImage ? videoUrl : '');

                    if (imageToDisplay) {
                      return (
                        <img
                          src={imageToDisplay}
                          alt="Cover Preview"
                          onError={() => setPosterLoadError(true)}
                          className="w-full h-full object-contain opacity-100 filter-none"
                        />
                      );
                    }

                    if (videoUrl && (videoUrl.includes('.svga') || videoUrl.includes('data:application/octet-stream'))) {
                      return (
                        <SvgaPlayer
                          src={videoUrl}
                          autoPlay
                          loop
                          isMuted
                          backdrop="dark"
                          className="w-full h-full object-contain"
                        />
                      );
                    }

                    if (videoUrl) {
                      return (
                        <video
                          key={videoUrl}
                          src={`${videoUrl}#t=0.001`}
                          autoPlay
                          loop
                          muted
                          playsInline
                          className="w-full h-full object-cover"
                        />
                      );
                    }

                    return (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 text-[11px] p-3 text-center">
                        <Video className="w-6 h-6 mb-1 opacity-40 text-cyan-400" />
                        <span>{lang === 'ar' ? 'ضع رابط الفيديو أو الصورة' : '输入视频或图片直链'}</span>
                      </div>
                    );
                  })()}

                  <div className="absolute bottom-2 left-2 right-2 px-2 py-1 rounded bg-slate-950/85 backdrop-blur text-[10px] text-white truncate font-medium text-center border border-slate-800 z-10">
                    {title || (lang === 'ar' ? 'اسم الهدية' : '礼物名称')}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )}

      {/* TAB 2: ACTIVE GIFTS LIST */}
      {activeTab === 'list' && (
        <div className="bg-[#111520] border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-6">
          {/* 1. GIFTS PER PAGE CONTROL & STOREFRONT PAGINATION SETTING */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-purple-950/70 via-slate-900 to-indigo-950/70 border border-purple-500/40 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-lg">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-purple-500/20 border border-purple-400/50 flex items-center justify-center text-purple-300 shrink-0 shadow-md">
                <SlidersHorizontal className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-sm font-black text-white">
                    {lang === 'ar' ? 'التحكم في عدد الهدايا لكل صفحة في المتجر (Gifts Per Page)' : '全站商城每页展示数量设定'}
                  </h4>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                    {lang === 'ar' ? 'تحكم فوري مباشر' : 'Live Sync'}
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {lang === 'ar'
                    ? `إجمالي الهدايا (${gifts.length}) هدية — يتم تقسيمها وتوزيعها في المتجر تلقائياً بناءً على الرقم الذي تحدده هنا.`
                    : `全站当前共有 (${gifts.length}) 件礼物素材，将根据您设置的数量自动精确分页。`}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-center">
              <div className="flex items-center gap-2 bg-slate-950/90 px-3.5 py-2 rounded-xl border border-slate-700/80 shadow-inner">
                <span className="text-xs text-slate-400 font-bold">{lang === 'ar' ? 'كل صفحة:' : '每页:'}</span>
                <input
                  type="number"
                  min="1"
                  max="200"
                  value={customGiftsPerPage}
                  onChange={(e) => setCustomGiftsPerPage(Math.max(1, Number(e.target.value)))}
                  className="w-16 px-2 py-1 rounded-lg bg-slate-900 border border-purple-500/60 text-white font-mono font-black text-center text-sm focus:outline-none focus:border-purple-400"
                />
                <span className="text-xs text-slate-400 font-bold">{lang === 'ar' ? 'هدية' : '件'}</span>
              </div>

              {/* Quick Presets */}
              <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
                {[10, 20, 26, 30, 50].map((presetVal) => (
                  <button
                    key={presetVal}
                    type="button"
                    onClick={() => setCustomGiftsPerPage(presetVal)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                      customGiftsPerPage === presetVal
                        ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30 font-black'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                    title={lang === 'ar' ? `ضبط ${presetVal} هدية بالصفحة` : `设为 ${presetVal} 件`}
                  >
                    {presetVal}
                  </button>
                ))}
              </div>

              {/* Save Button */}
              <button
                type="button"
                onClick={handleSaveGiftsPerPage}
                disabled={isSavingGiftsPerPage}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>{lang === 'ar' ? 'حفظ وتطبيق فوراً' : '保存生效'}</span>
              </button>
            </div>
          </div>

          {/* 2. SEARCH, VIEW MODE SELECTOR, AND ACTION BUTTONS */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            {/* Search Input */}
            <div className="relative max-w-md w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder={lang === 'ar' ? 'بحث بالاسم، الرقم التسلسلي، التصنيف...' : '搜索礼物名称、编号、分类...'}
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-500 transition-colors shadow-inner"
              />
            </div>

            {/* View Mode & Management Actions */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* VIEW SWITCHER: LARGE CARDS (GRID) VS COMPACT TABLE */}
              <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-700/80 shadow-inner">
                <button
                  type="button"
                  onClick={() => setListDisplayMode('grid')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    listDisplayMode === 'grid'
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/20'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title={lang === 'ar' ? 'عرض البطاقات الكبيرة المريحة للعين' : '大图卡片视图'}
                >
                  <LayoutGrid className="w-4 h-4" />
                  <span>{lang === 'ar' ? 'بطاقات كبيرة (مريح للعين)' : '大卡片'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setListDisplayMode('table')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    listDisplayMode === 'table'
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/20'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title={lang === 'ar' ? 'عرض الجدول المضغوط' : '表格视图'}
                >
                  <List className="w-4 h-4" />
                  <span>{lang === 'ar' ? 'جدول' : '表格'}</span>
                </button>
              </div>

              {/* PURGE DUMMY GIFTS BUTTON */}
              <button
                type="button"
                onClick={handlePurgeDummyGifts}
                className="px-3 py-2 rounded-xl bg-amber-950/60 hover:bg-amber-900 text-amber-300 hover:text-white text-xs font-bold border border-amber-700/60 flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
                title={lang === 'ar' ? 'فحص وحذف أي هدايا وهمية أو تجريبية' : '清理测试礼物'}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>{lang === 'ar' ? 'تنظيف الهدايا الوهمية' : '清理测试'}</span>
              </button>

              {/* DELETE ALL UPLOADED PRODUCTS BUTTON */}
              <button
                type="button"
                disabled={isDeletingAll || gifts.length === 0}
                onClick={() => setIsDeleteAllModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-red-950/70 hover:bg-red-900 text-red-300 hover:text-white disabled:opacity-40 disabled:pointer-events-none text-xs font-bold border border-red-800/80 flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
                title={lang === 'ar' ? 'حذف جميع المنتجات المرفوعة نهائياً' : '清空所有产品'}
              >
                <Trash2 className="w-3.5 h-3.5 text-red-400" />
                <span>
                  {lang === 'ar' ? `حذف الكل (${gifts.length})` : `清空 (${gifts.length})`}
                </span>
              </button>

              {/* ADD NEW GIFT BUTTON */}
              <button
                onClick={() => {
                  setEditingId(null);
                  setActiveTab('create');
                }}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-lg shadow-cyan-500/25 active:scale-95"
              >
                <PlusCircle className="w-4 h-4" />
                <span>{t.addNewGift}</span>
              </button>
            </div>
          </div>

          {/* 3. MAIN GIFTS CONTENT AREA */}
          {filteredGifts.length === 0 ? (
            <div className="py-20 text-center text-slate-500 space-y-3">
              <p className="text-sm">
                {lang === 'ar' ? 'لا توجد هدايا تطابق البحث' : '未找到匹配的礼物素材'}
              </p>
            </div>
          ) : listDisplayMode === 'grid' ? (
            /* ============================================================ */
            /* LARGE CARD GRID VIEW (بشكل كبير جداً وصفوف مريحة للعين)       */
            /* ============================================================ */
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5 sm:gap-6">
              {filteredGifts.map((g, idx) => (
                <div
                  key={g.id}
                  className="group relative flex flex-col rounded-2xl sm:rounded-3xl bg-[#0c1017] border border-slate-800/90 hover:border-cyan-500/50 hover:shadow-2xl hover:shadow-cyan-950/40 transition-all duration-300 overflow-hidden"
                >
                  {/* Large High-Definition Media Preview Area */}
                  <div className="relative w-full h-64 sm:h-72 bg-slate-950 flex items-center justify-center overflow-hidden">
                    {g.posterUrl ? (
                      <img
                        src={g.posterUrl}
                        alt={g.title}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    ) : g.videoUrl ? (
                      <video
                        src={`${g.videoUrl}#t=0.001`}
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 bg-slate-900/50">
                        <Video className="w-10 h-10 mb-2 opacity-40 text-cyan-400" />
                        <span className="text-xs">{lang === 'ar' ? 'لا يوجد استعراض' : '无预览'}</span>
                      </div>
                    )}

                    {/* Gradient Overlay for Top Badges */}
                    <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/80 via-black/30 to-transparent pointer-events-none" />

                    {/* Top Right: ID Badge */}
                    <span className="absolute top-3 right-3 bg-black/80 backdrop-blur-md border border-cyan-500/40 text-cyan-300 font-mono font-bold text-xs px-2.5 py-1 rounded-xl shadow-lg">
                      {g.id}
                    </span>

                    {/* Top Left: Price Badge */}
                    <span className="absolute top-3 left-3 bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-black text-xs px-2.5 py-1 rounded-xl shadow-lg flex items-center gap-1">
                      <span>¥ {g.price}</span>
                    </span>

                    {/* Bottom Left: Category & Effect Type Badge */}
                    <span className="absolute bottom-3 left-3 bg-black/75 backdrop-blur-md border border-slate-700/80 text-slate-200 text-[10px] font-bold px-2 py-0.5 rounded-lg">
                      {g.category} · {g.effectType}
                    </span>

                    {/* Hover Center Overlay: Quick Preview Button */}
                    <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2 backdrop-blur-xs">
                      <button
                        type="button"
                        onClick={() => onPreviewGift(g)}
                        className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs shadow-xl shadow-cyan-500/40 flex items-center gap-1.5 transition-all transform scale-90 group-hover:scale-100 cursor-pointer"
                      >
                        <Eye className="w-4 h-4" />
                        <span>{lang === 'ar' ? 'معاينة بالحجم الكامل' : '全屏大图预览'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Card Content & Details Area */}
                  <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3.5 bg-gradient-to-b from-[#0c1017] to-[#111520]">
                    <div>
                      {/* Primary & Arabic Title */}
                      <h3 className="text-base sm:text-lg font-black text-white tracking-tight line-clamp-1 mb-1">
                        {g.title}
                      </h3>
                      {g.titleAr && (
                        <p className="text-xs sm:text-sm text-slate-300 font-medium line-clamp-1">
                          {g.titleAr}
                        </p>
                      )}
                    </div>

                    {/* Formats Pills */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      {g.formats && g.formats.map((f, fIdx) => (
                        <span
                          key={fIdx}
                          className="px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-300 border border-slate-700/60 text-[10px] font-semibold"
                        >
                          {f.name.split('带')[0].split('动')[0]}
                        </span>
                      ))}
                    </div>

                    {/* Price Tiers Info */}
                    <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800/90 flex items-center justify-between text-xs font-mono">
                      <div>
                        <span className="text-[10px] text-slate-400 block">{lang === 'ar' ? 'سعر VIP' : 'VIP价格'}</span>
                        <span className="text-purple-300 font-bold">¥ {g.vipPrice || Math.round(g.price * 0.65)}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block">{lang === 'ar' ? 'التحميلات' : '下载次数'}</span>
                        <span className="text-emerald-400 font-bold">{g.downloadsCount || 0}</span>
                      </div>
                    </div>

                    {/* Actions Row: 4 Clear & Comfortable Buttons */}
                    <div className="grid grid-cols-4 gap-2 pt-1 border-t border-slate-800/80">
                      {/* Preview Button */}
                      <button
                        type="button"
                        onClick={() => onPreviewGift(g)}
                        className="py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center justify-center transition-colors cursor-pointer"
                        title={lang === 'ar' ? 'معاينة الهدية' : '预览'}
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {/* Edit Button */}
                      <button
                        type="button"
                        onClick={() => handleStartEdit(g)}
                        className="py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center justify-center transition-colors cursor-pointer"
                        title={lang === 'ar' ? 'تعديل الهدية' : '编辑'}
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      {/* Copy Link Button */}
                      <button
                        type="button"
                        onClick={() => handleCopyGiftLink(g)}
                        className="py-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center justify-center transition-colors cursor-pointer"
                        title={lang === 'ar' ? 'نسخ رابط الهدية' : '复制直链'}
                      >
                        {copiedGiftId === g.id ? (
                          <Check className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>

                      {/* Delete Button */}
                      <button
                        type="button"
                        onClick={() => handleDeleteGift(g.id)}
                        className="py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 flex items-center justify-center transition-colors cursor-pointer"
                        title={lang === 'ar' ? 'حذف الهدية' : '删除'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* ============================================================ */
            /* COMPACT TABLE VIEW (الجدول المحسن بتفاصيل أوضح)              */
            /* ============================================================ */
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/90 text-slate-400 uppercase text-[10px] font-mono border-b border-slate-800">
                  <tr>
                    <th className="p-3.5">ID / 封面</th>
                    <th className="p-3.5">{lang === 'ar' ? 'اسم الهدية' : '礼物名称'}</th>
                    <th className="p-3.5">{lang === 'ar' ? 'السعر' : '价格 (CNY)'}</th>
                    <th className="p-3.5">{lang === 'ar' ? 'التصنيف' : '分类/维度'}</th>
                    <th className="p-3.5">{lang === 'ar' ? 'الصيغ' : '包含格式'}</th>
                    <th className="p-3.5">{lang === 'ar' ? 'التحميلات' : '下载量'}</th>
                    <th className="p-3.5 text-right">{lang === 'ar' ? 'الإجراءات' : '操作'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredGifts.map((g) => (
                    <tr key={g.id} className="hover:bg-slate-900/50 transition-colors">
                      <td className="p-3.5">
                        <div className="flex items-center gap-3">
                          {g.posterUrl ? (
                            <img
                              src={g.posterUrl}
                              alt={g.title}
                              className="w-14 h-14 rounded-xl object-cover border border-slate-700 shadow-md shrink-0 cursor-pointer"
                              onClick={() => onPreviewGift(g)}
                            />
                          ) : (
                            <div
                              onClick={() => onPreviewGift(g)}
                              className="w-14 h-14 rounded-xl bg-black border border-cyan-500/40 flex items-center justify-center overflow-hidden shrink-0 cursor-pointer"
                            >
                              <video src={g.videoUrl ? `${g.videoUrl}#t=0.001` : undefined} muted playsInline className="w-full h-full object-cover" />
                            </div>
                          )}
                          <span className="font-mono text-cyan-400 font-bold text-xs">{g.id}</span>
                        </div>
                      </td>
                      <td className="p-3.5 font-semibold text-white">
                        <div className="text-sm font-bold">{g.title}</div>
                        {g.titleAr && <div className="text-xs text-slate-400 mt-0.5">{g.titleAr}</div>}
                      </td>
                      <td className="p-3.5 font-mono font-bold text-amber-400 text-sm">
                        ¥ {g.price}
                      </td>
                      <td className="p-3.5">
                        <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold">
                          {g.category} · {g.effectType}
                        </span>
                      </td>
                      <td className="p-3.5 text-xs text-slate-400">
                        {g.formats.map((f) => f.name.split('动')[0]).join(', ')}
                      </td>
                      <td className="p-3.5 font-mono text-slate-400 text-xs">
                        {g.downloadsCount}
                      </td>
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onPreviewGift(g)}
                            className="p-2 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 transition-colors"
                            title={lang === 'ar' ? 'معاينة' : 'Preview'}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleStartEdit(g)}
                            className="p-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 transition-colors"
                            title={lang === 'ar' ? 'تعديل' : 'Edit'}
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleCopyGiftLink(g)}
                            className="p-2 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 transition-colors"
                            title={lang === 'ar' ? 'نسخ الرابط' : 'Copy'}
                          >
                            {copiedGiftId === g.id ? (
                              <Check className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => handleDeleteGift(g.id)}
                            className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                            title={lang === 'ar' ? 'حذف' : 'Delete'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ORDERS & DELIVERIES LOG WITH MANUAL UPLOAD & PRINTING */}
      {activeTab === 'orders' && (
        <div className="space-y-6">
          {/* Orders Header and Action Buttons */}
          <div className="bg-[#111520] border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <PackageCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">
                  {t.ordersManagement || (lang === 'ar' ? 'إدارة ورفع الطلبات والمبيعات' : 'Orders Management')}
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {lang === 'ar' 
                  ? 'رفع الطلبات يدوياً، إصدار التراخيص، وطباعة الفواتير والشهادات الرسمية وكشوف المبيعات' 
                  : 'Manage and upload orders manually, issue licenses, and print tax invoices and certificates'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Manual Order Upload Button */}
              <button
                type="button"
                onClick={() => setIsOrderFormOpen(!isOrderFormOpen)}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md ${
                  isOrderFormOpen
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white'
                }`}
              >
                <Plus className="w-4 h-4" />
                <span>
                  {isOrderFormOpen 
                    ? (lang === 'ar' ? 'إغلاق نموذج الرفع' : 'Close Form') 
                    : (lang === 'ar' ? 'رفع / تسجيل طلب جديد' : 'Upload New Order')}
                </span>
                {isOrderFormOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {/* Print Full Sales Report */}
              <button
                type="button"
                onClick={() => openPrintModal(null, 'report')}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition-colors"
                title={lang === 'ar' ? 'طباعة تقرير مبيعات شامل' : 'Print Full Sales Report'}
              >
                <Printer className="w-4 h-4 text-cyan-400" />
                <span>{lang === 'ar' ? 'طباعة كشف المبيعات الشامل' : 'Print Sales Report'}</span>
              </button>
            </div>
          </div>

          {/* MANUAL ORDER UPLOAD FORM (Collapsible) */}
          {isOrderFormOpen && (
            <form 
              onSubmit={handleCreateManualOrder}
              className="bg-gradient-to-b from-[#141928] to-[#101420] border-2 border-emerald-500/40 rounded-2xl p-5 sm:p-7 shadow-2xl space-y-5 animate-fadeIn"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <h4 className="text-sm font-black text-white uppercase tracking-wider">
                    {lang === 'ar' ? 'نموذج رفع وتسجيل طلب جديد (Manual Order Upload)' : 'Upload New Customer Order'}
                  </h4>
                </div>
                <span className="text-[11px] text-emerald-400 font-mono">
                  {lang === 'ar' ? 'توليد تلقائي للترخيص وكود الاستخراج' : 'Auto-generates license certificate'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                {/* 1. Select Gift */}
                <div className="space-y-1.5">
                  <label className="text-slate-300 font-semibold block">
                    {lang === 'ar' ? 'الهدية المطلوبة (اختر من المتجر):' : 'Select Gift Item:'}
                  </label>
                  <select
                    value={orderGiftId}
                    onChange={(e) => {
                      setOrderGiftId(e.target.value);
                      const found = gifts.find(g => g.id === e.target.value);
                      if (found) {
                        setOrderPrice(orderLicenseType === 'exclusive' ? found.exclusivePrice : found.price);
                      }
                    }}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-medium focus:outline-none focus:border-emerald-500"
                  >
                    {gifts.map((g) => (
                      <option key={g.id} value={g.id}>
                        [{g.id}] {g.title} {g.titleAr ? `(${g.titleAr})` : ''} - ¥{g.price}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Custom Title (Optional override) */}
                <div className="space-y-1.5">
                  <label className="text-slate-300 font-semibold block">
                    {lang === 'ar' ? 'اسم مخصص للهدية (اختياري):' : 'Custom Title (Optional):'}
                  </label>
                  <input
                    type="text"
                    value={orderCustomTitle}
                    onChange={(e) => setOrderCustomTitle(e.target.value)}
                    placeholder={lang === 'ar' ? 'اتركه فارغاً لاعتماد اسم الهدية الأصلي' : 'Leave empty for original'}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* 3. Buyer Name */}
                <div className="space-y-1.5">
                  <label className="text-slate-300 font-semibold block">
                    {lang === 'ar' ? 'اسم المشتري / الحساب أو القناة:' : 'Buyer / Channel Name:'} *
                  </label>
                  <input
                    type="text"
                    required
                    value={orderBuyerName}
                    onChange={(e) => setOrderBuyerName(e.target.value)}
                    placeholder={lang === 'ar' ? 'مثال: مشاري لايف / المذيعة سارة' : 'e.g., StarStreamer88'}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* 4. Buyer Contact */}
                <div className="space-y-1.5">
                  <label className="text-slate-300 font-semibold block">
                    {lang === 'ar' ? 'رقم الهاتف أو البريد الإلكتروني:' : 'Buyer Phone / Email:'} *
                  </label>
                  <input
                    type="text"
                    required
                    value={orderBuyerContact}
                    onChange={(e) => setOrderBuyerContact(e.target.value)}
                    placeholder={lang === 'ar' ? 'client@streamer.com أو +966...' : 'client@email.com'}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* 5. License Type */}
                <div className="space-y-1.5">
                  <label className="text-slate-300 font-semibold block">
                    {lang === 'ar' ? 'نوع الترخيص المطلوب:' : 'License Authorization:'}
                  </label>
                  <select
                    value={orderLicenseType}
                    onChange={(e) => {
                      const val = e.target.value as 'standard' | 'exclusive';
                      setOrderLicenseType(val);
                      const found = gifts.find(g => g.id === orderGiftId);
                      if (found) {
                        setOrderPrice(val === 'exclusive' ? found.exclusivePrice : found.price);
                      }
                    }}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-medium focus:outline-none focus:border-emerald-500"
                  >
                    <option value="standard">{lang === 'ar' ? 'ترخيص تجاري عام للبث (Standard)' : 'Standard Commercial'}</option>
                    <option value="exclusive">{lang === 'ar' ? 'شراء حقوق حصرية كاملة (Exclusive Buyout)' : 'Exclusive Buyout'}</option>
                  </select>
                </div>

                {/* 6. Order Price */}
                <div className="space-y-1.5">
                  <label className="text-slate-300 font-semibold block">
                    {lang === 'ar' ? 'قيمة الطلب المستلمة (USD $):' : 'Amount Received (USD $):'} *
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={orderPrice}
                    onChange={(e) => setOrderPrice(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-emerald-400 font-mono font-bold text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* 7. Payment Method */}
                <div className="space-y-1.5">
                  <label className="text-slate-300 font-semibold block">
                    {lang === 'ar' ? 'طريقة التحصيل / الدفع:' : 'Payment Method:'}
                  </label>
                  <select
                    value={orderPaymentMethod}
                    onChange={(e) => setOrderPaymentMethod(e.target.value as any)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-medium focus:outline-none focus:border-emerald-500"
                  >
                    <option value="card">{lang === 'ar' ? 'بطاقة مصرفية / فيزا أو ماستركارد' : 'Credit / Debit Card'}</option>
                    <option value="bank">{lang === 'ar' ? 'تحويل بنكي مباشر' : 'Direct Bank Wire'}</option>
                    <option value="wechat">{lang === 'ar' ? 'WeChat Pay (وي تشات باي)' : 'WeChat Pay'}</option>
                    <option value="alipay">{lang === 'ar' ? 'Alipay (علي باي)' : 'Alipay'}</option>
                    <option value="cash">{lang === 'ar' ? 'تحصيل يدوي / نقدي' : 'Cash / Manual'}</option>
                  </select>
                </div>

                {/* 8. Additional Notes */}
                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-slate-300 font-semibold block">
                    {lang === 'ar' ? 'ملاحظات وتفاصيل إضافية للطلب:' : 'Order Notes (Optional):'}
                  </label>
                  <input
                    type="text"
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    placeholder={lang === 'ar' ? 'مثال: تم إرسال الملفات مسبقاً، تسليم فوري وتوثيق البث' : 'e.g. Verified via VIP streamer desk'}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsOrderFormOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:brightness-110 text-white text-xs font-bold shadow-lg flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{t.dispatchOrderBtn || (lang === 'ar' ? 'تسجيل ورفع الطلب وإصدار الترخيص' : 'Upload & Dispatch Order')}</span>
                </button>
              </div>
            </form>
          )}

          {/* ORDERS TABLE WITH FULL PRINTING CAPABILITIES */}
          <div className="bg-[#111520] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <span>{lang === 'ar' ? 'سجل الطلبات والعمليات المسجلة' : 'Registered Orders & Deliveries'}</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 text-[11px] font-mono">
                  {deliveries.length}
                </span>
              </h4>

              <span className="text-xs text-slate-400">
                {lang === 'ar' ? 'انقر على أيقونات الطباعة لمعاينة الفاتورة أو شهادة الترخيص وطباعتها فوراً' : 'Click print icons to print invoice or certificate'}
              </span>
            </div>

            {deliveries.length === 0 ? (
              <div className="p-10 text-center text-slate-500 text-xs space-y-2">
                <PackageCheck className="w-8 h-8 mx-auto opacity-40 text-slate-400" />
                <p>{lang === 'ar' ? 'لا توجد طلبات مسجلة حتى الآن. يمكنك الضغط على "رفع / تسجيل طلب جديد" لإضافة أول طلب!' : 'No orders recorded yet. Click "Upload New Order" above to create one.'}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left rtl:text-right text-xs text-slate-300">
                  <thead className="bg-slate-900/90 text-slate-400 uppercase text-[10px] font-mono border-b border-slate-800">
                    <tr>
                      <th className="p-3">{t.orderNumber}</th>
                      <th className="p-3">{lang === 'ar' ? 'العميل / المشتري' : 'Buyer'}</th>
                      <th className="p-3">{lang === 'ar' ? 'الهدية' : 'Gift'}</th>
                      <th className="p-3">{lang === 'ar' ? 'الترخيص' : 'License'}</th>
                      <th className="p-3">{lang === 'ar' ? 'السعر' : 'Price'}</th>
                      <th className="p-3">{lang === 'ar' ? 'التاريخ' : 'Date'}</th>
                      <th className="p-3 text-center">{lang === 'ar' ? 'خيارات الطباعة' : 'Print Options'}</th>
                      <th className="p-3 text-right rtl:text-left">{lang === 'ar' ? 'الإجراءات' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {deliveries.map((del) => (
                      <tr key={del.id} className="hover:bg-slate-900/50 transition-colors">
                        <td className="p-3">
                          <span className="font-mono font-bold text-cyan-300 block">{del.orderId}</span>
                          <span className="text-[10px] text-slate-500 font-mono">{del.licenseKey}</span>
                        </td>
                        <td className="p-3">
                          <div className="font-semibold text-white">{del.buyerName || (lang === 'ar' ? 'عميل معتمد' : 'VIP Client')}</div>
                          <div className="text-[11px] text-slate-400 truncate max-w-[140px]">{del.buyerContact || 'streamer@live.com'}</div>
                        </td>
                        <td className="p-3">
                          <div className="font-medium text-slate-200">{del.giftTitle}</div>
                          <div className="text-[10px] text-slate-500 truncate max-w-[160px]">{del.format}</div>
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            del.licenseType === 'exclusive' 
                              ? 'bg-purple-950 text-purple-300 border border-purple-800' 
                              : 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                          }`}>
                            {del.licenseType === 'exclusive' 
                              ? (lang === 'ar' ? 'شراء حصري' : '全网买断') 
                              : (lang === 'ar' ? 'ترخيص تجاري' : '商用通用')}
                          </span>
                        </td>
                        <td className="p-3 font-mono font-bold text-emerald-400">
                          ¥ {del.price}
                        </td>
                        <td className="p-3 text-slate-400 font-mono text-[11px]">
                          {del.purchaseDate}
                        </td>

                        {/* PRINTING SHORTCUTS (The user requested: "وطابع منها كل شيء") */}
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Print Invoice */}
                            <button
                              type="button"
                              onClick={() => openPrintModal(del, 'invoice')}
                              className="px-2 py-1 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 text-[11px] font-semibold flex items-center gap-1"
                              title={lang === 'ar' ? 'طباعة فاتورة البيع الرسمية' : 'Print Invoice'}
                            >
                              <Printer className="w-3.5 h-3.5 text-blue-400" />
                              <span>{lang === 'ar' ? 'فاتورة' : 'Invoice'}</span>
                            </button>

                            {/* Print Certificate */}
                            <button
                              type="button"
                              onClick={() => openPrintModal(del, 'certificate')}
                              className="px-2 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-[11px] font-semibold flex items-center gap-1"
                              title={lang === 'ar' ? 'طباعة شهادة الترخيص والملكية' : 'Print Certificate'}
                            >
                              <Award className="w-3.5 h-3.5 text-amber-400" />
                              <span>{lang === 'ar' ? 'شهادة' : 'Cert'}</span>
                            </button>

                            {/* Print Voucher */}
                            <button
                              type="button"
                              onClick={() => openPrintModal(del, 'voucher')}
                              className="px-2 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold flex items-center gap-1"
                              title={lang === 'ar' ? 'طباعة بطاقة الاستلام' : 'Print Slip'}
                            >
                              <Package className="w-3.5 h-3.5 text-emerald-400" />
                              <span>{lang === 'ar' ? 'بطاقة' : 'Slip'}</span>
                            </button>
                          </div>
                        </td>

                        {/* Order Actions */}
                        <td className="p-3 text-right rtl:text-left">
                          <div className="flex items-center justify-end rtl:justify-start gap-1.5">
                            <button
                              type="button"
                              onClick={() => onOpenDeliveryBox(del)}
                              className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-[11px] font-semibold border border-cyan-500/30 flex items-center gap-1"
                              title={lang === 'ar' ? 'فتح صندوق الاستلام الرقمي' : 'Open Delivery Box'}
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>{lang === 'ar' ? 'صندوق الاستلام' : '交付盒'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteOrder(del.id)}
                              className="p-1 rounded-lg hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-colors"
                              title={lang === 'ar' ? 'حذف هذا الطلب' : 'Delete Order'}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: STAFF & CREATORS MANAGEMENT (لوحة إدارة الحسابات والصلاحيات) */}
      {activeTab === 'staff' && (() => {
        const activeAccountsCount = staffList.filter((e) => (e.status || 'active') === 'active').length;
        const inactiveAccountsCount = staffList.filter((e) => e.status === 'inactive').length;
        const uploadAllowedCount = staffList.filter((e) => (e.permissions?.giftUploadAndPublish !== false) && (e.status !== 'inactive')).length;

        const filteredStaffList = staffList.filter((e) => {
          if (accountFilter === 'active') return (e.status || 'active') === 'active';
          if (accountFilter === 'inactive') return e.status === 'inactive';
          if (accountFilter === 'upload_allowed') return (e.permissions?.giftUploadAndPublish !== false) && (e.status !== 'inactive');
          return true;
        });

        return (
          <div className="space-y-6">
            {/* Header & Stats Banner */}
            <div className="p-5 rounded-2xl bg-[#111520] border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-cyan-400" />
                  <h2 className="text-lg font-bold text-white">
                    {lang === 'ar' ? 'لوحة تفعيل وإدارة الحسابات والصلاحيات' : 'Account & Permissions Management'}
                  </h2>
                </div>
                <p className="text-xs text-slate-400 mt-1 max-w-2xl">
                  {lang === 'ar'
                    ? 'التحكم الكامل في حسابات المنصة: تفعيل أو تعطيل الحسابات، وإدارة [صلاحية رفع ونشر الهدايا - Gift Upload & Publishing Permission] لكل حساب بشكل مستقل، وتعيين بيانات الاتصال بالواتساب.'
                    : 'Manage platform accounts, toggle active/inactive status, and grant/revoke Gift Upload & Publishing Permissions independently.'}
                </p>
              </div>

              {/* Real-time Status Metric Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 w-full md:w-auto">
                <div className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700/80 text-center">
                  <div className="text-[10px] text-slate-400 font-medium">{lang === 'ar' ? 'إجمالي الحسابات' : 'Total Accounts'}</div>
                  <div className="text-sm sm:text-base font-black text-cyan-300 font-mono">{staffList.length}</div>
                </div>
                <div className="px-3 py-2 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-center">
                  <div className="text-[10px] text-emerald-400 font-medium">{lang === 'ar' ? 'حسابات مفعلة' : 'Active'}</div>
                  <div className="text-sm sm:text-base font-black text-emerald-300 font-mono">{activeAccountsCount}</div>
                </div>
                <div className="px-3 py-2 rounded-xl bg-red-950/40 border border-red-500/30 text-center">
                  <div className="text-[10px] text-red-400 font-medium">{lang === 'ar' ? 'معطلة / موقوفة' : 'Inactive'}</div>
                  <div className="text-sm sm:text-base font-black text-red-300 font-mono">{inactiveAccountsCount}</div>
                </div>
                <div className="px-3 py-2 rounded-xl bg-purple-950/40 border border-purple-500/30 text-center">
                  <div className="text-[10px] text-purple-300 font-medium">{lang === 'ar' ? 'مصرح بالرفع' : 'Can Upload'}</div>
                  <div className="text-sm sm:text-base font-black text-purple-300 font-mono">{uploadAllowedCount}</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Create New Staff Form */}
              <div className="lg:col-span-5 bg-[#111520] border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                  <UserPlus className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-bold text-white">
                    {lang === 'ar' ? 'إنشاء حساب جديد وتعيين الصلاحيات' : t.createStaffAccount}
                  </h3>
                </div>

                <form onSubmit={handleCreateStaff} className="space-y-4 text-xs">
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">
                      {lang === 'ar' ? 'الاسم الكامل أو اسم العرض' : 'Full Name'} *
                    </label>
                    <input
                      type="text"
                      required
                      value={newStaffName}
                      onChange={(e) => setNewStaffName(e.target.value)}
                      placeholder="مثال: يوسف ديزاينر / سارة فلكس"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{lang === 'ar' ? 'رقم الواتساب الخاص بالموظف' : 'Employee WhatsApp'} *</span>
                      </span>
                      <span className="text-[10px] text-cyan-400 font-normal">
                        {lang === 'ar' ? 'اختر الدولة وأدخل الرقم' : 'Select country & enter phone'}
                      </span>
                    </label>
                    <InternationalPhoneInput
                      value={newStaffWhatsapp}
                      onChange={setNewStaffWhatsapp}
                      lang={lang}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-300 font-bold mb-1">
                        {lang === 'ar' ? 'الوظيفة / الصلاحيات' : 'Role / Permissions'}
                      </label>
                      <select
                        value={newStaffRole}
                        onChange={(e) => setNewStaffRole(e.target.value as any)}
                        className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                      >
                        <option value="buyer">{lang === 'ar' ? 'مستخدم / مشتري' : 'Buyer'}</option>
                        <option value="designer">{lang === 'ar' ? 'مصمم (Designer)' : 'Designer'}</option>
                        <option value="employee">{lang === 'ar' ? 'موظف / مشرف' : 'Employee'}</option>
                        {isSuperAdmin && <option value="admin">{lang === 'ar' ? 'مسؤول / أدمن (Admin)' : 'Admin'}</option>}
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-300 font-bold mb-1">
                        {lang === 'ar' ? 'البريد الإلكتروني للدخول *' : '员工登录邮箱 *'}
                      </label>
                      <input
                        type="email"
                        required
                        value={newStaffEmail}
                        onChange={(e) => setNewStaffEmail(e.target.value)}
                        placeholder="designer@streamgifts.com"
                        className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-cyan-500 font-mono text-xs"
                      />
                    </div>
                  </div>

                  {/* Password for Employee Login */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-slate-300 font-bold flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-cyan-400" />
                        <span>{lang === 'ar' ? 'كلمة المرور للدخول (Password) *' : '员工登录密码 *'}</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const randomPass = 'JW' + Math.floor(1000 + Math.random() * 9000);
                          setNewStaffPassword(randomPass);
                        }}
                        className="text-[11px] text-cyan-400 hover:text-cyan-300 underline font-medium"
                      >
                        {lang === 'ar' ? '⚡ توليد كلمة سر عشوائية' : '⚡ 随机生成'}
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showStaffPassword ? 'text' : 'password'}
                        required
                        value={newStaffPassword}
                        onChange={(e) => setNewStaffPassword(e.target.value)}
                        placeholder="أدخل كلمة مرور للموظف"
                        className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-cyan-500 font-mono text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setShowStaffPassword(!showStaffPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                        tabIndex={-1}
                      >
                        {showStaffPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Independent Permission Switch: Gift Upload & Publishing Permission */}
                  <div className="p-3.5 rounded-xl bg-slate-900/90 border border-cyan-500/40 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                          <span>{lang === 'ar' ? 'صلاحية رفع ونشر الهدايا' : 'Gift Upload Permission'}</span>
                        </div>
                        <p className="text-[10px] text-slate-400">
                          {lang === 'ar'
                            ? 'تمكين هذا الحساب من رفع ملفات ومؤثرات الهدايا ونشرها على المنصة فوراً'
                            : 'Allow this user to upload and publish gifts immediately'}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setNewStaffCanUpload(!newStaffCanUpload)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          newStaffCanUpload ? 'bg-cyan-500' : 'bg-slate-700'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                            newStaffCanUpload ? (lang === 'ar' ? '-translate-x-5' : 'translate-x-5') : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px]">
                      <span className="text-slate-400">{lang === 'ar' ? 'الحالة المبدئية عند الإنشاء:' : 'Initial Status:'}</span>
                      <span className={`font-bold ${newStaffCanUpload ? 'text-cyan-300' : 'text-amber-400'}`}>
                        {newStaffCanUpload
                          ? (lang === 'ar' ? 'مصرح له بالرفع والنشر ✅' : 'Allowed')
                          : (lang === 'ar' ? 'ممنوع من الرفع (مسحوبة) ⛔' : 'Disabled')}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1">
                      {lang === 'ar' ? 'صورة الرمز الشخصي (Avatar):' : '头像选择:'}
                    </label>
                    <div className="flex items-center gap-2 mb-2">
                      {[
                        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=160&auto=format&fit=crop&q=80',
                        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=160&auto=format&fit=crop&q=80',
                        'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=160&auto=format&fit=crop&q=80',
                        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=160&auto=format&fit=crop&q=80'
                      ].map((img, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setNewStaffAvatar(img)}
                          className={`relative rounded-xl overflow-hidden border-2 transition-transform ${
                            newStaffAvatar === img ? 'border-cyan-400 scale-105 shadow-md shadow-cyan-500/30' : 'border-slate-700 opacity-60 hover:opacity-100'
                          }`}
                        >
                          <img src={img} alt="preset" className="w-10 h-10 object-cover" />
                        </button>
                      ))}
                    </div>
                    <input
                      type="url"
                      value={newStaffAvatar}
                      onChange={(e) => setNewStaffAvatar(e.target.value)}
                      placeholder="https://..."
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-[11px] text-slate-300 font-mono focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1">
                      {lang === 'ar' ? 'التخصص أو النبذة التعريفية:' : '擅长领域/简介:'}
                    </label>
                    <input
                      type="text"
                      value={newStaffBio}
                      onChange={(e) => setNewStaffBio(e.target.value)}
                      placeholder="مثال: متخصص في مؤثرات التيك توك و SVGA ثلاثية الأبعاد"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-900/30 transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>{lang === 'ar' ? 'إنشاء وتفعيل الحساب فوراً' : '创建员工并完成配置'}</span>
                  </button>
                </form>
              </div>

              {/* Right Column: Staff Members List & Permission Toggles */}
              <div className="lg:col-span-7 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-cyan-400" />
                    <h3 className="text-sm font-bold text-white">
                      {lang === 'ar' ? 'قائمة الحسابات والصلاحيات' : 'Staff List'} ({filteredStaffList.length})
                    </h3>
                  </div>

                  {/* Filter Pills */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setAccountFilter('all')}
                      className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                        accountFilter === 'all'
                          ? 'bg-cyan-500 text-black font-bold shadow-sm'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {lang === 'ar' ? 'الكل' : 'All'} ({staffList.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setAccountFilter('active')}
                      className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                        accountFilter === 'active'
                          ? 'bg-emerald-500 text-black font-bold shadow-sm'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {lang === 'ar' ? 'المفعلة' : 'Active'} ({activeAccountsCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setAccountFilter('inactive')}
                      className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                        accountFilter === 'inactive'
                          ? 'bg-red-500 text-white font-bold shadow-sm'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {lang === 'ar' ? 'المعطلة' : 'Inactive'} ({inactiveAccountsCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setAccountFilter('upload_allowed')}
                      className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                        accountFilter === 'upload_allowed'
                          ? 'bg-purple-500 text-white font-bold shadow-sm'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {lang === 'ar' ? 'مصرح بالرفع' : 'Can Upload'} ({uploadAllowedCount})
                    </button>
                  </div>
                </div>

                <div className="space-y-3.5">
                  {filteredStaffList.length === 0 ? (
                    <div className="p-8 text-center rounded-2xl bg-[#111520] border border-slate-800 text-slate-400 text-xs">
                      {lang === 'ar' ? 'لا توجد حسابات مطابقة للتصفية المختارة' : 'No accounts matching the filter.'}
                    </div>
                  ) : (
                    filteredStaffList.map((emp) => {
                      const isActiveAccount = (emp.status || 'active') === 'active';
                      const hasUploadPermission = (emp.permissions?.giftUploadAndPublish !== false) && isActiveAccount;
                      const isCurrentActive = emp.id === activeStaff.id;

                      return (
                        <div
                          key={emp.id}
                          className={`p-4 rounded-2xl border transition-all ${
                            isCurrentActive
                              ? 'bg-gradient-to-r from-slate-900 via-[#13192a] to-cyan-950/40 border-cyan-500/70 shadow-lg shadow-cyan-500/10'
                              : 'bg-[#111520] border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="space-y-3.5">
                            {/* Top row: Avatar + Identity + Status Badges */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div className="flex items-start gap-3.5">
                                <div className="relative shrink-0">
                                  <img
                                    src={emp.avatar}
                                    alt={emp.name}
                                    className={`w-12 h-12 rounded-2xl object-cover border-2 ${
                                      isCurrentActive
                                        ? 'border-cyan-400 shadow-md'
                                        : isActiveAccount
                                        ? 'border-slate-700'
                                        : 'border-red-500/50 opacity-60'
                                    }`}
                                  />
                                  {isCurrentActive && (
                                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-cyan-400 border-2 border-[#111520] flex items-center justify-center">
                                      <Check className="w-2.5 h-2.5 text-black stroke-[3]" />
                                    </span>
                                  )}
                                </div>

                                <div className="space-y-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-sm font-black text-white">{emp.name}</span>
                                    
                                    <select
                                      value={emp.role}
                                      onChange={(e) => {
                                        const newRole = e.target.value as UserRole;
                                        changeEmployeeRole(emp, newRole).then(() => {
                                          setStaffList((prev) => prev.map((u) => u.id === emp.id ? { ...u, role: newRole } : u));
                                          setSuccessMessage(lang === 'ar' ? `تم تغيير وظيفة/صلاحيات ${emp.name} بنجاح` : 'Role updated successfully');
                                          setTimeout(() => setSuccessMessage(null), 3000);
                                        }).catch((err) => {
                                          alert(lang === 'ar' ? 'حدث خطأ أثناء تغيير الصلاحية' : 'Error updating role');
                                        });
                                      }}
                                      className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 font-semibold focus:outline-none focus:border-cyan-500 cursor-pointer appearance-none"
                                      title={lang === 'ar' ? 'تغيير الوظيفة والصلاحيات' : 'Change Role'}
                                    >
                                      <option value="buyer">{lang === 'ar' ? 'مستخدم عادي / مشتري' : 'Buyer'}</option>
                                      <option value="designer">{lang === 'ar' ? 'مصمم معتمد' : 'Designer'}</option>
                                      <option value="employee">{lang === 'ar' ? 'موظف' : 'Employee'}</option>
                                      {isSuperAdmin && <option value="admin">{lang === 'ar' ? 'مدير نظام' : 'Admin'}</option>}
                                    </select>

                                    {/* Active Account Status Badge */}
                                    {isActiveAccount ? (
                                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                        <span>{lang === 'ar' ? 'حساب مفعل' : 'Active'}</span>
                                      </span>
                                    ) : (
                                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/40 font-bold flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                                        <span>{lang === 'ar' ? 'حساب معطل ⏸️' : 'Inactive'}</span>
                                      </span>
                                    )}

                                    {isCurrentActive && (
                                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span>
                                        <span>{lang === 'ar' ? 'الحساب المختار حالياً' : 'Selected'}</span>
                                      </span>
                                    )}
                                  </div>

                                  {emp.bio && (
                                    <p className="text-xs text-slate-300">{emp.bio}</p>
                                  )}

                                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                                    <div className="flex items-center gap-1">
                                      <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                                      <span className="font-mono text-emerald-400 font-semibold dir-ltr">{emp.whatsapp}</span>
                                      {emp.whatsapp && (
                                        <a
                                          href={`https://wa.me/${emp.whatsapp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`مرحباً ${emp.name}، استفسار بخصوص مؤثرات المتجر`)}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="ml-1 text-[10px] px-2 py-0.5 rounded bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/30 inline-flex items-center gap-1"
                                          title={lang === 'ar' ? 'محادثة واتساب' : 'WhatsApp'}
                                        >
                                          <span>واتساب</span>
                                          <ExternalLink className="w-2.5 h-2.5" />
                                        </a>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => handleOpenProfileModal(emp)}
                                        className="ml-1 text-[10px] px-2 py-0.5 rounded bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border border-cyan-500/30 inline-flex items-center gap-1 cursor-pointer transition-colors"
                                        title={lang === 'ar' ? 'تعديل رقم الواتساب وتحديثه على جميع هداياه' : 'Edit WhatsApp and sync all gifts'}
                                      >
                                        <Edit3 className="w-2.5 h-2.5" />
                                        <span>{lang === 'ar' ? 'تعديل الرقم' : 'Edit'}</span>
                                      </button>
                                    </div>

                                    <span>•</span>
                                    <span>{lang === 'ar' ? 'الهدايا المرفوعة' : 'Uploaded Gifts'}: <strong className="text-white">{emp.giftsCount || 0}</strong></span>
                                  </div>
                                </div>
                              </div>

                              {/* Direct Status Control Button (تفعيل / تعطيل الحساب) */}
                              <div className="flex items-center gap-2 self-start sm:self-center">
                                <button
                                  type="button"
                                  onClick={() => handleToggleStaffStatus(emp.id, isActiveAccount ? 'inactive' : 'active', emp.role)}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                                    isActiveAccount
                                      ? 'bg-red-500/10 hover:bg-red-500/20 text-red-300 border-red-500/30'
                                      : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border-emerald-500/40 shadow-sm'
                                  }`}
                                  title={isActiveAccount ? 'تعطيل الحساب' : 'تفعيل الحساب'}
                                >
                                  {isActiveAccount ? (
                                    <>
                                      <span>تعطيل الحساب ⏸️</span>
                                    </>
                                  ) : (
                                    <>
                                      <span>تفعيل الحساب ▶️</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>

                            {/* Detailed Permissions Management */}
                            <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
                              <div className="flex items-center gap-1.5 border-b border-slate-800/80 pb-2">
                                <Sparkles className="w-4 h-4 text-cyan-400" />
                                <span className="text-xs font-bold text-white">
                                  {lang === 'ar' ? 'الصلاحيات الممنوحة لهذا المشرف:' : 'Account Permissions:'}
                                </span>
                              </div>
                              
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                {[
                                  { id: 'giftUploadAndPublish', label: lang === 'ar' ? 'إدارة ورفع الهدايا' : 'Manage Gifts' },
                                  { id: 'viewOrders', label: lang === 'ar' ? 'مشاهدة الطلبات' : 'View Orders' },
                                  { id: 'manageAccounts', label: lang === 'ar' ? 'إدارة الحسابات' : 'Manage Accounts' },
                                  { id: 'manageBanners', label: lang === 'ar' ? 'إدارة البنرات' : 'Manage Banners' },
                                  { id: 'manageSettings', label: lang === 'ar' ? 'إعدادات الموقع' : 'Site Settings' },
                                ].map((perm) => (
                                  <label key={perm.id} className="flex items-center gap-2 cursor-pointer group">
                                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                                      emp.permissions?.[perm.id as keyof UserPermissions] !== false && (perm.id === 'giftUploadAndPublish' || emp.permissions?.[perm.id as keyof UserPermissions])
                                        ? 'bg-cyan-500 border-cyan-500' 
                                        : 'bg-slate-800 border-slate-700 group-hover:border-cyan-500/50'
                                    }`}>
                                      {(emp.permissions?.[perm.id as keyof UserPermissions] !== false && (perm.id === 'giftUploadAndPublish' || emp.permissions?.[perm.id as keyof UserPermissions])) && (
                                        <Check className="w-3 h-3 text-black stroke-[3]" />
                                      )}
                                    </div>
                                    <input 
                                      type="checkbox" 
                                      className="hidden"
                                      checked={emp.permissions?.[perm.id as keyof UserPermissions] !== false && (perm.id === 'giftUploadAndPublish' || emp.permissions?.[perm.id as keyof UserPermissions]) ? true : false}
                                      onChange={() => {
                                        // Default for giftUploadAndPublish is true if undefined, others false
                                        let currentVal = emp.permissions?.[perm.id as keyof UserPermissions];
                                        if (currentVal === undefined) {
                                          currentVal = perm.id === 'giftUploadAndPublish' ? true : false;
                                        }
                                        handleTogglePermission(emp.id, perm.id as keyof UserPermissions, Boolean(currentVal), emp.role);
                                      }}
                                    />
                                    <span className="text-[11px] text-slate-300 group-hover:text-white transition-colors">{perm.label}</span>
                                  </label>
                                ))}
                              </div>
                            </div>

                            {/* Staff Login Credentials (Email & Password) */}
                            <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-[11px]">
                              <div className="flex flex-wrap items-center gap-2">
                                <div className="flex items-center gap-1 bg-slate-900/90 px-2.5 py-1 rounded-lg border border-slate-800">
                                  <Mail className="w-3 h-3 text-cyan-400" />
                                  <span className="text-slate-400">البريد:</span>
                                  <span className="text-slate-200 font-mono font-medium">{emp.email}</span>
                                </div>

                                <div className="flex items-center gap-1.5 bg-slate-900/90 px-2.5 py-1 rounded-lg border border-slate-800">
                                  <Lock className="w-3 h-3 text-amber-400" />
                                  <span className="text-slate-400">كلمة المرور:</span>
                                  <span className="text-amber-300 font-mono font-bold">
                                    {visibleStaffPasswords[emp.id] ? (emp.password || '123456') : '••••••'}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setVisibleStaffPasswords(prev => ({ ...prev, [emp.id]: !prev[emp.id] }));
                                    }}
                                    className="text-slate-400 hover:text-white p-0.5 cursor-pointer"
                                    title="إظهار / إخفاء"
                                  >
                                    {visibleStaffPasswords[emp.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      navigator.clipboard.writeText(emp.password || '123456');
                                      alert(lang === 'ar' ? 'تم نسخ كلمة المرور' : '密码已复制');
                                    }}
                                    className="text-slate-400 hover:text-cyan-400 p-0.5 cursor-pointer"
                                    title="نسخ كلمة السر"
                                  >
                                    <Copy className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>

                              {/* Bottom Actions: Select For Uploading + Delete */}
                              <div className="flex items-center gap-2">
                                {isCurrentActive ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (!hasUploadPermission) {
                                        alert(lang === 'ar' ? 'تنبيه: هذا الحساب ليس لديه صلاحية رفع الهدايا حالياً. يرجى تفعيل الصلاحية أولاً.' : 'Upload permission is disabled.');
                                        return;
                                      }
                                      setAuthorName(emp.name);
                                      setActiveTab('create');
                                    }}
                                    className="px-3.5 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-xs font-bold border border-cyan-500/40 flex items-center gap-1.5 shadow cursor-pointer"
                                  >
                                    <PlusCircle className="w-3.5 h-3.5" />
                                    <span>{lang === 'ar' ? 'رفع هدية بهذا الحساب' : '发布素材'}</span>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (!isActiveAccount) {
                                        alert(lang === 'ar' ? 'تنبيه: هذا الحساب معطل حالياً. يرجى تفعيل الحساب أولاً للتمكن من استخدامه.' : 'Account is inactive.');
                                        return;
                                      }
                                      handleSwitchStaff(emp.id);
                                      setAuthorName(emp.name);
                                      if (onStaffLogin) {
                                        onStaffLogin(emp);
                                      }
                                      if (hasUploadPermission) {
                                        setActiveTab('create');
                                      }
                                    }}
                                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-colors cursor-pointer ${
                                      isActiveAccount
                                        ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                                        : 'bg-slate-900 text-slate-500 border-slate-800 opacity-60'
                                    }`}
                                  >
                                    <UserCheck className="w-3.5 h-3.5 text-cyan-400" />
                                    <span>{lang === 'ar' ? 'تحديد الحساب للرفع' : '切换为此账号'}</span>
                                  </button>
                                )}

                                {staffList.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteStaff(emp.id, emp.role)}
                                    className="p-1.5 rounded-xl hover:bg-red-500/20 text-slate-500 hover:text-red-400 border border-transparent hover:border-red-500/30 transition-colors cursor-pointer"
                                    title={lang === 'ar' ? 'حذف الحساب' : 'Delete'}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* PRINT DOCUMENT MODAL (For Invoice, Certificate, Delivery Slip, or Sales Report) */}
      <PrintDocumentModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        delivery={printDelivery}
        allDeliveries={deliveries}
        defaultDocType={printDocType}
        lang={lang}
      />

      {/* FIRST-TIME PROFILE SETUP MODAL (لأول مرة فقط) */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-lg rounded-2xl bg-[#111520] border border-cyan-500/50 shadow-2xl p-6 space-y-5 text-xs text-slate-200">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                  <UserCheck className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    {editingStaffTarget && editingStaffTarget.id !== activeStaff?.id
                      ? (lang === 'ar' ? `تعديل بيانات ورقم ${editingStaffTarget.name}` : `Edit ${editingStaffTarget.name}`)
                      : (lang === 'ar' ? 'إعداد ملف المصمم ورقم الواتساب' : 'Designer Profile Setup')}
                  </h3>
                  <p className="text-[11px] text-cyan-300 font-semibold">
                    {editingStaffTarget && editingStaffTarget.id !== activeStaff?.id
                      ? (lang === 'ar' ? 'تحديث رقم الواتساب ومزامنته مع جميع هدايا هذا المصمم' : 'Update WhatsApp & sync all gifts')
                      : (lang === 'ar' ? 'إدخال البيانات الأساسية ورقم الواتساب لمزامنة الهدايا' : '只需填写一次，后续自动关联')}
                  </p>
                </div>
              </div>

              {(activeStaff?.isProfileCompleted || editingStaffTarget) && (
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileModalOpen(false);
                    setEditingStaffTarget(null);
                  }}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Explanatory Banner */}
            <div className="p-3.5 rounded-xl bg-cyan-950/60 border border-cyan-500/40 text-slate-300 leading-relaxed space-y-1">
              <p className="text-cyan-200 font-bold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>{lang === 'ar' ? 'مزامنة رقم الواتساب تلقائياً مع جميع الهدايا' : 'Automatic WhatsApp Sync with Gifts'}</span>
              </p>
              <p className="text-[11px] text-slate-300">
                {lang === 'ar' 
                  ? 'اختر كود دولتك من القائمة وأدخل رقمك؛ بمجرد التأكيد سيقوم النظام فوراً بتحديث رقم التواصل على جميع هداياك المعروضة في المتجر للعملاء.'
                  : (lang === 'en' ? 'Select country code & enter WhatsApp number to sync across gifts.' : '只需填写一次，后续自动关联')}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  {lang === 'ar' ? 'الاسم الكامل أو اسم الاستوديو' : 'Full Name'} *
                </label>
                <input
                  type="text"
                  required
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  placeholder="مثال: سارة المهندس / كول ديزاين"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white font-bold focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{lang === 'ar' ? 'رقم الواتساب للتواصل' : 'WhatsApp Number'} *</span>
                  </span>
                  <span className="text-[10px] text-cyan-400 font-normal">
                    {lang === 'ar' ? 'اختر كود دولتك وأدخل رقمك' : 'Select country code & enter phone'}
                  </span>
                </label>
                <InternationalPhoneInput
                  value={profileWhatsapp}
                  onChange={setProfileWhatsapp}
                  lang={lang}
                  required
                />
                <div className="mt-2 p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-[11px] text-emerald-300 flex items-start gap-1.5">
                  <span className="text-emerald-400 text-xs shrink-0 mt-0.5">⚡</span>
                  <span className="leading-tight">
                    {lang === 'ar'
                      ? 'ميزة التحديث الشامل: عند الضغط على تأكيد وحفظ، سيتم تحديث هذا الرقم فوراً على جميع الهدايا والتصاميم التي قمت برفعها مسبقاً.'
                      : 'Sync feature: Confirming will automatically update this number across all gifts and effects you uploaded.'}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  {lang === 'ar' ? 'التخصص أو النبذة التعريفية:' : '擅长领域/简介:'}
                </label>
                <input
                  type="text"
                  value={profileBio}
                  onChange={(e) => setProfileBio(e.target.value)}
                  placeholder="مثال: مصممة هدايا SVGA وبثوث لايف"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  {lang === 'ar' ? 'اختر صورة رمزية لملفك:' : '选择头像:'}
                </label>
                <div className="flex items-center gap-2 mb-2">
                  {[
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=160&auto=format&fit=crop&q=80',
                    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=160&auto=format&fit=crop&q=80',
                    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=160&auto=format&fit=crop&q=80',
                    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=160&auto=format&fit=crop&q=80'
                  ].map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setProfileAvatar(img)}
                      className={`relative rounded-xl overflow-hidden border-2 transition-transform ${
                        profileAvatar === img ? 'border-cyan-400 scale-105 shadow-md shadow-cyan-500/30' : 'border-slate-700 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={img} alt="preset" className="w-10 h-10 object-cover" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
                {(activeStaff?.isProfileCompleted || editingStaffTarget) && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileModalOpen(false);
                      setEditingStaffTarget(null);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                  >
                    {lang === 'ar' ? 'إلغاء' : '取消'}
                  </button>
                )}
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-cyan-500/25 flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>{lang === 'ar' ? 'حفظ الملف الشخصي والمتابعة' : '保存资料并继续'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 5: HERO BANNERS MANAGEMENT (With Dimension Specs & Uploads) */}
      {activeTab === 'banners' && (
        <BannerManager
          lang={lang}
          banners={bannersList}
          setBanners={setBanners}
        />
      )}

      {/* TAB 4: EXTERNAL VIDEO CDN GUIDE */}
      {activeTab === 'guide' && (
        <div className="bg-[#111520] border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5 text-xs text-slate-300">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Globe className="w-5 h-5 text-cyan-400" />
            <span>{lang === 'ar' ? 'كيفية رفع الفيديو كروابط خارجية لتوفير استهلاك السيرفر 100%' : '外链视频直连接入指南（0 服务器负载）'}</span>
          </h3>

          <p className="leading-relaxed text-slate-300">
            {lang === 'ar' 
              ? 'موقع جياوي للمؤثرات يتيح لك وضع روابط فيديو مباشرة بحيث يتم بث وتشغيل فيديو الهدية فورياً من خوادم سحابية خارجية (CDN) دون تحميل السيرفر أي ميجابايت من التخزين أو الباندويث.'
              : '为了避免视频大文件（如1080P高清动效）占用服务器存储与宝贵的出网带宽，本平台支持直接绑定外链直连视频地址。'}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
              <strong className="text-cyan-400 font-bold block text-sm">1. Cloudflare R2</strong>
              <p className="text-slate-400 leading-relaxed">
                {lang === 'ar' 
                  ? 'مجاني تماماً حتى 10GB، ولا يوجد أي رسوم على باندويث التحميل (Zero Egress Fees). ممتاز جداً لبث فيديوهات الهدايا بسرعة خارقة.'
                  : '零出口带宽费用，免费提供 10GB 存储，直连速度极快，推荐首选。'}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
              <strong className="text-purple-400 font-bold block text-sm">2. Bunny CDN / Vimeo</strong>
              <p className="text-slate-400 leading-relaxed">
                {lang === 'ar' 
                  ? 'يقدم روابط mp4 مباشرة مع دعم للترميز التلقائي وقنوات الشفافية Alpha Channels.'
                  : '提供原画直链与透明通道视频流支持，全球边缘节点低延迟。'}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
              <strong className="text-emerald-400 font-bold block text-sm">3. Google Drive / GitHub Releases</strong>
              <p className="text-slate-400 leading-relaxed">
                {lang === 'ar' 
                  ? 'يمكنك وضع رابط التحميل المباشر من Google Drive أو GitHub Assets وتضمينه مباشرة في حقل رابط الفيديو.'
                  : '可通过直链转换工具将网盘文件转换为直接在线播放的视频源。'}
              </p>
            </div>
          </div>
        </div>
      )}
      {/* TAB 6: CATEGORIES MANAGEMENT */}
      {activeTab === 'categories' && (
        <div className="bg-[#111520] border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5 text-xs text-slate-300">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-emerald-400" />
            <span>{lang === 'ar' ? 'إدارة أقسام الموقع (Categories)' : '分类管理'}</span>
          </h3>

          <form onSubmit={handleAddCategory} className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              required
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder={lang === 'ar' ? 'اسم القسم (مثال: حيوانات أليفة)' : '分类名称'}
              className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-emerald-500"
            />
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>{lang === 'ar' ? 'إضافة قسم جديد' : '添加分类'}</span>
            </button>
          </form>

          <div className="space-y-2 mt-4">
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <div className="font-bold text-slate-300">{lang === 'ar' ? 'القسم العام (الأساسي)' : '通用分类'}</div>
              <span className="text-[10px] text-slate-500">{lang === 'ar' ? 'لا يمكن حذفه' : '不可删除'}</span>
            </div>
            
            {categories.map((cat) => (
              <div key={cat.id} className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                <div className="font-bold text-white">{cat.name}</div>
                <button
                  type="button"
                  onClick={() => handleDeleteCategory(cat.id)}
                  className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                  title={lang === 'ar' ? 'حذف القسم' : '删除分类'}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 7: SITE SETTINGS */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          <div className="bg-[#111520] border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6 text-xs text-slate-300">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-amber-400" />
                <span>{lang === 'ar' ? 'إعدادات هوية الموقع والتواصل الأساسية' : 'Site Identity & Contact Settings'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsSiteSettingsModalOpen(true)}
                className="px-3.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold border border-amber-500/30 text-xs flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{lang === 'ar' ? 'فتح في نافذة منبثقة' : 'Open in Modal'}</span>
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-5">
              {/* Site Name & Slogan */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-200 font-bold mb-1.5">
                    {lang === 'ar' ? 'اسم الموقع / البراند' : 'Website Name'}
                  </label>
                  <input
                    type="text"
                    value={siteSettings.siteName || ''}
                    onChange={(e) => setSiteSettings({ ...siteSettings, siteName: e.target.value })}
                    placeholder="Destroy KING Designer"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-bold text-sm focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1.5">
                    {lang === 'ar' ? 'الوصف / الشعار (Slogan)' : 'Tagline / Slogan'}
                  </label>
                  <input
                    type="text"
                    value={siteSettings.siteSlogan || ''}
                    onChange={(e) => setSiteSettings({ ...siteSettings, siteSlogan: e.target.value })}
                    placeholder="Animation Gallery & Live Stream VFX"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Logo Management */}
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
                <label className="block text-slate-200 font-bold">
                  {lang === 'ar' ? 'لوجو الموقع (يظهر في أعلى الهيدر)' : 'Website Logo (Top Header)'}
                </label>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                  {/* Current Logo Preview */}
                  <div className="shrink-0">
                    {siteSettings.logoUrl ? (
                      <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-amber-400 shadow-md shadow-amber-500/20 bg-slate-950">
                        <img 
                          src={siteSettings.logoUrl} 
                          alt="Logo Preview" 
                          className="w-full h-full object-cover" 
                        />
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 via-amber-600 to-yellow-600 p-0.5 shadow-md shadow-amber-500/20">
                        <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center">
                          <span className="text-2xl">👑</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-2 w-full">
                    <div className="flex flex-wrap items-center gap-2">
                      <input 
                        type="file" 
                        ref={settingsLogoInputRef} 
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            if (ev.target?.result) {
                              setSiteSettings({ ...siteSettings, logoUrl: ev.target.result as string });
                            }
                          };
                          reader.readAsDataURL(file);
                        }} 
                        accept="image/*" 
                        className="hidden" 
                      />
                      <button
                        type="button"
                        onClick={() => settingsLogoInputRef.current?.click()}
                        className="px-3.5 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 font-bold border border-cyan-500/40 text-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>{lang === 'ar' ? 'رفع لوجو من جهازك' : 'Upload Image'}</span>
                      </button>

                      {siteSettings.logoUrl && (
                        <button
                          type="button"
                          onClick={() => setSiteSettings({ ...siteSettings, logoUrl: '' })}
                          className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-red-950/60 text-slate-300 hover:text-red-300 border border-slate-700 text-xs flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-400" />
                          <span>{lang === 'ar' ? 'استعادة التاج الافتراضي' : 'Reset to Crown'}</span>
                        </button>
                      )}
                    </div>

                    <input
                      type="text"
                      value={siteSettings.logoUrl || ''}
                      onChange={(e) => setSiteSettings({ ...siteSettings, logoUrl: e.target.value })}
                      placeholder={lang === 'ar' ? 'أو ألصق رابط اللوجو المباشر هنا (URL)...' : 'Or paste image URL...'}
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-[11px] focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
              </div>

              {/* Primary Phone / WhatsApp Number */}
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-emerald-400 font-bold flex items-center gap-1.5">
                    <MessageCircle className="w-4 h-4" />
                    <span>{lang === 'ar' ? 'رقم الهاتف والواتساب الأساسي (الظاهر في الهيدر)' : 'Primary Phone & WhatsApp (In Header)'}</span>
                  </label>
                  {(siteSettings.primaryPhone || siteSettings.whatsapp) && (
                    <a
                      href={`https://wa.me/${(siteSettings.primaryPhone || siteSettings.whatsapp || '').replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1"
                    >
                      <span>{lang === 'ar' ? 'تجربة رابط الواتساب' : 'Test WhatsApp'}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      value={siteSettings.primaryPhone || siteSettings.whatsapp || ''}
                      onChange={(e) => setSiteSettings({ 
                        ...siteSettings, 
                        primaryPhone: e.target.value,
                        whatsapp: e.target.value 
                      })}
                      placeholder="+923400700013"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono focus:outline-none focus:border-emerald-500"
                      dir="ltr"
                      required
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      value={siteSettings.primaryPhoneLabel || 'WhatsApp'}
                      onChange={(e) => setSiteSettings({ ...siteSettings, primaryPhoneLabel: e.target.value })}
                      placeholder="WhatsApp"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-300 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Secondary Phone / WhatsApp Number */}
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-cyan-400 font-bold flex items-center gap-1.5">
                    <Phone className="w-4 h-4" />
                    <span>{lang === 'ar' ? 'الرقم الإضافي الثاني (اختياري)' : 'Secondary Contact Number (Optional)'}</span>
                  </label>
                  {(siteSettings.secondaryPhone || siteSettings.secondaryWhatsapp) && (
                    <a
                      href={`https://wa.me/${(siteSettings.secondaryPhone || siteSettings.secondaryWhatsapp || '').replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1"
                    >
                      <span>{lang === 'ar' ? 'تجربة الواتساب 2' : 'Test'}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      value={siteSettings.secondaryPhone || siteSettings.secondaryWhatsapp || ''}
                      onChange={(e) => setSiteSettings({ 
                        ...siteSettings, 
                        secondaryPhone: e.target.value,
                        secondaryWhatsapp: e.target.value 
                      })}
                      placeholder="+966501234567"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono focus:outline-none focus:border-cyan-500"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      value={siteSettings.secondaryPhoneLabel || (lang === 'ar' ? 'واتساب 2' : 'WhatsApp 2')}
                      onChange={(e) => setSiteSettings({ ...siteSettings, secondaryPhoneLabel: e.target.value })}
                      placeholder={lang === 'ar' ? 'واتساب 2 / المبيعات' : 'WhatsApp 2'}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-300 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
              </div>

              {/* WeChat QR Code & Email & Passcode Section */}
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
                <label className="block text-white font-bold flex items-center gap-2">
                  <Globe className="w-4 h-4 text-cyan-400" />
                  <span>{lang === 'ar' ? 'صورة الوي شات (WeChat QR) والبريد وكلمة سر الحماية' : 'WeChat QR, Email & Passcode'}</span>
                </label>

                {/* WeChat QR Upload */}
                <div className="space-y-2 p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-xs font-bold text-slate-200 block">
                    {lang === 'ar' ? 'صورة باركود / رمز الوي شات (WeChat QR Code):' : 'WeChat QR Image:'}
                  </span>

                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <div className="w-16 h-16 rounded-xl bg-white border border-slate-700 overflow-hidden flex items-center justify-center shrink-0">
                      {siteSettings.wechatQrUrl ? (
                        <img src={siteSettings.wechatQrUrl} alt="WeChat QR" className="w-full h-full object-contain p-1" />
                      ) : (
                        <span className="text-slate-400 text-[9px] text-center">Default QR</span>
                      )}
                    </div>

                    <div className="flex-1 space-y-2 w-full">
                      <div className="flex items-center gap-2">
                        <input 
                          type="file" 
                          ref={settingsWechatQrInputRef} 
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              if (ev.target?.result) {
                                setSiteSettings({ ...siteSettings, wechatQrUrl: ev.target.result as string });
                              }
                            };
                            reader.readAsDataURL(file);
                          }} 
                          accept="image/*" 
                          className="hidden" 
                        />
                        <button
                          type="button"
                          onClick={() => settingsWechatQrInputRef.current?.click()}
                          className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold border border-emerald-500/40 text-xs flex items-center gap-1.5 cursor-pointer"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>{lang === 'ar' ? 'رفع صورة الوي شات' : 'Upload WeChat QR'}</span>
                        </button>

                        {siteSettings.wechatQrUrl && (
                          <button
                            type="button"
                            onClick={() => setSiteSettings({ ...siteSettings, wechatQrUrl: '' })}
                            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-red-950 text-slate-300 hover:text-red-300 border border-slate-700 text-xs flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-400" />
                            <span>{lang === 'ar' ? 'حذف' : 'Clear'}</span>
                          </button>
                        )}
                      </div>

                      <input
                        type="text"
                        value={siteSettings.wechatQrUrl || ''}
                        onChange={(e) => setSiteSettings({ ...siteSettings, wechatQrUrl: e.target.value })}
                        placeholder={lang === 'ar' ? 'أو ألصق رابط صورة الوي شات هنا...' : 'Or paste WeChat QR Image URL...'}
                        className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-[11px] focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="pt-1">
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      {lang === 'ar' ? 'معرف حساب الوي شات (WeChat ID)' : 'WeChat ID'}
                    </label>
                    <input
                      type="text"
                      value={siteSettings.wechat || ''}
                      onChange={(e) => setSiteSettings({ ...siteSettings, wechat: e.target.value })}
                      placeholder="southasia216"
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Email Input */}
                <div className="space-y-1 p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                  <label className="block text-xs font-bold text-slate-200">
                    {lang === 'ar' ? 'البريد الإلكتروني للدعم والتواصل' : 'Business Support Email'}
                  </label>
                  <input
                    type="email"
                    value={siteSettings.email || ''}
                    onChange={(e) => setSiteSettings({ ...siteSettings, email: e.target.value })}
                    placeholder="southasia216@gmail.com"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-blue-500"
                    dir="ltr"
                  />
                </div>

                {/* Delete Passcode */}
                <div className="space-y-1 p-3.5 rounded-xl bg-slate-950 border border-red-900/40">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-red-300">
                      {lang === 'ar' ? 'كلمة سر الحماية لحذف جميع المنتجات (PIN)' : 'Security Passcode for Deleting Products'}
                    </label>
                    <span className="text-[10px] text-amber-400 font-mono font-bold">150 150</span>
                  </div>
                  <input
                    type="text"
                    value={siteSettings.deletePasscode || '150150'}
                    onChange={(e) => setSiteSettings({ ...siteSettings, deletePasscode: e.target.value })}
                    placeholder="150150"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-red-800/60 text-white font-mono font-bold text-xs focus:outline-none focus:border-red-400"
                  />
                  <p className="text-[10px] text-slate-400">
                    {lang === 'ar' ? 'كلمة السر المطلوبة لتأكيد حذف المنتجات وحماية المتجر من الحذف غير المصرح به.' : 'Security passcode required to confirm product deletion.'}
                  </p>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="px-7 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>{lang === 'ar' ? 'حفظ وتثبيت الإعدادات بشكل دائم' : 'Save & Lock Permanently'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* DANGER ZONE: DELETE ALL UPLOADED PRODUCTS */}
          <div className="bg-red-950/20 border border-red-900/60 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-red-300">
                  {lang === 'ar' ? 'منطقة الخطر - تفريغ المتجر وحذف جميع المنتجات المرفوعة' : 'Danger Zone - Delete All Uploaded Products'}
                </h4>
                <p className="text-[11px] text-slate-400">
                  {lang === 'ar' 
                    ? `يتوفر حالياً (${gifts.length}) هدية ومنتج في المتجر وقاعدة البيانات.` 
                    : `Currently (${gifts.length}) products in database.`}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-red-200/80 max-w-lg">
                {lang === 'ar'
                  ? 'سيؤدي هذا الخيار إلى حذف جميع المنتجات المرفوعة نهائياً وتفريغ المتجر بالكامل بنقرة واحدة مع تأكيد الأمان.'
                  : 'Permanently remove all gifts and wipe the store showcase completely.'}
              </p>

              <button
                type="button"
                disabled={gifts.length === 0}
                onClick={() => setIsDeleteAllModalOpen(true)}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-700 to-rose-700 hover:from-red-600 hover:to-rose-600 text-white font-black text-xs shadow-lg shadow-red-700/30 flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition-all shrink-0"
              >
                <Trash2 className="w-4 h-4" />
                <span>
                  {lang === 'ar'
                    ? `حذف جميع المنتجات المرفوعة (${gifts.length})`
                    : `Delete All Products (${gifts.length})`}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 8: GIFT MEDIA OPTIMIZER & ASSET LIBRARY */}
      {activeTab === 'optimizer' && (
        <GiftMediaOptimizer
          lang={lang}
          onOpenCreateGiftWithAsset={handleCreateGiftFromAsset}
          existingGifts={gifts}
          categories={categories}
          onBatchGiftsCreated={(createdGifts) => {
            setGifts(prev => [...createdGifts, ...prev]);
            setSuccessMessage(
              lang === 'ar'
                ? `تم نشر (${createdGifts.length}) هدية جديدة بنجاح في المتجر!`
                : `Successfully published ${createdGifts.length} new gifts to the store!`
            );
            setTimeout(() => setSuccessMessage(null), 4000);
          }}
        />
      )}

      {/* Delete All Uploaded Products Modal */}
      <DeleteAllGiftsModal
        isOpen={isDeleteAllModalOpen}
        onClose={() => setIsDeleteAllModalOpen(false)}
        lang={lang}
        giftsCount={gifts.length}
        siteSettings={siteSettings}
        onGiftsDeleted={(deletedCount) => {
          setGifts([]);
          setSuccessMessage(
            lang === 'ar'
              ? `✓ تم حذف جميع المنتجات المرفوعة بنجاح (${deletedCount} هدية) وإفراغ المتجر بالكامل!`
              : `✓ Successfully deleted all ${deletedCount} uploaded products!`
          );
          setTimeout(() => setSuccessMessage(null), 5000);
        }}
      />

      {/* Site Identity & Phone Numbers Settings Modal */}
      <SiteSettingsModal
        isOpen={isSiteSettingsModalOpen}
        onClose={() => setIsSiteSettingsModalOpen(false)}
        lang={lang}
        siteSettings={siteSettings}
        onSettingsSaved={(newSettings) => {
          setSiteSettings(newSettings);
          setSuccessMessage(
            lang === 'ar'
              ? '✓ تم حفظ وتثبيت لوجو واسم الموقع وأرقام التواصل بشكل دائم بنجاح!'
              : '✓ Site identity and phone numbers updated successfully!'
          );
          setTimeout(() => setSuccessMessage(null), 4000);
        }}
      />

      {/* Image Shape, Circular Crop & Edge Feather Editor Modal */}
      <ImageShapeEditorModal
        isOpen={isShapeEditorOpen}
        onClose={() => setIsShapeEditorOpen(false)}
        imageUrl={shapeEditorImage}
        lang={lang}
        onApply={(processedDataUrl) => {
          setPosterUrl(processedDataUrl);
          setUsePosterImage(true);
          setSuccessMessage(
            lang === 'ar'
              ? '✓ تم تطبيق وقص الصورة بالشكل المطلوب (دائري / حواف ناعمة) وتعيينها كغلاف بنجاح!'
              : '✓ Image cropped, shaped and applied successfully!'
          );
          setTimeout(() => setSuccessMessage(null), 5000);
        }}
      />
    </div>
  );
};
