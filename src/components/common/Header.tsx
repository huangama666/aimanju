import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, HelpCircle, LogIn, UserCircle, Shield, Users, BookOpen, GitBranch, Clapperboard, Pen, Coins, Crown, ArrowUp, Camera, Edit2, LogOut } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { 
  SakuraPetal, 
  AnimeStar, 
  ComicBubble, 
  ChineseCloud, 
  CuteEmoji, 
  JapaneseFan, 
  ComicSparkle,
  ChineseSeal 
} from '@/components/decorations/AnimeDecorations';
import { LoginDialog } from '@/components/auth/LoginDialog';
import { MembershipBadge } from '@/components/membership/MembershipBadge';
import { membershipConfig } from '@/config/membership';
import { useAuth } from '@/contexts/AuthContext';
import { getUserProfile, updateUserProfile, uploadAvatar } from '@/db/api';
import { checkIsAdmin } from '@/db/admin-api';
import { supabase } from '@/db/supabase';
import type { DbUser } from '@/types/database';
import routes from '../../routes';

// Supabase存储桶名称
const BUCKET_NAME = 'app-6r71zzjmv5kx_avatars';

// 移动端菜单配置
const mobileMenuItems = [
  { name: '码上做漫画', path: '/', iconName: 'pen' },
  { name: '码上做剧本', path: '/script', iconName: 'book' },
  { name: '码上准备', path: '/preparation', iconName: 'camera' },
  { name: '码上拍戏', path: '/filming', iconName: 'clapperboard' },
  { name: '平行世界', path: '/parallel', iconName: 'branch' },
  { name: '社区广场', path: '/community', iconName: 'users' },
];

// 获取菜单图标
const getMenuIcon = (iconName: string) => {
  switch (iconName) {
    case 'pen':
      return <Pen className="h-5 w-5" />;
    case 'book':
      return <BookOpen className="h-5 w-5" />;
    case 'camera':
      return <Camera className="h-5 w-5" />;
    case 'clapperboard':
      return <Clapperboard className="h-5 w-5" />;
    case 'branch':
      return <GitBranch className="h-5 w-5" />;
    case 'users':
      return <Users className="h-5 w-5" />;
    default:
      return <Pen className="h-5 w-5" />;
  }
};

const Header: React.FC = () => {
const [isMenuOpen, setIsMenuOpen] = useState(false);
const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
const location = useLocation();
const navigate = useNavigate();
const navigation = routes.filter(route => route.visible !== false);

// 使用AuthContext获取用户状态
const { currentUser, refreshUser, logout: authLogout } = useAuth();
const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);
const [isAdmin, setIsAdmin] = useState(false);

// 编辑对话框状态
const [avatarDialogOpen, setAvatarDialogOpen] = useState(false);
const [nicknameDialogOpen, setNicknameDialogOpen] = useState(false);
const [avatarFile, setAvatarFile] = useState<File | null>(null);
const [avatarPreview, setAvatarPreview] = useState<string>('');
const [newNickname, setNewNickname] = useState('');
const [isUploading, setIsUploading] = useState(false);

// AI生成头像相关状态
const [avatarMode, setAvatarMode] = useState<'upload' | 'ai'>('upload');
const [aiPrompt, setAiPrompt] = useState('');
const [isGenerating, setIsGenerating] = useState(false);
const [generatedAvatarUrl, setGeneratedAvatarUrl] = useState<string>('');


// 检查管理员状态
useEffect(() => {
  let isMounted = true;
  
  const checkAdmin = async () => {
    if (currentUser) {
      try {
        const adminStatus = await checkIsAdmin();
        if (isMounted) {
          setIsAdmin(adminStatus);
        }
      } catch (error) {
        console.error('检查管理员状态失败:', error);
        if (isMounted) {
          setIsAdmin(false);
        }
      }
    } else {
      if (isMounted) {
        setIsAdmin(false);
      }
    }
  };
  
  checkAdmin();
  
  return () => {
    isMounted = false;
  };
}, [currentUser]);

// 登录成功回调
const handleLoginSuccess = async () => {
  console.log('登录成功，刷新用户信息');
  await refreshUser();
};

const handleNavigateToProfile = () => {
  navigate('/profile');
};

const handleNavigateToAdmin = () => {
  navigate('/admin');
};

// 处理头像文件选择
const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (file) {
    // 检查文件大小（限制为1MB）
    if (file.size > 1024 * 1024) {
      toast.error('图片大小不能超过1MB');
      return;
    }
    
    // 检查文件类型
    if (!file.type.startsWith('image/')) {
      toast.error('请选择图片文件');
      return;
    }
    
    setAvatarFile(file);
    
    // 生成预览
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  }
};

// 上传头像
const handleUploadAvatar = async () => {
  if (!avatarFile || !currentUser) return;
  
  setIsUploading(true);
  try {
    const avatarUrl = await uploadAvatar(currentUser.id, avatarFile);
    await updateUserProfile(currentUser.id, { avatar_url: avatarUrl });
    
    toast.success('头像更新成功');
    setAvatarDialogOpen(false);
    setAvatarFile(null);
    setAvatarPreview('');
    
    // 刷新用户信息
    await refreshUser();
  } catch (error) {
    console.error('上传头像失败:', error);
    toast.error('上传头像失败，请重试');
  } finally {
    setIsUploading(false);
  }
};

// 更新昵称
const handleUpdateNickname = async () => {
  if (!currentUser || !newNickname.trim()) {
    toast.error('请输入昵称');
    return;
  }
  
  setIsUploading(true);
  try {
    await updateUserProfile(currentUser.id, { nickname: newNickname.trim() });
    
    toast.success('昵称更新成功');
    setNicknameDialogOpen(false);
    setNewNickname('');
    
    // 刷新用户信息
    await refreshUser();
  } catch (error) {
    console.error('更新昵称失败:', error);
    toast.error('更新昵称失败，请重试');
  } finally {
    setIsUploading(false);
  }
};

