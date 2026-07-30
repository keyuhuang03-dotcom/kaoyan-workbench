import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const nodes = await prisma.knowledgeNode.findMany({
    include: {
      subject: true,
      chapter: true,
      children: true,
      mistakeItems: { select: { id: true, title: true, reviewStatus: true } },
      notes: { select: { id: true, title: true } },
    },
  });

  if (nodes.length === 0) {
    return NextResponse.json({ nodes: [], edges: [] });
  }

  const outputNodes = nodes.map((n) => ({
    id: n.id,
    label: n.name,
    level: n.masteryLevel,
    group: n.subject.name,
    status: n.status,
    tags: n.tags,
    pageStart: n.pageStart,
    pageEnd: n.pageEnd,
    description: n.description,
    lastReviewAt: n.lastReviewAt,
    chapterName: n.chapter?.name || null,
    relatedMistakes: n.mistakeItems,
    relatedNotes: n.notes,
  }));

  const edges: { from: string; to: string }[] = [];
  for (const n of nodes) {
    if (n.parentId) {
      edges.push({ from: n.parentId, to: n.id });
    }
  }

  return NextResponse.json({ nodes: outputNodes, edges });
}
