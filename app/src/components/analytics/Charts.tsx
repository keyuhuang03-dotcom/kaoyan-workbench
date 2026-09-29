"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface ChartsProps {
  lineData: { date: string; minutes: number }[];
  pieData: { name: string; value: number }[];
}

// Monet-inspired low-saturation palette
const SUBJECT_COLORS = ["#bcc8d4", "#d4c4b8", "#a8bfb4", "#c4bcc8"];

export default function Charts({ lineData, pieData }: ChartsProps) {
  const hasData = lineData.length > 0 || pieData.length > 0;

  if (!hasData) {
    return (
      <div className="card p-12 text-center text-[var(--muted-foreground)] text-sm">
        暂无学习数据，开始记录后这里会展示图表。
      </div>
    );
  }

  const tooltipStyle = {
    background: "var(--card)",
    border: "1px solid var(--card-border)",
    borderRadius: "8px",
    fontSize: "12px",
    padding: "8px 10px",
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
      {/* Line chart */}
      <div className="card p-4 md:p-5">
        <h3 className="text-sm font-semibold mb-4">学习时间趋势</h3>
        <div className="h-56 md:h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={lineData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
              <XAxis
                dataKey="date"
                tickFormatter={(d: string) => {
                  const parts = d.split("-");
                  return `${parts[1]}/${parts[2]}`;
                }}
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tickFormatter={(m: number) => `${Math.round(m / 60)}h`}
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
                width={35}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value) => {
                  const v = Number(value);
                  return [`${Math.round(v / 60)}h ${v % 60}min`, "学习时间"];
                }}
              />
              <Line
                type="monotone"
                dataKey="minutes"
                stroke="#8a9aad"
                strokeWidth={1.5}
                dot={false}
                activeDot={{ r: 3, fill: "#8a9aad" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Pie chart */}
      <div className="card p-4 md:p-5">
        <h3 className="text-sm font-semibold mb-4">科目投入比例</h3>
        <div className="h-56 md:h-64 flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={70}
                paddingAngle={4}
                dataKey="value"
                stroke="none"
              >
                {pieData.map((_, index) => (
                  <Cell
                    key={index}
                    fill={SUBJECT_COLORS[index % SUBJECT_COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value) => {
                  const v = Number(value);
                  return [`${Math.round(v / 60)}h ${v % 60}min`, ""];
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-wrap gap-3 justify-center mt-1">
          {pieData.map((d, i) => (
            <div
              key={d.name}
              className="flex items-center gap-1.5 text-[11px] text-[var(--muted-foreground)]"
            >
              <div
                className="w-2 h-2 rounded-full"
                style={{ background: SUBJECT_COLORS[i % SUBJECT_COLORS.length] }}
              />
              {d.name}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
