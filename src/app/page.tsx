import Greeting from "@/components/dashboard/Greeting";
import StatsCards from "@/components/dashboard/StatsCards";
import TodayTasks from "@/components/dashboard/TodayTasks";
import AIAssistant from "@/components/dashboard/AIAssistant";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [tasks, todaySessions, allSessions, user] = await Promise.all([
    prisma.task.findMany({
      where: { date: { gte: today, lt: tomorrow } },
      include: { subject: true },
      orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
    }),
    prisma.studySession.findMany({
      where: { date: { gte: today, lt: tomorrow } },
    }),
    prisma.studySession.findMany({
      orderBy: { date: "desc" },
      take: 100,
    }),
    prisma.user.findFirst(),
  ]);

  const todayMinutes = todaySessions.reduce(
    (sum, s) => sum + s.durationMinutes,
    0
  );
  const completedTasks = tasks.filter((t) => t.completed).length;
  const completionRate =
    tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

  let streak = 0;
  const dates = new Set(
    allSessions.map((s) => {
      const d = new Date(s.date);
      return d.toISOString().split("T")[0];
    })
  );
  const check = new Date(today);
  while (dates.has(check.toISOString().split("T")[0])) {
    streak++;
    check.setDate(check.getDate() - 1);
  }

  const examDate = user?.examDate
    ? new Date(user.examDate)
    : new Date("2026-12-26");
  const daysLeft = Math.ceil(
    (examDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className="max-w-4xl mx-auto space-y-4 md:space-y-6">
      <Greeting name={user?.name || "hky"} />
      <StatsCards
        daysLeft={daysLeft}
        todayMinutes={todayMinutes}
        streak={streak}
        completionRate={completionRate}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6">
        <TodayTasks tasks={tasks} />
        <AIAssistant />
      </div>
    </div>
  );
}
