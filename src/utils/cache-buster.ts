/**
 * 图片URL缓存破坏工具
 * 
 * 用于解决浏览器缓存导致的跨域问题
 */

/**
 * 为图片URL添加缓存破坏参数
 * @param url 原始图片URL
 * @returns 添加了缓存破坏参数的URL
 */
export function addCacheBuster(url: string | undefined | null): string {
  if (!url) return '';
  
  // 如果URL已经包含缓存破坏参数，直接返回
  if (url.includes('_cb=') || url.includes('t=')) {
    return url;
  }
  
  // 添加时间戳作为缓存破坏参数
  const separator = url.includes('?') ? '&' : '?';
  const cacheBuster = `_cb=${Date.now()}`;
  
  return `${url}${separator}${cacheBuster}`;
}

/**
 * 为图片URL添加缓存控制头（用于img标签）
 * 注意：img标签无法直接设置请求头，只能通过URL参数破坏缓存
 * @param url 原始图片URL
 * @returns 添加了缓存破坏参数的URL
 */
export function getImageUrlWithNoCache(url: string | undefined | null): string {
  return addCacheBuster(url);
}

/**
 * 批量处理图片URL数组
 * @param urls 图片URL数组
 * @returns 添加了缓存破坏参数的URL数组
 */
export function addCacheBusterToUrls(urls: (string | undefined | null)[]): string[] {
  return urls.map(url => addCacheBuster(url));
}

/**
 * 为对象中的图片URL字段添加缓存破坏参数
 * @param obj 包含图片URL的对象
 * @param urlFields 需要处理的URL字段名数组
 * @returns 处理后的对象
 */
export function addCacheBusterToObject<T extends Record<string, any>>(
  obj: T,
  urlFields: (keyof T)[]
): T {
  const result = { ...obj };
  
  for (const field of urlFields) {
    if (typeof result[field] === 'string') {
      result[field] = addCacheBuster(result[field] as string) as T[keyof T];
    }
  }
  
  return result;
}

/**
 * 为对象数组中的图片URL字段添加缓存破坏参数
 * @param arr 对象数组
 * @param urlFields 需要处理的URL字段名数组
 * @returns 处理后的数组
 */
export function addCacheBusterToArray<T extends Record<string, any>>(
  arr: T[],
  urlFields: (keyof T)[]
): T[] {
  return arr.map(obj => addCacheBusterToObject(obj, urlFields));
}
