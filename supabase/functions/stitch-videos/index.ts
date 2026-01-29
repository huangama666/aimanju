import { createClient } from 'npm:@supabase/supabase-js@2';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { writeFile, readFile, unlink } from 'node:fs/promises';
import { join } from 'node:path';

const execAsync = promisify(exec);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-app-id',
};

interface StitchRequest {
  videoUrls: string[];
  novelId: string;
  chapterNumber: number;
}

Deno.serve(async (req) => {
  // 处理CORS预检请求
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 初始化Supabase客户端
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 解析请求
    const { videoUrls, novelId, chapterNumber }: StitchRequest = await req.json();

    if (!videoUrls || videoUrls.length === 0) {
      return new Response(
        JSON.stringify({ error: '视频URL列表不能为空' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`开始拼接${videoUrls.length}个视频...`);

    // 创建临时目录
    const tempDir = await Deno.makeTempDir();
    const videoFiles: string[] = [];
    const listFilePath = join(tempDir, 'videos.txt');

    try {
      // 1. 下载所有视频文件
      for (let i = 0; i < videoUrls.length; i++) {
        const videoUrl = videoUrls[i];
        const videoPath = join(tempDir, `video_${i}.mp4`);
        
        console.log(`下载视频 ${i + 1}/${videoUrls.length}...`);
        // 禁用缓存，避免跨域问题
        const response = await fetch(videoUrl, {
          cache: 'no-store', // 禁用缓存
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });
        if (!response.ok) {
          throw new Error(`下载视频失败: ${videoUrl}`);
        }
        
        const videoData = await response.arrayBuffer();
        await writeFile(videoPath, new Uint8Array(videoData));
        videoFiles.push(videoPath);
      }

      // 2. 创建ffmpeg输入列表文件
      const listContent = videoFiles.map(file => `file '${file}'`).join('\n');
      await writeFile(listFilePath, listContent);

      // 3. 使用ffmpeg拼接视频
      const outputPath = join(tempDir, 'output.mp4');
      console.log('开始拼接视频...');
      
      const ffmpegCommand = `ffmpeg -f concat -safe 0 -i "${listFilePath}" -c copy "${outputPath}"`;
      await execAsync(ffmpegCommand);

      console.log('视频拼接完成，开始上传...');

      // 4. 读取拼接后的视频
      const outputData = await readFile(outputPath);

      // 5. 上传到Supabase Storage
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(7);
      const storagePath = `${novelId}/chapter_${chapterNumber}/final/${timestamp}_${randomStr}.mp4`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('filming-final-videos')
        .upload(storagePath, outputData, {
          contentType: 'video/mp4',
          upsert: false
        });

      if (uploadError) {
        throw new Error(`上传视频失败: ${uploadError.message}`);
      }

      // 6. 获取公开URL
      const { data: urlData } = supabase.storage
        .from('filming-final-videos')
        .getPublicUrl(storagePath);

      console.log('视频上传成功:', urlData.publicUrl);

      // 7. 清理临时文件
      for (const file of videoFiles) {
        await unlink(file).catch(() => {});
      }
      await unlink(listFilePath).catch(() => {});
      await unlink(outputPath).catch(() => {});

      return new Response(
        JSON.stringify({
          success: true,
          videoUrl: urlData.publicUrl,
          storagePath: storagePath
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (error) {
      // 清理临时文件
      for (const file of videoFiles) {
        await unlink(file).catch(() => {});
      }
      await unlink(listFilePath).catch(() => {});
      throw error;
    }

  } catch (error) {
    console.error('视频拼接失败:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : '视频拼接失败' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
