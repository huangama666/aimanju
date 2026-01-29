// video-merge-proxy Edge Function
// 代理视频合并请求，解决CORS问题

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const COZE_API_URL = "https://6ndttsj7qc.coze.site/run";
const COZE_API_TOKEN = "eyJhbGciOiJSUzI1NiIsImtpZCI6ImIyNjM4YTkzLTAwZjgtNDAwZi04NTEyLWJjMDQ3MTYyZDU3ZiJ9.eyJpc3MiOiJodHRwczovL2FwaS5jb3plLmNuIiwiYXVkIjpbInJnVXNMV2QxMHhveWlRU2pvVWtGNEhXT1p6RnlnYU5MIl0sImV4cCI6ODIxMDI2Njg3Njc5OSwiaWF0IjoxNzY4NTc4ODExLCJzdWIiOiJzcGlmZmU6Ly9hcGkuY296ZS5jbi93b3JrbG9hZF9pZGVudGl0eS9pZDo3NTk1MDQ5ODk1NTgzMDg4NjkwIiwic3JjIjoiaW5ib3VuZF9hdXRoX2FjY2Vzc190b2tlbl9pZDo3NTk1OTg4MTU0MDAwMDgwOTM4In0.HMpqPcaGSeQDHWLEsw4SecZuQ9Cg-n0O9QGw1O0CKX6VbbJshh-4_Lsmju5zc0gPCFrI4XesZN4OHZncmXKoGJjIK5hHL2IwXvypRsjX-z4P88F2cB28r2YOUT3pzxr432-HbZ11pAo-Q9UET6urHljTrFbUNOlwcZWx7gyj8wv4A9zgAj7i3MOa86SZzWQHwJ3FLC-8V3YGJu0TgHeE_SV8cHiUbkWOp1aNCHNvLD8AXQVRHsXb8gh6sOKljJN-cib-b5ofVhKxZBPSYBtS8C4n6l1msXnQLsYUyQpj343NBwXeGu3RwiDZp_w6SyZ8dU9gGy-htREHOtaYNZb0kw";

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // 处理 CORS 预检请求
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('📹 [视频合并代理] 开始处理请求');
    console.log('📹 [视频合并代理] 请求方法:', req.method);
    console.log('📹 [视频合并代理] Content-Type:', req.headers.get('content-type'));
    
    // 读取请求体文本
    const bodyText = await req.text();
    console.log('📹 [视频合并代理] 请求体:', bodyText);
    
    // 检查请求体是否为空
    if (!bodyText || bodyText.trim() === '') {
      console.error('❌ [视频合并代理] 请求体为空');
      return new Response(
        JSON.stringify({ error: '请求体为空' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    // 解析JSON
    let requestData;
    try {
      requestData = JSON.parse(bodyText);
    } catch (parseError) {
      console.error('❌ [视频合并代理] JSON解析失败:', parseError);
      return new Response(
        JSON.stringify({ 
          error: 'JSON解析失败',
          details: parseError instanceof Error ? parseError.message : '未知错误'
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    const { video_list } = requestData;
    
    if (!video_list || !Array.isArray(video_list) || video_list.length === 0) {
      console.error('❌ [视频合并代理] 无效的视频列表');
      return new Response(
        JSON.stringify({ error: '无效的视频列表' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    console.log(`📹 [视频合并代理] 视频数量: ${video_list.length}`);
    console.log('📹 [视频合并代理] 视频列表:', video_list);
    
    // 调用外部Coze API
    console.log('🔗 [视频合并代理] 调用Coze API...');
    
    // 设置15分钟超时（视频合并需要5-10分钟）
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15 * 60 * 1000); // 15分钟 = 900秒
    
    try {
      const response = await fetch(COZE_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${COZE_API_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          video_list: video_list
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId); // 清除超时定时器
      
      console.log(`📹 [视频合并代理] Coze API响应状态: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [视频合并代理] Coze API错误:', errorText);
        return new Response(
          JSON.stringify({ 
            error: `Coze API请求失败: ${response.status} ${response.statusText}`,
            details: errorText
          }),
          { 
            status: response.status,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      
      // 解析响应
      const data = await response.json();
      console.log('✅ [视频合并代理] Coze API响应:', data);
      
      // 检查返回的数据格式（Coze API返回的是output_video对象）
      if (!data || !data.output_video || !data.output_video.url) {
        console.error('❌ [视频合并代理] 返回数据格式错误:', data);
        return new Response(
          JSON.stringify({ error: '未返回合并后的视频URL' }),
          { 
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      
      console.log('✅ [视频合并代理] 合并成功，视频URL:', data.output_video.url);
      
      // 返回成功响应（保持原始数据格式）
      return new Response(
        JSON.stringify(data),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
      
    } catch (fetchError) {
      clearTimeout(timeoutId); // 确保清除超时定时器
      
      // 检查是否是超时错误
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        console.error('❌ [视频合并代理] 请求超时（15分钟）');
        return new Response(
          JSON.stringify({ 
            error: '视频合并超时',
            message: '视频合并时间超过15分钟，请稍后重试或减少视频数量'
          }),
          { 
            status: 504,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      
      // 其他fetch错误
      console.error('❌ [视频合并代理] Fetch错误:', fetchError);
      return new Response(
        JSON.stringify({ 
          error: 'Coze API请求失败',
          message: fetchError instanceof Error ? fetchError.message : '未知错误'
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
  } catch (error) {
    console.error('❌ [视频合并代理] 异常:', error);
    return new Response(
      JSON.stringify({ 
        error: '视频合并失败',
        message: error instanceof Error ? error.message : '未知错误'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
