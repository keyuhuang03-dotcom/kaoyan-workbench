import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { title, priority, subjectId } = await req.json();
  const normalizedTitle = typeof title === "string" ? title.trim() : "";
  if (!normalizedTitle) {
    return NextResponse.json({ error: "任务内容不能为空" }, { status: 400 });
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const user = await prisma.user.findFirst();
  if (!user) {
    return NextResponse.json({ error: "用户数据尚未初始化" }, { status: 400 });
  }
  const task = await prisma.task.create({
    data: {
      title: normalizedTitle,
      userId: user.id,
      subjectId: typeof subjectId === "string" && subjectId ? subjectId : null,
      priority: Number.isInteger(priority) ? Math.max(0, Math.min(2, priority)) : 0,
      date: today,
    },
    include: { subject: true },
  });

  return NextResponse.json(task);
}
