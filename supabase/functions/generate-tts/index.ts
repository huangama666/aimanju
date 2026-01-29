// 生成语音合成任务（仅创建任务，不轮询）
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-app-id",
};

Deno.serve(async (req) => {
  // 处理CORS预检请求
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, format = "mp3-16k", voice = 0, speed = 5 } = await req.json();

    if (!text || !Array.isArray(text) || text.length === 0) {
      return new Response(
        JSON.stringify({ error: "text参数必须是非空数组" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`📝 创建语音合成任务，文本段落数: ${text.length}`);

    // 调用语音合成API创建任务
    const createResponse = await fetch(
      "https://api-integrations.appmiaoda.com/app-6r71zzjmv5kx/api-oLpZ71AA5KPa/rpc/2.0/tts/v1/create",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          format,
          voice,
          speed,
          pitch: 5,
          volume: 5,
          break: 500, // 段落间隔500ms
        }),
      }
    );

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.error("❌ 创建语音合成任务失败:", errorText);
      return new Response(
        JSON.stringify({ error: `创建任务失败: ${errorText}` }),
        {
          status: createResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const createResult = await createResponse.json();
    console.log("✅ 语音合成任务创建成功:", createResult);

    if (createResult.status !== 0 || !createResult.data?.task_id) {
      return new Response(
        JSON.stringify({
          error: `创建任务失败: ${createResult.msg || "未知错误"}`,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const taskId = createResult.data.task_id;

    // 直接返回task_id，不进行轮询
    console.log(`✅ 返回task_id: ${taskId}，前端将负责轮询查询状态`);
    return new Response(
      JSON.stringify({
        success: true,
        taskId: taskId,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("❌ 生成语音失败:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "未知错误",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
