"use client";

import { useSyncExternalStore } from "react";
import { getGreeting } from "@/lib/utils";

const subscribeToClient = () => () => {};

export default function Greeting({ name }: { name: string }) {
  const isClient = useSyncExternalStore(
    subscribeToClient,
    () => true,
    () => false
  );
  const { greeting, emoji } = isClient
    ? getGreeting()
    : { greeting: "你好", emoji: "👋" };

  return (
    <div>
      <h1 className="text-xl md:text-3xl font-semibold tracking-tight">
        {greeting}, {name} {emoji}
      </h1>
      <p className="text-sm md:text-base text-[var(--muted-foreground)] mt-1">
        今天继续积累，让知识体系逐渐完整。
      </p>
    </div>
  );
}
