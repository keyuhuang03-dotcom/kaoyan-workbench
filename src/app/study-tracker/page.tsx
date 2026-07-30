"use client";

import { useState, useEffect } from "react";
import { TrendingUp, Clock, Plus, X, Save } from "lucide-react";
import { formatMinutes } from "@/lib/utils";

interface Session {
  id: string;
  subject: { name: string };
  date: string;
  durationMinutes: number;
}

interface Subject {
  id: string;
  name: string;
}

export default function StudyTrackerPage() {
  const [todaySessions, setTodaySessions] = useState<Session[]>([]);
  const [recentSessions, setRecentSessions] = useState<Session[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  // Add form
  const [showForm, setShowForm] = useState(false);
  const [subjectId, setSubjectId] = useState("");
  const [hours, setHours] = useState("");
  const [minutes, setMinutes] = useState("30");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
    fetchSubjects();
  }, []);

  const fetchData = async () => {
    const res = await fetch("/api/study-sessions");
    const data = await res.json();
    setTodaySessions(data.today || []);
    setRecentSessions(data.recent || []);
    setLoading(false);
  };

  const fetchSubjects = async () => {
    const res = await fetch("/api/knowledge");
    const data = await res.json();
    const subMap = new Map<string, Subject>();
    for (const n of data.nodes || []) {
      if (!subMap.has(n.group)) {
        subMap.set(n.group, { id: n.group, name: n.group });
      }
    }
    if (subMap.size === 0) {
      subMap.set("数学", { id: "数学", name: "数学" });
      subMap.set("英语", { id: "英语", name: "英语" });
      subMap.set("408", { id: "408", name: "408" });
      subMap.set("政治", { id: "政治", name: "政治" });
    }
    setSubjects(Array.from(subMap.values()));
  };

  const handleAdd = async () => {
    const totalMinutes = (parseInt(hours) || 0) * 60 + (parseInt(minutes) || 0);
    if (!subjectId || totalMinutes <= 0) return;
    setSaving(true);
    try {
      await fetch("/api/study-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjectId, durationMinutes: totalMinutes }),
      });
      setShowForm(false);
      setSubjectId("");
      setHours("");
      setMinutes("30");
      await fetchData();
    } catch (err) {
      console.error("Save failed:", err);
    }
    setSaving(false);
  };

  // Recompute grouped data
  const groupedByDate: Record<string, Session[]> = {};
  for (const s of recentSessions) {
    const key = new Date(s.date).toISOString().split("T")[0];
    if (!groupedByDate[key]) groupedByDate[key] = [];
    groupedByDate[key].push(s);
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-semibold tracking-tight flex items-center gap-2">
          <TrendingUp size={22} strokeWidth={1.5} />
          学习记录
        </h1>
        <button onClick={() => setShowForm(true)} className="btn btn-primary text-sm gap-1.5">
          <Plus size={14} />
          <span className="hidden sm:inline">记录学习</span>
        </button>
      </div>

      {/* Today summary */}
      <div className="card p-4 md:p-5">
        <div className="flex items-center gap-2 text-sm font-semibold mb-3">
          <Clock size={14} strokeWidth={1.5} />今日学习
        </div>
        {todaySessions.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)]">今天还没有学习记录</p>
        ) : (
          <div className="space-y-2">
            {todaySessions.map((s) => (
              <div key={s.id} className="flex items-center justify-between text-sm py-1">
                <span>{s.subject.name}</span>
                <span className="text-[var(--muted-foreground)]">{formatMinutes(s.durationMinutes)}</span>
              </div>
            ))}
            <div className="pt-2 border-t border-[var(--card-border)] flex justify-between text-sm font-semibold">
              <span>总计</span>
              <span>{formatMinutes(todaySessions.reduce((sum, s) => sum + s.durationMinutes, 0))}</span>
            </div>
          </div>
        )}
      </div>

      {/* History */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold px-1">历史记录</h2>
        {loading ? (
          <div className="text-sm text-[var(--muted-foreground)] p-4">加载中...</div>
        ) : Object.keys(groupedByDate).length === 0 ? (
          <div className="text-sm text-[var(--muted-foreground)] p-4">暂无记录</div>
        ) : (
          Object.entries(groupedByDate).map(([date, sessions]) => (
            <div key={date} className="card p-3 md:p-4">
              <div className="text-xs text-[var(--muted-foreground)] mb-2">{date}</div>
              <div className="space-y-1.5">
                {sessions.map((s) => (
                  <div key={s.id} className="flex items-center justify-between text-sm py-0.5">
                    <span>{s.subject.name}</span>
                    <span className="text-[var(--muted-foreground)]">{formatMinutes(s.durationMinutes)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add form modal */}
      {showForm && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setShowForm(false)} />
          <div className="fixed inset-x-4 top-[30%] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-[400px] z-50 card flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-[var(--card-border)]">
              <h2 className="text-sm font-semibold">记录学习</h2>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--muted)]"><X size={16} /></button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="text-xs text-[var(--muted-foreground)] mb-1 block">科目</label>
                <select value={subjectId} onChange={e => setSubjectId(e.target.value)}
                  className="w-full text-sm bg-[var(--muted)] rounded-lg px-3 py-2.5 outline-none border border-[var(--card-border)] focus:border-[var(--foreground)] min-h-[40px]">
                  <option value="">选择科目</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[var(--muted-foreground)] mb-1 block">小时</label>
                  <input type="number" value={hours} onChange={e => setHours(e.target.value)}
                    placeholder="0" min="0" max="24"
                    className="w-full text-sm bg-[var(--muted)] rounded-lg px-3 py-2.5 outline-none border border-[var(--card-border)] focus:border-[var(--foreground)]" />
                </div>
                <div>
                  <label className="text-xs text-[var(--muted-foreground)] mb-1 block">分钟</label>
                  <input type="number" value={minutes} onChange={e => setMinutes(e.target.value)}
                    placeholder="30" min="0" max="59"
                    className="w-full text-sm bg-[var(--muted)] rounded-lg px-3 py-2.5 outline-none border border-[var(--card-border)] focus:border-[var(--foreground)]" />
                </div>
              </div>
              <button onClick={handleAdd} disabled={saving || !subjectId}
                className="btn btn-primary text-sm w-full gap-1.5" style={{ opacity: saving || !subjectId ? 0.5 : 1 }}>
                <Save size={14} />{saving ? "保存中..." : "记录"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
