"use client";

import { useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";

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

export default function TaskList({ tasks: initialTasks }: { tasks: Task[] }) {
  const [taskList, setTaskList] = useState(initialTasks);
  const [newTitle, setNewTitle] = useState("");
  const [newPriority, setNewPriority] = useState(0);
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
    if (!newTitle.trim()) return;
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle, priority: newPriority }),
    });
    const task = await res.json();
    setTaskList((prev) => [...prev, task]);
    setNewTitle("");
    setNewPriority(0);
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

  const pending = taskList.filter((t) => !t.completed);
  const done = taskList.filter((t) => t.completed);

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Add task */}
      <div className="card p-3 md:p-4">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTask()}
            placeholder="添加新任务..."
            className="flex-1 text-sm bg-transparent border-none outline-none min-h-[40px]"
          />
          <select
            value={newPriority}
            onChange={(e) => setNewPriority(Number(e.target.value))}
            className="text-xs px-2 py-1.5 rounded-lg bg-[var(--muted)] border border-[var(--card-border)] outline-none min-h-[36px]"
          >
            <option value="0">普通</option>
            <option value="1">重要</option>
            <option value="2">紧急</option>
          </select>
          <button
            onClick={addTask}
            className="btn btn-primary text-sm gap-1 py-2 px-3"
          >
            <Plus size={14} />
            <span className="hidden sm:inline">添加</span>
          </button>
        </div>
      </div>

      {/* Pending tasks */}
      <div className="space-y-1">
        <div className="text-xs text-[var(--muted-foreground)] mb-1.5 px-1">
          {pending.length} 个待完成
        </div>
        {pending.map((task) => (
          <div
            key={task.id}
            className="w-full card p-2 md:p-2.5 flex items-center gap-1 text-left min-h-[52px] group"
          >
            <button onClick={() => toggleTask(task.id)} className="flex flex-1 min-w-0 items-center gap-3 p-1 text-left touch-manipulation">
              <span className="w-5 h-5 rounded-full border-2 border-[var(--card-border)] flex-shrink-0" />
              <span
                className={`w-2 h-2 rounded-full flex-shrink-0 ${priorityDotClass(task.priority)}`}
                aria-label={task.priority >= 2 ? "紧急" : task.priority === 1 ? "重要" : "普通"}
              />
              <span className="flex-1 text-sm truncate">{task.title}</span>
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

      {/* Done tasks */}
      {done.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs text-[var(--muted-foreground)] mb-1.5 px-1">
            已完成
          </div>
          {done.map((task) => (
            <div
              key={task.id}
              className="w-full card p-2 md:p-2.5 flex items-center gap-1 text-left opacity-50 min-h-[52px] group"
            >
              <button onClick={() => toggleTask(task.id)} className="flex flex-1 min-w-0 items-center gap-3 p-1 text-left touch-manipulation">
              <span className="w-5 h-5 rounded-full bg-[var(--accent)] flex items-center justify-center flex-shrink-0">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path
                    d="M2.5 6L5 8.5L9.5 3.5"
                    stroke="var(--accent-foreground)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${priorityDotClass(task.priority)}`} />
              <span className="flex-1 text-sm line-through truncate">
                {task.title}
              </span>
              </button>
              <button onClick={() => deleteTask(task.id)} disabled={deletingId === task.id} className="w-10 h-10 flex items-center justify-center rounded-xl text-[var(--muted-foreground)] hover:bg-red-50 hover:text-red-500 md:opacity-0 md:group-hover:opacity-100 focus:opacity-100 transition-all touch-manipulation" aria-label={`删除任务：${task.title}`}>
                {deletingId === task.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
