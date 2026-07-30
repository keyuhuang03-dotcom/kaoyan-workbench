import { clsx, type ClassValue } from "clsx";

// Simple clsx implementation
export function cn(...inputs: (string | boolean | undefined | null)[]) {
  return inputs.filter(Boolean).join(" ");
}

export function daysUntil(date: Date) {
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function formatMinutes(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

export function getGreeting(): { greeting: string; emoji: string } {
  const hour = new Date().getHours();
  if (hour < 12) return { greeting: "Good morning", emoji: "☀️" };
  if (hour < 18) return { greeting: "Good afternoon", emoji: "🌤" };
  return { greeting: "Good evening", emoji: "🌙" };
}

export function masteryLabel(level: number) {
  const labels = ["未学习", "了解", "理解", "掌握", "熟练", "精通"];
  return labels[Math.min(level, 5)] || "未知";
}

export function masteryColor(level: number) {
  const colors = [
    "#e5e5e5",
    "#d4d4d4",
    "#a3a3a3",
    "#737373",
    "#525252",
    "#171717",
  ];
  return colors[Math.min(level, 5)] || colors[0];
}