// AI生成头像
const handleGenerateAvatar = async () => {
  if (!aiPrompt.trim()) {
    toast.error('请输入头像描述');
    return;
  }

  setIsGenerating(true);
  try {
    const APP_ID = import.meta.env.VITE_APP_ID;
    
    // 提交AI作画任务
    const submitResponse = await fetch('/api/miaoda/runtime/apicenter/source/proxy/iragtextToImageiiVMkBQMEHfZ6rd', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-App-Id': APP_ID,
      },
      body: JSON.stringify({
        prompt: `${aiPrompt}，头像，1:1`,
      }),
    });

    const submitData = await submitResponse.json();
    
    if (submitData.status !== 0) {
      if (submitData.status === 999) {
        toast.error(submitData.msg || 'AI生成失败');
      } else {
        toast.error('AI生成失败，请稍后重试');
      }
      return;
    }

    const taskId = submitData.data.task_id;
    
    // 轮询查询结果
    let attempts = 0;
    const maxAttempts = 30; // 最多查询30次（5分钟）
    
    const checkResult = async (): Promise<void> => {
      if (attempts >= maxAttempts) {
        toast.error('生成超时，请重试');
        setIsGenerating(false);
        return;
      }

      attempts++;
      
      const queryResponse = await fetch('/api/miaoda/runtime/apicenter/source/proxy/iraggetImgjWUTzny87hoV6fSaYzr2Rj', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-App-Id': APP_ID,
        },
        body: JSON.stringify({
          task_id: taskId,
        }),
      });

      const queryData = await queryResponse.json();
      
      if (queryData.status !== 0) {
        if (queryData.status === 999) {
          toast.error(queryData.msg || '查询失败');
        } else {
          toast.error('查询失败，请稍后重试');
        }
        setIsGenerating(false);
        return;
      }

      const taskStatus = queryData.data.task_status;
      
      if (taskStatus === 'SUCCESS') {
        // 生成成功
        const imageUrl = queryData.data.sub_task_result_list?.[0]?.final_image_list?.[0]?.img_url;
        if (imageUrl) {
          setGeneratedAvatarUrl(imageUrl);
          setAvatarPreview(imageUrl);
          toast.success('头像生成成功！');
        } else {
          toast.error('未能获取生成的图片');
        }
        setIsGenerating(false);
      } else if (taskStatus === 'FAILED') {
        toast.error('生成失败，请重试');
        setIsGenerating(false);
      } else {
        // 继续等待
        setTimeout(checkResult, 10000); // 10秒后再次查询
      }
    };

    // 开始查询
    setTimeout(checkResult, 10000); // 10秒后开始第一次查询
    
  } catch (error) {
    console.error('AI生成头像失败:', error);
    toast.error('AI生成头像失败');
    setIsGenerating(false);
  }
};

