import { useState, useEffect } from 'react';

/**
 * 持久化状态Hook，自动保存到localStorage
 */
export function usePersistentState<T>(
  key: string,
  defaultValue: T
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [state, setState] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.warn(`从localStorage读取${key}失败:`, error);
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(state));
    } catch (error) {
      console.warn(`保存${key}到localStorage失败:`, error);
    }
  }, [key, state]);

  return [state, setState];
}

/**
 * 清除指定key的localStorage数据
 */
export function clearPersistentState(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch (error) {
    console.warn(`清除localStorage中的${key}失败:`, error);
  }
}

/**
 * 清除所有小说相关的localStorage数据
 */
export function clearAllNovelData() {
  const keys = [
    'novel-characters',
    'novel-comic-panels',
    'novel-current-novel',
    'novel-selected-chapter'
  ];
  
  keys.forEach(key => clearPersistentState(key));
}