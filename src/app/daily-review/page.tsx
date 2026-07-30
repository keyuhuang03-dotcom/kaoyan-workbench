import { prisma } from "@/lib/prisma";
import { FileText, Star, RefreshCw } from "lucide-react";

export default async function DailyReviewPage() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [reviews, todaySessions] = await Promise.all([
    prisma.dailyReview.findMany({
      orderBy: { date: "desc" },
      take: 7,
    }),
    prisma.studySession.findMany({
      where: { date: { gte: today, lt: tomorrow } },
      include: { subject: true },
    }),
  ]);

  const latestReview = reviews[0];

  const subjectHours: Record<string, number> = {};
  for (const s of todaySessions) {
    subjectHours[s.subject.name] =
      (subjectHours[s.subject.name] || 0) + s.durationMinutes;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4 md:space-y-6">
      <h1 className="text-xl md:text-2xl font-semibold tracking-tight flex items-center gap-2">
        <FileText size={22} strokeWidth={1.5} />
        AI 每日复盘
      </h1>

      <div className="card p-4 md:p-6">
        <div className="text-xs text-[var(--muted-foreground)] mb-1">
          {today.toLocaleDateString("zh-CN", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}{" "}
          学习总结
        </div>

        <div className="mt-4 mb-5">
          <div className="text-xs text-[var(--muted-foreground)] mb-2 font-medium">
            今日学习
          </div>
          {Object.entries(subjectHours).length > 0 ? (
            <div className="space-y-1.5">
              {Object.entries(subjectHours).map(([name, mins]) => (
                <div
                  key={name}
                  className="flex items-center justify-between text-sm py-1"
                >
                  <span>{name}</span>
                  <span className="text-[var(--muted-foreground)]">
                    {Math.round(mins / 60)} 小时
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--muted-foreground)]">
              暂无今日学习记录
            </p>
          )}
        </div>

        {latestReview ? (
          <div className="space-y-4 pt-4 border-t border-[var(--card-border)]">
            <div>
              <div className="text-xs text-[var(--muted-foreground)] mb-2 font-medium">
                整体评价
              </div>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star
                    key={i}
                    size={16}
                    strokeWidth={1.5}
                    className={
                      i <= latestReview.rating
                        ? "fill-[var(--foreground)] text-[var(--foreground)]"
                        : "text-[var(--card-border)]"
                    }
                  />
                ))}
              </div>
            </div>

            <div className="space-y-3 text-sm leading-relaxed">
              <div>
                <div className="text-xs text-[var(--muted-foreground)] mb-1 font-medium">
                  AI 总结
                </div>
                <p className="text-[13px]">{latestReview.aiSummary}</p>
              </div>
              {latestReview.strengths && (
                <div>
                  <div className="text-xs text-[var(--muted-foreground)] mb-1 font-medium">
                    优势
                  </div>
                  <p className="text-[13px]">{latestReview.strengths}</p>
                </div>
              )}
              {latestReview.problems && (
                <div>
                  <div className="text-xs text-[var(--muted-foreground)] mb-1 font-medium">
                    问题
                  </div>
                  <p className="text-[13px]">{latestReview.problems}</p>
                </div>
              )}
              {latestReview.suggestion && (
                <div>
                  <div className="text-xs text-[var(--muted-foreground)] mb-1 font-medium">
                    明日建议
                  </div>
                  <p className="text-[13px]">{latestReview.suggestion}</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="pt-4 border-t border-[var(--card-border)] text-sm text-[var(--muted-foreground)]">
            暂未生成今日复盘，请在完成学习后生成。
          </div>
        )}

        <button className="btn btn-secondary text-sm w-full mt-5 gap-2">
          <RefreshCw size={14} />
          生成本日复盘
        </button>
      </div>

      {reviews.length > 1 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold px-1">历史复盘</h2>
          {reviews.slice(1).map((r) => (
            <div key={r.id} className="card p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-[var(--muted-foreground)]">
                  {new Date(r.date).toLocaleDateString("zh-CN")}
                </span>
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star
                      key={i}
                      size={11}
                      strokeWidth={1.5}
                      className={
                        i <= r.rating
                          ? "fill-[var(--foreground)] text-[var(--foreground)]"
                          : "text-[var(--card-border)]"
                      }
                    />
                  ))}
                </div>
              </div>
              <p className="text-[13px] text-[var(--muted-foreground)] line-clamp-2">
                {r.aiSummary}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
