import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("缺少Supabase环境变量");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // 自动刷新token
    autoRefreshToken: true,
    // 持久化session到localStorage
    persistSession: true,
    // 检测session变化
    detectSessionInUrl: true,
    // 设置storage key，确保session正确保存
    storageKey: 'supabase.auth.token',
    // 使用localStorage作为存储
    storage: window.localStorage,
    // 禁用lock机制，避免热重载时的冲突
    lock: async (_name: string, _acquireTimeout: number, fn: () => Promise<any>) => {
      return await fn();
    },
  },
});
