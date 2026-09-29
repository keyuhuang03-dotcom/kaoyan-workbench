import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const mistakes = await prisma.mistakeItem.findMany({
    include: { subject: true, knowledgeNode: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(mistakes);
}

export async function POST(req: Request) {
  const body = await req.json();
  const mistake = await prisma.mistakeItem.create({
    data: {
      title: body.title,
      content: body.content,
      subjectId: body.subjectId,
      knowledgeNodeId: body.knowledgeNodeId,
      imageUrl: body.imageUrl,
      errorType: body.errorType,
      errorReason: body.errorReason,
      aiAnalysis: body.aiAnalysis,
      relatedKnowledge: body.relatedKnowledge,
    },
    include: { subject: true, knowledgeNode: true },
  });
  return NextResponse.json(mistake);
}
