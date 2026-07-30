import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(req: NextRequest) {
  try {
    const { content } = await req.json();
    if (!content || !process.env.DEEPSEEK_API_KEY) {
      return NextResponse.json({ nodes: [] });
    }

    // Get all knowledge nodes for context
    const allNodes = await prisma.knowledgeNode.findMany({
      select: { id: true, name: true, subject: { select: { name: true } } },
    });

    const nodeLabels = allNodes.map((n) => `"${n.name}" (${n.subject.name})`).join(", ");

    const client = new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: "https://api.deepseek.com/v1",
    });

    const response = await client.chat.completions.create({
      model: "moonshot-v1-8k",
      messages: [
        {
          role: "system",
          content: `你是考研知识分类助手。根据用户提供的笔记内容，从以下知识节点中选择最相关的（最多3个），以JSON数组返回节点名称：
可用知识节点: [${nodeLabels}]
只返回JSON数组格式: ["节点1", "节点2"]`,
        },
        { role: "user", content },
      ],
      temperature: 0.2,
    });

    const text = response.choices[0]?.message?.content || "[]";
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    const suggestedNames: string[] = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

    // Match names to actual node IDs
    const matched = allNodes.filter((n) =>
      suggestedNames.some((s) => n.name.includes(s) || s.includes(n.name))
    );

    return NextResponse.json({
      nodes: matched.map((n) => ({ id: n.id, name: n.name, subject: n.subject.name })),
    });
  } catch {
    return NextResponse.json({ nodes: [] });
  }
}
