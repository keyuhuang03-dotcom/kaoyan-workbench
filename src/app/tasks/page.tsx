import { CheckSquare } from "lucide-react";
import TaskList from "@/components/tasks/TaskList";
import { getTodayTasksWithCarryOver } from "@/lib/tasks";

export default async function TasksPage() {
  const tasks = await getTodayTasksWithCarryOver();

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
