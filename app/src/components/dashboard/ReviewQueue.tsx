"use client";

import { useEffect, useState } from "react";
import { Brain, Check, ChevronDown, ChevronRight, Loader2 } from "lucide-react";

interface ReviewNode {
  id: string;
  name: string;
  subject: string;
  masteryLevel: number;
  mistakeCount: number;
  mistakeTitles: string[];
  description: string | null;
  lastReviewAt: string | null;
  nextReviewAt: string | null;
  reason: string;
}

export default function ReviewQueue() {
  const [nodes, setNodes] = useState<ReviewNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/knowledge/review")
      .then((response) => {
        if (!response.ok) throw new Error("加载失败");
        return response.json() as Promise<ReviewNode[]>;
      })
      .then((data) => {
        if (active) setNodes(data);
      })
      .catch(() => {
        if (active) setNodes([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function submit(result: "forgot" | "fuzzy" | "mastered" | "skip") {
    if (!nodes[0] || saving) return;
    setSaving(true);
    try {
      const response = await fetch("/api/knowledge/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodeId: nodes[0].id, result }),
      });
      const updated = await response.json();
      if (!response.ok) throw new Error(updated.error || "保存失败");
      setFeedback(
        result === "skip"
          ? "已推迟到明天"
          : `下次复习：${new Date(updated.nextReviewAt).toLocaleDateString("zh-CN")}`
      );
      setNodes((current) => current.slice(1));
      setExpanded(false);
      setTimeout(() => setFeedback(""), 2500);
    } finally {
      setSaving(false);
    }
  }

  const current = nodes[0];

  return (
    <div className="card p-4 md:p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Brain size={16} strokeWidth={1.5} />今日复习
        </h2>
        {!loading && nodes.length > 0 && (
          <span className="text-xs text-[var(--muted-foreground)]">剩余 {nodes.length}</span>
        )}
      </div>

      {loading ? (
        <div className="h-24 flex items-center justify-center text-[var(--muted-foreground)]">
          <Loader2 size={18} className="animate-spin" />
        </div>
      ) : current ? (
        <div className="space-y-3">
          <button
            onClick={() => setExpanded((value) => !value)}
            className="w-full rounded-lg bg-[var(--muted)] p-3 text-left"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs text-[var(--muted-foreground)] mb-1">{current.subject}</div>
                <div className="font-medium">{current.name}</div>
              </div>
              {expanded
                ? <ChevronDown size={17} className="text-[var(--muted-foreground)]" />
                : <ChevronRight size={17} className="text-[var(--muted-foreground)]" />}
            </div>
            <div className="text-xs text-[var(--muted-foreground)] mt-2">
              掌握度 {current.masteryLevel}/5 · 关联错题 {current.mistakeCount} 道
            </div>
            <div className="text-xs text-[var(--muted-foreground)] mt-1">{current.reason}</div>
            {expanded && (
              <div className="mt-3 pt-3 border-t border-[var(--card-border)] space-y-2 text-xs leading-relaxed">
                <p>{current.description || "暂无个人理解，可以先尝试复述定义和解题步骤。"}</p>
                {current.mistakeTitles.length > 0 && (
                  <p className="text-red-500">相关错题：{current.mistakeTitles.join("、")}</p>
                )}
                <p className="text-[var(--muted-foreground)]">完成回忆后，再选择下面最符合当前状态的结果。</p>
              </div>
            )}
          </button>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button disabled={saving} onClick={() => submit("forgot")} className="btn btn-secondary text-xs">忘记</button>
            <button disabled={saving} onClick={() => submit("fuzzy")} className="btn btn-secondary text-xs">模糊</button>
            <button disabled={saving} onClick={() => submit("mastered")} className="btn btn-primary text-xs">掌握</button>
            <button disabled={saving} onClick={() => submit("skip")} className="btn btn-secondary text-xs">今天跳过</button>
          </div>
        </div>
      ) : (
        <div className="h-24 flex flex-col items-center justify-center text-sm text-[var(--muted-foreground)]">
          <Check size={20} className="mb-2" />今天的复习已完成
        </div>
      )}
      {feedback && <p className="text-xs text-center text-green-600 mt-3">{feedback}</p>}
    </div>
  );
}
