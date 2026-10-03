import { EmployeeUser } from '../types';

export const INITIAL_EMPLOYEES: EmployeeUser[] = [
  {
    id: 'EMP-ADMIN-MAIN',
    name: 'المدير العام (Super Admin)',
    email: 'sdsdfdfddsfdd@gmail.com',
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
    bio: 'المدير التنفيذي الرسمي للمنصة والمسؤول عن كافة الإعدادات والبنرات وفريق العمل',
    giftsCount: 16,
    totalSales: 154,
    isProfileCompleted: true
  },
  {
    id: 'EMP-001',
    name: 'سارة المهندس (Sarah VFX)',
    email: 'sarah.vfx@streamgifts.com',
    password: '123456',
    whatsapp: '+966551234567',
    role: 'designer',
    status: 'active',
    permissions: {
      giftUploadAndPublish: true,
      manageAccounts: false,
      manageBanners: false,
      viewOrders: false
    },
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=160&auto=format&fit=crop&q=80',
    joinedDate: '2026-08-15',
    bio: 'مصممة مؤثرات بصرية متخصصة في هدايا البث المباشر بتقنية SVGA و VAP',
    giftsCount: 8,
    totalSales: 34,
    isProfileCompleted: true
  },
  {
    id: 'EMP-002',
    name: 'كريم ديزاين (Karim Live FX)',
    email: 'karim.fx@streamgifts.com',
    password: '123456',
    whatsapp: '+201012345678',
    role: 'designer',
    status: 'active',
    permissions: {
      giftUploadAndPublish: true,
      manageAccounts: false,
      manageBanners: false,
      viewOrders: false
    },
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=160&auto=format&fit=crop&q=80',
    joinedDate: '2026-08-20',
    bio: 'خبير تصميم مؤثرات ثلاثية الأبعاد 3D و PAG لتيك توك وبيجو لايف',
    giftsCount: 5,
    totalSales: 21,
    isProfileCompleted: true
  },
  {
    id: 'EMP-003',
    name: 'إدارة المنصة (Super Admin)',
    email: 'admin@streamgifts.com',
    password: 'admin123',
    whatsapp: '+966509998877',
    role: 'admin',
    status: 'active',
    permissions: {
      giftUploadAndPublish: true,
      manageAccounts: true,
      manageBanners: true,
      viewOrders: true
    },
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=160&auto=format&fit=crop&q=80',
    joinedDate: '2026-08-01',
    bio: 'المشرف العام وإدارة المحتوى والاعتمادات والمبيعات',
    giftsCount: 14,
    totalSales: 89,
    isProfileCompleted: true
  },
  {
    id: 'EMP-004',
    name: 'أحمد المتدرب (Ahmed Motion)',
    email: 'ahmed.motion@streamgifts.com',
    password: '123456',
    whatsapp: '+966540001122',
    role: 'employee',
    status: 'active',
    permissions: {
      giftUploadAndPublish: false, // صلاحية الرفع ملغاة افتراضياً للتجربة والتفعيل
      manageAccounts: false,
      manageBanners: false,
      viewOrders: false
    },
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=160&auto=format&fit=crop&q=80',
    joinedDate: '2026-09-10',
    bio: 'موظف تحت التدريب - بانتظار تفعيل صلاحية رفع ونشر الهدايا من الإدارة',
    giftsCount: 0,
    totalSales: 0,
    isProfileCompleted: true
  }
];
