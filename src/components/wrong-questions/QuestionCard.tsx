"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Sparkles, Loader2 } from "lucide-react";

interface MistakeItem {
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

export default function QuestionCard({ mistake }: { mistake: MistakeItem }) {
  const [expanded, setExpanded] = useState(false);
  const [status, setStatus] = useState(mistake.reviewStatus);
  const [aiResult, setAiResult] = useState<{
    nodes?: { id: string; name: string; subject: string }[];
  } | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const statusLabels: Record<string, string> = {
    pending: "待复习",
    reviewing: "复习中",
    mastered: "已掌握",
  };

  const handleAiAnalyze = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (analyzing) return;
    setAnalyzing(true);
    try {
      const res = await fetch("/api/ai/categorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: `${mistake.title}\n${mistake.content}` }),
      });
      const data = await res.json();
      setAiResult(data);
    } catch (err) {
      console.error("AI analyze failed:", err);
    }
    setAnalyzing(false);
  };

  return (
    <div
      className={cn(
        "card p-4 md:p-5 cursor-pointer transition-all touch-manipulation",
        expanded && "ring-1 ring-[var(--foreground)]"
      )}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold leading-snug">{mistake.title}</h3>
          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
            {mistake.subject && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--muted)] text-[var(--muted-foreground)]">
                {mistake.subject.name}
              </span>
            )}
            {mistake.knowledgeNode && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--muted)] text-[var(--muted-foreground)]">
                {mistake.knowledgeNode.name}
              </span>
            )}
            {mistake.errorType && (
              <span className="text-[10px] text-[var(--muted-foreground)]">
                {mistake.errorType}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          {/* AI Analyze button */}
          <button
            onClick={handleAiAnalyze}
            disabled={analyzing}
            className="text-[10px] flex items-center gap-1 px-2 py-1 rounded-lg bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors touch-manipulation min-h-[28px]"
          >
            {analyzing ? (
              <Loader2 size={11} className="animate-spin" />
            ) : (
              <Sparkles size={11} />
            )}
            AI 归类
          </button>

          <select
            value={status}
            onChange={async (e) => {
              setStatus(e.target.value);
              await fetch(`/api/mistakes/${mistake.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ reviewStatus: e.target.value }),
              });
            }}
            className="text-xs px-2 py-1.5 rounded-lg bg-[var(--muted)] border border-[var(--card-border)] outline-none cursor-pointer min-h-[32px]"
          >
            {Object.entries(statusLabels).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* AI result inline */}
      {aiResult && aiResult.nodes && aiResult.nodes.length > 0 && (
        <div
          className="mt-3 pt-3 border-t border-[var(--card-border)]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-[10px] text-[var(--muted-foreground)] mb-1.5 flex items-center gap-1">
            <Sparkles size={10} />AI 识别知识点
          </div>
          <div className="flex flex-wrap gap-1.5">
            {aiResult.nodes.map((n) => (
              <span
                key={n.id}
                className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--muted)] text-[var(--muted-foreground)] border border-[var(--card-border)]"
              >
                {n.name}
                <span className="opacity-50 ml-1">({n.subject})</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {expanded && (
        <div
          className="mt-4 pt-4 border-t border-[var(--card-border)] space-y-3 text-sm"
          onClick={(e) => e.stopPropagation()}
        >
          {mistake.content && (
            <div>
              <div className="text-xs text-[var(--muted-foreground)] mb-1 font-medium">
                题目
              </div>
              <p className="leading-relaxed text-[13px]">{mistake.content}</p>
            </div>
          )}
          {mistake.errorReason && (
            <div>
              <div className="text-xs text-[var(--muted-foreground)] mb-1 font-medium">
                错误原因
              </div>
              <p className="leading-relaxed text-[13px]">{mistake.errorReason}</p>
            </div>
          )}
          {mistake.aiAnalysis && (
            <div>
              <div className="text-xs text-[var(--muted-foreground)] mb-1 font-medium">
                AI 分析
              </div>
              <p className="leading-relaxed text-[13px]">{mistake.aiAnalysis}</p>
            </div>
          )}
          {mistake.relatedKnowledge && (
            <div>
              <div className="text-xs text-[var(--muted-foreground)] mb-1 font-medium">
                关联知识
              </div>
              <p className="leading-relaxed text-[13px]">
                {mistake.relatedKnowledge}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
