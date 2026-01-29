// 数据库类型定义

// 会员等级类型
export type MembershipLevel = 'free' | 'basic' | 'intermediate' | 'premium';

// 交易类型
export type TransactionType = 'grant' | 'consume' | 'upgrade' | 'refund' | 'recharge';

// 用户表类型
export interface DbUser {
  id: string;
  phone: string | null;
  nickname: string;
  avatar_url: string | null;
  score: number; // 已废弃：请使用 credits 字段。此字段保留仅为向后兼容。
  consecutive_checkin_days: number; // 连续签到天数
  last_checkin_date: string | null; // 最后签到日期
  membership_level: MembershipLevel; // 会员等级
  credits: number; // 用户码分余额：包含所有获得的码分（签到、分享、发帖等）和消费的码分（AI功能）
  last_credit_grant_date: string; // 上次发放码分的日期
  pending_membership_level: MembershipLevel | null; // 待生效的会员等级（次月生效）
  pending_membership_effective_date: string | null; // 待生效会员等级的生效日期
  is_admin: boolean; // 是否是管理员
  created_at: string;
  updated_at: string;
}

// 章节数据类型
export interface ChapterData {
  chapter_number: number;
  title: string;
  content: string; // 优化后的章节详细内容
  optimized: boolean; // 标记是否已优化
  audio_url?: string; // 章节音频URL
  audio_task_id?: string; // 音频生成任务ID
  audio_status?: 'pending' | 'generating' | 'completed' | 'failed'; // 音频生成状态
}

// 章节简介类型
export interface SimpleContext {
  chapter_number: number;
  title: string;
  summary: string; // 章节简介
}

// 角色数据类型
export interface CharacterData {
  id: string;
  name: string;
  description: string;
  image_url?: string;
  traits?: string[];
}

// 分镜数据类型
export interface PanelData {
  id: string;
  chapter_number: number;
  panel_number: number;
  image_url: string;
  description: string;
}

// 小说表类型
export interface DbNovel {
  id: string;
  user_id: string;
  novel_title: string;
  novel_content: string | null;
  novel_thumb: string | null;
  novel_type: string | null; // 小说类型（如玄幻、都市、历史、言情、科幻等）
  price: number; // 小说收费码分（0表示免费）
  chapters_data: ChapterData[];
  simple_context: SimpleContext[]; // 章节简介
  characters_data: CharacterData[];
  panels_data: PanelData[];
  scripts_data: ScriptData[]; // 剧本数据
  costume_data: CostumeItem[] | null; // 服装分析数据
  makeup_data: MakeupItem[] | null; // 化妆分析数据
  props_data: PropItem[] | null; // 道具分析数据
  scene_data: SceneItem[] | null; // 布景分析数据
  styling_logic_data: StylingLogicItem[] | null; // 造型逻辑分析数据
  overall_analysis_data: OverallAnalysisItem[] | null; // 综合分析数据
  parallel_source_id: string | null; // 平行世界源小说ID
  parallel_start_chapter: number | null; // 平行世界起始章节
  created_at: string;
  updated_at: string;
}

// 创建小说输入类型
export interface CreateNovelInput {
  user_id: string;
  novel_title: string;
  novel_content?: string;
  novel_thumb?: string;
  novel_type?: string; // 小说类型
}

// 更新小说输入类型
export interface UpdateNovelInput {
  novel_title?: string;
  novel_content?: string;
  novel_thumb?: string;
  novel_type?: string; // 小说类型
  chapters_data?: ChapterData[];
  simple_context?: SimpleContext[]; // 章节简介
  characters_data?: CharacterData[];
  panels_data?: PanelData[];
  scripts_data?: ScriptData[]; // 剧本数据
  costume_data?: CostumeItem[]; // 服装分析数据
  makeup_data?: MakeupItem[]; // 化妆分析数据
  props_data?: PropItem[]; // 道具分析数据
  scene_data?: SceneItem[]; // 布景分析数据
  styling_logic_data?: StylingLogicItem[]; // 造型逻辑分析数据
  overall_analysis_data?: OverallAnalysisItem[]; // 综合分析数据
  parallel_source_id?: string | null; // 平行世界源小说ID
  parallel_start_chapter?: number | null; // 平行世界起始章节
}

// 剧本数据类型
// 场景分段类型
export interface SceneSegment {
  scene_number: number; // 场景编号
  scene_title: string; // 场景标题（如"内景-客厅-白天"）
  script_content: string; // 该场景的剧本内容
  novel_content: string; // 对应的小说章节片段（50-60字）
  narration_content: string; // 解说内容（20-22字，用于配音）
}

