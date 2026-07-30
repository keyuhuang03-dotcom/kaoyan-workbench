import { prisma } from "@/lib/prisma";
import { BarChart3 } from "lucide-react";
import Charts from "@/components/analytics/Charts";

export default async function AnalyticsPage() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const sessions = await prisma.studySession.findMany({
    where: { date: { gte: thirtyDaysAgo } },
    include: { subject: true },
    orderBy: { date: "asc" },
  });

  const dailyData: Record<string, { date: string; minutes: number }> = {};
  const subjectData: Record<string, number> = {};

  for (const s of sessions) {
    const dateKey = new Date(s.date).toISOString().split("T")[0];
    if (!dailyData[dateKey]) {
      dailyData[dateKey] = { date: dateKey, minutes: 0 };
    }
    dailyData[dateKey].minutes += s.durationMinutes;
    subjectData[s.subject.name] =
      (subjectData[s.subject.name] || 0) + s.durationMinutes;
  }

  const lineData = Object.values(dailyData);
  const pieData = Object.entries(subjectData).map(([name, value]) => ({
    name,
    value,
  }));

  const totalMinutes = sessions.reduce((sum, s) => sum + s.durationMinutes, 0);
  const totalHours = Math.round(totalMinutes / 60);
  const avgPerDay = Math.round(totalMinutes / Math.max(30, 1) / 60);

  const hourCounts: Record<number, number> = {};
  for (const s of sessions) {
    const h = new Date(s.date).getHours();
    hourCounts[h] = (hourCounts[h] || 0) + 1;
  }
  const peakHour = Object.entries(hourCounts).sort(
    (a, b) => b[1] - a[1]
  )[0]?.[0];

  const weakestSubject =
    pieData.length > 0
      ? pieData.sort((a, b) => a.value - b.value)[0].name
      : "--";

  return (
    <div className="max-w-4xl mx-auto space-y-4 md:space-y-6">
      <h1 className="text-xl md:text-2xl font-semibold tracking-tight flex items-center gap-2">
        <BarChart3 size={22} strokeWidth={1.5} />
        数据分析
      </h1>

      <div className="grid grid-cols-2 gap-2 md:gap-3">
        <div className="card p-3 md:p-4">
          <div className="text-[11px] md:text-xs text-[var(--muted-foreground)] mb-1">
            过去30天
          </div>
          <div className="text-lg md:text-xl font-semibold">
            {totalHours}
            <span className="text-xs md:text-sm font-normal text-[var(--muted-foreground)] ml-1">
              h
            </span>
          </div>
        </div>
        <div className="card p-3 md:p-4">
          <div className="text-[11px] md:text-xs text-[var(--muted-foreground)] mb-1">
            日均学习
          </div>
          <div className="text-lg md:text-xl font-semibold">
            {avgPerDay}
            <span className="text-xs md:text-sm font-normal text-[var(--muted-foreground)] ml-1">
              h
            </span>
          </div>
        </div>
        <div className="card p-3 md:p-4">
          <div className="text-[11px] md:text-xs text-[var(--muted-foreground)] mb-1">
            最高效率时段
          </div>
          <div className="text-lg md:text-xl font-semibold">
            {peakHour ? `${peakHour}:00` : "--"}
          </div>
        </div>
        <div className="card p-3 md:p-4">
          <div className="text-[11px] md:text-xs text-[var(--muted-foreground)] mb-1">
            薄弱科目
          </div>
          <div className="text-lg md:text-xl font-semibold truncate">
            {weakestSubject}
          </div>
        </div>
      </div>

      <Charts lineData={lineData} pieData={pieData} />
    </div>
  );
}
