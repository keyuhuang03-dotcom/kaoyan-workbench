"use client";

import { useState } from "react";
import { CheckSquare, Plus, Loader2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Task {
  id: string;
  title: string;
  completed: boolean;
  priority: number;
  subject?: { name: string; color: string } | null;
}

function priorityDotClass(priority: number) {
  if (priority >= 2) return "bg-red-500";
  if (priority === 1) return "bg-yellow-400";
  return "bg-green-500";
}

export default function TodayTasks({ tasks }: { tasks: Task[] }) {
  const [taskList, setTaskList] = useState(tasks);
  const [newTitle, setNewTitle] = useState("");
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const toggleTask = async (id: string) => {
    setTaskList((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
    await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        completed: !taskList.find((t) => t.id === id)?.completed,
      }),
    });
  };

  const addTask = async () => {
    const title = newTitle.trim();
    if (!title || adding) return;

    setAdding(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (!res.ok) throw new Error("Failed to add task");
      const task = await res.json();
      setTaskList((prev) => [...prev, task]);
      setNewTitle("");
    } catch (err) {
      console.error("Add task failed:", err);
    } finally {
      setAdding(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTask();
    }
  };

  const deleteTask = async (id: string) => {
    if (deletingId || !confirm("确定删除这个任务？")) return;
    setDeletingId(id);
    try {
      const response = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("删除任务失败");
      setTaskList((prev) => prev.filter((task) => task.id !== id));
    } catch (error) {
      alert(error instanceof Error ? error.message : "删除任务失败，请重试");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="card p-4 md:p-5">
      <div className="flex items-center justify-between mb-3 md:mb-4">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <CheckSquare size={16} strokeWidth={1.5} />
          Today&apos;s Tasks
        </h2>
        <span className="text-xs text-[var(--muted-foreground)]">
          {taskList.filter((t) => t.completed).length}/{taskList.length}
        </span>
      </div>

      <div className="space-y-0.5">
        {taskList.map((task) => (
          <div
            key={task.id}
            className="w-full flex items-center gap-1 p-1 rounded-xl hover:bg-[var(--muted)] transition-colors text-left group min-h-[48px]"
          >
            <button onClick={() => toggleTask(task.id)} className="flex flex-1 min-w-0 items-center gap-3 p-2 text-left touch-manipulation">
            <span
              className={cn(
                "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors",
                task.completed
                  ? "bg-[var(--accent)] border-[var(--accent)]"
                  : "border-[var(--card-border)]"
              )}
            >
              {task.completed && (
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  className="text-[var(--accent-foreground)]"
                >
                  <path
                    d="M2.5 6L5 8.5L9.5 3.5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </span>
            <span
              className={`w-2 h-2 rounded-full flex-shrink-0 ${priorityDotClass(task.priority)}`}
              aria-label={task.priority >= 2 ? "紧急" : task.priority === 1 ? "重要" : "普通"}
            />
            <div className="flex-1 min-w-0">
              <span
                className={cn(
                  "text-sm block truncate",
                  task.completed && "line-through text-[var(--muted-foreground)]"
                )}
              >
                {task.title}
              </span>
            </div>
            {task.subject && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--muted)] text-[var(--muted-foreground)] flex-shrink-0">
                {task.subject.name}
              </span>
            )}
            </button>
            <button onClick={() => deleteTask(task.id)} disabled={deletingId === task.id} className="w-10 h-10 flex items-center justify-center rounded-xl text-[var(--muted-foreground)] hover:bg-red-50 hover:text-red-500 md:opacity-0 md:group-hover:opacity-100 focus:opacity-100 transition-all touch-manipulation" aria-label={`删除任务：${task.title}`}>
              {deletingId === task.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
            </button>
          </div>
        ))}
      </div>

      {/* Add task input */}
      <div className="mt-3 flex items-center gap-2">
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入任务后点 + 添加..."
          className="flex-1 text-sm bg-transparent border border-[var(--card-border)] rounded-lg px-3 py-2 outline-none focus:border-[var(--foreground)] transition-colors min-h-[44px] placeholder:text-[var(--muted-foreground)]"
        />
        <button
          onClick={addTask}
          disabled={adding || !newTitle.trim()}
          className="flex items-center justify-center w-11 h-11 rounded-lg transition-colors flex-shrink-0 touch-manipulation"
          style={{
            background: newTitle.trim() ? "var(--accent)" : "var(--muted)",
            color: newTitle.trim() ? "var(--accent-foreground)" : "var(--muted-foreground)",
            opacity: adding ? 0.6 : 1,
          }}
          aria-label="添加任务"
        >
          {adding ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Plus size={18} strokeWidth={1.5} />
          )}
        </button>
      </div>
    </div>
  );
}
