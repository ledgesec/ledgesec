"use client";

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CHART_HEIGHT, RPS, RPS_COLOR } from "@/widgets/rate-chart/windows";

const tooltipStyle = {
  backgroundColor: "var(--chart-tooltip-bg)",
  border: "1px solid var(--chart-tooltip-border)",
  borderRadius: "8px",
  color: "var(--chart-tooltip-text)",
  boxShadow: "0 18px 48px rgba(0, 0, 0, 0.32)",
};

const tooltipText = { color: "var(--chart-tooltip-text)" };

export function RateLine({ points }: { points: { label: string; rps: number }[] }) {
  return (
    <div className="cyber-grid-panel w-full rounded-xl" style={{ height: CHART_HEIGHT }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 12, right: 12, bottom: 8, left: -8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
          <XAxis dataKey="label" stroke="var(--chart-tick)" tick={{ fill: "var(--chart-tick)", fontSize: 12 }} minTickGap={28} />
          <YAxis stroke="var(--chart-tick)" tick={{ fill: "var(--chart-tick)", fontSize: 12 }} width={48} />
          <Tooltip
            contentStyle={tooltipStyle}
            labelStyle={{ ...tooltipText, fontWeight: 700 }}
            itemStyle={tooltipText}
            wrapperStyle={{ outline: "none" }}
          />
          <Legend wrapperStyle={{ color: "var(--muted-foreground)" }} />
          <Line
            type="monotone"
            dataKey="rps"
            name={RPS}
            stroke={RPS_COLOR}
            strokeWidth={3}
            dot={{ fill: RPS_COLOR, r: 3 }}
            activeDot={{ r: 5, fill: RPS_COLOR }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
