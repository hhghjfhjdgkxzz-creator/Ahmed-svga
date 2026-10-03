export type Language = 'zh' | 'ar' | 'en';

export interface GiftFormat {
  name: string; // e.g., 'MP4带声音', 'SVGA动效', 'VAP透明通道', 'PAG', 'JSON', 'GIF', 'WEBP', 'MOV'
  size: string; // e.g., '5.08MB', '10.2MB'
  url?: string;
  notes?: string;
}

export interface GiftItem {
  id: string; // e.g. 'NO.243751'
  title: string;
  titleAr?: string;
  titleEn?: string;
  price: number; // in CNY
  vipPrice: number; // in CNY
  exclusivePrice: number; // 全网排他
  videoUrl: string; // Direct external video link (0 server bandwidth)
  posterUrl?: string; // Thumbnail / poster image (optional - if omitted, video acts as main showcase face)
  previewStartTime?: number; // Second offset in video to start preview / capture cover from (e.g., 1.5s, 3s)
  formats: GiftFormat[];
  tags: string[]; // e.g. ['AI原创', '浪漫', '礼物', '2D', '热销']
  category: string; // 'general' (القسم العام) or custom category created by admin
  theme: string;
  effectType: '2D' | '3D';
  author: {
    id?: string;
    name: string;
    avatar: string;
    whatsapp?: string; // Direct WhatsApp contact for clients and buyers
    verified?: boolean;
    sales?: number;
  };
  duration: number; // in seconds, e.g. 14
  resolution: string; // e.g. '1080x1920'
  fps?: number;
  deliveryUrl?: string; // Instant delivery link after purchase
  cloudDiskCode?: string; // 网盘提取码
  licenseCode?: string;
  externalVideoUrl?: string; // Direct Top4toP or external CDN streaming link
  downloadUrl?: string; // Direct download link
  externalVideoId?: string; // ID referencing ExternalVideo record
  uploadProvider?: 'top4top' | 'local' | 'cloud';
  downloadsCount?: number;
  favoritesCount?: number;
  isNew?: boolean;
  isFeatured?: boolean;
  isVip?: boolean;
  createdAt: string;
}

export interface CartItem {
  gift: GiftItem;
  format: string;
  licenseType: 'standard' | 'exclusive';
  price: number;
}

export interface DeliveryItem {
  id: string;
  orderId: string;
  giftId: string;
  giftTitle: string;
  posterUrl: string;
  videoUrl: string;
  format: string;
  licenseType: 'standard' | 'exclusive';
  licenseKey: string;
  downloadUrl: string;
  fileSize: string;
  cloudDiskCode?: string;
  purchaseDate: string;
  price: number;
  buyerName?: string;
  buyerContact?: string;
  paymentMethod?: 'wechat' | 'alipay' | 'card' | 'bank' | 'cash';
  notes?: string;
  status?: 'completed' | 'processing' | 'shipped';
}

export interface OrderRecord {
  orderId: string;
  date: string;
  buyerName: string;
  buyerEmail: string;
  items: DeliveryItem[];
  totalPrice: number;
  paymentMethod: 'wechat' | 'alipay' | 'card' | 'balance';
  status: 'completed';
}

export type AccountStatus = 'active' | 'inactive';

export interface UserPermissions {
  giftUploadAndPublish: boolean; // Gift Upload & Publishing Permission (صلاحية رفع ونشر الهدايا)
  manageAccounts?: boolean;       // إدارة وتفعيل الحسابات
  manageBanners?: boolean;        // إدارة البنرات الإعلانية
  viewOrders?: boolean;           // عرض سجل الطلبات والمبيعات
  manageSettings?: boolean;       // إدارة إعدادات الموقع والأقسام
}

export type UserRole = 'buyer' | 'designer' | 'employee' | 'admin';

export interface EmployeeUser {
  id: string;
  name: string;
  email: string;
  password?: string; // Login password assigned by admin
  whatsapp: string; // e.g. +966501234567
  role: UserRole;
  status: AccountStatus; // Active / Inactive (مفعل / غير مفعل)
  permissions: UserPermissions; // Fine-grained permissions
  avatar: string;
  joinedDate: string;
  bio?: string;
  giftsCount?: number;
  totalSales?: number;
  isProfileCompleted: boolean;
  lastLogin?: string;
}

