// 社区功能API

import { supabase } from './supabase';
import type {
  Comment,
  Post,
  PostComment,
  CharacterFan,
  UserFollow,
  UserStats,
  CreateCommentInput,
  CreatePostInput,
  CreatePostCommentInput,
  LikeTargetType,
  CharacterCard,
  NovelShare,
  CreateNovelShareInput,
} from '@/types/community';

// ==================== 小说分享相关 ====================

/**
 * 获取分享的小说列表
 */
export async function getNovelShares(limit: number = 20): Promise<NovelShare[]> {
  console.log('📚 获取分享的小说列表');

  const { data, error } = await supabase
    .from('novel_shares')
    .select(`
      *,
      novel:novels(novel_title, novel_content, novel_thumb, price, novel_type),
      user:users(nickname, avatar_url)
    `)
    .order('is_featured', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('❌ 获取分享的小说列表失败:', error);
    throw error;
  }

  console.log('✅ 获取分享的小说列表成功:', data?.length);
  return data || [];
}

/**
 * 搜索分享的小说
 * @param keyword 搜索关键词
 * @param sortBy 排序方式：relevance(相关度), time(时间), popularity(热度)
 * @param limit 返回数量限制
 */
export async function searchNovelShares(
  keyword: string,
  sortBy: 'relevance' | 'time' | 'popularity' = 'relevance',
  limit: number = 20
): Promise<NovelShare[]> {
  console.log('🔍 搜索分享的小说:', { keyword, sortBy, limit });

  if (!keyword || keyword.trim() === '') {
    console.log('⚠️ 搜索关键词为空，返回所有小说');
    return getNovelShares(limit);
  }

  const trimmedKeyword = keyword.trim().toLowerCase();

  // 先获取所有小说分享数据
  const { data, error } = await supabase
    .from('novel_shares')
    .select(`
      *,
      novel:novels(novel_title, novel_content, novel_thumb, price, novel_type),
      user:users(nickname, avatar_url)
    `)
    .order('created_at', { ascending: false })
    .limit(200); // 获取更多数据以便过滤

  if (error) {
    console.error('❌ 获取小说分享数据失败:', error);
    throw error;
  }

  if (!data || data.length === 0) {
    console.log('⚠️ 没有小说分享数据');
    return [];
  }

  // 在客户端进行关键词过滤
  let filteredData = data.filter((share) => {
    const novelTitle = share.novel?.novel_title?.toLowerCase() || '';
    const novelContent = share.novel?.novel_content?.toLowerCase() || '';
    const userNickname = share.user?.nickname?.toLowerCase() || '';
    const shareDescription = share.share_description?.toLowerCase() || '';

    return (
      novelTitle.includes(trimmedKeyword) ||
      novelContent.includes(trimmedKeyword) ||
      userNickname.includes(trimmedKeyword) ||
      shareDescription.includes(trimmedKeyword)
    );
  });

  // 根据排序方式进行排序
  switch (sortBy) {
    case 'time':
      filteredData.sort((a, b) => {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      break;
    case 'popularity':
      filteredData.sort((a, b) => {
        const aScore = (a.likes_count || 0) * 2 + (a.views_count || 0);
        const bScore = (b.likes_count || 0) * 2 + (b.views_count || 0);
        return bScore - aScore;
      });
      break;
    case 'relevance':
    default:
      // 相关度排序：精华 > 标题匹配 > 创建时间
      filteredData.sort((a, b) => {
        // 精华优先
        if (a.is_featured && !b.is_featured) return -1;
        if (!a.is_featured && b.is_featured) return 1;

        // 标题完全匹配优先
        const aTitleMatch = a.novel?.novel_title?.toLowerCase().includes(trimmedKeyword);
        const bTitleMatch = b.novel?.novel_title?.toLowerCase().includes(trimmedKeyword);
        if (aTitleMatch && !bTitleMatch) return -1;
        if (!aTitleMatch && bTitleMatch) return 1;

        // 按创建时间排序
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      break;
  }

  // 限制返回数量
  const result = filteredData.slice(0, limit);

  console.log('✅ 搜索分享的小说成功:', result.length);
  return result;
}

/**
 * 分享小说到社区
 */
export async function shareNovel(input: CreateNovelShareInput): Promise<NovelShare> {
  console.log('📤 分享小说到社区:', input);

  const userId = (await supabase.auth.getUser()).data.user?.id;
  if (!userId) {
    throw new Error('用户未登录');
  }

  // 检查是否已经分享过
  const { data: existingShare } = await supabase
    .from('novel_shares')
    .select('id')
    .eq('novel_id', input.novel_id)
    .eq('user_id', userId)
    .maybeSingle();

  if (existingShare) {
    throw new Error('您已经分享过这部小说了');
  }

  const { data, error } = await supabase
    .from('novel_shares')
    .insert({
      novel_id: input.novel_id,
      user_id: userId,
      share_description: input.share_description || null,
    })
    .select(`
      *,
      novel:novels(novel_title, novel_content, novel_thumb, price, novel_type),
      user:users(nickname, avatar_url)
    `)
    .single();

  if (error) {
    console.error('❌ 分享小说失败:', error);
    throw error;
  }

  console.log('✅ 分享小说成功:', data);
  return data;
}

/**
 * 取消分享小说
 */
export async function unshareNovel(novelId: string): Promise<void> {
  console.log('🗑️ 取消分享小说:', novelId);

  const userId = (await supabase.auth.getUser()).data.user?.id;
  if (!userId) {
    throw new Error('用户未登录');
  }

  const { error } = await supabase
    .from('novel_shares')
    .delete()
    .eq('novel_id', novelId)
    .eq('user_id', userId);

  if (error) {
    console.error('❌ 取消分享小说失败:', error);
    throw error;
  }

  console.log('✅ 取消分享小说成功');
}

/**
 * 检查小说是否已分享
 */
export async function checkNovelShared(novelId: string): Promise<boolean> {
  const userId = (await supabase.auth.getUser()).data.user?.id;
  if (!userId) return false;

  const { data } = await supabase
    .from('novel_shares')
    .select('id')
    .eq('novel_id', novelId)
    .eq('user_id', userId)
    .maybeSingle();

  return !!data;
}

/**
 * 增加小说分享浏览数
 */
export async function incrementNovelShareViews(shareId: string): Promise<void> {
  const { data } = await supabase
    .from('novel_shares')
    .select('views_count')
    .eq('id', shareId)
    .maybeSingle();

  if (data) {
    await supabase
      .from('novel_shares')
      .update({ views_count: (data.views_count || 0) + 1 })
      .eq('id', shareId);
  }
}

/**
 * 根据小说ID增加浏览数
 */
export async function incrementNovelShareViewsByNovelId(novelId: string): Promise<void> {
  console.log('👁️ 增加小说浏览数:', novelId);
  
  const { data } = await supabase
    .from('novel_shares')
    .select('id, views_count')
    .eq('novel_id', novelId)
    .maybeSingle();

  if (data) {
    await supabase
      .from('novel_shares')
      .update({ views_count: (data.views_count || 0) + 1 })
      .eq('id', data.id);
    console.log('✅ 增加小说浏览数成功');
  } else {
    console.log('⚠️ 未找到小说分享记录');
  }
}

/**
 * 切换小说分享点赞状态
 */
export async function toggleNovelShareLike(novelId: string): Promise<{ isLiked: boolean; likesCount: number }> {
  console.log('❤️ 切换小说点赞状态:', novelId);

  const userId = (await supabase.auth.getUser()).data.user?.id;
  if (!userId) {
    throw new Error('用户未登录');
  }

  // 获取小说分享记录
  const { data: share } = await supabase
    .from('novel_shares')
    .select('id, likes_count')
    .eq('novel_id', novelId)
    .maybeSingle();

  if (!share) {
    throw new Error('未找到小说分享记录');
  }

  // 检查是否已点赞
  const { data: existingLike } = await supabase
    .from('novel_share_likes')
    .select('id')
    .eq('novel_share_id', share.id)
    .eq('user_id', userId)
    .maybeSingle();

  let isLiked: boolean;
  let likesCount: number;

  if (existingLike) {
    // 取消点赞
    await supabase
      .from('novel_share_likes')
      .delete()
      .eq('id', existingLike.id);

    likesCount = Math.max(0, (share.likes_count || 0) - 1);
    await supabase
      .from('novel_shares')
      .update({ likes_count: likesCount })
      .eq('id', share.id);

    isLiked = false;
    console.log('✅ 取消点赞成功');
  } else {
    // 添加点赞
    await supabase
      .from('novel_share_likes')
      .insert({
        novel_share_id: share.id,
        user_id: userId,
      });

    likesCount = (share.likes_count || 0) + 1;
    await supabase
      .from('novel_shares')
      .update({ likes_count: likesCount })
      .eq('id', share.id);

    isLiked = true;
    console.log('✅ 点赞成功');
  }

  return { isLiked, likesCount };
}

/**
 * 检查用户是否已点赞小说分享
 */
export async function checkNovelShareLiked(novelId: string): Promise<boolean> {
  const userId = (await supabase.auth.getUser()).data.user?.id;
  if (!userId) return false;

  // 获取小说分享记录
  const { data: share } = await supabase
    .from('novel_shares')
    .select('id')
    .eq('novel_id', novelId)
    .maybeSingle();

  if (!share) return false;

  // 检查是否已点赞
  const { data } = await supabase
    .from('novel_share_likes')
    .select('id')
    .eq('novel_share_id', share.id)
    .eq('user_id', userId)
    .maybeSingle();

  return !!data;
}

/**
 * 获取小说分享的统计信息
 */
export async function getNovelShareStats(novelId: string): Promise<{ viewsCount: number; likesCount: number } | null> {
  const { data } = await supabase
    .from('novel_shares')
    .select('views_count, likes_count')
    .eq('novel_id', novelId)
    .maybeSingle();

  if (!data) return null;

  return {
    viewsCount: data.views_count || 0,
    likesCount: data.likes_count || 0,
  };
}

// ==================== 评论相关 ====================

/**
 * 获取章节评论列表
 */
export async function getChapterComments(
  novelId: string,
  chapterNumber: number
): Promise<Comment[]> {
  console.log('📖 获取章节评论:', { novelId, chapterNumber });

  const { data, error } = await supabase
    .from('comments')
    .select(`
      *,
      user:users(nickname, avatar_url)
    `)
    .eq('novel_id', novelId)
    .eq('chapter_number', chapterNumber)
    .is('parent_id', null)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ 获取章节评论失败:', error);
    throw error;
  }

  console.log('✅ 获取章节评论成功:', data?.length);
  return data || [];
}

/**
 * 获取评论的回复
 */
export async function getCommentReplies(commentId: string): Promise<Comment[]> {
  const { data, error } = await supabase
    .from('comments')
    .select(`
      *,
      user:users(nickname, avatar_url)
    `)
    .eq('parent_id', commentId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('❌ 获取评论回复失败:', error);
    throw error;
  }

  return data || [];
}

/**
 * 创建评论
 */
export async function createComment(input: CreateCommentInput): Promise<Comment> {
  console.log('💬 创建评论:', input);

  const { data, error } = await supabase
    .from('comments')
    .insert({
      novel_id: input.novel_id,
      chapter_number: input.chapter_number,
      paragraph_index: input.paragraph_index || null,
      content: input.content,
      is_spoiler: input.is_spoiler || false,
      parent_id: input.parent_id || null,
      user_id: (await supabase.auth.getUser()).data.user?.id,
    })
    .select(`
      *,
      user:users(nickname, avatar_url)
    `)
    .single();

  if (error) {
    console.error('❌ 创建评论失败:', error);
    throw error;
  }

  console.log('✅ 创建评论成功:', data);

  // 更新用户统计
  await updateUserStats('comments_count', 1);

  return data;
}

/**
 * 删除评论
 */
export async function deleteComment(commentId: string): Promise<void> {
  console.log('🗑️ 删除评论:', commentId);

  const { error } = await supabase
    .from('comments')
    .delete()
    .eq('id', commentId);

  if (error) {
    console.error('❌ 删除评论失败:', error);
    throw error;
  }

  console.log('✅ 删除评论成功');
}

// ==================== 帖子相关 ====================

/**
 * 获取帖子列表
 */
export async function getPosts(
  novelId?: string,
  category?: string,
  limit: number = 20
): Promise<Post[]> {
  console.log('📝 获取帖子列表:', { novelId, category, limit });

  let query = supabase
    .from('posts')
    .select(`
      *,
      user:users(nickname, avatar_url),
      novel:novels(novel_title, novel_thumb, price)
    `)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (novelId) {
    query = query.eq('novel_id', novelId);
  }

  if (category) {
    query = query.eq('category', category);
  }

  const { data, error } = await query;

  if (error) {
    console.error('❌ 获取帖子列表失败:', error);
    throw error;
  }

  console.log('✅ 获取帖子列表成功:', data?.length);
  return data || [];
}

/**
 * 获取用户的帖子列表
 */
export async function getUserPosts(userId: string): Promise<Post[]> {
  console.log('📝 获取用户帖子列表:', userId);

  const { data, error } = await supabase
    .from('posts')
    .select(`
      *,
      user:users(nickname, avatar_url),
      novel:novels(novel_title, novel_thumb, price)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ 获取用户帖子列表失败:', error);
    throw error;
  }

  console.log('✅ 获取用户帖子列表成功:', data?.length);
  return data || [];
}

/**
 * 获取帖子详情
 */
export async function getPostById(postId: string): Promise<Post | null> {
  console.log('📝 获取帖子详情:', postId);

  const { data, error } = await supabase
    .from('posts')
    .select(`
      *,
      user:users(nickname, avatar_url),
      novel:novels(novel_title, novel_thumb, price)
    `)
    .eq('id', postId)
    .single();

  if (error) {
    console.error('❌ 获取帖子详情失败:', error);
    return null;
  }

  // 增加浏览数
  await supabase
    .from('posts')
    .update({ views_count: (data.views_count || 0) + 1 })
    .eq('id', postId);

  console.log('✅ 获取帖子详情成功');
  return data;
}

/**
 * 创建帖子
 */
export async function createPost(input: CreatePostInput): Promise<Post> {
  console.log('📝 创建帖子:', input);

  const { data, error } = await supabase
    .from('posts')
    .insert({
      novel_id: input.novel_id || null,
      title: input.title,
      content: input.content,
      post_type: input.post_type || 'normal',
      category: input.category || null,
      poll_options: input.poll_options || null,
      user_id: (await supabase.auth.getUser()).data.user?.id,
    })
    .select(`
      *,
      user:users(nickname, avatar_url),
      novel:novels(novel_title, novel_thumb, price)
    `)
    .single();

  if (error) {
    console.error('❌ 创建帖子失败:', error);
    throw error;
  }

  console.log('✅ 创建帖子成功:', data);

  // 更新用户统计
  await updateUserStats('posts_count', 1);

  return data;
}

/**
 * 删除帖子
 */
export async function deletePost(postId: string): Promise<void> {
  console.log('🗑️ 删除帖子:', postId);

  const { error } = await supabase
    .from('posts')
    .delete()
    .eq('id', postId);

  if (error) {
    console.error('❌ 删除帖子失败:', error);
    throw error;
  }

  console.log('✅ 删除帖子成功');
}

/**
 * 置顶/取消置顶帖子
 */
export async function togglePostPin(postId: string, isPinned: boolean): Promise<void> {
  console.log('📌 切换帖子置顶状态:', { postId, isPinned });

  const { error } = await supabase
    .from('posts')
    .update({ is_pinned: isPinned })
    .eq('id', postId);

  if (error) {
    console.error('❌ 切换帖子置顶状态失败:', error);
    throw error;
  }

  console.log('✅ 切换帖子置顶状态成功');
}

/**
 * 精华/取消精华帖子
 */
export async function togglePostFeatured(postId: string, isFeatured: boolean): Promise<void> {
  console.log('⭐ 切换帖子精华状态:', { postId, isFeatured });

  const { error } = await supabase
    .from('posts')
    .update({ is_featured: isFeatured })
    .eq('id', postId);

  if (error) {
    console.error('❌ 切换帖子精华状态失败:', error);
    throw error;
  }

  console.log('✅ 切换帖子精华状态成功');
}

// ==================== 帖子评论相关 ====================

/**
 * 获取帖子评论列表
 */
export async function getPostComments(postId: string): Promise<PostComment[]> {
  console.log('💬 获取帖子评论:', postId);

  const { data, error } = await supabase
    .from('post_comments')
    .select(`
      *,
      user:users(nickname, avatar_url)
    `)
    .eq('post_id', postId)
    .is('parent_id', null)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ 获取帖子评论失败:', error);
    throw error;
  }

  console.log('✅ 获取帖子评论成功:', data?.length);
  return data || [];
}

/**
 * 创建帖子评论
 */
export async function createPostComment(input: CreatePostCommentInput): Promise<PostComment> {
  console.log('💬 创建帖子评论:', input);

  const { data, error } = await supabase
    .from('post_comments')
    .insert({
      post_id: input.post_id,
      content: input.content,
      parent_id: input.parent_id || null,
      user_id: (await supabase.auth.getUser()).data.user?.id,
    })
    .select(`
      *,
      user:users(nickname, avatar_url)
    `)
    .single();

  if (error) {
    console.error('❌ 创建帖子评论失败:', error);
    throw error;
  }

  console.log('✅ 创建帖子评论成功:', data);

  // 更新帖子评论数
  const { data: post } = await supabase
    .from('posts')
    .select('comments_count')
    .eq('id', input.post_id)
    .single();

  if (post) {
    await supabase
      .from('posts')
      .update({ comments_count: (post.comments_count || 0) + 1 })
      .eq('id', input.post_id);
  }

  return data;
}

/**
 * 删除帖子评论
 */
export async function deletePostComment(commentId: string): Promise<void> {
  console.log('🗑️ 删除帖子评论:', commentId);

  const { error } = await supabase
    .from('post_comments')
    .delete()
    .eq('id', commentId);

  if (error) {
    console.error('❌ 删除帖子评论失败:', error);
    throw error;
  }

  console.log('✅ 删除帖子评论成功');
}

// ==================== 点赞相关 ====================

/**
 * 点赞/取消点赞
 */
export async function toggleLike(
  targetType: LikeTargetType,
  targetId: string
): Promise<boolean> {
  console.log('👍 切换点赞状态:', { targetType, targetId });

  const userId = (await supabase.auth.getUser()).data.user?.id;
  if (!userId) {
    throw new Error('用户未登录');
  }

  // 检查是否已点赞
  const { data: existingLike } = await supabase
    .from('likes')
    .select('id')
    .eq('user_id', userId)
    .eq('target_type', targetType)
    .eq('target_id', targetId)
    .maybeSingle();

  if (existingLike) {
    // 取消点赞
    await supabase
      .from('likes')
      .delete()
      .eq('id', existingLike.id);

    // 更新点赞数
    await updateLikesCount(targetType, targetId, -1);

    console.log('✅ 取消点赞成功');
    return false;
  } else {
    // 点赞
    await supabase
      .from('likes')
      .insert({
        user_id: userId,
        target_type: targetType,
        target_id: targetId,
      });

    // 更新点赞数
    await updateLikesCount(targetType, targetId, 1);

    console.log('✅ 点赞成功');
    return true;
  }
}

/**
 * 更新点赞数
 */
async function updateLikesCount(
  targetType: LikeTargetType,
  targetId: string,
  delta: number
): Promise<void> {
  let tableName: string;
  switch (targetType) {
    case 'comment':
      tableName = 'comments';
      break;
    case 'post':
      tableName = 'posts';
      break;
    case 'post_comment':
      tableName = 'post_comments';
      break;
  }

  const { data } = await supabase
    .from(tableName)
    .select('likes_count')
    .eq('id', targetId)
    .single();

  if (data) {
    await supabase
      .from(tableName)
      .update({ likes_count: Math.max(0, (data.likes_count || 0) + delta) })
      .eq('id', targetId);
  }
}

/**
 * 检查是否已点赞
 */
export async function checkIsLiked(
  targetType: LikeTargetType,
  targetId: string
): Promise<boolean> {
  const userId = (await supabase.auth.getUser()).data.user?.id;
  if (!userId) return false;

  const { data } = await supabase
    .from('likes')
    .select('id')
    .eq('user_id', userId)
    .eq('target_type', targetType)
    .eq('target_id', targetId)
    .maybeSingle();

  return !!data;
}

// ==================== 角色粉丝相关 ====================

/**
 * 获取角色粉丝数
 */
export async function getCharacterFansCount(
  novelId: string,
  characterId: string
): Promise<number> {
  const { count, error } = await supabase
    .from('character_fans')
    .select('*', { count: 'exact', head: true })
    .eq('novel_id', novelId)
    .eq('character_id', characterId);

  if (error) {
    console.error('❌ 获取角色粉丝数失败:', error);
    return 0;
  }

  return count || 0;
}

/**
 * 关注/取消关注角色
 */
export async function toggleCharacterFan(
  novelId: string,
  characterId: string
): Promise<boolean> {
  console.log('⭐ 切换角色关注状态:', { novelId, characterId });

  const userId = (await supabase.auth.getUser()).data.user?.id;
  if (!userId) {
    throw new Error('用户未登录');
  }

  // 检查是否已关注
  const { data: existingFan } = await supabase
    .from('character_fans')
    .select('id')
    .eq('user_id', userId)
    .eq('novel_id', novelId)
    .eq('character_id', characterId)
    .maybeSingle();

  if (existingFan) {
    // 取消关注
    await supabase
      .from('character_fans')
      .delete()
      .eq('id', existingFan.id);

    console.log('✅ 取消关注角色成功');
    return false;
  } else {
    // 关注
    await supabase
      .from('character_fans')
      .insert({
        user_id: userId,
        novel_id: novelId,
        character_id: characterId,
      });

    console.log('✅ 关注角色成功');
    return true;
  }
}

/**
 * 检查是否已关注角色
 */
export async function checkIsCharacterFan(
  novelId: string,
  characterId: string
): Promise<boolean> {
  const userId = (await supabase.auth.getUser()).data.user?.id;
  if (!userId) return false;

  const { data } = await supabase
    .from('character_fans')
    .select('id')
    .eq('user_id', userId)
    .eq('novel_id', novelId)
    .eq('character_id', characterId)
    .maybeSingle();

  return !!data;
}

/**
 * 获取角色卡片列表（包含粉丝数）
 */
export async function getCharacterCards(novelId: string): Promise<CharacterCard[]> {
  console.log('🎭 获取角色卡片列表:', novelId);

  // 获取小说的角色数据
  const { data: novel } = await supabase
    .from('novels')
    .select('characters_data')
    .eq('id', novelId)
    .single();

  if (!novel || !novel.characters_data) {
    return [];
  }

  const characters = novel.characters_data as any[];
  const userId = (await supabase.auth.getUser()).data.user?.id;

  // 为每个角色获取粉丝数和关注状态
  const characterCards: CharacterCard[] = await Promise.all(
    characters.map(async (char) => {
      const fansCount = await getCharacterFansCount(novelId, char.id);
      const isFan = userId ? await checkIsCharacterFan(novelId, char.id) : false;

      return {
        ...char,
        fans_count: fansCount,
        is_fan: isFan,
      };
    })
  );

  console.log('✅ 获取角色卡片列表成功:', characterCards.length);
  return characterCards;
}

// ==================== 用户关注相关 ====================

/**
 * 关注/取消关注用户
 */
export async function toggleUserFollow(followingId: string): Promise<boolean> {
  console.log('👥 切换用户关注状态:', followingId);

  const userId = (await supabase.auth.getUser()).data.user?.id;
  if (!userId) {
    throw new Error('用户未登录');
  }

  if (userId === followingId) {
    throw new Error('不能关注自己');
  }

  // 检查是否已关注
  const { data: existingFollow } = await supabase
    .from('user_follows')
    .select('id')
    .eq('follower_id', userId)
    .eq('following_id', followingId)
    .maybeSingle();

  if (existingFollow) {
    // 取消关注
    await supabase
      .from('user_follows')
      .delete()
      .eq('id', existingFollow.id);

    // 更新统计
    await updateUserStats('following_count', -1, userId);
    await updateUserStats('followers_count', -1, followingId);

    console.log('✅ 取消关注用户成功');
    return false;
  } else {
    // 关注
    await supabase
      .from('user_follows')
      .insert({
        follower_id: userId,
        following_id: followingId,
      });

    // 更新统计
    await updateUserStats('following_count', 1, userId);
    await updateUserStats('followers_count', 1, followingId);

    console.log('✅ 关注用户成功');
    return true;
  }
}

/**
 * 检查是否已关注用户
 */
export async function checkIsFollowing(followingId: string): Promise<boolean> {
  const userId = (await supabase.auth.getUser()).data.user?.id;
  if (!userId) return false;

  const { data } = await supabase
    .from('user_follows')
    .select('id')
    .eq('follower_id', userId)
    .eq('following_id', followingId)
    .maybeSingle();

  return !!data;
}

// ==================== 用户统计相关 ====================

/**
 * 获取用户统计信息
 */
export async function getUserStats(userId: string): Promise<UserStats | null> {
  const { data, error } = await supabase
    .from('user_stats')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('❌ 获取用户统计失败:', error);
    return null;
  }

  // 如果不存在，创建初始统计
  if (!data) {
    const { data: newStats } = await supabase
      .from('user_stats')
      .insert({ user_id: userId })
      .select()
      .single();

    return newStats;
  }

  return data;
}

/**
 * 更新用户统计
 */
async function updateUserStats(
  field: keyof UserStats,
  delta: number,
  userId?: string
): Promise<void> {
  const targetUserId = userId || (await supabase.auth.getUser()).data.user?.id;
  if (!targetUserId) return;

  const stats = await getUserStats(targetUserId);
  if (!stats) return;

  const currentValue = stats[field] as number;
  const newValue = Math.max(0, currentValue + delta);

  await supabase
    .from('user_stats')
    .update({ [field]: newValue })
    .eq('user_id', targetUserId);
}

/**
 * 增加用户积分
 */
export async function addUserPoints(points: number, userId?: string): Promise<void> {
  await updateUserStats('points', points, userId);
}

// ==================== 创作者相关 ====================

/**
 * 获取随机创作者列表
 * @param limit 获取数量，默认8个
 */
export async function getRandomCreators(limit: number = 8) {
  console.log('👥 获取随机创作者列表, 数量:', limit);

  try {
    // 获取所有有小说的用户
    const { data: creators, error } = await supabase
      .from('users')
      .select(`
        id,
        nickname,
        avatar_url,
        created_at
      `)
      .order('created_at', { ascending: false })
      .limit(100); // 先获取100个用户

    if (error) {
      console.error('❌ 获取创作者列表失败:', error);
      throw error;
    }

    if (!creators || creators.length === 0) {
      console.log('⚠️ 没有找到创作者');
      return [];
    }

    // 为每个创作者获取小说数量
    const creatorsWithNovels = await Promise.all(
      creators.map(async (creator) => {
        const { count, error: countError } = await supabase
          .from('novels')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', creator.id);

        if (countError) {
          console.error('❌ 获取创作者小说数量失败:', countError);
          return { ...creator, novel_count: 0 };
        }

        return {
          ...creator,
          novel_count: count || 0,
        };
      })
    );

    // 过滤出有小说的创作者
    const creatorsWithNovelsFiltered = creatorsWithNovels.filter(
      (creator) => creator.novel_count > 0
    );

    // 随机打乱数组
    const shuffled = creatorsWithNovelsFiltered.sort(() => Math.random() - 0.5);

    // 取前 limit 个
    const result = shuffled.slice(0, limit);

    console.log('✅ 获取随机创作者列表成功, 数量:', result.length);
    return result;
  } catch (error) {
    console.error('❌ 获取随机创作者列表异常:', error);
    throw error;
  }
}

/**
 * 获取创作者信息及其小说列表
 * @param userId 创作者ID
 */
export async function getCreatorProfile(userId: string) {
  console.log('👤 获取创作者信息, ID:', userId);

  try {
    // 获取创作者基本信息
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('❌ 获取创作者信息失败:', userError);
      throw userError;
    }

    if (!user) {
      console.log('⚠️ 创作者不存在');
      return null;
    }

    // 获取创作者的小说列表
    const { data: novels, error: novelsError } = await supabase
      .from('novels')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (novelsError) {
      console.error('❌ 获取创作者小说列表失败:', novelsError);
      throw novelsError;
    }

    console.log('✅ 获取创作者信息成功, 小说数量:', novels?.length || 0);

    return {
      user,
      novels: novels || [],
      novel_count: novels?.length || 0,
    };
  } catch (error) {
    console.error('❌ 获取创作者信息异常:', error);
    throw error;
  }
}
