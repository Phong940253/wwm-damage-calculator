"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  TooltipProps,
} from "recharts";

const COLORS = {
  normal: "#10b981",
  abrasion: "#94a3b8",
  affinity: "#f59e0b",
  critical: "#facc15",
};

type Breakdown = {
  normal: number;
  abrasion: number;
  affinity: number;
  critical: number;
};

export default function AverageDamagePie({ data }: { data: Breakdown }) {
  const chartData = [
    { name: "Normal", value: data.normal, key: "normal" },
    { name: "Abrasion", value: data.abrasion, key: "abrasion" },
    { name: "Affinity", value: data.affinity, key: "affinity" },
    { name: "Critical", value: data.critical, key: "critical" },
  ];

  const total = chartData.reduce((s, d) => s + d.value, 0);

  /* =======================
     Pie label: percent only
  ======================= */
  const renderPercentLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
  }: any) => {
    if (percent < 0.03) return null; // hide < 3%

    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.65;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        textAnchor="middle"
        dominantBaseline="central"
        className="text-xs font-bold fill-white drop-shadow"
      >
        {(percent * 100).toFixed(1)}%
      </text>
    );
  };

  /* =======================
     Tooltip: type + detail
  ======================= */
  const tooltipFormatter: TooltipProps<number, string>["formatter"] = (
    value,
    _,
    item
  ) => {
    if (typeof value !== "number" || total === 0) {
      return ["0 dmg (0%)", item?.name ?? ""];
    }

    const pct = (value / total) * 100;

    return [`${value.toFixed(1)} dmg (${pct.toFixed(1)}%)`, item?.name ?? ""];
  };

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <PieChart>
          {/* Fake depth */}
          <Pie
            data={chartData}
            dataKey="value"
            cx="50%"
            cy="55%"
            outerRadius={90}
            innerRadius={40}
            fill="#000"
            opacity={0.18}
          />

          {/* Main pie */}
          <Pie
            data={chartData}
            dataKey="value"
            cx="50%"
            cy="50%"
            outerRadius={90}
            innerRadius={40}
            paddingAngle={2}
            label={renderPercentLabel}
            labelLine={false}
          >
            {chartData.map((e) => (
              <Cell key={e.key} fill={COLORS[e.key as keyof typeof COLORS]} />
            ))}
          </Pie>

          <Tooltip formatter={tooltipFormatter} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
