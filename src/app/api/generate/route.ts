import { createOpenAI } from '@ai-sdk/openai';
import { streamObject, generateObject } from 'ai';
import { z } from 'zod';
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

// --- 配置区域 ---
const PRICING = {
  BASE_COST_CREATE: 30,   // [生成模式] 起步价 (较贵)
  BASE_COST_EXPAND: 3,    // [扩写模式] 起步价 (便宜)
  CHARS_PER_CREDIT: 500,  // 流量费 (每 500 字 1 分)
  MAX_COST_CAP: 200,      // 封顶
};

// --- 初始化 DeepSeek ---
const deepseek = createOpenAI({
  baseURL: 'https://api.deepseek.com/v1',
  apiKey: process.env.DEEPSEEK_API_KEY,
  compatibility: 'compatible',
  fetch: async (url, options) => {
    if (options && options.body) {
      const body = JSON.parse(options.body as string);
      if (body.response_format?.type === 'json_schema') {
        body.response_format = { type: 'json_object' };
      }
      if (body.messages) {
        for (const msg of body.messages) {
          if (msg.role === 'system' && !msg.content.toLowerCase().includes('json')) {
            msg.content += ' (Please respond in JSON format)';
          }
        }
      }
      options.body = JSON.stringify(body);
    }
    return fetch(url, options);
  },
});

const NodeSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    label: z.string(),
    children: z.array(NodeSchema).optional(),
  })
);

const ExpandSchema = z.object({
  children: z.array(z.object({ label: z.string(), children: z.array(z.any()).optional() })),
});

// --- 辅助函数：计算预估成本 ---
// 增加 mode 参数来区分计费
function calculateCost(inputText: string, mode: string = 'create'): number {
  const inputLength = inputText.length;

  // 根据模式选择起步价
  const baseCost = mode === 'expand' ? PRICING.BASE_COST_EXPAND : PRICING.BASE_COST_CREATE;

  const variableCost = Math.ceil(inputLength / PRICING.CHARS_PER_CREDIT);
  let totalCost = baseCost + variableCost;

  if (totalCost > PRICING.MAX_COST_CAP) {
    totalCost = PRICING.MAX_COST_CAP;
  }

  return totalCost;
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. 获取请求体
    const jsonBody = await req.json();
    const { prompt, mode } = jsonBody;

    // 2. 核心：计算成本 (传入 mode)
    const estimatedCost = calculateCost(
      typeof prompt === 'string' ? prompt : JSON.stringify(prompt),
      mode // <--- 传入模式
    );

    // 3. 获取用户状态
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('credits, tier, billing_cycle, last_reset_date')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // 年付用户自动月度刷新逻辑
    if (profile.tier === 'pro' && profile.billing_cycle === 'year' && profile.last_reset_date) {
      const lastReset = new Date(profile.last_reset_date);
      const now = new Date();
      const diffDays = Math.ceil(Math.abs(now.getTime() - lastReset.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays >= 30) {
        await supabase.from('profiles').update({ credits: 3000, last_reset_date: now.toISOString() }).eq('id', user.id);
        profile.credits = 3000;
      }
    }

    const isUnlimited = profile.tier === 'unlimited';

    // 4. 积分检查
    if (!isUnlimited) {
      if (profile.credits < estimatedCost) {
        return NextResponse.json({
          error: `积分不足。本次操作需要 ${estimatedCost} 积分，当前余额 ${profile.credits}。`,
          required: estimatedCost,
          current: profile.credits,
          code: 'INSUFFICIENT_CREDITS'
        }, { status: 403 });
      }

      // 5. 扣费
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ credits: profile.credits - estimatedCost })
        .eq('id', user.id);

      if (updateError) {
        console.error('扣费失败', updateError);
        return NextResponse.json({ error: 'Transaction failed' }, { status: 500 });
      }
    }

    // --- AI 生成逻辑 ---

    if (mode === 'expand') {
      const result = await generateObject({
        model: deepseek.chat('deepseek-chat'),
        schema: ExpandSchema,
        // @ts-ignore
        mode: 'json',
        system: `你是一个思维导图扩写助手。
        请针对用户给出的节点，发散出 3-5 个具体的子节点。
        
        【必须严格遵守的 JSON 格式】：
        {
          "children": [
             { "label": "子节点内容1", "children": [] },
             { "label": "子节点内容2", "children": [] }
          ]
        }
        
        必须使用 "children" 和 "label"。`,
        prompt: prompt,
      });

      // 返回 JSON 响应，并带上消耗信息
      const response = result.toJsonResponse();
      response.headers.set('X-Cost-Charged', estimatedCost.toString());
      return response;
    } else {
      const result = await streamObject({
        model: deepseek.chat('deepseek-chat'),
        schema: NodeSchema,
        // @ts-ignore
        mode: 'json',
        system: `你是一个思维导图生成助手。
        核心任务：根据用户输入或文件内容，总结并生成一个层级分明的思维导图。
        
        【重要格式要求】
        1. 必须输出标准的 JSON 格式 (JSON Format)。
        2. 不要包含 Markdown 代码块标记。
        
        【内容要求】
        1. 根节点是核心主题。
        2. 确保层级深度至少 3 层。
        3. 内容要在 label 中，不要太长。`,
        prompt: prompt,
      });
      const response = result.toTextStreamResponse();
      response.headers.set('X-Cost-Charged', estimatedCost.toString());
      return response;
    }

  } catch (error) {
    console.error("API Error:", error);
    return new Response(JSON.stringify({ error: 'Internal Error' }), { status: 500 });
  }
}
