import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

const intervals = {
  forgot: 1,
  fuzzy: 3,
  mastered: 7,
  skip: 1,
} as const;

export async function GET() {
  const now = new Date();
  const nodes = await prisma.knowledgeNode.findMany({
    where: {
      OR: [
        { nextReviewAt: { lte: now } },
        { nextReviewAt: null, status: { not: "unlearned" } },
      ],
    },
    include: {
      subject: { select: { name: true, color: true } },
      mistakeItems: { select: { id: true, title: true } },
    },
    orderBy: [{ nextReviewAt: "asc" }, { masteryLevel: "asc" }],
    take: 12,
  });

  return NextResponse.json(nodes.map((node) => ({
    id: node.id,
    name: node.name,
    subject: node.subject.name,
    subjectColor: node.subject.color,
    masteryLevel: node.masteryLevel,
    mistakeCount: node.mistakeItems.length,
    mistakeTitles: node.mistakeItems.map((item) => item.title),
    description: node.description,
    lastReviewAt: node.lastReviewAt,
    nextReviewAt: node.nextReviewAt,
    reason: node.nextReviewAt
      ? `计划复习时间：${node.nextReviewAt.toLocaleDateString("zh-CN")}`
      : "尚未安排过复习",
  })));
}

export async function POST(req: NextRequest) {
  try {
    const { nodeId, result } = await req.json();
    if (typeof nodeId !== "string" || !(result in intervals)) {
      return NextResponse.json({ error: "复习结果无效" }, { status: 400 });
    }

    const current = await prisma.knowledgeNode.findUnique({ where: { id: nodeId } });
    if (!current) {
      return NextResponse.json({ error: "知识点不存在" }, { status: 404 });
    }

    const reviewResult = result as keyof typeof intervals;
    const nextReviewAt = new Date();
    nextReviewAt.setDate(nextReviewAt.getDate() + intervals[reviewResult]);
    const masteryDelta = reviewResult === "forgot" ? -1 : reviewResult === "mastered" ? 1 : 0;
    const masteryLevel = Math.max(0, Math.min(5, current.masteryLevel + masteryDelta));

    const node = await prisma.knowledgeNode.update({
      where: { id: nodeId },
      data: {
        lastReviewAt: reviewResult === "skip" ? current.lastReviewAt : new Date(),
        nextReviewAt,
        masteryLevel,
        status: reviewResult === "skip" ? current.status : masteryLevel >= 4 ? "mastered" : "learning",
      },
    });

    return NextResponse.json(node);
  } catch (error) {
    console.error("Save review result failed:", error);
    return NextResponse.json({ error: "保存复习结果失败" }, { status: 500 });
  }
}
