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
  subject?: { name: string; id?: string } | null;
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

  // AI suggested tags with node IDs
  const [aiTags, setAiTags] = useState<{ id: string; name: string; subject: string }[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [aiNewNodes, setAiNewNodes] = useState<{ name: string; subject: string }[]>([]);

  useEffect(() => {
    fetchMistakes();
    fetchSubjects();
  }, []);

  async function fetchSubjects() {
    try {
      const fixedSubjects: Subject[] = [
        { id: "math", name: "数学" },
        { id: "english", name: "英语" },
        { id: "cs", name: "408" },
        { id: "politics", name: "政治" },
      ];
      setSubjects(fixedSubjects);
      setSubjectId(fixedSubjects[0]?.id || "");
    } catch (err) {
      console.error("Failed to fetch subjects:", err);
    }
  }

  async function fetchMistakes() {
    try {
      const res = await fetch("/api/mistakes");
      const data = await res.json();
      setMistakes(data);
    } catch (err) {
      console.error("Failed to fetch mistakes:", err);
    }
    setLoading(false);
  }

  const handleAiAnalyze = async () => {
    if (!title.trim() && !content.trim()) return;
    setAiAnalyzing(true);
    try {
      const res = await fetch("/api/ai/categorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: `${title}\n${content}` }),
      });
      const data = await res.json();

      if (data.nodes && data.nodes.length > 0) {
        // Store full node info (id, name, subject)
        setAiTags(data.nodes.map((n: { id: string; name: string; subject: string }) => ({
          id: n.id, name: n.name, subject: n.subject,
        })));
        // Auto-select all matched tags
        const names = data.nodes.map((n: { name: string }) => n.name);
        const ids = data.nodes.map((n: { id: string }) => n.id);
        setSelectedTags(names);
        setSelectedNodeIds(ids);
        // Auto-detect subject
        const first = data.nodes[0];
        const matched = subjects.find((s) => s.name === first.subject);
        if (matched) setSubjectId(matched.id);
      }
      if (data.newNodes && data.newNodes.length > 0) {
        setAiNewNodes(data.newNodes);
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
          subjectId: subjectId || subjects[0]?.id || "math",
          knowledgeNodeId: selectedNodeIds[0] || null,
          relatedKnowledge: selectedTags.join(", ") || null,
        }),
      });
      if (res.ok) {
        setTitle("");
        setContent("");
        setSubjectId(subjects[0]?.id || "");
        setAiTags([]);
        setSelectedTags([]);
        setSelectedNodeIds([]);
        setAiNewNodes([]);
        setShowForm(false);
        await fetchMistakes();
      }
    } catch (err) {
      console.error("Save failed:", err);
    }
    setSaving(false);
  };

  const filteredMistakes = searchQuery
    ? mistakes.filter(
        (m) =>
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
              <div>
                <label className="text-xs text-[var(--muted-foreground)] mb-1 block">题目</label>
                <input
                  type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                  placeholder="简短描述这道错题"
                  className="w-full text-sm bg-[var(--muted)] rounded-lg px-3 py-2.5 outline-none border border-[var(--card-border)] focus:border-[var(--foreground)]"
                />
              </div>

              <div>
                <label className="text-xs text-[var(--muted-foreground)] mb-1 block">题目内容 / 错误记录</label>
                <textarea
                  value={content} onChange={(e) => setContent(e.target.value)}
                  placeholder="详细记录题目内容或你的错误过程..."
                  rows={6}
                  className="w-full text-sm bg-[var(--muted)] rounded-lg px-3 py-2.5 outline-none border border-[var(--card-border)] focus:border-[var(--foreground)] resize-none"
                />
              </div>

              <div>
                <label className="text-xs text-[var(--muted-foreground)] mb-1 block">科目</label>
                <select
                  value={subjectId}
                  onChange={(e) => setSubjectId(e.target.value)}
                  className="w-full text-sm bg-[var(--muted)] rounded-lg px-3 py-2.5 outline-none border border-[var(--card-border)] focus:border-[var(--foreground)] min-h-[40px]"
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              {/* AI suggested tags */}
              {aiTags.length > 0 && (
                <div>
                  <label className="text-xs text-[var(--muted-foreground)] mb-1.5 block">AI 识别的知识点</label>
                  <div className="flex flex-wrap gap-1.5">
                    {aiTags.map((tag) => {
                      const isSelected = selectedTags.includes(tag.name);
                      return (
                        <button
                          key={tag.id}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedTags(prev => prev.filter(t => t !== tag.name));
                              setSelectedNodeIds(prev => prev.filter(id => id !== tag.id));
                            } else {
                              setSelectedTags(prev => [...prev, tag.name]);
                              setSelectedNodeIds(prev => [...prev, tag.id]);
                            }
                          }}
                          className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
                            isSelected
                              ? "bg-[var(--accent)] text-[var(--accent-foreground)]"
                              : "bg-[var(--muted)] text-[var(--muted-foreground)] hover:bg-[var(--card)]"
                          }`}
                        >
                          {tag.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* AI 新建的知识点 */}
              {aiNewNodes.length > 0 && (
                <div className="mt-3 p-3 rounded-lg bg-green-50 border border-green-100">
                  <p className="text-xs text-green-700 mb-1.5">✅ 已自动添加到知识图谱：</p>
                  <div className="flex flex-wrap gap-1">
                    {aiNewNodes.map((n, i) => (
                      <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                        {n.name}（{n.subject}）
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-4 border-t border-[var(--card-border)]">
              <button
                onClick={handleAiAnalyze}
                disabled={aiAnalyzing || !title.trim() || !content.trim()}
                className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors touch-manipulation disabled:opacity-50"
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
            <QuestionCard
              key={m.id}
              mistake={m}
              onDelete={(id) => setMistakes((prev) => prev.filter((mm) => mm.id !== id))}
            />
          ))}
        </div>
      )}
    </div>
  );
}
