/**
 * Edge Function: 从URL下载图片并上传到Supabase Storage
 * 
 * 用途：解决前端直接下载第三方图片时的CORS跨域问题
 * 
 * 请求参数：
 * - imageUrl: 原始图片URL
 * - bucketName: Storage bucket名称
 * - filePath: 文件路径（不包含bucket名称）
 * 
 * 返回：
 * - storageUrl: Supabase Storage中的公开URL
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // 处理CORS预检请求
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 解析请求参数
    const { imageUrl, bucketName, filePath } = await req.json();

    if (!imageUrl || !bucketName || !filePath) {
      return new Response(
        JSON.stringify({ 
          error: '缺少必要参数：imageUrl, bucketName, filePath' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`📥 开始下载图片: ${imageUrl}`);
    console.log(`📤 目标位置: ${bucketName}/${filePath}`);

    // 1. 下载图片（禁用缓存）
    const imageResponse = await fetch(imageUrl, {
      cache: 'no-store', // 禁用缓存
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
    if (!imageResponse.ok) {
      throw new Error(`下载图片失败: ${imageResponse.status} ${imageResponse.statusText}`);
    }

    const imageBlob = await imageResponse.blob();
    const imageBuffer = await imageBlob.arrayBuffer();
    const contentType = imageResponse.headers.get('content-type') || 'image/png';

    console.log(`✅ 图片下载成功，大小: ${imageBuffer.byteLength} bytes, 类型: ${contentType}`);

    // 2. 初始化Supabase客户端
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 3. 上传到Supabase Storage
    console.log(`📤 上传图片到Storage...`);
    
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, imageBuffer, {
        contentType,
        upsert: true, // 如果文件已存在则覆盖
      });

    if (error) {
      console.error('❌ 上传失败:', error);
      throw new Error(`上传图片失败: ${error.message}`);
    }

    // 4. 获取公开URL
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    console.log(`✅ 图片上传成功: ${urlData.publicUrl}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        storageUrl: urlData.publicUrl,
        path: filePath
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ 处理失败:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : '未知错误' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
