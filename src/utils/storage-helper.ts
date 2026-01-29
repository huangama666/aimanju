// Supabase Storage 辅助函数
import { supabase } from "@/db/supabase";
import axios from "axios";

/**
 * 从URL下载图片并上传到Supabase Storage（通过Edge Function，解决CORS问题）
 * @param imageUrl 原始图片URL
 * @param bucketName Storage bucket名称
 * @param filePath 文件路径（不包含bucket名称）
 * @returns Supabase Storage中的公开URL
 */
export async function uploadImageToStorage(
  imageUrl: string,
  bucketName: string,
  filePath: string
): Promise<string> {
  try {
    console.log(`📥 通过Edge Function上传图片: ${imageUrl}`);
    console.log(`📤 目标位置: ${bucketName}/${filePath}`);

    // 调用Edge Function来下载并上传图片（解决CORS问题）
    const { data, error } = await supabase.functions.invoke('upload-image-from-url', {
      body: JSON.stringify({
        imageUrl,
        bucketName,
        filePath
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (error) {
      const errorMsg = await error?.context?.text();
      console.error('❌ Edge Function调用失败:', errorMsg || error?.message);
      throw new Error(`上传图片失败: ${errorMsg || error?.message}`);
    }

    if (!data?.success || !data?.storageUrl) {
      console.error('❌ Edge Function返回错误:', data);
      throw new Error(`上传图片失败: ${data?.error || '未知错误'}`);
    }

    console.log(`✅ 图片上传成功: ${data.storageUrl}`);
    return data.storageUrl;
  } catch (error) {
    console.error('❌ 上传图片到Storage失败:', error);
    throw error;
  }
}

/**
 * 从URL下载图片并上传到Supabase Storage（直接方式，可能遇到CORS问题）
 * @deprecated 建议使用 uploadImageToStorage，它通过Edge Function解决CORS问题
 */
export async function uploadImageToStorageDirect(
  imageUrl: string,
  bucketName: string,
  filePath: string
): Promise<string> {
  try {
    // 1. 下载图片
    console.log(`📥 下载图片: ${imageUrl}`);
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 30000 // 30秒超时
    });

    const imageBuffer = response.data;
    const contentType = response.headers['content-type'] || 'image/png';

    // 2. 上传到Supabase Storage
    console.log(`📤 上传图片到Storage: ${bucketName}/${filePath}`);
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, imageBuffer, {
        contentType,
        upsert: true // 如果文件已存在则覆盖
      });

    if (error) {
      console.error('❌ 上传失败:', error);
      throw new Error(`上传图片失败: ${error.message}`);
    }

    // 3. 获取公开URL
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    console.log(`✅ 图片上传成功: ${urlData.publicUrl}`);
    return urlData.publicUrl;
  } catch (error) {
    console.error('❌ 上传图片到Storage失败:', error);
    throw error;
  }
}

/**
 * 批量上传图片到Supabase Storage
 * @param imageUrls 原始图片URL数组
 * @param bucketName Storage bucket名称
 * @param baseFolder 基础文件夹路径
 * @returns Supabase Storage中的公开URL数组
 */
export async function uploadImagesToStorage(
  imageUrls: string[],
  bucketName: string,
  baseFolder: string
): Promise<string[]> {
  const uploadedUrls: string[] = [];

  for (let i = 0; i < imageUrls.length; i++) {
    const imageUrl = imageUrls[i];
    if (!imageUrl) {
      uploadedUrls.push('');
      continue;
    }

    try {
      // 生成唯一文件名
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(7);
      const fileName = `${timestamp}_${randomStr}.png`;
      const filePath = `${baseFolder}/${fileName}`;

      const storageUrl = await uploadImageToStorage(imageUrl, bucketName, filePath);
      uploadedUrls.push(storageUrl);
    } catch (error) {
      console.error(`❌ 上传第${i + 1}张图片失败:`, error);
      // 如果上传失败，保留原始URL
      uploadedUrls.push(imageUrl);
    }
  }

  return uploadedUrls;
}

/**
 * 删除Storage中的图片
 * @param bucketName Storage bucket名称
 * @param filePath 文件路径
 */
export async function deleteImageFromStorage(
  bucketName: string,
  filePath: string
): Promise<void> {
  try {
    const { error } = await supabase.storage
      .from(bucketName)
      .remove([filePath]);

    if (error) {
      console.error('❌ 删除图片失败:', error);
      throw new Error(`删除图片失败: ${error.message}`);
    }

    console.log(`✅ 图片删除成功: ${bucketName}/${filePath}`);
  } catch (error) {
    console.error('❌ 删除图片失败:', error);
    throw error;
  }
}

/**
 * 从Storage URL中提取文件路径
 * @param storageUrl Storage公开URL
 * @param bucketName Storage bucket名称
 * @returns 文件路径
 */
export function extractFilePathFromUrl(
  storageUrl: string,
  bucketName: string
): string | null {
  try {
    const url = new URL(storageUrl);
    const pathParts = url.pathname.split('/');
    const bucketIndex = pathParts.indexOf(bucketName);
    
    if (bucketIndex === -1) {
      return null;
    }

    // 返回bucket之后的路径
    return pathParts.slice(bucketIndex + 1).join('/');
  } catch (error) {
    console.error('❌ 解析URL失败:', error);
    return null;
  }
}

/**
 * 直接上传Blob到Supabase Storage
 * @param blob Blob对象
 * @param bucketName Storage bucket名称
 * @param filePath 文件路径（不包含bucket名称）
 * @returns Supabase Storage中的公开URL
 */
export async function uploadBlobToStorage(
  blob: Blob,
  bucketName: string,
  filePath: string
): Promise<string> {
  try {
    console.log(`📤 直接上传Blob到Storage: ${bucketName}/${filePath}`);

    // 直接上传Blob到Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, blob, {
        contentType: blob.type || 'image/png',
        upsert: true // 如果文件已存在则覆盖
      });

    if (error) {
      console.error('❌ 上传失败:', error);
      throw new Error(`上传图片失败: ${error.message}`);
    }

    // 获取公开URL
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    console.log(`✅ Blob上传成功: ${urlData.publicUrl}`);
    return urlData.publicUrl;
  } catch (error) {
    console.error('❌ 上传Blob到Storage失败:', error);
    throw error;
  }
}
