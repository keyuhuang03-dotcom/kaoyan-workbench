import { generateDailyReview } from "@/lib/ai";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [sessions, tasks, mistakes, reviewedNodes] = await Promise.all([
      prisma.studySession.findMany({
        where: { date: { gte: today, lt: tomorrow } },
        include: { subject: true },
      }),
      prisma.task.findMany({ where: { date: { gte: today, lt: tomorrow } } }),
      prisma.mistakeItem.findMany({
        where: { createdAt: { gte: today, lt: tomorrow } },
        select: { title: true, errorReason: true },
      }),
      prisma.knowledgeNode.findMany({
        where: { lastReviewAt: { gte: today, lt: tomorrow } },
        select: { name: true, masteryLevel: true },
      }),
    ]);

    const subjectMinutes = new Map<string, number>();
    for (const session of sessions) {
      subjectMinutes.set(
        session.subject.name,
        (subjectMinutes.get(session.subject.name) || 0) + session.durationMinutes
      );
    }

    const data = {
      subjects: Array.from(subjectMinutes, ([name, minutes]) => ({ name, minutes })),
      tasks: { total: tasks.length, completed: tasks.filter((task) => task.completed).length },
      mistakes,
      reviewedNodes,
    };

    let result;
    try {
      result = await generateDailyReview(data);
    } catch {
      const completed = data.tasks.completed;
      const total = data.tasks.total;
      result = {
        rating: sessions.length > 0 || completed > 0 ? 3 : 2,
        summary: `今日记录学习 ${sessions.reduce((sum, item) => sum + item.durationMinutes, 0)} 分钟，完成任务 ${completed}/${total}，复习知识点 ${reviewedNodes.length} 个。`,
        strengths: completed > 0 ? "完成了已安排的学习任务，保持了执行节奏。" : "今天的数据已被如实记录，可以据此调整明日安排。",
        problems: mistakes.length > 0 ? `新增 ${mistakes.length} 道错题，需要回到对应知识点复习。` : "当前记录较少，建议及时补充学习时长和复习结果。",
        suggestion: reviewedNodes.length > 0 ? "明天优先处理仍然模糊的知识点，再继续原定计划。" : "明天先完成计划中的核心任务，并安排一次知识点复习。",
      };
    }

    if (!result) {
      return NextResponse.json({ error: "无法生成复盘" }, { status: 500 });
    }

    const existing = await prisma.dailyReview.findFirst({
      where: { date: { gte: today, lt: tomorrow } },
    });
    const review = existing
      ? await prisma.dailyReview.update({
          where: { id: existing.id },
          data: {
            rating: Math.max(1, Math.min(5, Number(result.rating) || 3)),
            aiSummary: result.summary || "今日复盘已生成。",
            strengths: result.strengths || null,
            problems: result.problems || null,
            suggestion: result.suggestion || null,
          },
        })
      : await prisma.dailyReview.create({
          data: {
            date: today,
            rating: Math.max(1, Math.min(5, Number(result.rating) || 3)),
            aiSummary: result.summary || "今日复盘已生成。",
            strengths: result.strengths || null,
            problems: result.problems || null,
            suggestion: result.suggestion || null,
          },
        });

    return NextResponse.json(review);
  } catch (error) {
    console.error("Generate daily review failed:", error);
    return NextResponse.json({ error: "生成本日复盘失败" }, { status: 500 });
  }
}
