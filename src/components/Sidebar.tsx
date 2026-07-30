"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CheckSquare,
  GitGraph,
  AlertTriangle,
  BarChart3,
  FileText,
  BookOpen,
  TrendingUp,
  Settings,
  Menu,
  X,
  Sparkles,
  Wifi,
} from "lucide-react";

const menuItems = [
  { href: "/", label: "工作台", icon: LayoutDashboard },
  { href: "/tasks", label: "今日任务", icon: CheckSquare },
  { href: "/knowledge", label: "知识图谱", icon: GitGraph },
  { href: "/wrong-questions", label: "错题管理", icon: AlertTriangle },
  { href: "/study-tracker", label: "学习记录", icon: TrendingUp },
  { href: "/daily-review", label: "AI 复盘", icon: FileText },
  { href: "/notes", label: "笔记中心", icon: BookOpen },
  { href: "/analytics", label: "数据分析", icon: BarChart3 },
  { href: "/settings", label: "设置", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setOpen(false);
  }, [pathname]);

  // Avoid hydration mismatch: render placeholder until client-side mount
  const todayStr = mounted
    ? new Date().toLocaleDateString("zh-CN", {
        month: "long",
        day: "numeric",
        weekday: "short",
      })
    : "";

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed top-0 left-0 z-30 h-full w-[240px] bg-[var(--sidebar-bg)] border-r border-[var(--sidebar-border)] flex-col">
        <div className="p-5 pb-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-full bg-[var(--accent)] flex items-center justify-center text-[var(--accent-foreground)] text-sm font-semibold">
              hk
            </div>
            <div>
              <div className="text-sm font-semibold">hky</div>
              <div className="text-xs text-[var(--muted-foreground)]">
                {todayStr}
              </div>
            </div>
          </div>
          <p className="text-xs text-[var(--muted-foreground)]">
            日拱一卒，功不唐捐。
          </p>
        </div>
        <nav className="flex-1 px-3 space-y-0.5">
          {menuItems.map((item) => {
            const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors
                  ${isActive
                    ? "bg-[var(--card)] text-[var(--foreground)] font-medium"
                    : "text-[var(--muted-foreground)] hover:bg-[var(--card)] hover:text-[var(--foreground)]"
                  }`}
              >
                <item.icon size={18} strokeWidth={1.5} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-[var(--sidebar-border)] space-y-2">
          <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
            <Sparkles size={12} />
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />AI 在线
            </span>
          </div>
          <div className="text-[10px] text-[var(--muted-foreground)] pt-1">v1.0.0</div>
        </div>
      </aside>

      {/* Mobile: hamburger button */}
      <button
        onClick={() => setOpen(true)}
        className="md:hidden fixed z-30 flex items-center justify-center w-10 h-10 rounded-full bg-[var(--card)] border border-[var(--card-border)] active:scale-95 transition-transform touch-manipulation"
        style={{
          top: "max(12px, env(safe-area-inset-top, 0px))",
          left: "12px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
        }}
        aria-label="菜单"
      >
        <Menu size={18} strokeWidth={1.5} />
      </button>

      {/* Mobile: overlay + drawer */}
      {open && (
        <>
          <div
            className="md:hidden fixed inset-0 z-40 bg-black/30"
            onClick={() => setOpen(false)}
          />
          <div className="md:hidden fixed top-0 left-0 z-50 h-full w-[280px] max-w-[85vw] bg-[var(--sidebar-bg)] border-r border-[var(--sidebar-border)] flex flex-col shadow-2xl animate-slide-in">
            <button
              onClick={() => setOpen(false)}
              className="absolute z-10 flex items-center justify-center w-10 h-10 rounded-lg right-3 hover:bg-[var(--card)] transition-colors touch-manipulation"
              style={{ top: "max(12px, env(safe-area-inset-top, 0px))" }}
              aria-label="关闭"
            >
              <X size={18} strokeWidth={1.5} />
            </button>

            <div className="p-5 pb-4" style={{ paddingTop: "max(20px, env(safe-area-inset-top, 0px))" }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-[var(--accent)] flex items-center justify-center text-[var(--accent-foreground)] text-sm font-semibold flex-shrink-0">
                  hk
                </div>
                <div>
                  <div className="text-sm font-semibold">hky</div>
                  <div className="text-xs text-[var(--muted-foreground)]">
                    {todayStr}
                  </div>
                </div>
              </div>
              <p className="text-xs text-[var(--muted-foreground)]">
                日拱一卒，功不唐捐。
              </p>
            </div>

            <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto pb-4">
              {menuItems.map((item) => {
                const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm transition-colors touch-manipulation
                      ${isActive
                        ? "bg-[var(--card)] text-[var(--foreground)] font-medium"
                        : "text-[var(--muted-foreground)] hover:bg-[var(--card)] hover:text-[var(--foreground)]"
                      }`}
                  >
                    <item.icon size={18} strokeWidth={1.5} className="flex-shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="p-4 border-t border-[var(--sidebar-border)]" style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom, 0px))" }}>
              <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)] mb-1.5">
                <Sparkles size={12} />
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />AI 在线
                </span>
              </div>
              <div className="text-[10px] text-[var(--muted-foreground)]">v1.0.0</div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
