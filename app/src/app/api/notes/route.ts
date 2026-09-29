import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const notes = await prisma.note.findMany({
    include: { knowledgeNodes: { select: { id: true, name: true } } },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json(notes);
}

export async function POST(req: NextRequest) {
  const { title, content, tags, knowledgeNodeIds } = await req.json();
  const note = await prisma.note.create({
    data: {
      title: title || "未命名笔记",
      content: content || "",
      tags,
      ...(knowledgeNodeIds?.length > 0 && {
        knowledgeNodes: {
          connect: knowledgeNodeIds.map((id: string) => ({ id })),
        },
      }),
    },
    include: { knowledgeNodes: { select: { id: true, name: true } } },
  });
  return NextResponse.json(note);
}
