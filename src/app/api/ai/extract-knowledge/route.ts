import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(req: NextRequest) {
  const { content } = await req.json();
  if (!content || !process.env.DEEPSEEK_API_KEY) {
    return NextResponse.json({ nodes: [] });
  }

  const client = new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseURL: "https://api.deepseek.com/v1",
  });

  const response = await client.chat.completions.create({
    model: "deepseek-chat",
    messages: [
      {
        role: "system",
        content: `你是一个考研知识体系分析助手。根据用户输入的学习内容，提取其中涵盖的知识点并以JSON数组返回。
每个知识点包含：name（知识点名称）、subject（所属科目：数学/英语/408/政治）、notes（简要总结）。
如果没有明确的新知识点则返回空数组。

返回格式示例：
[{"name": "极限的定义", "subject": "数学", "notes": "函数在自变量趋近某值时..."}]`,
      },
      { role: "user", content },
    ],
    temperature: 0.3,
  });

  try {
    const text = response.choices[0]?.message?.content || "[]";
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    const nodes = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    return NextResponse.json({ nodes });
  } catch {
    return NextResponse.json({ nodes: [] });
  }
}
