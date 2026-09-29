import { formatMinutes } from "@/lib/utils";
import { Calendar, Clock, Flame, Target } from "lucide-react";

interface StatsCardsProps {
  daysLeft: number;
  todayMinutes: number;
  streak: number;
  completionRate: number;
}

export default function StatsCards(props: StatsCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-2 md:gap-3">
      {/* 距离考研 */}
      <div className="card p-3 md:p-4">
        <div className="flex items-center gap-1.5 text-[var(--muted-foreground)] mb-1.5">
          <Calendar size={13} strokeWidth={1.5} />
          <span className="text-[11px] md:text-xs">距离考研</span>
        </div>
        <div className="text-xl md:text-2xl font-semibold tracking-tight">
          {props.daysLeft}
          <span className="text-xs md:text-sm font-normal text-[var(--muted-foreground)] ml-0.5">
            天
          </span>
        </div>
      </div>

      {/* 今日学习 */}
      <div className="card p-3 md:p-4">
        <div className="flex items-center gap-1.5 text-[var(--muted-foreground)] mb-1.5">
          <Clock size={13} strokeWidth={1.5} />
          <span className="text-[11px] md:text-xs">今日学习</span>
        </div>
        <div className="text-xl md:text-2xl font-semibold tracking-tight">
          {formatMinutes(props.todayMinutes)}
        </div>
      </div>

      {/* 连续学习 */}
      <div className="card p-3 md:p-4">
        <div className="flex items-center gap-1.5 text-[var(--muted-foreground)] mb-1.5">
          <Flame size={13} strokeWidth={1.5} />
          <span className="text-[11px] md:text-xs">连续学习</span>
        </div>
        <div className="text-xl md:text-2xl font-semibold tracking-tight">
          {props.streak}
          <span className="text-xs md:text-sm font-normal text-[var(--muted-foreground)] ml-0.5">
            天
          </span>
        </div>
      </div>

      {/* 任务完成 */}
      <div className="card p-3 md:p-4">
        <div className="flex items-center gap-1.5 text-[var(--muted-foreground)] mb-1.5">
          <Target size={13} strokeWidth={1.5} />
          <span className="text-[11px] md:text-xs">任务完成</span>
        </div>
        <div className="text-xl md:text-2xl font-semibold tracking-tight">
          {props.completionRate}
          <span className="text-xs md:text-sm font-normal text-[var(--muted-foreground)] ml-0.5">
            %
          </span>
        </div>
      </div>
    </div>
  );
}
