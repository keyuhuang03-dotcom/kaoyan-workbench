"use client";

import { useState } from "react";
import { Sparkles, RefreshCw } from "lucide-react";

export default function AIAssistant() {
  const [advice, setAdvice] = useState(
    "根据最近7天学习记录，你的数据结构复习进度较慢，建议增加30分钟专业课学习时间。"
  );
  const [loading, setLoading] = useState(false);

  const getAdvice = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/advice");
      const data = await res.json();
      setAdvice(data.advice);
    } catch {
      setAdvice("暂时无法获取建议，请稍后再试。");
    }
    setLoading(false);
  };

  return (
    <div className="card p-4 md:p-5">
      <div className="flex items-center justify-between mb-3 md:mb-4">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Sparkles size={16} strokeWidth={1.5} />
          AI Study Assistant
        </h2>
      </div>

      <p className="text-sm text-[var(--muted-foreground)] leading-relaxed mb-4">
        {loading ? "AI 正在分析你的学习数据..." : advice}
      </p>

      <div className="flex flex-col sm:flex-row gap-2">
        <button
          onClick={getAdvice}
          disabled={loading}
          className="btn btn-primary text-sm gap-2 flex-1"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          刷新建议
        </button>
        <button className="btn btn-secondary text-sm flex-1">
          生成今日计划
        </button>
      </div>
    </div>
  );
}
