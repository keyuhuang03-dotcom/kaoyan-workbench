import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { title } = await req.json();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const user = await prisma.user.findFirst();
  const task = await prisma.task.create({
    data: {
      title,
      userId: user?.id || "",
      date: today,
    },
    include: { subject: true },
  });

  return NextResponse.json(task);
}
