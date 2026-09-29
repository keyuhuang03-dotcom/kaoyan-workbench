import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(req: NextRequest) {
  try {
    const { nodeId, mode } = await req.json();
    if (typeof nodeId !== "string" || !nodeId) {
      return NextResponse.json({ error: "缺少知识点" }, { status: 400 });
    }

    const node = await prisma.knowledgeNode.findUnique({
      where: { id: nodeId },
      include: {
        subject: true,
        chapter: true,
        parent: { select: { name: true } },
        children: { select: { name: true } },
        mistakeItems: {
          select: { title: true, errorReason: true, reviewStatus: true },
          take: 8,
        },
        notes: { select: { title: true, content: true }, take: 5 },
        relatedNodesAsSource: {
          include: { target: { select: { name: true } } },
          take: 8,
        },
      },
    });

    if (!node) {
      return NextResponse.json({ error: "知识点不存在" }, { status: 404 });
    }

    if (!process.env.DEEPSEEK_API_KEY) {
      const fallback = `当前掌握度 ${node.masteryLevel}/5，关联 ${node.mistakeItems.length} 道错题、${node.notes.length} 条笔记。建议先复述核心定义，再完成一道典型题并记录易错点。`;
      return NextResponse.json({ advice: fallback, fallback: true });
    }

    const client = new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: "https://api.deepseek.com/v1",
    });
    const context = {
      知识点: node.name,
      科目: node.subject.name,
      章节: node.chapter?.name,
      上位知识: node.parent?.name,
      下位知识: node.children.map((item) => item.name),
      相关知识: node.relatedNodesAsSource.map((item) => item.target.name),
      掌握度: `${node.masteryLevel}/5`,
      状态: node.status,
      我的理解: node.description,
      错题: node.mistakeItems,
      笔记: node.notes.map((note) => ({ title: note.title, content: note.content.slice(0, 500) })),
    };
    const response = await client.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content: mode === "summary"
            ? "你是考研知识复习助手。根据给定的个人学习记录，用120字以内总结这个知识点的核心、当前薄弱处和与其他知识的联系。不要虚构。"
            : "你是考研知识复习助手。根据给定的个人学习记录，给出3条具体、可在30分钟内执行的复习建议。不要泛泛而谈，不要虚构。",
        },
        { role: "user", content: JSON.stringify(context) },
      ],
      temperature: 0.3,
    });

    return NextResponse.json({
      advice: response.choices[0]?.message?.content || "暂时无法生成建议。",
      fallback: false,
    });
  } catch (error) {
    console.error("Knowledge advice failed:", error);
    return NextResponse.json({ error: "生成知识点建议失败" }, { status: 500 });
  }
}
