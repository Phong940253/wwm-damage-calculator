"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  TooltipProps,
  PieLabelRenderProps,
} from "recharts";
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";

const COLORS = {
  normal: "#10b981",
  abrasion: "#94a3b8",
  affinity: "#f59e0b",
  critical: "#facc15",
};

export default function SimulationOutcomePie({
  totalNormal,
  totalAbrasion,
  totalCritical,
  totalAffinity,
}: {
  totalNormal: number;
  totalAbrasion: number;
  totalCritical: number;
  totalAffinity: number;
}) {
  const chartData = [
    { name: "Normal", value: totalNormal, key: "normal" },
    { name: "Abrasion", value: totalAbrasion, key: "abrasion" },
    { name: "Affinity", value: totalAffinity, key: "affinity" },
    { name: "Critical", value: totalCritical, key: "critical" },
  ];

  const total = chartData.reduce((s, d) => s + d.value, 0);

  const renderPercentLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
  }: PieLabelRenderProps) => {
    if (
      percent === undefined ||
      percent < 0.03 ||
      cx === undefined ||
      cy === undefined ||
      midAngle === undefined ||
      innerRadius === undefined ||
      outerRadius === undefined
    ) {
      return null;
    }

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

  const tooltipFormatter: TooltipProps<ValueType, NameType>["formatter"] = (
    value,
    _,
    item,
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
