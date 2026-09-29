import { generateStudyAdvice } from "@/lib/ai";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const sessions = await prisma.studySession.findMany({
      where: { date: { gte: sevenDaysAgo } },
      include: { subject: true },
      orderBy: { date: "desc" },
    });

    // Group by subject
    const subjectMap: Record<string, number> = {};
    for (const s of sessions) {
      subjectMap[s.subject.name] =
        (subjectMap[s.subject.name] || 0) + s.durationMinutes;
    }

    const summary = Object.entries(subjectMap)
      .map(([name, mins]) => {
        const h = Math.round(mins / 60);
        return `${name}: ${h}小时`;
      })
      .join(", ");

    const advice = await generateStudyAdvice(
      summary || "暂无近7天学习记录"
    );

    return NextResponse.json({ advice });
  } catch {
    return NextResponse.json({
      advice: "继续按计划推进，保持节奏稳定。",
    });
  }
}
