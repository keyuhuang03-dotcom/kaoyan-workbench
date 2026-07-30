import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();

  // Find subject by name
  const subject = await prisma.subject.findFirst({
    where: { name: body.subject },
  });

  if (!subject) {
    return NextResponse.json({ error: "Subject not found" }, { status: 400 });
  }

  const node = await prisma.knowledgeNode.create({
    data: {
      name: body.name,
      subjectId: subject.id,
      parentId: body.parentId || null,
      masteryLevel: body.masteryLevel ?? 0,
      status: body.status || "unlearned",
      description: body.description || null,
      tags: body.tags || null,
    },
    include: { subject: true },
  });

  return NextResponse.json(node);
}