export interface ScriptData {
  chapter_number: number; // 章节号
  chapter_title: string; // 章节标题
  script_content: string; // 完整剧本内容（向后兼容）
  scenes?: SceneSegment[]; // 场景分段数组（新增）
  generated_at: string; // 生成时间
}

// 服装分析项类型
export interface CostumeItem {
  chapter_number: number; // 章节号
  character: string; // 角色名称
  description: string; // 服装描述
  material: string; // 材质
  color: string; // 颜色
  style: string; // 风格
  purpose: string; // 用途说明
  image_urls?: string[]; // 生成的图片URL数组
}

// 化妆分析项类型
export interface MakeupItem {
  chapter_number: number; // 章节号
  character: string; // 角色名称
  description: string; // 化妆描述
  style: string; // 妆容风格
  details: string; // 细节要求
  emotion: string; // 情绪表达
  image_urls?: string[]; // 生成的图片URL数组
}

// 道具分析项类型
export interface PropItem {
  chapter_number: number; // 章节号
  name: string; // 道具名称
  description: string; // 道具描述
  function: string; // 功能说明
  plot_relevance: string; // 与剧情的关联
  image_urls?: string[]; // 生成的图片URL数组
}

// 布景分析项类型
export interface SceneItem {
  chapter_number: number; // 章节号
  location: string; // 场景位置
  layout: string; // 布局描述
  decoration: string; // 装饰风格
  atmosphere: string; // 氛围描述
  lighting: string; // 光源设置
  image_urls?: string[]; // 生成的图片URL数组
}

// 造型逻辑分析项类型
export interface StylingLogicItem {
  chapter_number: number; // 章节号
  aspect: string; // 方面（服装/化妆/道具/布景）
  logic: string; // 逻辑说明
  character_reflection: string; // 角色反映
  plot_connection: string; // 剧情联系
}

// 综合分析项类型
export interface OverallAnalysisItem {
  chapter_number: number; // 章节号
  category: string; // 分类
  suggestion: string; // 建议
  coordination: string; // 协调要求
}

// 签到记录类型
export interface CheckinRecord {
  id: string;
  user_id: string;
  checkin_date: string; // 签到日期（YYYY-MM-DD格式）
  score_earned: number; // 获得的码分
  created_at: string;
}

// 码分变动记录类型
export interface ScoreRecord {
  id: string;
  user_id: string;
  score_change: number; // 码分变动（正数为增加，负数为减少）
  action_type: 'checkin' | 'share_novel' | 'post' | 'delete_post' | 'delete_share'; // 操作类型
  related_id: string | null; // 关联ID（帖子ID或分享ID）
  description: string | null; // 描述
  created_at: string;
}

// 每日发帖记录类型
export interface DailyPostRecord {
  id: string;
  user_id: string;
  post_date: string; // 发帖日期（YYYY-MM-DD格式）
  first_post_id: string | null; // 第一次发帖的帖子ID
  score_earned: boolean; // 是否已获得码分
  created_at: string;
}

// 小说分享记录类型
export interface NovelShareRecord {
  id: string;
  user_id: string;
  novel_id: string; // 小说ID
  share_id: string | null; // 分享记录ID
  score_earned: boolean; // 是否已获得码分
  created_at: string;
}

// 购买记录类型
export interface PurchaseRecord {
  id: string;
  user_id: string;
  novel_id: string; // 小说ID
  price: number; // 购买时的价格
  created_at: string;
}

// 码分兑换现金记录类型
export interface ExchangeRecord {
  id: string;
  user_id: string;
  score_amount: number; // 兑换的码分数量
  cash_amount: number; // 兑换的现金金额
  status: 'completed' | 'pending' | 'cancelled'; // 兑换状态
  created_at: string;
}

// 码分交易记录类型（新会员系统）
export interface CreditTransaction {
  id: string;
  user_id: string;
  amount: number; // 码分变动数量（正数为增加，负数为扣减）
  transaction_type: TransactionType; // 交易类型
  feature_name: string | null; // 功能名称
  description: string | null; // 描述
  balance_after: number; // 交易后余额
  created_at: string;
}

// 功能价格配置类型
export interface FeaturePrice {
  id: string;
  feature_key: string; // 功能标识
  feature_name: string; // 功能名称
  price: number; // 价格（码分）
  description: string | null; // 描述
  is_active: boolean; // 是否启用
  created_at: string;
  updated_at: string;
}

// 会员等级配置
export interface MembershipConfig {
  level: MembershipLevel;
  name: string;
  monthlyCredits: number;
  color: string; // V标颜色
  price: number; // 会员价格
  originalPrice: number; // 原价
  benefits: string[];
}

