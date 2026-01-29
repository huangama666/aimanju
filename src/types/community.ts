// 社区功能类型定义

// 小说分享
export interface NovelShare {
  id: string;
  novel_id: string;
  user_id: string;
  share_description: string | null;
  is_featured: boolean;
  views_count: number;
  likes_count: number;
  created_at: string;
  updated_at: string;
  novel?: {
    novel_title: string;
    novel_content: string;
    novel_thumb: string | null;
    novel_type?: string | null;
    price?: number;
  };
  user?: {
    nickname: string;
    avatar_url: string | null;
  };
  is_liked?: boolean;
}

// 创建小说分享输入
export interface CreateNovelShareInput {
  novel_id: string;
  share_description?: string;
}

// 评论类型
export interface Comment {
  id: string;
  novel_id: string;
  chapter_number: number;
  paragraph_index: number | null;
  user_id: string;
  content: string;
  is_spoiler: boolean;
  parent_id: string | null;
  likes_count: number;
  created_at: string;
  updated_at: string;
  user?: {
    nickname: string;
    avatar_url: string | null;
  };
  replies?: Comment[];
  is_liked?: boolean;
}

// 帖子类型
export type PostType = 'normal' | 'poll' | 'question';

export interface Post {
  id: string;
  novel_id: string | null;
  user_id: string;
  title: string;
  content: string;
  post_type: PostType;
  category: string | null;
  is_pinned: boolean;
  is_featured: boolean;
  likes_count: number;
  comments_count: number;
  views_count: number;
  poll_options: PollOption[] | null;
  created_at: string;
  updated_at: string;
  user?: {
    nickname: string;
    avatar_url: string | null;
  };
  novel?: {
    novel_title: string;
    novel_thumb: string | null;
  };
  is_liked?: boolean;
  is_author?: boolean;
}

// 投票选项
export interface PollOption {
  id: string;
  text: string;
  votes: number;
}

// 帖子评论类型
export interface PostComment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  parent_id: string | null;
  likes_count: number;
  created_at: string;
  updated_at: string;
  user?: {
    nickname: string;
    avatar_url: string | null;
  };
  replies?: PostComment[];
  is_liked?: boolean;
}

// 角色粉丝关系
export interface CharacterFan {
  id: string;
  novel_id: string;
  character_id: string;
  user_id: string;
  created_at: string;
}

// 用户关注关系
export interface UserFollow {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
}

// 点赞记录
export type LikeTargetType = 'comment' | 'post' | 'post_comment' | 'novel_share';

export interface Like {
  id: string;
  user_id: string;
  target_type: LikeTargetType;
  target_id: string;
  created_at: string;
}

// 勋章
export interface Badge {
  id: string;
  name: string;
  description: string;
  icon_url: string | null;
  condition_type: string;
  condition_value: number;
  created_at: string;
}

// 用户勋章
export interface UserBadge {
  id: string;
  user_id: string;
  badge_id: string;
  earned_at: string;
  badge?: Badge;
}

// 用户统计
export interface UserStats {
  user_id: string;
  points: number;
  level: number;
  posts_count: number;
  comments_count: number;
  likes_received: number;
  followers_count: number;
  following_count: number;
  created_at: string;
  updated_at: string;
}

// 创建评论输入
export interface CreateCommentInput {
  novel_id: string;
  chapter_number: number;
  paragraph_index?: number;
  content: string;
  is_spoiler?: boolean;
  parent_id?: string;
}

// 创建帖子输入
export interface CreatePostInput {
  novel_id?: string;
  title: string;
  content: string;
  post_type?: PostType;
  category?: string;
  poll_options?: PollOption[];
}

// 创建帖子评论输入
export interface CreatePostCommentInput {
  post_id: string;
  content: string;
  parent_id?: string;
}

// 角色卡片（扩展自数据库中的角色数据）
export interface CharacterCard {
  id: string;
  name: string;
  description: string;
  image_url?: string;
  traits?: string[];
  fans_count: number;
  is_fan?: boolean;
}

// 公告类型
export type AnnouncementType = 'system' | 'activity' | 'rule';

// 公告
export interface Announcement {
  id: string;
  title: string;
  content: string;
  type: AnnouncementType;
  is_pinned: boolean;
  is_active: boolean;
  start_date: string;
  end_date: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  creator?: {
    nickname: string;
    avatar_url: string | null;
  };
}

// 创建公告输入
export interface CreateAnnouncementInput {
  title: string;
  content: string;
  type?: AnnouncementType;
  is_pinned?: boolean;
  is_active?: boolean;
  start_date?: string;
  end_date?: string | null;
}

// 更新公告输入
export interface UpdateAnnouncementInput {
  title?: string;
  content?: string;
  type?: AnnouncementType;
  is_pinned?: boolean;
  is_active?: boolean;
  start_date?: string;
  end_date?: string | null;
}

// 用户信息（包含管理员标识）
export interface UserWithAdmin {
  id: string;
  phone: string | null;
  nickname: string;
  avatar_url: string | null;
  is_admin: boolean;
  registration_order: number | null;
  score: number;
  credits: number;
  membership_level: string;
  created_at: string;
  updated_at: string;
}

// 管理员统计数据
export interface AdminStats {
  total_users: number;
  total_posts: number;
  total_novels: number;
  total_announcements: number;
  active_users_today: number;
}
