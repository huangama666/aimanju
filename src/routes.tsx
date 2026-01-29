import NovelCreationPage from './pages/NovelCreationPage';
import ProfilePage from './pages/ProfilePage';
import NovelDetailPage from './pages/NovelDetailPage';
import NovelEditPage from './pages/NovelEditPage';
import CommunityPage from './pages/CommunityPage';
import PostDetailPage from './pages/PostDetailPage';
import SearchResultsPage from './pages/SearchResultsPage';
import CreatorProfilePage from './pages/CreatorProfilePage';
import ScriptGenerationPage from './pages/ScriptGenerationPage';
import FilmingPreparationPage from './pages/FilmingPreparationPage';
import FilmingPage from './pages/FilmingPage';
import NovelsPage from './pages/NovelsPage';
import ParallelWorldPage from './pages/ParallelWorldPage';
import AdminPage from './pages/admin/AdminPage';
import SystemSettings from './pages/admin/SystemSettings';
import AboutPage from './pages/AboutPage';
import Membership from './pages/Membership';
import TestChatPage from './pages/TestChatPage';
import type { ReactNode } from 'react';

interface RouteConfig {
  name: string;
  path: string;
  element: ReactNode;
  visible?: boolean;
}

const routes: RouteConfig[] = [
  {
    name: '码上制片厂',
    path: '/',
    element: <NovelCreationPage />
  },
  {
    name: '码上做剧本',
    path: '/script',
    element: <ScriptGenerationPage />
  },
  {
    name: '码上准备',
    path: '/preparation',
    element: <FilmingPreparationPage />
  },
  {
    name: '码上拍戏',
    path: '/filming',
    element: <FilmingPage />
  },
  {
    name: '社区广场',
    path: '/community',
    element: <CommunityPage />
  },
  {
    name: '看小说',
    path: '/novels',
    element: <NovelsPage />
  },
  {
    name: '平行世界',
    path: '/parallel',
    element: <ParallelWorldPage />
  },
  {
    name: '搜索结果',
    path: '/search',
    element: <SearchResultsPage />,
    visible: false
  },
  {
    name: '会员中心',
    path: '/membership',
    element: <Membership />,
    visible: false
  },
  {
    name: '个人中心',
    path: '/profile',
    element: <ProfilePage />,
    visible: false
  },
  {
    name: '小说详情',
    path: '/novel/:id',
    element: <NovelDetailPage />,
    visible: false
  },
  {
    name: '编辑作品',
    path: '/novel/:id/edit',
    element: <NovelEditPage />,
    visible: false
  },
  {
    name: '帖子详情',
    path: '/community/post/:id',
    element: <PostDetailPage />,
    visible: false
  },
  {
    name: '创作者主页',
    path: '/creator/:id',
    element: <CreatorProfilePage />,
    visible: false
  },
  {
    name: '管理后台',
    path: '/admin',
    element: <AdminPage />,
    visible: false
  },
  {
    name: '码分设置',
    path: '/admin/settings',
    element: <SystemSettings />,
    visible: false
  },
  {
    name: '关于我们',
    path: '/about',
    element: <AboutPage />,
    visible: false
  },
  {
    name: 'AI测试聊天',
    path: '/test-chat',
    element: <TestChatPage />,
    visible: false
  }
];

export default routes;