import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  BookOpen, 
  Palette, 
  FileText, 
  Video, 
  GitBranch, 
  Users, 
  Sparkles,
  Zap,
  Heart,
  Star,
  ArrowRight,
  Home
} from 'lucide-react';
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

export default function AboutPage() {
  const features = [
    {
      icon: <BookOpen className="h-8 w-8" />,
      title: '小说创作',
      description: '支持多题材小说智能生成，包含爆款标题和类型识别，支持玄幻、都市、历史等多种题材和写作风格。AI智能创作，让灵感变成精彩故事。',
      color: 'from-purple-500 to-pink-500'
    },
    {
      icon: <Palette className="h-8 w-8" />,
      title: '角色生成与漫画制作',
      description: '提供AI绘画生成角色形象，自动转化为漫画风格分镜图片，保持人物形象一致性。让你的角色栩栩如生，故事跃然纸上。',
      color: 'from-blue-500 to-cyan-500'
    },
    {
      icon: <FileText className="h-8 w-8" />,
      title: '码上做剧本',
      description: '根据小说章节内容生成标准格式剧本，支持剧本编辑和修改，符合专业剧本格式要求。从小说到剧本，一键转换。',
      color: 'from-green-500 to-emerald-500'
    },
    {
      icon: <Video className="h-8 w-8" />,
      title: '码上拍戏',
      description: '基于剧本进行六个方面的专业拍戏分析，包含服装、化妆、道具、布景、造型逻辑和综合分析，提供参考图片生成。支持短视频生成功能，将剧本内容转化为精彩的短视频作品。专业指导，助力影视制作。',
      color: 'from-orange-500 to-red-500'
    },
    {
      icon: <GitBranch className="h-8 w-8" />,
      title: '平行世界二创',
      description: '支持基于任意章节的平行世界二创续写，创造全新的故事发展方向，保持原有内容不变。无限可能，由你创造。',
      color: 'from-indigo-500 to-purple-500'
    },
    {
      icon: <Users className="h-8 w-8" />,
      title: '互动社区',
      description: '提供社区广场、小说分享、帖子发布、签到码分、评论等社区功能。与创作者交流，分享你的作品。',
      color: 'from-pink-500 to-rose-500'
    }
  ];

  const highlights = [
    {
      icon: <Sparkles className="h-6 w-6" />,
      title: 'AI智能生成',
      description: '采用先进的AI技术，支持小说、角色、分镜、剧本的智能生成'
    },
    {
      icon: <Zap className="h-6 w-6" />,
      title: '漫画风格',
      description: '专注漫画风格的视觉呈现，符合国内用户审美偏好'
    },
    {
      icon: <Heart className="h-6 w-6" />,
      title: '完整工具链',
      description: '从创意到成品的完整创作工具链，满足不同创作需求'
    },
    {
      icon: <Star className="h-6 w-6" />,
      title: '社区生态',
      description: '活跃的创作者社区，支持作品分享、互动交流、二次创作'
    }
  ];

  const steps = [
    {
      number: '01',
      title: '新用户入门',
      description: '注册账号获得100码分奖励，完成首次小说创作体验',
      icon: <CuteEmoji type="happy" className="h-8 w-8" />
    },
    {
      number: '02',
      title: '创作流程',
      description: '从小说创作开始，逐步生成角色、分镜、剧本、拍戏分析的完整创作链条',
      icon: <ComicSparkle className="h-8 w-8" />
    },
    {
      number: '03',
      title: '社区互动',
      description: '分享作品到社区，参与讨论，通过签到、发帖、分享等方式获得码分',
      icon: <JapaneseFan className="h-8 w-8" />
    },
    {
      number: '04',
      title: '平行世界玩法',
      description: '选择喜欢的小说章节进行二创，创造属于自己的平行世界故事',
      icon: <ChineseCloud className="h-8 w-8" />
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 relative overflow-hidden">
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 text-[#FF8A5B] animate-float opacity-20">
          <SakuraPetal className="w-16 h-16" />
        </div>
        <div className="absolute top-40 right-20 text-[#FFCAB8] animate-sparkle opacity-30">
          <AnimeStar className="w-12 h-12" />
        </div>
        <div className="absolute bottom-40 left-1/4 text-[#FF7A4D] animate-wiggle opacity-25">
          <ComicBubble className="w-20 h-20" />
        </div>
        <div className="absolute top-1/3 right-1/4 text-[#E64A1F] animate-bounce-gentle opacity-20">
          <ChineseSeal className="w-16 h-16" />
        </div>
        <div className="absolute bottom-20 right-10 text-[#FF5724] animate-float opacity-25">
          <JapaneseFan className="w-14 h-14" />
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">
        {/* 页面头部 */}
        <div className="text-center mb-16 animate-slide-in-cute">
          <div className="flex items-center justify-center gap-3 mb-4">
            <ComicSparkle className="h-10 w-10 text-[#FF5724] animate-sparkle" />
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-[#FF5724] to-[#E64A1F] bg-clip-text text-transparent font-['MF-8ce23c6b83aac587a3ceffadd1056176']">关于我们</h1>
            <ComicSparkle className="h-10 w-10 text-[#FF5724] animate-sparkle" />
          </div>

        </div>

        {/* 平台介绍 */}
        <Card className="mb-12 border-2 border-[#FF5724]/20 shadow-xl animate-pop-in">

          <CardContent className="pt-6 mt-[0px] mb-[10px]">
            <div className="space-y-4 text-base md:text-lg text-gray-700 leading-relaxed">
              <p className="text-center text-[18px]">
                <span className="text-[#000000ff]">码上制片厂</span>是一个集<span className="text-[#000000ff]">小说创作</span>、<span className="text-[#000000ff]">角色生成</span>、<span className="text-[#000000ff]">漫画分镜制作</span>、<span className="text-[#000000ff]">剧本生成</span>、<span className="text-[#000000ff]">拍戏分析</span>、<span className="text-[#000000ff]">平行世界二创</span>、<span className="text-[#000000ff]">互动社区</span>于一体的综合性创作平台。
              </p>
              <p className="text-center">
                支持用户通过输入创作需求，自动生成小说内容并将其转化为<span className="text-[#000000ff]">漫画风格</span>的视觉化作品，提供完整的从小说到影视制作的创作工具链。
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 核心功能 */}
        <div className="mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-8 bg-gradient-to-r from-[#FF5724] to-[#E64A1F] bg-clip-text text-transparent flex items-center justify-center gap-3">核心功能</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card 
                key={index} 
                className="border-2 hover:border-[#FF5724] transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 animate-pop-in group"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <CardHeader>
                  <div className={`w-16 h-16 rounded-full bg-gradient-to-r ${feature.color} flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    {feature.icon}
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* 使用指南 */}
        <div className="mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-8 bg-gradient-to-r from-[#FF5724] to-[#E64A1F] bg-clip-text text-transparent flex items-center justify-center gap-3">使用指南</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {steps.map((step, index) => (
              <Card 
                key={index} 
                className="border-2 border-[#FF5724]/20 hover:border-[#FF5724] transition-all duration-300 hover:shadow-xl animate-slide-in-cute"
                style={{ animationDelay: `${index * 0.15}s` }}
              >
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-r from-[#FF5724] to-[#E64A1F] flex items-center justify-center text-white font-bold text-xl">
                        {step.number}
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="text-[#FF5724]">{step.icon}</div>
                        <h3 className="text-xl font-bold text-gray-800">{step.title}</h3>
                      </div>
                      <p className="text-gray-600 leading-relaxed">{step.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* 特色亮点 */}
        <div className="mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-8 bg-gradient-to-r from-[#FF5724] to-[#E64A1F] bg-clip-text text-transparent flex items-center justify-center gap-3">
            <Star className="h-8 w-8 text-[#FF5724]" />
            特色亮点
            <Star className="h-8 w-8 text-[#FF5724]" />
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {highlights.map((highlight, index) => (
              <Card 
                key={index} 
                className="border-2 border-[#FF5724]/20 hover:border-[#FF5724] transition-all duration-300 hover:shadow-xl text-center animate-pop-in group"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <CardContent className="pt-6">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-r from-[#FF5724] to-[#E64A1F] flex items-center justify-center text-white mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                    {highlight.icon}
                  </div>
                  <h3 className="text-lg font-bold text-gray-800 mb-2">{highlight.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{highlight.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* 技术特色 */}
        <Card className="mb-12 border-2 border-[#FF5724]/20 shadow-xl">
          <CardHeader className="bg-white">
            <CardTitle className="text-2xl md:text-3xl text-center flex items-center justify-center gap-3">技术特色</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <ArrowRight className="h-5 w-5 text-[#FF5724] mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-1">响应式设计</h4>
                    <p className="text-gray-600 text-sm">完美适配PC、平板、手机等各种设备</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <ArrowRight className="h-5 w-5 text-[#FF5724] mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-1">实时生成</h4>
                    <p className="text-gray-600 text-sm">支持实时内容生成和进度显示</p>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <ArrowRight className="h-5 w-5 text-[#FF5724] mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-1">数据安全</h4>
                    <p className="text-gray-600 text-sm">完善的数据存储和备份机制</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <ArrowRight className="h-5 w-5 text-[#FF5724] mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-1">用户体验</h4>
                    <p className="text-gray-600 text-sm">简洁易用的界面设计，符合二次元用户喜好</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 底部操作区 */}
        <div className="text-center space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/">
              <Button 
                size="lg" 
                className="bg-gradient-to-r from-[#FF5724] to-[#E64A1F] hover:from-[#E64A1F] hover:to-[#FF5724] text-white shadow-lg hover:shadow-xl transition-all duration-300 text-base px-8"
              >
                <Home className="mr-2 h-5 w-5" />
                返回首页
              </Button>
            </Link>
            <Link to="/community">
              <Button 
                size="lg" 
                className="bg-gradient-to-r from-[#FF5724] to-[#E64A1F] hover:from-[#E64A1F] hover:to-[#FF5724] text-white shadow-lg hover:shadow-xl transition-all duration-300 text-base px-8"
              >
                <Users className="mr-2 h-5 w-5" />
                加入社区
              </Button>
            </Link>
          </div>
          <p className="text-gray-500 text-sm">
            开启你的创作之旅，让灵感在这里绽放 ✨
          </p>
        </div>
      </div>
    </div>
  );
}
