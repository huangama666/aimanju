// 查询语音合成任务状态
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
    const { taskId } = await req.json();

    if (!taskId) {
      return new Response(
        JSON.stringify({ error: "taskId参数必须提供" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`🔍 查询语音合成任务状态: ${taskId}`);

    // 调用语音合成API查询任务状态
    const queryResponse = await fetch(
      "https://api-integrations.appmiaoda.com/app-6r71zzjmv5kx/api-wLNdolpp7Oza/rpc/2.0/tts/v1/query",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          task_ids: [taskId],
        }),
      }
    );

    if (!queryResponse.ok) {
      const errorText = await queryResponse.text();
      console.error("❌ 查询任务状态失败:", errorText);
      return new Response(
        JSON.stringify({ error: `查询任务状态失败: ${errorText}` }),
        {
          status: queryResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const queryResult = await queryResponse.json();
    console.log("📊 任务状态:", queryResult);

    if (queryResult.status !== 0 || !queryResult.data?.tasks_info?.length) {
      return new Response(
        JSON.stringify({
          error: `查询任务状态失败: ${queryResult.msg || "未知错误"}`,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const taskInfo = queryResult.data.tasks_info[0];

    // 返回任务状态
    if (taskInfo.task_status === "Success") {
      console.log("✅ 语音合成完成!");
      return new Response(
        JSON.stringify({
          status: "success",
          taskId: taskId,
          audioUrl: taskInfo.task_result.speech_url,
          timestamp: taskInfo.task_result.speech_timestamp,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    } else if (taskInfo.task_status === "Failure") {
      console.error("❌ 语音合成失败");
      return new Response(
        JSON.stringify({
          status: "failed",
          error: "语音合成失败",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    } else {
      // 任务还在运行中
      console.log("⏳ 任务运行中...");
      return new Response(
        JSON.stringify({
          status: "processing",
          taskId: taskId,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  } catch (error) {
    console.error("❌ 查询任务状态失败:", error);
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