// 保存AI生成的头像
const handleSaveGeneratedAvatar = async () => {
  if (!generatedAvatarUrl || !currentUser) return;

  setIsUploading(true);
  try {
    // 下载图片并转换为Blob（禁用缓存，避免跨域问题）
    const response = await fetch(generatedAvatarUrl, {
      cache: 'no-store', // 禁用缓存
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    const blob = await response.blob();
    
    // 上传到Supabase Storage
    const fileExt = 'png';
    const fileName = `${currentUser.id}_${Date.now()}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, blob, {
        contentType: 'image/png',
        upsert: true,
      });

    if (uploadError) throw uploadError;

    // 获取公开URL
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    // 更新用户头像
    const { error: updateError } = await supabase
      .from('users')
      .update({ avatar_url: urlData.publicUrl })
      .eq('id', currentUser.id);

    if (updateError) throw updateError;

    await refreshUser();
    toast.success('头像更新成功！');
    setAvatarDialogOpen(false);
    setGeneratedAvatarUrl('');
    setAvatarPreview('');
    setAiPrompt('');
  } catch (error) {
    console.error('保存头像失败:', error);
    toast.error('保存头像失败');
  } finally {
    setIsUploading(false);
  }
};

// 退出登录
const handleSignOut = async () => {
  try {
    await authLogout();
    setIsAdmin(false);
    toast.success('已退出登录');
    navigate('/');
  } catch (error) {
    console.error('退出登录失败:', error);
    toast.error('退出登录失败');
  }
};

return (
  <>
    {/* 导航栏 */}
    <header className="bg-white/95 backdrop-blur-sm shadow-xl sticky top-0 z-50 border-b border-[#F2E6E1] relative overflow-hidden">
      {/* 导航栏装饰元素 */}
      <div className="absolute top-1 left-4 text-[#FF8A5B] animate-float opacity-30">
        <SakuraPetal className="w-4 h-4" />
      </div>
      <div className="absolute top-2 right-8 text-[#FFCAB8] animate-sparkle opacity-40">
        <AnimeStar className="w-3 h-3" />
      </div>
      <div className="absolute bottom-1 left-1/3 text-[#FF7A4D] animate-wiggle opacity-25">
        <ComicSparkle className="w-3 h-3" />
      </div>
      <div className="absolute top-1 right-1/4 text-[#E64A1F] animate-bounce-gentle opacity-30">
        <CuteEmoji className="w-4 h-4" type="wink" />
      </div>
      
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex-shrink-0 flex items-center relative">
              {/* Logo */}
              <div className="h-8 w-8 bg-gradient-to-r from-[#FF5724] to-[#E64A1F] rounded-lg flex items-center justify-center shadow-lg comic-shadow relative">
                <span className="text-white font-bold text-sm">码</span>
                {/* Logo装饰 */}
                <div className="absolute -top-1 -right-1 text-[#FFCAB8] animate-sparkle">
                  <AnimeStar className="w-2 h-2" />
                </div>
              </div>
              {/* 网站名称 */}
              <span className="ml-3 text-xl font-bold bg-gradient-to-r from-[#FF5724] to-[#E64A1F] bg-clip-text text-transparent relative">
                码上制片厂
                {/* 名称装饰 */}
                <div className="absolute -top-2 -right-3 text-[#FF8A5B] animate-wiggle opacity-60">
                  <SakuraPetal className="w-3 h-3" />
                </div>
              </span>
            </Link>
            
            {/* 导航链接 - 在屏幕宽度>=730px时显示 */}
            <div className="hidden min-[730px]:flex ml-10 space-x-8">
              {/* 码上做漫画 */}
              <Link
                to="/"
                className={`inline-flex items-center px-1 pt-1 text-sm font-medium transition-colors ${
                  location.pathname === '/'
                    ? 'text-[#FF5724] border-b-2 border-[#FF5724]'
                    : 'text-gray-700 hover:text-[#FF5724]'
                }`}
              >{"码上写小说"}</Link>
              
              {/* 码上做剧本 */}
              <Link
                to="/script"
                className={`inline-flex items-center px-1 pt-1 text-sm font-medium transition-colors ${
                  location.pathname === '/script'
                    ? 'text-[#FF5724] border-b-2 border-[#FF5724]'
                    : 'text-gray-700 hover:text-[#FF5724]'
                }`}
              >
                码上做剧本
              </Link>

              {/* 码上准备 */}
              <Link
                to="/preparation"
                className={`inline-flex items-center px-1 pt-1 text-sm font-medium transition-colors ${
                  location.pathname === '/preparation'
                    ? 'text-[#FF5724] border-b-2 border-[#FF5724]'
                    : 'text-gray-700 hover:text-[#FF5724]'
                }`}
              >
                码上准备
              </Link>

              {/* 码上拍戏 */}
              <Link
                to="/filming"
                className={`inline-flex items-center px-1 pt-1 text-sm font-medium transition-colors ${
                  location.pathname === '/filming'
                    ? 'text-[#FF5724] border-b-2 border-[#FF5724]'
                    : 'text-gray-700 hover:text-[#FF5724]'
                }`}
              >
                码上拍戏
              </Link>

              {/* 平行世界 */}
              <Link
                to="/parallel"
                className={`inline-flex items-center px-1 pt-1 text-sm font-medium transition-colors ${
                  location.pathname === '/parallel'
                    ? 'text-[#FF5724] border-b-2 border-[#FF5724]'
                    : 'text-gray-700 hover:text-[#FF5724]'
                }`}
              >
                平行世界
              </Link>

              {/* 社区广场 */}
              <Link
                to="/community"
                className={`inline-flex items-center px-1 pt-1 text-sm font-medium transition-colors ${
                  location.pathname === '/community' || location.pathname.startsWith('/community/')
                    ? 'text-[#FF5724] border-b-2 border-[#FF5724]'
                    : 'text-gray-700 hover:text-[#FF5724]'
                }`}
              >
                社区广场
              </Link>
            </div>
          </div>

          {/* 右侧教程按钮和用户按钮 */}
          <div className="flex items-center gap-4">
            {/* 教程按钮已隐藏 */}
            <Dialog>
              <DialogTrigger asChild>
                <Button 
                  variant="outline" 
                  className="hidden"
                  style={{ height: '2.25rem', width: '5rem' }}
                >
                  <HelpCircle className="h-4 w-4" />
                  教程
                  {/* 按钮装饰 */}
                  <div className="absolute -top-1 -right-1 text-[#FFCAB8] animate-pulse-soft">
                    <ComicBubble className="w-3 h-3" text="?" />
                  </div>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" style={{ maxWidth: '56rem' }}>
                <DialogHeader>
                  <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">使用教程</DialogTitle>
                </DialogHeader>
                <div className="space-y-6 mt-6">
                  {/* 平台简介 */}
                  <Card className="backdrop-blur-sm shadow-xl border-orange-200 relative overflow-hidden">
                    <div className="absolute top-2 right-2 text-pink-400 animate-float opacity-20">
                      <JapaneseFan className="w-6 h-6" />
                    </div>
                    <CardHeader>
                      <CardTitle className="text-lg text-gray-700 flex items-center gap-2">
                        🎨 平台简介
                        <div className="text-yellow-400 animate-sparkle">
                          <ComicSparkle className="w-4 h-4" />
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="border-solid border-[#954900ff] border-[0px] border-[#ea570d]">
                      <p className="text-sm text-gray-700 leading-relaxed">{"码上制片厂一个集小说创作、角色生成、剧本生成、剧本分析于、视频生成一体的综合性创作平台。您只需输入创作需求，平台将自动生成小说内容，并将其转化为漫画风格的视觉化作品"}</p>
                    </CardContent>
                  </Card>

                  {/* 快速开始 */}
                  <Card className="bg-white/80 backdrop-blur-sm shadow-xl border-orange-100 relative overflow-hidden">
                    <div className="absolute bottom-2 right-2 text-blue-400 animate-spin-slow opacity-15">
                      <ChineseCloud className="w-8 h-6" />
                    </div>
                    <CardHeader>
                      <CardTitle className="text-lg text-gray-700 flex items-center gap-2">
                        🚀 快速开始 - 四步创作流程
                        <div className="text-yellow-400 animate-sparkle">
                          <ComicSparkle className="w-4 h-4" />
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 rounded-lg border border-orange-200 relative comic-shadow">
                          <h4 className="font-semibold text-orange-800 mb-2">步骤1:小说创作</h4>
                          <p className="text-sm text-gray-600 mb-2">在"码上制片厂"页面输入创作需求:</p>
                          <ul className="text-xs text-gray-600 space-y-1 ml-2">
                            <li>• 选择题材（玄幻/都市/历史等）</li>
                            <li>• 设定写作风格</li>
                            <li>• 描述关键情节和主角特征</li>
                          </ul>
                          <div className="absolute top-1 right-1 text-orange-400 animate-wiggle opacity-40">
                            <CuteEmoji className="w-3 h-3" type="happy" />
                          </div>
                        </div>
                        <div className="p-4 bg-gradient-to-br from-red-50 to-white rounded-lg border border-red-200 relative comic-shadow">
                          <h4 className="font-semibold text-red-800 mb-2">步骤2：内容预览</h4>
                          <p className="text-sm text-gray-600 mb-2">查看生成的小说内容：</p>
                          <ul className="text-xs text-gray-600 space-y-1 ml-2">
                            <li>• 实时预览生成的章节</li>
                            <li>• 选择满意的章节内容</li>
                            <li>• 支持失败重新生成</li>
                          </ul>
                          <div className="absolute top-1 right-1 text-red-400 animate-bounce-gentle opacity-40">
                            <AnimeStar className="w-3 h-3" />
                          </div>
                        </div>
                        <div className="p-4 bg-gradient-to-br from-pink-50 to-white rounded-lg border border-pink-200 relative comic-shadow">
                          <h4 className="font-semibold text-pink-800 mb-2">步骤3：角色生成</h4>
                          <p className="text-sm text-gray-600 mb-2">为主角创建视觉形象：</p>
                          <ul className="text-xs text-gray-600 space-y-1 ml-2">
                            <li>• 自主选择AI绘画风格</li>
                            <li>• 调整角色形象参数</li>
                            <li>• 支持细节修改和优化</li>
                          </ul>
                          <div className="absolute top-1 right-1 text-pink-400 animate-pulse-soft opacity-40">
                            <SakuraPetal className="w-3 h-3" />
                          </div>
                        </div>
                        <div className="p-4 rounded-lg border border-orange-200 relative comic-shadow bg-gradient-to-br from-purple-50 to-white">
                          <h4 className="font-semibold text-purple-800 mb-2">步骤4：分镜制作</h4>
                          <p className="text-sm text-gray-600 mb-2">转化为国漫风格分镜：</p>
                          <ul className="text-xs text-gray-600 space-y-1 ml-2">
                            <li>• 单个章节支持生成3-5个章节分镜</li>
                            <li>• 保持场景风格一致性</li>
                            <li>• 支持单个/批量重新生成</li>
                          </ul>
                          <div className="absolute top-1 right-1 text-purple-400 animate-sparkle opacity-40">
                            <ComicSparkle className="w-3 h-3" />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* 核心功能详解 */}
                  <Card className="bg-white/80 backdrop-blur-sm shadow-xl border-orange-100 relative overflow-hidden">
                    <div className="absolute top-2 left-2 text-purple-400 animate-float opacity-20">
                      <JapaneseFan className="w-6 h-6" />
                    </div>
                    <CardHeader>
                      <CardTitle className="text-lg text-gray-700 flex items-center gap-2">
                        📖 核心功能详解
                        <div className="text-red-400 animate-wiggle">
                          <ChineseSeal className="w-4 h-4" />
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-4">
                        <div className="border-l-4 border-orange-500 pl-4 py-2 bg-orange-50/50 rounded-r relative">
                          <h4 className="font-semibold text-gray-800 mb-1">📝 小说生成模块</h4>
                          <p className="text-sm text-gray-600 mb-2">智能文本生成，支持多样化创作需求</p>
                          <ul className="text-xs text-gray-600 space-y-1 ml-2">
                            <li>• <strong>题材支持：</strong>玄幻、都市、历史、科幻、武侠等多种题材</li>
                            <li>• <strong>风格自定义：</strong>可设定写作风格、叙事节奏、情感基调</li>
                            <li>• <strong>智能生成：</strong>根据关键情节和主角特征自动创作完整故事</li>
                            <li>• <strong>内容质量：</strong>符合叙事逻辑，情节连贯，人物性格鲜明</li>
                          </ul>
                          <div className="absolute top-2 -left-2 text-orange-400 animate-bounce-gentle opacity-50">
                            <CuteEmoji className="w-3 h-3" type="love" />
                          </div>
                        </div>
                        
                        <div className="border-l-4 border-red-500 pl-4 py-2 bg-red-50/50 rounded-r relative">
                          <h4 className="font-semibold text-gray-800 mb-1">👤 角色生成模块</h4>
                          <p className="text-sm text-gray-600 mb-2">为小说主角创建专属视觉形象</p>
                          <ul className="text-xs text-gray-600 space-y-1 ml-2">
                            <li>• 生成方式：提供AI绘画两种生成</li>
                            <li>• <strong>章节选择：</strong>从生成的小说中选择具体章节或情节作为参考</li>
                            <li>• <strong>形象定制：</strong>支持角色形象参数调整和细节修改</li>
                            <li>• <strong>照片生成：</strong>生成高质量的主角角色形象照片</li>
                          </ul>
                          <div className="absolute top-2 -left-2 text-red-400 animate-pulse-soft opacity-50">
                            <AnimeStar className="w-3 h-3" />
                          </div>
                        </div>
                        
                        <div className="border-l-4 border-pink-500 pl-4 py-2 bg-pink-50/50 rounded-r relative">
                          <h4 className="font-semibold text-gray-800 mb-1">🎬 图片生成模块（分镜制作）</h4>
                          <p className="text-sm text-gray-600 mb-2">将小说转化为国漫风格的视觉化作品</p>
                          <ul className="text-xs text-gray-600 space-y-1 ml-2">
                            <li>• <strong>国漫风格：</strong>自动渲染为国漫风格分镜图片</li>
                            <li>• <strong>构图专业：</strong>分镜构图符合漫画叙事逻辑</li>
                            <li>• 批量处理：支持一次性生成5-10个章节的配套漫画图片</li>
                            <li>• <strong>重新生成：</strong>支持批量重新生成和单个重新生成</li>
                          </ul>
                          <div className="absolute top-2 -left-2 text-pink-400 animate-wiggle opacity-50">
                            <SakuraPetal className="w-3 h-3" />
                          </div>
                        </div>

                        <div className="border-l-4 border-blue-500 pl-4 py-2 bg-blue-50/50 rounded-r relative">
                          <h4 className="font-semibold text-gray-800 mb-1">📜 码上做剧本</h4>
                          <p className="text-sm text-gray-600 mb-2">专业的剧本创作工具，助力影视剧本创作</p>
                          <ul className="text-xs text-gray-600 space-y-1 ml-2">
                            <li>• <strong>剧本生成：</strong>根据故事大纲自动生成专业剧本格式</li>
                            <li>• <strong>场景设计：</strong>智能规划场景切换和镜头语言</li>
                            <li>• <strong>对话优化：</strong>自动优化人物对话，符合影视剧本规范</li>
                            <li>• <strong>格式标准：</strong>符合行业标准的剧本格式输出</li>
                          </ul>
                          <div className="absolute top-2 -left-2 text-blue-400 animate-bounce-gentle opacity-50">
                            <AnimeStar className="w-3 h-3" />
                          </div>
                        </div>

                        <div className="border-l-4 border-indigo-500 pl-4 py-2 bg-indigo-50/50 rounded-r relative">
                          <h4 className="font-semibold text-gray-800 mb-1">🎥 码上拍戏</h4>
                          <p className="text-sm text-gray-600 mb-2">辅助拍摄工具，让剧本变成现实</p>
                          <ul className="text-xs text-gray-600 space-y-1 ml-2">
                            <li>• <strong>分镜辅助：</strong>根据剧本生成详细的分镜头脚本</li>
                            <li>• <strong>拍摄指导：</strong>提供镜头角度、运镜方式等专业建议</li>
                            <li>• <strong>场景规划：</strong>智能规划拍摄场景和道具需求</li>
                            <li>• <strong>进度管理：</strong>帮助团队管理拍摄进度和任务分配</li>
                          </ul>
                          <div className="absolute top-2 -left-2 text-indigo-400 animate-pulse-soft opacity-50">
                            <ComicSparkle className="w-3 h-3" />
                          </div>
                        </div>

                        <div className="border-l-4 border-green-500 pl-4 py-2 bg-green-50/50 rounded-r relative">
                          <h4 className="font-semibold text-gray-800 mb-1">🌐 社区广场</h4>
                          <p className="text-sm text-gray-600 mb-2">创作者交流平台，分享作品与灵感</p>
                          <ul className="text-xs text-gray-600 space-y-1 ml-2">
                            <li>• <strong>作品展示：</strong>发布和展示您的创作作品</li>
                            <li>• <strong>创意交流：</strong>与其他创作者交流创作心得和技巧</li>
                            <li>• <strong>灵感分享：</strong>浏览热门作品，获取创作灵感</li>
                            <li>• 互动评论：点赞、评论自己喜欢的作品</li>
                          </ul>
                          <div className="absolute top-2 -left-2 text-green-400 animate-wiggle opacity-50">
                            <CuteEmoji className="w-3 h-3" type="happy" />
                          </div>
                        </div>

                        <div className="border-l-4 border-purple-500 pl-4 py-2 bg-purple-50/50 rounded-r relative">
                          <h4 className="font-semibold text-gray-800 mb-1">🛠️ 辅助功能</h4>
                          <p className="text-sm text-gray-600 mb-2">提升创作效率的实用工具</p>
                          <ul className="text-xs text-gray-600 space-y-1 ml-2">
                            <li>• <strong>实时预览：</strong>角色生成和漫画分镜阶段支持实时预览</li>
                            <li>• <strong>版本对比：</strong>可保存不同生成方案，方便对比选择</li>
                            <li>• <strong>批量操作：</strong>支持批量生成等高效操作</li>
                          </ul>
                          <div className="absolute top-2 -left-2 text-purple-400 animate-sparkle opacity-50">
                            <ComicSparkle className="w-3 h-3" />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* 界面交互说明 */}
                  <Card className="bg-white/80 backdrop-blur-sm shadow-xl border-orange-100 relative overflow-hidden chinese-pattern">
                    <div className="absolute bottom-2 right-2 text-indigo-400 animate-spin-slow opacity-15">
                      <ChineseCloud className="w-10 h-6" />
                    </div>
                    <CardHeader>
                      <CardTitle className="text-lg text-gray-700 flex items-center gap-2">
                        🖥️ 界面交互说明
                        <div className="text-blue-400 animate-pulse-soft">
                          <ComicSparkle className="w-4 h-4" />
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-3">
                        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <h4 className="font-semibold text-gray-800 mb-1">三段式操作界面</h4>
                          <ul className="text-sm text-gray-600 space-y-1 ml-2">
                            <li>• <strong>需求输入区：</strong>输入小说创作需求、题材、风格等要素</li>
                            <li>• <strong>内容选择区：</strong>选择章节、角色、分镜等内容进行操作</li>
                            <li>• <strong>生成预览区：</strong>实时查看生成结果，支持预览和对比</li>
                          </ul>
                        </div>
                        <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                          <h4 className="font-semibold text-gray-800 mb-1">响应式设计</h4>
                          <p className="text-sm text-gray-600">支持PC、平板、手机端跨平台适配，随时随地进行创作</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* 使用技巧 */}
                  <Card className="bg-white/80 backdrop-blur-sm shadow-xl border-orange-100 relative overflow-hidden japanese-wave">
                    <div className="absolute top-2 left-2 text-purple-400 animate-float opacity-20">
                      <JapaneseFan className="w-6 h-6" />
                    </div>
                    <CardHeader>
                      <CardTitle className="text-lg text-gray-700 flex items-center gap-2">
                        💡 使用技巧与建议
                        <div className="text-yellow-400 animate-sparkle">
                          <ComicBubble className="w-4 h-4" text="!" />
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2 relative p-3 rounded-lg border border-orange-100">
                          <h4 className="font-semibold text-gray-800">📝 小说创作建议</h4>
                          <ul className="text-sm text-gray-600 space-y-1">
                            <li>• 详细描述主角特征和性格</li>
                            <li>• 明确指定题材和写作风格</li>
                            <li>• 提供关键情节或转折点</li>
                            <li>• 设定故事背景和世界观</li>
                          </ul>
                          <div className="absolute -top-1 -right-1 text-green-400 animate-bounce-gentle opacity-40">
                            <CuteEmoji className="w-3 h-3" type="wink" />
                          </div>
                        </div>
                        <div className="space-y-2 relative p-3 bg-gradient-to-br from-pink-50 to-white rounded-lg border border-pink-100">
                          <h4 className="font-semibold text-gray-800">🎨 角色生成技巧</h4>
                          <ul className="text-sm text-gray-600 space-y-1">
                            <li>• 选择描述详细的章节作为参考</li>
                            <li>• 根据需求智能选择绘画风格</li>
                            <li>• 利用参数调整功能优化形象</li>
                            <li>• 不满意可以重新生成</li>
                          </ul>
                          <div className="absolute -top-1 -right-1 text-pink-400 animate-pulse-soft opacity-40">
                            <SakuraPetal className="w-3 h-3" />
                          </div>
                        </div>
                        <div className="space-y-2 relative p-3 bg-gradient-to-br from-purple-50 to-white rounded-lg border border-purple-100">
                          <h4 className="font-semibold text-gray-800">🎬 分镜制作优化</h4>
                          <ul className="text-sm text-gray-600 space-y-1">
                            <li>• 使用批量生成提高效率</li>
                            <li>• 不满意的分镜可单独重新生成</li>
                            <li>• 注意内容避免敏感词汇</li>
                            <li>• 利用实时预览功能检查效果</li>
                          </ul>
                          <div className="absolute -top-1 -right-1 text-purple-400 animate-sparkle opacity-40">
                            <ComicSparkle className="w-3 h-3" />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* 常见问题 */}
                  <Card className="bg-white/80 backdrop-blur-sm shadow-xl border-orange-100 relative overflow-hidden">
                    <div className="absolute bottom-2 right-2 text-indigo-400 animate-spin-slow opacity-15">
                      <ChineseCloud className="w-10 h-6" />
                    </div>
                    <CardHeader>
                      <CardTitle className="text-lg text-gray-700 flex items-center gap-2">
                        ❓ 常见问题解答
                        <div className="text-red-400 animate-wiggle">
                          <ComicBubble className="w-4 h-4" text="?" />
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-3">
                        <div className="relative p-3 bg-gray-50 rounded-lg">
                          <h4 className="font-semibold text-gray-800">Q: 生成时间需要多久？</h4>
                          <p className="text-sm text-gray-600">A: 小说生成通常需要1-5分钟，角色和分镜生成可能需要1-3分钟。批量生成5-10个章节的分镜可能需要3-5分钟，具体时间取决于内容复杂度和服务器负载。</p>
                          <div className="absolute -top-1 -left-3 text-yellow-400 animate-sparkle opacity-30">
                            <AnimeStar className="w-3 h-3" />
                          </div>
                        </div>
                        <div className="relative p-3 bg-gray-50 rounded-lg">
                          <h4 className="font-semibold text-gray-800">Q: 生成失败怎么办？</h4>
                          <p className="text-sm text-gray-600">A: 平台支持批量重新生成和单个重新生成功能，避免AI生成失败导致的内容缺失。如果分镜多次生成失败，可能是内容涉及敏感词，建议修改小说内容后重试。</p>
                          <div className="absolute -top-1 -left-3 text-pink-400 animate-bounce-gentle opacity-30">
                            <CuteEmoji className="w-3 h-3" type="love" />
                          </div>
                        </div>

                      </div>
                    </CardContent>
                  </Card>
                </div>
              </DialogContent>
            </Dialog>

            {/* 用户登录按钮 - 移动端隐藏 */}
            {currentUser ? (
              <div className="hidden min-[730px]:flex items-center gap-2">
                {/* 管理后台按钮 - 仅管理员可见 */}
                {isAdmin && (
                  <Button
                    variant="outline"
                    onClick={handleNavigateToAdmin}
                    className="flex items-center gap-2 border-orange-500 text-white bg-primary hover:bg-primary hover:text-white"
                    style={{ height: '2.25rem' }}
                  >
                    <Shield className="h-4 w-4" />
                    管理后台
                  </Button>
                )}
                
                {/* 会员标识 - 点击跳转到会员中心 */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/membership')}
                  className="p-1 h-auto hover:bg-accent"
                  title="会员中心"
                >
                  <MembershipBadge 
                    level={currentUser.membership_level || 'free'} 
                    size="md"
                  />
                </Button>
                
                {/* 用户头像 - 悬浮显示用户信息 */}
                <HoverCard 
                  openDelay={200} 
                  closeDelay={100}
                  onOpenChange={(open) => {
                    if (open) {
                      // 当HoverCard打开时，刷新用户信息
                      refreshUser();
                    }
                  }}
                >
                  <HoverCardTrigger asChild>
                    <Button
                      variant="ghost"
                      className="flex items-center gap-2 h-auto p-2 hover:bg-accent"
                    >
                      <div className="relative">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={currentUser.avatar_url || undefined} />
                          <AvatarFallback>
                            <UserCircle className="h-5 w-5" />
                          </AvatarFallback>
                        </Avatar>
                        {/* 会员等级标识 */}
                        {currentUser.membership_level && currentUser.membership_level !== 'free' && (
                          <div 
                            className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold text-white border border-white shadow-sm"
                            style={{ 
                              backgroundColor: membershipConfig[currentUser.membership_level].color 
                            }}
                          >
                            V
                          </div>
                        )}
                      </div>
                    </Button>
                  </HoverCardTrigger>
                  <HoverCardContent className="w-80" align="end" side="bottom">
                    <div className="space-y-4">
                      {/* 用户基本信息 */}
                      <div className="flex items-center gap-3">
                        {/* 头像区域 - 可点击编辑 */}
                        <div className="relative group flex-shrink-0">
                          <Avatar className="h-16 w-16">
                            <AvatarImage src={currentUser.avatar_url || undefined} />
                            <AvatarFallback>
                              <UserCircle className="h-8 w-8" />
                            </AvatarFallback>
                          </Avatar>
                          <button
                            onClick={() => setAvatarDialogOpen(true)}
                            className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            title="更换头像"
                          >
                            <Camera className="h-5 w-5 text-white" />
                          </button>
                          {/* 会员等级标识 */}
                          {currentUser.membership_level && currentUser.membership_level !== 'free' && (
                            <div 
                              className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white border-2 border-white shadow-md z-10"
                              style={{ 
                                backgroundColor: membershipConfig[currentUser.membership_level].color 
                              }}
                            >
                              V
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-lg">
                              {currentUser.nickname || '未设置昵称'}
                            </p>
                            {/* 昵称编辑按钮 */}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setNewNickname(currentUser.nickname || '');
                                setNicknameDialogOpen(true);
                              }}
                              className="h-6 w-6 p-0"
                              title="修改昵称"
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            <MembershipBadge 
                              level={currentUser.membership_level || 'free'} 
                              size="sm"
                            />
                            {/* 会员状态徽章 */}
                            <Badge 
                              variant="secondary"
                              className="cursor-pointer hover:bg-primary/20 transition-colors"
                              onClick={() => {
                                navigate('/membership');
                              }}
                            >
                              {currentUser.membership_level === 'free' ? (
                                <>
                                  <Crown className="mr-1 h-3 w-3" />
                                  成为会员
                                </>
                              ) : currentUser.membership_level === 'premium' ? (
                                <>
                                  <Crown className="mr-1 h-3 w-3" />
                                  会员中心
                                </>
                              ) : (
                                <>
                                  <ArrowUp className="mr-1 h-3 w-3" />
                                  升级会员
                                </>
                              )}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {currentUser.phone || '未绑定联系方式'}
                          </p>
                        </div>
                      </div>
                      
                      <Separator />
                      
                      {/* 会员信息 */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">会员等级</span>
                          <span className="text-sm font-medium">
                            {membershipConfig[currentUser.membership_level || 'free'].name}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground flex items-center gap-1">
                            码分余额
                                                      </span>
                          <span className="text-sm font-medium text-primary">
                            {currentUser.credits || 0} 码分
                          </span>
                        </div>
                        {currentUser.last_credit_grant_date && (
                          <></>
                        )}
                      </div>
                      
                      <Separator />
                      
                      {/* 快捷操作 */}
                      <div className="flex flex-col gap-2">
                        <Button
                          variant="outline"
                          className="w-full justify-start bg-[#ffffffe6] bg-none text-[#ff5724] hover:bg-[#ffffffe6] hover:text-[#ff5724]"
                          onClick={handleNavigateToProfile}
                        >
                          <UserCircle className="mr-2 h-4 w-4" />
                          个人中心
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-[#ff5724] bg-[#f9f9f9e6] bg-none hover:bg-[#f9f9f9e6] hover:text-[#ff5724]"
                          onClick={handleSignOut}
                        >
                          <LogOut className="mr-2 h-4 w-4" />
                          退出登录
                        </Button>
                      </div>
                    </div>
                  </HoverCardContent>
                </HoverCard>
              </div>
            ) : (
              <Button
                onClick={() => setIsLoginDialogOpen(true)}
                className="hidden min-[730px]:flex bg-gradient-to-r from-[#FF5724] to-[#E64A1F] text-white"
                style={{ height: '2.25rem' }}
              >
                <LogIn className="mr-2 h-4 w-4" />
                登录
              </Button>
            )}
          </div>
        </div>
      </nav>
    </header>
    {/* Banner区域 - #FF5724 主题二次元国漫风格 */}
    <div 
      className="relative overflow-hidden"
      style={{
        height: '28rem',
        backgroundImage: `linear-gradient(rgb(0 0 0 / 70%), rgb(0 0 0 / 70%), rgb(0 0 0 / 60%)), url('https://miaoda-site-img.cdn.bcebos.com/136b43a0-ec17-458e-9f37-926689ac1793/images/2c33e45e-a7d7-11f0-8500-dacf15c4e777_0.jpg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      
      {/* Banner装饰元素 - #FF5724 主题 */}
      <div className="absolute top-8 left-8 text-white/40 animate-float">
        <SakuraPetal className="w-16 h-16" />
      </div>
      <div className="absolute top-12 right-12 text-[#FFCAB8]/60 animate-sparkle">
        <AnimeStar className="w-12 h-12" />
      </div>
      <div className="absolute bottom-16 left-16 text-[#FF8A5B]/50 animate-wiggle">
        <JapaneseFan className="w-14 h-14" />
      </div>
      <div className="absolute bottom-20 right-20 text-white/35 animate-bounce-gentle">
        <ChineseCloud className="w-20 h-12" />
      </div>
      <div className="absolute top-1/3 left-1/4 text-[#FFCAB8]/40 animate-pulse-soft">
        <ComicSparkle className="w-10 h-10" />
      </div>
      <div className="absolute top-1/2 right-1/3 text-[#FF8A5B]/45 animate-spin-slow">
        <CuteEmoji className="w-12 h-12" type="love" />
      </div>
      <div className="absolute bottom-1/3 left-1/3 text-[#E64A1F]/30 animate-wiggle">
        <ChineseSeal className="w-10 h-10" />
      </div>
      
      {/* 新增：更多#FF5724主题装饰元素 */}
      <div className="absolute bottom-24 right-1/4 text-[#FF7A4D]/30 animate-bounce-gentle">
        <AnimeStar className="w-6 h-6" />
      </div>
      <div className="absolute top-1/4 right-12 text-[#FF8A5B]/35 animate-pulse-soft">
        <SakuraPetal className="w-8 h-8" />
      </div>
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center">
        <div className="text-center w-full">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl text-white mb-4 md:mb-6 relative animate-slide-in-cute font-['MF-b0218d84376f046ce3489e541bc5ae64']">码上制片厂</h1>
          <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl text-white/90 mb-3 md:mb-4 px-2 relative animate-slide-in-cute" style={{ animationDelay: '0.2s' }}>从灵感到荧幕，一站成梦 </p>
          <p className="text-base sm:text-lg md:text-xl text-white/80 px-2 relative animate-slide-in-cute" style={{ animationDelay: '0.4s' }}>{"小说创作、剧本生成、短剧视频、自由二创、社区广场"}</p>
          {/* #FF5724 主题标签 */}

          {/* 关于我们链接 */}
          <div className="mt-4 md:mt-6 animate-pop-in" style={{ animationDelay: '0.8s' }}>
            <Link 
              to="/about"
              className="inline-flex items-center gap-2 text-white/90 hover:text-white text-sm sm:text-base font-medium transition-all duration-300 hover:scale-105 group"
            >
              <span className="border-b-2 border-white/50 group-hover:border-white pb-0.5">关于我们</span>
              <svg 
                className="w-4 h-4 transform group-hover:translate-x-1 transition-transform duration-300" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </div>
    {/* 移动端悬浮菜单按钮 - 屏幕宽度<730px时显示 */}
    <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
      <SheetTrigger asChild>
        <button
          className="fixed bottom-20 right-4 max-[729px]:flex hidden items-center justify-center w-14 h-14 bg-gradient-to-r from-[#FF5724] to-[#E64A1F] text-white rounded-full shadow-2xl hover:shadow-3xl transition-all duration-300 z-50 animate-bounce-gentle"
          style={{
            boxShadow: '0 8px 24px rgba(255, 87, 36, 0.4), 0 0 0 4px rgba(255, 87, 36, 0.1)',
          }}
          aria-label="打开菜单"
        >
          <Menu className="h-6 w-6" />
          {/* 脉冲动画圆环 */}
          <span className="absolute inset-0 rounded-full bg-[#FF5724] animate-ping opacity-20"></span>
        </button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl overflow-y-auto">
        <SheetHeader className="pb-4">

        </SheetHeader>
        
        <div className="space-y-6 pb-6">
          {/* 用户信息区域 */}
          <div className="px-1">
            {currentUser ? (
              <div className="space-y-4">
                {/* 用户信息卡片 */}
                <div 
                  className="relative overflow-hidden bg-white rounded-2xl p-4"
                  style={{ border: '1px solid #91919157' }}
                >
                  {/* 装饰性背景 */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#FF5724]/10 to-transparent rounded-full blur-2xl"></div>
                  
                  <div className="relative flex items-center gap-4">
                    {/* 头像区域 - 点击更换头像 */}
                    <div 
                      className="relative flex-shrink-0 cursor-pointer group"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsMobileMenuOpen(false);
                        setAvatarDialogOpen(true);
                      }}
                    >
                      <Avatar className="h-16 w-16 border-3 border-white shadow-lg group-hover:opacity-80 transition-opacity">
                        <AvatarImage src={currentUser.avatar_url || undefined} />
                        <AvatarFallback className="bg-gradient-to-br from-[#FF5724] to-[#E64A1F] text-white">
                          <UserCircle className="h-8 w-8" />
                        </AvatarFallback>
                      </Avatar>
                      {/* 会员等级标识 */}
                      {currentUser.membership_level && currentUser.membership_level !== 'free' && (
                        <div 
                          className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white border-2 border-white shadow-md"
                          style={{ 
                            backgroundColor: membershipConfig[currentUser.membership_level].color 
                          }}
                        >
                          V
                        </div>
                      )}
                      {/* 相机图标提示 */}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                        <Camera className="h-6 w-6 text-white" />
                      </div>
                    </div>
                    
                    {/* 用户信息区域 */}
                    <div className="flex-1 min-w-0">
                      {/* 昵称区域 - 点击修改昵称 */}
                      <div 
                        className="flex items-center gap-2 mb-1 cursor-pointer group"
                        onClick={(e) => {
                          e.stopPropagation();
                          setNewNickname(currentUser.nickname || '');
                          setIsMobileMenuOpen(false);
                          setNicknameDialogOpen(true);
                        }}
                      >
                        <p className="font-bold text-lg text-gray-900 truncate group-hover:text-[#FF5724] transition-colors">
                          {currentUser.nickname}
                        </p>
                        <Edit2 className="h-4 w-4 text-gray-400 group-hover:text-[#FF5724] transition-colors flex-shrink-0" />
                        <MembershipBadge 
                          level={currentUser.membership_level || 'free'} 
                          size="sm"
                        />
                      </div>
                      {/* 个人中心链接 */}
                      <p 
                        className="text-sm text-gray-600 flex items-center gap-1 cursor-pointer hover:text-[#FF5724] transition-colors w-fit"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsMobileMenuOpen(false);
                          handleNavigateToProfile();
                        }}
                      >
                        <span>个人中心</span>
                        <ArrowUp className="h-3 w-3 rotate-90" />
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* 快捷操作按钮组 */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      navigate('/membership');
                    }}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-white rounded-xl border border-gray-200 hover:border-[#FF5724] hover:shadow-md transition-all duration-200 active:scale-95"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-100 to-orange-100 flex items-center justify-center flex-shrink-0">
                      <Crown className="h-4 w-4 text-yellow-600" />
                    </div>
                    <span className="text-sm font-medium text-gray-700">会员中心</span>
                  </button>
                  
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      handleSignOut();
                    }}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-white rounded-xl border border-gray-200 hover:border-red-300 hover:shadow-md transition-all duration-200 active:scale-95"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-100 to-pink-100 flex items-center justify-center flex-shrink-0">
                      <LogOut className="h-4 w-4 text-red-600" />
                    </div>
                    <span className="text-sm font-medium text-gray-700">退出登录</span>
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsLoginDialogOpen(true);
                }}
                className="w-full bg-gradient-to-r from-[#FF5724] to-[#E64A1F] hover:from-[#E64A1F] hover:to-[#FF5724] text-white rounded-2xl p-4 shadow-lg hover:shadow-xl transition-all duration-300 active:scale-95"
              >
                <div className="flex items-center justify-center gap-3">
                  <LogIn className="h-6 w-6" />
                  <span className="text-lg font-bold">登录 / 注册</span>
                </div>
              </button>
            )}
          </div>

          {/* 导航菜单列表 */}
          <div className="px-1">
            <div className="mb-3 px-2">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">功能导航</h3>
            </div>
            <div className="space-y-2">
              {mobileMenuItems.map((item, index) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`group flex items-center gap-4 px-4 py-4 rounded-xl transition-all duration-300 ${
                      isActive
                        ? 'bg-gradient-to-r from-[#FF5724] to-[#E64A1F] text-white shadow-lg scale-[1.02]'
                        : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-100 hover:border-[#FF5724]/30 hover:shadow-md active:scale-95'
                    }`}
                    style={{
                      animationDelay: `${index * 50}ms`
                    }}
                  >
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-300 ${
                      isActive 
                        ? 'bg-white/20' 
                        : 'bg-gradient-to-br from-orange-50 to-pink-50 group-hover:from-orange-100 group-hover:to-pink-100'
                    }`}>
                      <span className={isActive ? 'text-white' : 'text-[#FF5724]'}>
                        {getMenuIcon(item.iconName)}
                      </span>
                    </div>
                    <span className="font-semibold text-base flex-1">{item.name}</span>
                    {isActive && (
                      <div className="w-2 h-2 rounded-full bg-white animate-pulse"></div>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* 管理员入口 */}
          {isAdmin && (
            <div className="px-1">
              <div className="pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    handleNavigateToAdmin();
                  }}
                  className="flex items-center gap-4 px-4 py-4 rounded-xl bg-gradient-to-r from-purple-50 to-indigo-50 text-purple-700 hover:from-purple-100 hover:to-indigo-100 w-full transition-all duration-300 border border-purple-200 hover:shadow-md active:scale-95"
                >
                  <div className="w-11 h-11 rounded-xl bg-purple-200/50 flex items-center justify-center">
                    <Shield className="h-5 w-5" />
                  </div>
                  <span className="font-semibold text-base flex-1">管理后台</span>
                  <ArrowUp className="h-4 w-4 rotate-90" />
                </button>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
    {/* 头像编辑对话框 */}
    <Dialog open={avatarDialogOpen} onOpenChange={(open) => {
      setAvatarDialogOpen(open);
      if (!open) {
        // 关闭时重置状态
        setAvatarFile(null);
        setAvatarPreview('');
        setGeneratedAvatarUrl('');
        setAiPrompt('');
        setAvatarMode('upload');
      }
    }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>更换头像</DialogTitle>
          <DialogDescription>
            选择上传图片或使用AI生成头像
          </DialogDescription>
        </DialogHeader>
        
        {/* 模式切换 */}
        <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
          <button
            onClick={() => setAvatarMode('upload')}
            className={`flex-1 py-2 px-4 rounded-md transition-all ${
              avatarMode === 'upload'
                ? 'bg-white shadow-sm font-medium'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            上传图片
          </button>
          <button
            onClick={() => setAvatarMode('ai')}
            className={`flex-1 py-2 px-4 rounded-md transition-all ${
              avatarMode === 'ai'
                ? 'bg-white shadow-sm font-medium'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            AI生成
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex flex-col items-center gap-4">
            {/* 头像预览 */}
            <Avatar className="h-32 w-32">
              {avatarPreview ? (
                <AvatarImage src={avatarPreview} crossOrigin="anonymous" />
              ) : (
                <>
                  <AvatarImage src={currentUser?.avatar_url || undefined} />
                  <AvatarFallback>
                    <UserCircle className="h-16 w-16" />
                  </AvatarFallback>
                </>
              )}
            </Avatar>
            
            {avatarMode === 'upload' ? (
              /* 上传模式 */
              (<div className="w-full">
                <Label htmlFor="avatar-upload" className="cursor-pointer">
                  <div className="flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary transition-colors">
                    <Camera className="h-5 w-5" />
                    <span>选择图片</span>
                  </div>
                </Label>
                <Input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
                <p className="text-xs text-gray-500 mt-2 text-center">
                  支持JPG、PNG格式，大小不超过1MB
                </p>
              </div>)
            ) : (
              /* AI生成模式 */
              (<div className="w-full space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="ai-prompt">描述您想要的头像</Label>
                  <Input
                    id="ai-prompt"
                    placeholder="例如：可爱的动漫风格女孩头像"
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    disabled={isGenerating}
                  />
                  <p className="text-xs text-gray-500">
                    描述越详细，生成效果越好
                  </p>
                </div>
                <Button
                  onClick={handleGenerateAvatar}
                  disabled={!aiPrompt.trim() || isGenerating}
                  className="w-full"
                >
                  {isGenerating ? (
                    <>
                      <span className="animate-spin mr-2">⏳</span>
                      生成中...
                    </>
                  ) : (
                    <>
                      <Camera className="mr-2 h-4 w-4" />
                      生成头像
                    </>
                  )}
                </Button>
              </div>)
            )}
          </div>
        </div>
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setAvatarDialogOpen(false);
              setAvatarFile(null);
              setAvatarPreview('');
              setGeneratedAvatarUrl('');
              setAiPrompt('');
              setAvatarMode('upload');
            }}
            disabled={isUploading || isGenerating}
          >
            取消
          </Button>
          <Button
            onClick={avatarMode === 'upload' ? handleUploadAvatar : handleSaveGeneratedAvatar}
            disabled={
              (avatarMode === 'upload' && !avatarFile) ||
              (avatarMode === 'ai' && !generatedAvatarUrl) ||
              isUploading ||
              isGenerating
            }
          >
            {isUploading ? '保存中...' : '确认保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    {/* 昵称编辑对话框 */}
    <Dialog open={nicknameDialogOpen} onOpenChange={setNicknameDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>修改昵称</DialogTitle>
          <DialogDescription>
            请输入您的新昵称
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nickname">昵称</Label>
            <Input
              id="nickname"
              value={newNickname}
              onChange={(e) => setNewNickname(e.target.value)}
              placeholder="请输入昵称"
              maxLength={20}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setNicknameDialogOpen(false);
              setNewNickname('');
            }}
          >
            取消
          </Button>
          <Button
            onClick={handleUpdateNickname}
            disabled={!newNickname.trim() || isUploading}
          >
            {isUploading ? '保存中...' : '确认修改'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    {/* 登录对话框 */}
    <LoginDialog 
      open={isLoginDialogOpen} 
      onOpenChange={setIsLoginDialogOpen}
      onLoginSuccess={handleLoginSuccess}
    />
  </>
);
};

export default Header;