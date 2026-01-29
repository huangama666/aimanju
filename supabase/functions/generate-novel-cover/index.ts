import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || 'https://backend.appmiaoda.com/projects/supabase236369498670673920';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoyMDc1NzgyMDgwLCJpc3MiOiJzdXBhYmFzZSIsInJvbGUiOiJhbm9uIiwic3ViIjoiYW5vbiJ9.3_uVSd-7_bUGbQDyCDVuDzdCHetpmBORDT72V0ypvc4';
const APP_ID = Deno.env.get('APP_ID')!;

interface GenerateCoverRequest {
  novelId: string;
  prompt: string;
}

/**
 * 提交封面生成任务
 */
async function submitCoverTask(prompt: string): Promise<string> {
  const response = await fetch(
    'https://miaoda.baidu.com/api/miaoda/runtime/apicenter/source/proxy/iragtextToImageiiVMkBQMEHfZ6rd',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-App-Id': APP_ID
      },
      body: JSON.stringify({ prompt })
    }
  );

  const result = await response.json();
  
  if (result.status !== 0) {
    throw new Error(result.msg || '提交封面生成任务失败');
  }

  return result.data.task_id;
}

/**
 * 查询封面生成结果
 */
async function queryCoverResult(taskId: string): Promise<any> {
  const response = await fetch(
    'https://miaoda.baidu.com/api/miaoda/runtime/apicenter/source/proxy/iraggetImgjWUTzny87hoV6fSaYzr2Rj',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-App-Id': APP_ID
      },
      body: JSON.stringify({ task_id: taskId })
    }
  );

  const result = await response.json();
  
  if (result.status !== 0) {
    throw new Error(result.msg || '查询封面生成结果失败');
  }

  return result.data;
}

/**
 * 轮询查询封面生成结果
 */
async function pollCoverResult(taskId: string): Promise<string> {
  const maxAttempts = 30;
  const pollInterval = 3000;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const data = await queryCoverResult(taskId);
    
    if (data.task_status === 'SUCCESS') {
      const subTaskList = data.sub_task_result_list || [];
      if (subTaskList.length > 0) {
        const firstSubTask = subTaskList[0];
        const finalImageList = firstSubTask.final_image_list || [];
        if (finalImageList.length > 0) {
          return finalImageList[0].img_url;
        }
      }
      throw new Error('封面生成完成但未找到图片');
    } else if (data.task_status === 'FAILED') {
      throw new Error('封面生成失败');
    }
    
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }

  throw new Error('封面生成超时，请稍后重试');
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });
  }

  try {
    const { novelId, prompt }: GenerateCoverRequest = await req.json();

    if (!novelId || !prompt) {
      return new Response(
        JSON.stringify({ success: false, error: '缺少必要参数' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      );
    }

    console.log('开始生成封面，小说ID:', novelId);
    console.log('提示词:', prompt);

    const taskId = await submitCoverTask(prompt);
    console.log('任务提交成功，任务ID:', taskId);

    const imageUrl = await pollCoverResult(taskId);
    console.log('封面生成成功，图片URL:', imageUrl);

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    const { error: updateError } = await supabase
      .from('novels')
      .update({
        novel_thumb: imageUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', novelId);

    if (updateError) {
      throw new Error('更新数据库失败: ' + updateError.message);
    }

    console.log('数据库更新成功');

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          imageUrl,
          novelId
        }
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );

  } catch (error) {
    console.error('封面生成失败:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  }
});
