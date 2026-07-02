"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  TooltipProps,
} from "recharts";
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";
import { ROTATION_SKILL_GROUP_BY_SKILL_ID } from "@/app/utils/skillGroups";
import { Button } from "@/components/ui/button";

const PALETTE = [
  "#3b82f6",
  "#ef4444",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
  "#6366f1",
  "#84cc16",
];

export default function SimulationSkillBar({
  skills,
  grandTotal,
}: {
  skills: { skillId: string; skillName: string; subtotal: number }[];
  grandTotal: number;
}) {
  const [isGroupedView, setIsGroupedView] = useState(true);

  const grouped = skills.reduce<
    Record<string, { name: string; subtotal: number }>
  >((acc, sk) => {
    const group = ROTATION_SKILL_GROUP_BY_SKILL_ID.get(sk.skillId);
    const key = isGroupedView ? (group?.id ?? sk.skillId) : sk.skillId;
    const name = isGroupedView ? (group?.name ?? sk.skillName) : sk.skillName;
    if (acc[key]) {
      acc[key].subtotal += sk.subtotal;
    } else {
      acc[key] = { name, subtotal: sk.subtotal };
    }
    return acc;
  }, {});

  const chartData = Object.values(grouped).map((g) => ({
    skillName: g.name,
    subtotal: g.subtotal,
  }));

  const sorted = [...chartData].sort((a, b) => b.subtotal - a.subtotal);
  const total = grandTotal || sorted.reduce((s, sk) => s + sk.subtotal, 0);

  const tooltipFormatter: TooltipProps<ValueType, NameType>["formatter"] = (
    value,
    _,
    item,
  ) => {
    if (typeof value !== "number" || total === 0) {
      return ["0 dmg (0%)", item?.payload?.skillName ?? ""];
    }
    const pct = (value / total) * 100;
    return [`${value.toFixed(1)} dmg (${pct.toFixed(1)}%)`, item?.payload?.skillName ?? ""];
  };

  return (
    <div className="h-64 w-full">
      <div className="flex justify-end mb-1">
        <Button
          variant="outline"
          size="sm"
          className="h-6 text-[10px] px-2"
          onClick={() => setIsGroupedView((v) => !v)}
        >
          {isGroupedView ? "Show Detail" : "Show Group"}
        </Button>
      </div>
      <ResponsiveContainer>
        <BarChart
          data={sorted}
          layout="vertical"
          margin={{ top: 4, right: 16, bottom: 4, left: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 10 }}
            tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(Math.round(v))}
          />
          <YAxis
            type="category"
            dataKey="skillName"
            width={120}
            tick={{ fontSize: 10 }}
          />
          <Tooltip formatter={tooltipFormatter} />
          <Bar dataKey="subtotal" radius={[0, 3, 3, 0]}>
            {sorted.map((entry, idx) => (
              <Cell key={entry.skillName} fill={PALETTE[idx % PALETTE.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
