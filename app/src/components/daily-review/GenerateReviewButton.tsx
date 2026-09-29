"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";

export default function GenerateReviewButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function generate() {
    if (loading) return;
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/daily-review", { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "生成失败");
      setMessage("本日复盘已保存");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "生成失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-5">
      <button onClick={generate} disabled={loading} className="btn btn-secondary text-sm w-full gap-2">
        {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
        {loading ? "正在生成..." : "生成本日复盘"}
      </button>
      {message && <p className="text-xs text-center text-[var(--muted-foreground)] mt-2">{message}</p>}
    </div>
  );
}
