import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const notes = await prisma.note.findMany({
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json(notes);
}

export async function POST(req: NextRequest) {
  const { title, content, tags } = await req.json();
  const note = await prisma.note.create({
    data: { title: title || "未命名笔记", content: content || "", tags },
  });
  return NextResponse.json(note);
}
