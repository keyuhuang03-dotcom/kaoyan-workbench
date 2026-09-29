import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { title, content, tags, knowledgeNodeIds } = await req.json();

  // If knowledgeNodeIds provided, set the connections (replace all)
  const note = await prisma.note.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(content !== undefined && { content }),
      ...(tags !== undefined && { tags }),
      ...(knowledgeNodeIds !== undefined && {
        knowledgeNodes: { set: knowledgeNodeIds.map((kid: string) => ({ id: kid })) },
      }),
    },
    include: { knowledgeNodes: { select: { id: true, name: true } } },
  });
  return NextResponse.json(note);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.note.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
