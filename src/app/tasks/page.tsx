import { prisma } from "@/lib/prisma";
import { CheckSquare } from "lucide-react";
import TaskList from "@/components/tasks/TaskList";

export default async function TasksPage() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const tasks = await prisma.task.findMany({
    where: { date: { gte: today, lt: tomorrow } },
    include: { subject: true },
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
  });

  return (
    <div className="max-w-2xl mx-auto space-y-4 md:space-y-6">
      <h1 className="text-xl md:text-2xl font-semibold tracking-tight flex items-center gap-2">
        <CheckSquare size={22} strokeWidth={1.5} />
        今日任务
      </h1>
      <TaskList tasks={tasks} />
    </div>
  );
}