export interface HeroBannerItem {
  id: string;
  badge?: string;
  title?: string;
  subtitle?: string;
  imageUrl?: string;
  bgGradient?: string;
  btnText?: string;
  btnLink?: string; // Target URL or link (e.g. https://... or internal category/action)
  dimensionsNote?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CustomCategory {
  id: string;
  name: string; // e.g. "القسم العام", "سيارات فارهة", "شخصيات ثلاثية الأبعاد"
  nameAr?: string;
  isDefault?: boolean;
  createdAt?: string;
}

export interface SiteSettings {
  siteName: string;
  siteSlogan?: string;
  siteSubTitle?: string;
  logoUrl?: string; // Custom uploaded site logo (base64 data URL or external URL)
  primaryPhone?: string; // Primary phone / WhatsApp number displayed on top
  primaryPhoneLabel?: string; // Label e.g. "WhatsApp", "Customer Service"
  secondaryPhone?: string; // Additional secondary phone / WhatsApp number
  secondaryPhoneLabel?: string; // Label e.g. "WhatsApp 2", "Technical Support"
  whatsapp?: string; // Legacy/fallback alias for primaryPhone
  secondaryWhatsapp?: string; // Legacy/fallback alias for secondaryPhone
  phone?: string;
  email?: string;
  wechat?: string;
  wechatQrUrl?: string; // Custom uploaded WeChat QR code / Barcode image
  deletePasscode?: string; // Security passcode to confirm deleting all products (e.g. 150150)
  giftsPerPage?: number; // Number of gifts per page in storefront (configurable from Dashboard)
  updatedAt?: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: AccountStatus; // Active / Inactive
  permissions: UserPermissions;
  avatar: string;
  whatsapp?: string;
  isTrial?: boolean; // Trial / Demo account
  employeeId?: string; // If logged in as staff
  lastLogin?: string;
}

export interface SavedGiftName {
  id: string;
  title: string;       // Primary title (Chinese / English / Custom)
  titleAr?: string;     // Arabic title
  createdAt?: string;
}

export type AssetMediaType = 'svga' | 'svga2' | 'mp4' | 'webp' | 'png' | 'jpeg' | 'gif' | 'audio' | 'shared';

export interface SvgaStructureInfo {
  version: '1.0' | '2.0';
  fps: number;
  frames: number;
  duration: number; // in seconds
  width: number;
  height: number;
  layersCount: number;
  spritesCount: number;
  uniqueSpritesCount: number;
  audioTracksCount: number;
  hasMasks: boolean;
  hasTransforms: boolean;
  hasAlpha: boolean;
  layersList?: { id: string; name: string; type: string; opacity: number }[];
}

export interface MediaAssetItem {
  id: string;
  name: string;
  hash: string; // SHA-256
  type: AssetMediaType;
  mimeType: string;
  originalSize: number; // bytes
  optimizedSize: number; // bytes
  savedBytes: number;
  savingsPercent: number;
  resolution?: string; // '1080x1920'
  duration?: number;
  fps?: number;
  svgaInfo?: SvgaStructureInfo;
  dataUrl: string; // Base64 or Blob storage URL
  posterUrl?: string; // Cover thumbnail
  storagePath?: string;
  category?: string; // e.g. 'frames', 'gifts', 'cars', 'badges', 'general'
  usageCount: number;
  usedInGiftIds: string[];
  keepOriginalBackup: boolean;
  createdAt: string;
  lastUsed: string;
}

export interface OptimizationOptions {
  keepOriginalBackup: boolean;
  compressionMode: 'lossless' | 'balanced' | 'max';
  deduplicateSprites: boolean;
  removeUnusedData: boolean;
  targetResolution?: 'original' | '1080p' | '720p' | '540p';
  preserveTransparency: boolean;
}

export interface OptimizationTask {
  id: string;
  file: File;
  name: string;
  originalSize: number;
  type: string;
  progress: number; // 0 - 100
  speedMBs: number;
  status: 'pending' | 'uploading' | 'analyzing' | 'optimizing' | 'validating' | 'completed' | 'error' | 'deduplicated';
  statusText: string;
  resultAsset?: MediaAssetItem;
  error?: string;
  isDeduplicated?: boolean;
  startedAt: number;
}

export type UploadStatus = 'PENDING' | 'UPLOADING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface ExternalVideoRecord {
  id: string;
  operationId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  externalVideoUrl: string;
  downloadUrl: string;
  uploadStatus: UploadStatus;
  uploadedAt: string;
  lastAttemptAt?: string;
  errorMessage?: string;
  sha256Hash: string;
  provider: 'top4top' | 'local' | 'cloud';
  giftId?: string;
  giftTitle?: string;
  verified: boolean;
  duration?: number;
  resolution?: string;
  posterUrl?: string;
  retryCount?: number;
}

export type CacheCategory = 'all' | 'svga' | 'vap' | 'pag' | 'json' | 'video' | 'image' | 'models' | 'animations' | 'textures' | 'audio' | 'vfx' | 'other' | string;

