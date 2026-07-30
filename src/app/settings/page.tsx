"use client";

import { Settings, User, GraduationCap, Palette, Database } from "lucide-react";
import { useState } from "react";

export default function SettingsPage() {
  const [examDate, setExamDate] = useState("2026-12-26");
  const [name, setName] = useState("hky");

  return (
    <div className="max-w-2xl mx-auto space-y-4 md:space-y-6">
      <h1 className="text-xl md:text-2xl font-semibold tracking-tight flex items-center gap-2">
        <Settings size={22} strokeWidth={1.5} />
        设置
      </h1>

      <div className="card p-4 md:p-5 space-y-4">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <User size={14} strokeWidth={1.5} />
          个人信息
        </h2>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[var(--accent)] flex items-center justify-center text-[var(--accent-foreground)] text-lg font-semibold flex-shrink-0">
            hk
          </div>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 min-h-[40px] text-sm bg-transparent border-b border-[var(--card-border)] pb-1 outline-none focus:border-[var(--foreground)] transition-colors"
          />
        </div>
      </div>

      <div className="card p-4 md:p-5 space-y-4">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <GraduationCap size={14} strokeWidth={1.5} />
          考试设置
        </h2>
        <div>
          <label className="text-xs text-[var(--muted-foreground)] block mb-1.5">
            考研日期
          </label>
          <input
            type="date"
            value={examDate}
            onChange={(e) => setExamDate(e.target.value)}
            className="text-sm bg-[var(--muted)] border border-[var(--card-border)] rounded-lg px-3 py-2.5 outline-none focus:border-[var(--foreground)] transition-colors w-full min-h-[44px]"
          />
        </div>
      </div>

      <div className="card p-4 md:p-5 space-y-4">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Palette size={14} strokeWidth={1.5} />
          外观
        </h2>
        <div className="flex items-center justify-between min-h-[36px]">
          <span className="text-sm text-[var(--muted-foreground)]">深色模式</span>
          <span className="text-xs text-[var(--muted-foreground)]">跟随系统</span>
        </div>
      </div>

      <div className="card p-4 md:p-5 space-y-4">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Database size={14} strokeWidth={1.5} />
          数据
        </h2>
        <div className="flex items-center justify-between min-h-[36px]">
          <span className="text-sm text-[var(--muted-foreground)]">同步状态</span>
          <span className="text-xs flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
            已同步
          </span>
        </div>
      </div>
    </div>
  );
}
