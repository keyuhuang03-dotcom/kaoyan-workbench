import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

const relationLabels = new Set(["related", "prerequisite", "confusable"]);

export async function POST(req: NextRequest) {
  try {
    const { sourceId, targetId, label } = await req.json();
    if (typeof sourceId !== "string" || typeof targetId !== "string" || sourceId === targetId) {
      return NextResponse.json({ error: "请选择两个不同的知识点" }, { status: 400 });
    }
    const normalizedLabel = relationLabels.has(label) ? label : "related";
    const [source, target] = await Promise.all([
      prisma.knowledgeNode.findUnique({ where: { id: sourceId }, select: { id: true } }),
      prisma.knowledgeNode.findUnique({ where: { id: targetId }, select: { id: true } }),
    ]);
    if (!source || !target) {
      return NextResponse.json({ error: "知识点不存在" }, { status: 404 });
    }

    const existing = await prisma.knowledgeNodeRelation.findFirst({
      where: { sourceId, targetId, label: normalizedLabel },
    });
    if (existing) return NextResponse.json({ relation: existing, created: false });

    const relation = await prisma.knowledgeNodeRelation.create({
      data: { sourceId, targetId, label: normalizedLabel },
    });
    return NextResponse.json({ relation, created: true }, { status: 201 });
  } catch (error) {
    console.error("Create knowledge relation failed:", error);
    return NextResponse.json({ error: "添加关系失败" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { relationId } = await req.json();
    if (typeof relationId !== "string" || !relationId) {
      return NextResponse.json({ error: "缺少关系编号" }, { status: 400 });
    }
    await prisma.knowledgeNodeRelation.delete({ where: { id: relationId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Delete knowledge relation failed:", error);
    return NextResponse.json({ error: "删除关系失败" }, { status: 500 });
  }
}
