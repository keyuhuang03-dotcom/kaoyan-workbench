"use client";

import { useState, useEffect } from "react";
import QuestionCard from "@/components/wrong-questions/QuestionCard";
import { AlertTriangle, Plus, Search, X, Sparkles, Loader2, Save } from "lucide-react";

interface MistakeItemData {
  id: string;
  title: string;
  content: string;
  errorType?: string | null;
  errorReason?: string | null;
  aiAnalysis?: string | null;
  relatedKnowledge?: string | null;
  reviewStatus: string;
  subject?: { name: string } | null;
  knowledgeNode?: { name: string } | null;
}

interface Subject {
  id: string;
  name: string;
}

export default function WrongQuestionsPage() {
  const [mistakes, setMistakes] = useState<MistakeItemData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Add form
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [saving, setSaving] = useState(false);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);

  useEffect(() => {
    fetchMistakes();
    fetch("/api/knowledge").then(r => r.json()).then(data => {
      // Extract unique subjects
      const subs: Record<string, string> = {};
      for (const n of data.nodes || []) {
        if (!subs[n.group]) subs[n.group] = n.id;
      }
      // Also fetch subjects directly
    });
  }, []);

  useEffect(() => {
    // Fetch subjects from the mistakes API or directly
    fetch("/api/knowledge").then(r => r.json()).then(data => {
      const subMap = new Map<string, string>();
      for (const n of data.nodes || []) {
        if (!subMap.has(n.group)) {
          subMap.set(n.group, n.id);
        }
      }
      // We need actual subject objects. Let's create from the knowledge graph
      // Actually, the mistakes API returns subject info, let's get unique subjects from mistakes
    });
  }, []);

  const fetchMistakes = async () => {
    try {
      // We need to refetch from API since this is now a client component
      const res = await fetch("/api/mistakes");
      const data = await res.json();
      setMistakes(data);

      // Extract unique subjects
      const subSet = new Map<string, { id: string; name: string }>();
      for (const m of data) {
        if (m.subject && !subSet.has(m.subject.name)) {
          subSet.set(m.subject.name, { id: m.subject.id || m.subject.name, name: m.subject.name });
        }
      }
      if (subSet.size === 0) {
        // Fallback subjects
        subSet.set("数学", { id: "数学", name: "数学" });
        subSet.set("英语", { id: "英语", name: "英语" });
        subSet.set("408", { id: "408", name: "408" });
        subSet.set("政治", { id: "政治", name: "政治" });
      }
      setSubjects(Array.from(subSet.values()));
    } catch (err) {
      console.error("Failed to fetch mistakes:", err);
    }
    setLoading(false);
  };

  const handleAiAnalyze = async () => {
    if (!title.trim() || !content.trim()) return;
    setAiAnalyzing(true);
    try {
      const res = await fetch("/api/ai/categorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: `${title}\n${content}` }),
      });
      const data = await res.json();

      if (data.nodes && data.nodes.length > 0) {
        // Auto-detect subject from first match
        const first = data.nodes[0];
        const matchedSubject = subjects.find(s => s.name === first.subject);
        if (matchedSubject) {
          setSubjectId(matchedSubject.id);
        }
      }
    } catch (err) {
      console.error("AI analyze failed:", err);
    }
    setAiAnalyzing(false);
  };

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/mistakes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          subjectId: subjectId || subjects[0]?.id || "408",
        }),
      });
      if (res.ok) {
        setTitle("");
        setContent("");
        setSubjectId("");
        setShowForm(false);
        await fetchMistakes();
      }
    } catch (err) {
      console.error("Save failed:", err);
    }
    setSaving(false);
  };

  const filteredMistakes = searchQuery
    ? mistakes.filter(m =>
        m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : mistakes;

  return (
    <div className="max-w-4xl mx-auto space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-semibold tracking-tight flex items-center gap-2">
          <AlertTriangle size={22} strokeWidth={1.5} />
          错题管理
        </h1>
        <button onClick={() => setShowForm(true)} className="btn btn-primary text-sm gap-1.5">
          <Plus size={16} />
          <span className="hidden sm:inline">添加错题</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="搜索错题..."
          className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-[var(--card)] border border-[var(--card-border)] text-sm outline-none focus:border-[var(--foreground)] transition-colors min-h-[44px]"
        />
      </div>

      {/* Add form modal */}
      {showForm && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setShowForm(false)} />
          <div className="fixed inset-x-4 top-[5%] bottom-[5%] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-[560px] z-50 card flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-[var(--card-border)]">
              <h2 className="text-sm font-semibold">添加错题</h2>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--muted)]">
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 p-4 space-y-4 overflow-y-auto">
              {/* Title */}
              <div>
                <label className="text-xs text-[var(--muted-foreground)] mb-1 block">题目</label>
                <input
                  type="text" value={title} onChange={e => setTitle(e.target.value)}
                  placeholder="简短描述这道错题"
                  className="w-full text-sm bg-[var(--muted)] rounded-lg px-3 py-2.5 outline-none border border-[var(--card-border)] focus:border-[var(--foreground)]"
                />
              </div>

              {/* Content */}
              <div>
                <label className="text-xs text-[var(--muted-foreground)] mb-1 block">题目内容 / 错误记录</label>
                <textarea
                  value={content} onChange={e => setContent(e.target.value)}
                  placeholder="详细记录题目内容或你的错误过程..."
                  rows={6}
                  className="w-full text-sm bg-[var(--muted)] rounded-lg px-3 py-2.5 outline-none border border-[var(--card-border)] focus:border-[var(--foreground)] resize-none"
                />
              </div>

              {/* Subject */}
              <div>
                <label className="text-xs text-[var(--muted-foreground)] mb-1 block">科目</label>
                <select
                  value={subjectId}
                  onChange={e => setSubjectId(e.target.value)}
                  className="w-full text-sm bg-[var(--muted)] rounded-lg px-3 py-2.5 outline-none border border-[var(--card-border)] focus:border-[var(--foreground)] min-h-[40px]"
                >
                  <option value="">选择科目</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-4 border-t border-[var(--card-border)]">
              <button
                onClick={handleAiAnalyze}
                disabled={aiAnalyzing || !title.trim() || !content.trim()}
                className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors touch-manipulation"
              >
                {aiAnalyzing ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Sparkles size={14} />
                )}
                {aiAnalyzing ? "分析中..." : "AI 分析归类"}
              </button>
              <div className="flex gap-2">
                <button onClick={() => setShowForm(false)} className="btn btn-secondary text-sm">取消</button>
                <button
                  onClick={handleSave}
                  disabled={saving || !title.trim() || !content.trim()}
                  className="btn btn-primary text-sm gap-1.5"
                  style={{ opacity: saving || !title.trim() || !content.trim() ? 0.5 : 1 }}
                >
                  <Save size={14} />
                  {saving ? "保存中..." : "保存"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Mistakes list */}
      {loading ? (
        <div className="card p-12 text-center text-[var(--muted-foreground)] text-sm">加载中...</div>
      ) : filteredMistakes.length === 0 ? (
        <div className="card p-12 text-center text-[var(--muted-foreground)]">
          <AlertTriangle size={32} strokeWidth={1} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">{mistakes.length === 0 ? "暂无错题记录" : "无匹配结果"}</p>
          <p className="text-xs mt-1">
            {mistakes.length === 0 ? "点击右上角添加你的第一道错题" : "尝试其他关键词"}
          </p>
        </div>
      ) : (
        <div className="space-y-2 md:space-y-3">
          {filteredMistakes.map((m) => (
            <QuestionCard key={m.id} mistake={m} />
          ))}
        </div>
      )}
    </div>
  );
}
