import { createOpenAI } from '@ai-sdk/openai';
import { streamObject, generateObject } from 'ai';
import { z } from 'zod';

// --- 1. 初始化 Provider (带底层拦截器) ---
// 保持你刚才那个无敌的拦截器配置不变
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
            console.log('拦截器自动补充 JSON 关键词...');
            msg.content += ' (Please respond in JSON format)';
          }
        }
      }

      options.body = JSON.stringify(body);
    }
    return fetch(url, options);
  },
});

// --- 2. Schema 定义 ---
const NodeSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    label: z.string().describe('节点的文本标签，简练核心'),
    children: z.array(NodeSchema).optional().describe('子节点数组'),
  })
);

// 扩写用的 Schema
const ExpandSchema = z.object({
  children: z.array(
    z.object({
      label: z.string(),
      children: z.array(z.any()).optional(),
    })
  ),
});

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { prompt, mode } = await req.json();

    // --- 分支 A: 扩写模式 ---
    if (mode === 'expand') {
      const result = await generateObject({
        model: deepseek.chat('deepseek-chat'),
        schema: ExpandSchema,
        // @ts-ignore
        mode: 'json',
        // 【核心修复】在这里显式定义 JSON 结构，让 DeepSeek 别乱起名
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
      return result.toJsonResponse();
    }

    // --- 分支 B: 全量生成模式 (流式) ---
    else {
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

      return result.toTextStreamResponse();
    }

  } catch (error) {
    console.error("API Error details:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error'
    }), { status: 500 });
  }
}