// src/app/api/generate/route.ts
import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// 初始化 DeepSeek 客户端
const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY, // 记得在 .env.local 加上这个变量
  baseURL: 'https://api.deepseek.com',
});

export async function POST(req: Request) {
  try {
    const { prompt, mode } = await req.json();
    let systemPrompt = '';
    if (mode === 'expand') {
      // 扩写模式的 Prompt
      systemPrompt = `
          你是一个思维导图扩写助手。用户会给你一个具体的节点主题。
          请针对这个主题，发散出 3-5 个具体的子节点。
          
          直接返回 JSON，不要包含根节点，只返回子节点数组。格式如下：
          {
            "children": [
              { "label": "子分支1", "children": [] },
              { "label": "子分支2", "children": [] }
            ]
          }
        `;
    } else {
      systemPrompt = `
      你是一个思维导图生成助手。请根据用户的输入，总结内容并生成一个思维导图的 JSON 结构。
      根节点是核心主题，子节点是关键分支。
      
      严禁输出 Markdown，只输出纯 JSON。格式必须如下：
      {
        "label": "根节点主题",
        "children": [
          {
            "label": "子节点1",
            "children": [ ... ]
          },
          ...
        ]
      }
    `;
    }
    const response = await client.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' }, // 强制 JSON 模式
    });

    const content = response.choices[0].message.content;
    return NextResponse.json(JSON.parse(content || '{}'));

  } catch (error) {
    return NextResponse.json({ error: 'Failed to generate' }, { status: 500 });
  }
}