export interface CacheFileRecord {
  id: string;
  name: string;
  fileName?: string;
  size: number;
  type: string;
  hash: string;
  url: string;
  category: CacheCategory;
  userId?: string;
  userName?: string;
  userEmail?: string;
  sourceFeature?: string;
  dimensions?: any;
  duration?: number;
  storagePath?: string;
  downloadCount?: number;
  accessCount?: number;
  createdAt: string | any;
  lastAccessedAt?: string | any;
  tags?: string[];
  metadata?: Record<string, any>;
  [key: string]: any;
}

export interface CacheActivityLog {
  id: string;
  userId?: string;
  userName?: string;
  userEmail?: string;
  action: string;
  details?: string;
  fileId?: string;
  fileName?: string;
  timestamp: string | any;
  [key: string]: any;
}

export interface ActivityLog {
  id: string;
  userId?: string;
  userName?: string;
  userEmail?: string;
  action: string;
  details?: string;
  fileId?: string;
  fileName?: string;
  timestamp: string | any;
  [key: string]: any;
}

export interface UserRecord {
  id: string;
  uid?: string;
  name?: string;
  displayName?: string;
  email?: string;
  role?: string;
  isAdmin?: boolean;
  isSuperAdmin?: boolean;
  isApproved?: boolean;
  status?: string;
  numericId?: number | string;
  avatar?: string;
  telegramChatId?: string;
  phoneNumber?: string;
  whatsapp?: string;
  isOnline?: boolean;
  lastActive?: string;
  password?: string;
  plainPassword?: string;
  oldPassword?: string;
  subscriptionExpiry?: any;
  freeAttempts?: number;
  hasCacheAccess?: boolean;
  [key: string]: any;
}

export interface CacheStats {
  totalFiles: number;
  totalSizeBytes: number;
  categories?: Record<string, number>;
  categoryCounts?: Record<string, number>;
  activeCacheUsersCount?: number;
  [key: string]: any;
}

export interface CachePermissions {
  canUpload?: boolean;
  canDelete?: boolean;
  canDownload?: boolean;
  canViewLogs?: boolean;
  view?: boolean;
  [key: string]: any;
}

export interface StoreProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl: string;
  videoUrl?: string;
  supportedFormats?: string[];
  createdAt?: any;
  updatedAt?: any;
  [key: string]: any;
}

export interface AppSettings {
  siteName?: string;
  siteSlogan?: string;
  primaryPhone?: string;
  whatsapp?: string;
  externalLinks?: DashboardExternalLinks;
  [key: string]: any;
}

export interface CustomExternalLink {
  id?: string;
  name: string;
  url: string;
  icon?: string;
  category?: string;
  description?: string;
  enabled?: boolean;
  [key: string]: any;
}

export interface DashboardExternalLinks {
  firstLink?: CustomExternalLink;
  secondLink?: CustomExternalLink;
  links?: CustomExternalLink[];
  [key: string]: any;
}

export interface PresetBackground {
  id: string;
  name: string;
  url?: string;
  color?: string;
  type?: string;
  [key: string]: any;
}

export interface SVGAFileInfo {
  name: string;
  size: number;
  data: ArrayBuffer;
  version?: string;
  fps?: number;
  frames?: number;
  videoSize?: { width: number; height: number };
  [key: string]: any;
}

export const PlayerStatus = {
  IDLE: 'idle',
  LOADING: 'loading',
  PLAYING: 'playing',
  PAUSED: 'paused',
  STOPPED: 'stopped',
  ERROR: 'error'
} as const;

export type PlayerStatus = typeof PlayerStatus[keyof typeof PlayerStatus];

export type SubscriptionType = 'none' | 'day' | 'week' | 'month' | '3months' | 'year' | 'lifetime' | string;

export const PRODUCT_CATEGORIES = ['All', 'Intros', 'Alerts', 'Overlays', 'Emotes', 'Badges', 'Audio', 'Transitions'] as const;

export interface LicenseKey {
  id?: string;
  key: string;
  plan?: string;
  type?: string;
  status?: string;
  expiryDate?: any;
  activatedAt?: any;
  [key: string]: any;
}

export interface FileMetadata {
  name: string;
  size: number;
  type: string;
  width?: number;
  height?: number;
  duration?: number;
  fps?: number;
  frames?: number;
  [key: string]: any;
}

export interface MaterialAsset {
  id: string;
  name: string;
  url: string;
  type?: string;
  [key: string]: any;
}

export interface AccountVersionHistory {
  id: string;
  userId: string;
  action: string;
  timestamp: string;
  details?: string;
  [key: string]: any;
}


