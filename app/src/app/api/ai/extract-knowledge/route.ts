import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { content } = await req.json();
    if (typeof content !== "string" || !content.trim()) {
      return NextResponse.json({ error: "学习内容不能为空" }, { status: 400 });
    }
    if (!process.env.DEEPSEEK_API_KEY) {
      return NextResponse.json({ error: "尚未配置 AI 服务" }, { status: 503 });
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
        content: `你是一个考研知识体系分析助手。根据用户输入的学习内容，提取值得长期复习的知识点并以JSON数组返回，最多8个。
每个知识点包含：name（简洁名称）、subject（只能是数学/英语/408/政治）、notes（简要总结）、parent（上位知识点，可为空）、related（相关或易混淆知识点名称数组）。
如果没有明确的新知识点则返回空数组。

返回格式示例：
[{"name":"极限的定义","subject":"数学","notes":"函数在自变量趋近某值时的变化趋势","parent":"函数极限","related":["无穷小"]}]`,
      },
      { role: "user", content },
    ],
    temperature: 0.3,
  });

    const text = response.choices[0]?.message?.content || "[]";
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    const rawNodes: unknown = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    const nodes = Array.isArray(rawNodes)
      ? rawNodes.slice(0, 8).flatMap((item) => {
          if (!item || typeof item !== "object") return [];
          const candidate = item as Record<string, unknown>;
          const name = typeof candidate.name === "string" ? candidate.name.trim() : "";
          const subject = typeof candidate.subject === "string" ? candidate.subject.trim() : "";
          if (!name || !["数学", "英语", "408", "政治"].includes(subject)) return [];
          return [{
            name,
            subject,
            notes: typeof candidate.notes === "string" ? candidate.notes.trim() : "",
            parent: typeof candidate.parent === "string" ? candidate.parent.trim() : "",
            related: Array.isArray(candidate.related)
              ? candidate.related.filter((value): value is string => typeof value === "string").slice(0, 5)
              : [],
          }];
        })
      : [];

    const existing = await prisma.knowledgeNode.findMany({
      where: { name: { in: nodes.map((node) => node.name) } },
      select: { id: true, name: true, subject: { select: { name: true } } },
    });

    const output = nodes.map((node) => ({
      ...node,
      existingId: existing.find(
        (saved) => saved.name === node.name && saved.subject.name === node.subject
      )?.id ?? null,
    }));
    return NextResponse.json({ nodes: output });
  } catch (error) {
    console.error("Extract knowledge failed:", error);
    return NextResponse.json({ error: "AI 提取失败" }, { status: 500 });
  }
}
