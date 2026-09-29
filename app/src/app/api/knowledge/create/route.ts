import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const subjectName = typeof body.subject === "string" ? body.subject.trim() : "";

    if (!name || !subjectName) {
      return NextResponse.json(
        { error: "知识点名称和科目不能为空" },
        { status: 400 }
      );
    }

    const subject = await prisma.subject.findFirst({ where: { name: subjectName } });

    if (!subject) {
      return NextResponse.json({ error: "未找到对应科目" }, { status: 400 });
    }

    const existing = await prisma.knowledgeNode.findFirst({
      where: { subjectId: subject.id, name },
      include: { subject: true },
    });

    if (existing) {
      return NextResponse.json({ node: existing, created: false });
    }

    let parentId: string | null = null;
    if (typeof body.parentName === "string" && body.parentName.trim()) {
      const parent = await prisma.knowledgeNode.findFirst({
        where: { subjectId: subject.id, name: body.parentName.trim() },
      });
      parentId = parent?.id ?? null;
    }

    const node = await prisma.knowledgeNode.create({
      data: {
        name,
        subjectId: subject.id,
        parentId: body.parentId || parentId,
        masteryLevel: Number.isInteger(body.masteryLevel)
          ? Math.max(0, Math.min(5, body.masteryLevel))
          : 0,
        status: body.status || "unlearned",
        description: typeof body.description === "string" ? body.description.trim() || null : null,
        tags: typeof body.tags === "string" ? body.tags.trim() || null : null,
        nextReviewAt: new Date(),
      },
      include: { subject: true },
    });

    const relationNames = Array.isArray(body.relatedNames)
      ? body.relatedNames.filter((value: unknown): value is string => typeof value === "string")
      : [];

    for (const relationName of relationNames) {
      const target = await prisma.knowledgeNode.findFirst({
        where: { name: relationName.trim(), id: { not: node.id } },
      });
      if (!target) continue;
      const duplicate = await prisma.knowledgeNodeRelation.findFirst({
        where: { sourceId: node.id, targetId: target.id },
      });
      if (!duplicate) {
        await prisma.knowledgeNodeRelation.create({
          data: { sourceId: node.id, targetId: target.id, label: "related" },
        });
      }
    }

    return NextResponse.json({ node, created: true }, { status: 201 });
  } catch (error) {
    console.error("Create knowledge node failed:", error);
    return NextResponse.json({ error: "创建知识点失败" }, { status: 500 });
  }
}
