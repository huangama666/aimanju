import type { MembershipConfig, MembershipLevel, MembershipPackage } from '@/types/database';
import { getAllMembershipPackages } from '@/db/api';

// 默认会员等级配置（作为后备）
export const DEFAULT_MEMBERSHIP_CONFIGS: Record<MembershipLevel, MembershipConfig> = {
  free: {
    level: 'free',
    name: '免费会员',
    monthlyCredits: 100,
    color: '#9CA3AF',
    price: 0,
    originalPrice: 0,
    benefits: [
      '每月100码分',
      '基础小说创作',
      '基础角色生成',
      '社区广场免费访问'
    ]
  },
  basic: {
    level: 'basic',
    name: '初级会员',
    monthlyCredits: 500,
    color: '#3B82F6',
    price: 4.9,
    originalPrice: 24.9,
    benefits: [
      '每月500码分',
      '高级小说创作',
      '高级角色生成',
      '分镜创作功能',
      '剧本创作功能',
      '优先客服支持'
    ]
  },
  intermediate: {
    level: 'intermediate',
    name: '中级会员',
    monthlyCredits: 1000,
    color: '#8B5CF6',
    price: 19.9,
    originalPrice: 59.9,
    benefits: [
      '每月1000码分',
      '所有基础功能',
      '批量生成功能',
      '高清图片导出',
      '专属客服支持',
      '会员专属模板'
    ]
  },
  premium: {
    level: 'premium',
    name: '高级会员',
    monthlyCredits: 2000,
    color: '#F59E0B',
    price: 99.9,
    originalPrice: 199.9,
    benefits: [
      '每月2000码分',
      '所有功能无限制',
      'AI优先处理',
      '超高清图片导出',
      '1对1专属客服',
      '会员专属模板',
      '优先体验新功能',
      '专属会员标识'
    ]
  }
};

// 会员配置缓存
let membershipConfigsCache: Record<MembershipLevel, MembershipConfig> | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5分钟缓存

// 将数据库格式转换为配置格式
function convertPackageToConfig(pkg: MembershipPackage): MembershipConfig {
  return {
    level: pkg.level,
    name: pkg.name,
    monthlyCredits: pkg.monthly_credits,
    color: pkg.color,
    price: pkg.price,
    originalPrice: pkg.original_price,
    benefits: pkg.benefits
  };
}

// 从数据库加载会员配置
export async function loadMembershipConfigs(): Promise<Record<MembershipLevel, MembershipConfig>> {
  const now = Date.now();
  
  // 如果缓存有效，直接返回
  if (membershipConfigsCache && (now - cacheTimestamp) < CACHE_DURATION) {
    return membershipConfigsCache;
  }

  try {
    const packages = await getAllMembershipPackages();
    
    if (packages.length === 0) {
      // 如果数据库中没有数据，使用默认配置
      membershipConfigsCache = DEFAULT_MEMBERSHIP_CONFIGS;
    } else {
      // 将数据库数据转换为配置格式
      const configs: Record<string, MembershipConfig> = {};
      packages.forEach(pkg => {
        configs[pkg.level] = convertPackageToConfig(pkg);
      });
      membershipConfigsCache = configs as Record<MembershipLevel, MembershipConfig>;
    }
    
    cacheTimestamp = now;
    return membershipConfigsCache;
  } catch (error) {
    console.error('加载会员配置失败，使用默认配置:', error);
    return DEFAULT_MEMBERSHIP_CONFIGS;
  }
}

// 清除缓存
export function clearMembershipConfigCache() {
  membershipConfigsCache = null;
  cacheTimestamp = 0;
}

// 同步获取会员配置（使用缓存或默认值）
export const MEMBERSHIP_CONFIGS = DEFAULT_MEMBERSHIP_CONFIGS;

// 导出别名以兼容旧代码
export const membershipConfig = MEMBERSHIP_CONFIGS;

// 获取会员配置（异步，从数据库加载）
export async function getMembershipConfig(level: MembershipLevel): Promise<MembershipConfig> {
  const configs = await loadMembershipConfigs();
  return configs[level] || DEFAULT_MEMBERSHIP_CONFIGS[level];
}

// 获取会员颜色
export function getMembershipColor(level: MembershipLevel): string {
  return MEMBERSHIP_CONFIGS[level].color;
}

// 获取会员名称
export function getMembershipName(level: MembershipLevel): string {
  return MEMBERSHIP_CONFIGS[level].name;
}

// 获取每月码分
export function getMonthlyCredits(level: MembershipLevel): number {
  return MEMBERSHIP_CONFIGS[level].monthlyCredits;
}

// 功能键常量
export const FEATURE_KEYS = {
  NOVEL_CREATION: 'novel_creation',
  CHARACTER_CREATION: 'character_creation',
  PANEL_CREATION: 'panel_creation',
  SCRIPT_CREATION: 'script_creation',
  SCRIPT_IMAGE_GENERATION: 'script_image_generation',
  NOVEL_RECREATION: 'novel_recreation'
} as const;

// 码分与现金的兑换比例
export const CREDITS_TO_CASH_RATIO = 100; // 100码分 = 1元