// 会员套餐数据库表
export interface MembershipPackage {
  id: string;
  level: MembershipLevel;
  name: string;
  monthly_credits: number;
  color: string;
  price: number;
  original_price: number;
  benefits: string[];
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// 扣减码分结果
export interface DeductCreditsResult {
  success: boolean;
  balance?: number;
  deducted?: number;
  error?: string;
}

// 发放码分结果
export interface GrantCreditsResult {
  success: boolean;
  balance?: number;
  granted?: number;
  error?: string;
}

// 升级会员结果
export interface UpgradeMembershipResult {
  success: boolean;
  new_level?: MembershipLevel;
  granted?: number;
  error?: string;
}

// 充值套餐类型
export interface RechargePackage {
  id: string;
  package_name: string; // 套餐名称
  credits_amount: number; // 码分数量
  price: number; // 价格（元）
  bonus_credits: number; // 赠送码分
  is_active: boolean; // 是否启用
  sort_order: number; // 排序
  created_at: string;
  updated_at: string;
}

// 充值结果
export interface RechargeResult {
  success: boolean;
  balance?: number;
  recharged?: number;
  base_credits?: number;
  bonus_credits?: number;
  error?: string;
}

// 升级会员（次月生效）结果
export interface UpgradeMembershipNextMonthResult {
  success: boolean;
  current_level?: MembershipLevel;
  pending_level?: MembershipLevel;
  effective_date?: string;
  error?: string;
}

// 立即升级会员结果
export interface UpgradeMembershipImmediatelyResult {
  success: boolean;
  previous_level?: MembershipLevel;
  new_level?: MembershipLevel;
  granted_credits?: number;
  total_credits?: number;
  effective_date?: string;
  error?: string;
}

// 应用待生效会员等级结果
export interface ApplyPendingMembershipResult {
  success: boolean;
  new_level?: MembershipLevel;
  granted?: number;
  balance?: number;
  error?: string;
}

// 系统设置类型
export interface SystemSetting {
  id: string;
  key: string;
  value: string;
  description: string | null;
  updated_at: string;
  updated_by: string | null;
}

// 系统设置键名
export type SystemSettingKey = 
  | 'novel_generation_cost'
  | 'character_generation_cost'
  | 'comic_generation_cost'
  | 'script_generation_cost'
  | 'filming_analysis_cost'
  | 'parallel_world_cost'
  | 'script_image_generation_cost';

// 限免设置类型
export interface PromotionSettings {
  id: string;
  is_enabled: boolean; // 是否启用限免
  start_time: string | null; // 限免开始时间
  end_time: string | null; // 限免结束时间
  description: string | null; // 限免活动描述
  created_at: string;
  updated_at: string;
}

// ==================== 码上拍戏相关类型 ====================

// 虚拟试穿图片类型
export interface TryOnImage {
  id: string;
  novel_id: string;
  character_name: string;
  costume_description: string | null;
  original_character_image_url: string | null;
  costume_image_url: string | null;
  try_on_image_url: string | null;
  task_id: string | null;
  task_status: 'pending' | 'submitted' | 'processing' | 'succeed' | 'failed';
  retry_count: number;
  created_at: string;
  updated_at: string;
}

// 场景元素类型
export interface SceneElement {
  id: string;
  type: 'character' | 'prop' | 'makeup';
  name: string;
  image_url: string;
  x: number; // X坐标（百分比）
  y: number; // Y坐标（百分比）
  width: number; // 宽度（百分比）
  height: number; // 高度（百分比）
  z_index: number; // 层级
}

// 拍戏场景类型
export interface FilmingScene {
  id: string;
  novel_id: string;
  chapter_number: number;
  scene_name: string;
  scene_elements: unknown;
  prompt: string | null;
  created_at: string;
  updated_at: string;
}

// 拍戏合成图片类型
export interface FilmingCompositeImage {
  id: string;
  scene_id: string;
  image_url: string | null;
  storage_path: string | null;
  prompt: string | null;
  created_at: string;
  updated_at: string;
}

// 拍戏视频类型
export interface FilmingVideo {
  id: string;
  composite_image_id: string;
  video_url: string | null;
  storage_path: string | null;
  duration: string | null;
  created_at: string;
  updated_at: string;
}

// 最终拼接视频类型
export interface FilmingFinalVideo {
  id: string;
  novel_id: string;
  chapter_number: number;
  video_url: string | null;
  storage_path: string | null;
  duration: number | null;
  source_video_ids: string[];
  created_at: string;
  updated_at: string;
}

