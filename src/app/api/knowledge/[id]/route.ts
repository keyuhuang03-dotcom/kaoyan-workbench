import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const node = await prisma.knowledgeNode.update({
    where: { id },
    data: {
      name: body.name,
      masteryLevel: body.masteryLevel,
      status: body.status,
      tags: body.tags,
      pageStart: body.pageStart,
      pageEnd: body.pageEnd,
      description: body.description,
      chapterId: body.chapterId,
      lastReviewAt: body.lastReviewAt ? new Date(body.lastReviewAt) : undefined,
    },
  });

  return NextResponse.json(node);
}

// Add relation with note
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { noteId } = await req.json();

  await prisma.knowledgeNode.update({
    where: { id },
    data: {
      notes: { connect: { id: noteId } },
    },
  });

  return NextResponse.json({ ok: true });
}

// Remove relation with note
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const noteId = body.noteId;

  if (!noteId) {
    return NextResponse.json({ error: "noteId required" }, { status: 400 });
  }

  await prisma.knowledgeNode.update({
    where: { id },
    data: {
      notes: { disconnect: { id: noteId } },
    },
  });

  return NextResponse.json({ ok: true });
}
