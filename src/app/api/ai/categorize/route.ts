import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(req: NextRequest) {
  try {
    const { content } = await req.json();
    if (!content || !process.env.DEEPSEEK_API_KEY) {
      return NextResponse.json({ nodes: [], newNodes: [] });
    }

    const allNodes = await prisma.knowledgeNode.findMany({
      select: { id: true, name: true, subject: { select: { name: true } } },
    });

    const nodeLabels = allNodes.map((n) => `"${n.name}" (${n.subject.name})`).join(", ");

    const client = new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: "https://api.deepseek.com/v1",
    });

    const response = await client.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content: `你是考研知识分类助手。根据用户提供的笔记/错题内容，从以下知识节点中选择最相关的（最多3个）。
如果现有节点中没有完全匹配的，也可以建议新的知识点。

可用知识节点: [${nodeLabels}]

返回JSON格式：{"matched": ["节点1", "节点2"], "new": [{"name": "新知识点", "subject": "数学"}]}
只返回JSON，不要其他文字。`,
        },
        { role: "user", content },
      ],
      temperature: 0.2,
    });

    const text = response.choices[0]?.message?.content || "{}";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const result = jsonMatch ? JSON.parse(jsonMatch[0]) : { matched: [], new: [] };

    const suggestedNames: string[] = result.matched || [];
    const newSuggestions: { name: string; subject: string }[] = result.new || [];

    // Match names to existing node IDs
    const matched = allNodes.filter((n) =>
      suggestedNames.some((s: string) => n.name.includes(s) || s.includes(n.name))
    );

    // Auto-create new knowledge nodes
    const createdNodes: { id: string; name: string; subject: string }[] = [];
    for (const s of newSuggestions) {
      try {
        const subject = await prisma.subject.findFirst({
          where: { name: s.subject },
        });
        if (subject) {
          const node = await prisma.knowledgeNode.create({
            data: {
              name: s.name,
              subjectId: subject.id,
              masteryLevel: 0,
              status: "unlearned",
            },
            include: { subject: true },
          });
          createdNodes.push({ id: node.id, name: node.name, subject: node.subject.name });
        }
      } catch {
        // skip duplicates
      }
    }

    return NextResponse.json({
      nodes: matched.map((n) => ({ id: n.id, name: n.name, subject: n.subject.name })),
      newNodes: createdNodes,
    });
  } catch (e) {
    console.error("AI categorize error:", e);
    return NextResponse.json({ nodes: [], newNodes: [] });
  }
}
