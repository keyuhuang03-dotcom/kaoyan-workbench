import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const user = await prisma.user.findFirst();

  const [todaySessions, recentSessions] = await Promise.all([
    prisma.studySession.findMany({
      where: { date: { gte: today, lt: tomorrow } },
      include: { subject: true },
      orderBy: { date: "desc" },
    }),
    prisma.studySession.findMany({
      include: { subject: true },
      orderBy: { date: "desc" },
      take: 50,
    }),
  ]);

  return NextResponse.json({ today: todaySessions, recent: recentSessions });
}

export async function POST(req: NextRequest) {
  const { subjectId, durationMinutes } = await req.json();
  const user = await prisma.user.findFirst();

  // Find or use the subject name directly (subject ID might be the name string)
  let subject = await prisma.subject.findUnique({ where: { id: subjectId } });
  if (!subject) {
    subject = await prisma.subject.findFirst({ where: { name: subjectId } });
  }

  const session = await prisma.studySession.create({
    data: {
      userId: user?.id || "default",
      subjectId: subject?.id || subjectId,
      durationMinutes,
      date: new Date(),
    },
    include: { subject: true },
  });

  return NextResponse.json(session);
}
