import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getCurrentUser, getUserProfile, checkAndGrantMonthlyCredits } from '@/db/api';
import { supabase } from '@/db/supabase';
import type { DbUser } from '@/types/database';

interface AuthContextType {
  currentUser: DbUser | null;
  isLoading: boolean;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth必须在AuthProvider内部使用');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [currentUser, setCurrentUser] = useState<DbUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 刷新用户信息
  const refreshUser = async () => {
    console.log('🔄 [AuthContext] 刷新用户信息');
    try {
      const user = await getCurrentUser();
      
      if (user) {
        console.log('✅ [AuthContext] 用户已登录，用户ID:', user.id);
        const profile = await getUserProfile(user.id);
        
        if (profile) {
          setCurrentUser(profile);
          console.log('✅ [AuthContext] 已更新用户状态');
          
          // 检查并发放每月码分
          try {
            await checkAndGrantMonthlyCredits(user.id);
          } catch (error) {
            console.error('❌ [AuthContext] 发放每月码分失败:', error);
          }
        } else {
          console.warn('⚠️ [AuthContext] 未获取到用户资料，保持当前状态');
          // 不清空currentUser，避免闪烁
        }
      } else {
        console.log('ℹ️ [AuthContext] 用户未登录');
        // 只有在明确未登录时才清空状态
        setCurrentUser(null);
      }
    } catch (error) {
      console.error('❌ [AuthContext] 刷新用户信息失败:', error);
      // 发生错误时保持当前状态，不清空用户信息
      console.warn('⚠️ [AuthContext] 保持当前用户状态，避免登录状态丢失');
    }
  };

  // 登出
  const logout = async () => {
    console.log('👋 [AuthContext] 用户登出');
    await supabase.auth.signOut();
    setCurrentUser(null);
  };

  // 初始化和定期检查
  useEffect(() => {
    let isMounted = true;
    let refreshInterval: NodeJS.Timeout | null = null;

    const initialize = async () => {
      console.log('🚀 [AuthContext] 初始化Auth状态');
      setIsLoading(true);
      
      if (isMounted) {
        await refreshUser();
        setIsLoading(false);
      }
    };

    // 初始化
    initialize();

    // 每30分钟检查一次登录状态（降低频率，避免影响session稳定性）
    refreshInterval = setInterval(() => {
      console.log('⏰ [AuthContext] 定期检查登录状态（30分钟间隔）');
      if (isMounted && currentUser) {
        // 只有在已登录状态下才定期刷新
        refreshUser();
      }
    }, 30 * 60 * 1000); // 30分钟

    // 监听auth状态变化
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔔 [AuthContext] Auth状态变化:', event);
      console.log('🔔 [AuthContext] Session状态:', session ? '存在' : '不存在');
      
      if (event === 'SIGNED_IN' && session && isMounted) {
        console.log('✅ [AuthContext] 用户已登录，刷新用户信息');
        await refreshUser();
      } else if (event === 'SIGNED_OUT' && isMounted) {
        console.log('❌ [AuthContext] 用户已登出，清除用户状态');
        setCurrentUser(null);
      } else if (event === 'TOKEN_REFRESHED' && isMounted) {
        console.log('🔄 [AuthContext] Token已刷新');
      }
    });

    return () => {
      isMounted = false;
      if (refreshInterval) {
        clearInterval(refreshInterval);
        console.log('🧹 [AuthContext] 清除定时器');
      }
      subscription.unsubscribe();
      console.log('🧹 [AuthContext] 取消Auth监听');
    };
  }, []);

  const value: AuthContextType = {
    currentUser,
    isLoading,
    refreshUser,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
