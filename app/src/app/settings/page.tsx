"use client";

import { Settings, User, GraduationCap, Palette, Database, Check, Loader2, Download, Upload } from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";

export default function SettingsPage() {
  const [examDate, setExamDate] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<"name" | "examDate" | null>(null);
  const [saved, setSaved] = useState<"name" | "examDate" | null>(null);
  const [backupStatus, setBackupStatus] = useState("");
  const [backupBusy, setBackupBusy] = useState(false);
  const [lastBackupAt, setLastBackupAt] = useState("");
  const importInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/user")
      .then((r) => r.json())
      .then((data) => {
        if (data.name) setName(data.name);
        if (data.examDate) {
          setExamDate(new Date(data.examDate).toISOString().split("T")[0]);
        }
        setLastBackupAt(localStorage.getItem("kaoyan-last-backup") || "");
      })
      .finally(() => setLoading(false));
  }, []);

  const saveField = useCallback(async (field: "name" | "examDate", value: string) => {
    setSaving(field);
    setSaved(null);
    try {
      const body = field === "name" ? { name: value } : { examDate: value };
      await fetch("/api/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      setSaved(field);
      setTimeout(() => setSaved(null), 2000);
    } catch {
      // silently fail
    }
    setSaving(null);
  }, []);

  async function exportBackup() {
    setBackupBusy(true);
    setBackupStatus("");
    try {
      const response = await fetch("/api/backup");
      if (!response.ok) throw new Error("导出失败");
      const backup = await response.json();
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `kaoyan-backup-${new Date().toISOString().split("T")[0]}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      const savedAt = new Date().toISOString();
      localStorage.setItem("kaoyan-last-backup", savedAt);
      setLastBackupAt(savedAt);
      setBackupStatus("备份已导出");
    } catch {
      setBackupStatus("备份导出失败");
    } finally {
      setBackupBusy(false);
    }
  }

  async function importBackup(file: File) {
    if (!confirm("导入会用备份内容替换当前全部数据，确定继续吗？")) return;
    setBackupBusy(true);
    setBackupStatus("");
    try {
      const backup = JSON.parse(await file.text());
      const response = await fetch("/api/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(backup),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "导入失败");
      setBackupStatus("备份已导入，请刷新页面查看");
    } catch (error) {
      setBackupStatus(error instanceof Error ? error.message : "备份导入失败");
    } finally {
      setBackupBusy(false);
      if (importInputRef.current) importInputRef.current.value = "";
    }
  }

  if (loading) return null;

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
          <div className="flex-1 flex items-center gap-2">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => saveField("name", name)}
              className="flex-1 min-h-[40px] text-sm bg-transparent border-b border-[var(--card-border)] pb-1 outline-none focus:border-[var(--foreground)] transition-colors"
            />
            {saving === "name" && <Loader2 size={14} className="animate-spin text-[var(--muted-foreground)]" />}
            {saved === "name" && <Check size={14} className="text-green-500" />}
          </div>
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
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={examDate}
              onChange={(e) => {
                setExamDate(e.target.value);
                saveField("examDate", e.target.value);
              }}
              className="text-sm bg-[var(--muted)] border border-[var(--card-border)] rounded-lg px-3 py-2.5 outline-none focus:border-[var(--foreground)] transition-colors flex-1 min-h-[44px]"
            />
            {saving === "examDate" && <Loader2 size={14} className="animate-spin text-[var(--muted-foreground)]" />}
            {saved === "examDate" && <Check size={14} className="text-green-500" />}
          </div>
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
        <div className="text-sm text-[var(--muted-foreground)]">
          数据保存在本机 SQLite 中。建议定期导出备份文件。
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button onClick={exportBackup} disabled={backupBusy} className="btn btn-primary text-sm gap-2">
            {backupBusy ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            导出全部数据
          </button>
          <button onClick={() => importInputRef.current?.click()} disabled={backupBusy} className="btn btn-secondary text-sm gap-2">
            <Upload size={14} />导入备份
          </button>
          <input
            ref={importInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void importBackup(file);
            }}
          />
        </div>
        {lastBackupAt && (
          <p className="text-xs text-[var(--muted-foreground)]">最近导出：{new Date(lastBackupAt).toLocaleString("zh-CN")}</p>
        )}
        {backupStatus && <p className="text-xs text-center">{backupStatus}</p>}
      </div>
    </div>
  );
}
