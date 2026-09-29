import { prisma } from "@/lib/prisma";

export async function getTodayTasksWithCarryOver() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const orderBy = [
    { priority: "desc" as const },
    { createdAt: "asc" as const },
  ];

  const todayTasks = await prisma.task.findMany({
    where: { date: { gte: today, lt: tomorrow } },
    include: { subject: true },
    orderBy,
  });

  if (todayTasks.length > 0) return todayTasks;

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayTasks = await prisma.task.findMany({
    where: { date: { gte: yesterday, lt: today } },
    orderBy,
  });

  if (yesterdayTasks.length === 0) return todayTasks;

  await prisma.task.createMany({
    data: yesterdayTasks.map((task) => ({
      userId: task.userId,
      subjectId: task.subjectId,
      title: task.title,
      priority: task.priority,
      completed: false,
      date: today,
    })),
  });

  return prisma.task.findMany({
    where: { date: { gte: today, lt: tomorrow } },
    include: { subject: true },
    orderBy,
  });
}
