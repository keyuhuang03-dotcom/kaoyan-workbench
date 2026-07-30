import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const user = await prisma.user.findFirst();
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  return NextResponse.json({ id: user.id, name: user.name, examDate: user.examDate });
}

export async function PATCH(req: Request) {
  const body = await req.json();
  const user = await prisma.user.findFirst();
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.examDate !== undefined && { examDate: new Date(body.examDate) }),
    },
  });

  return NextResponse.json({ id: updated.id, name: updated.name, examDate: updated.examDate });
}
