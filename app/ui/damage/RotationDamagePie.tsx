"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  TooltipProps,
  PieLabelRenderProps,
  Legend,
} from "recharts";
import { Rotation } from "@/app/types";
import { SKILLS } from "@/app/domain/skill/skills";
import { DamageContext } from "@/app/domain/damage/damageContext";
import { calculateSkillDamage } from "@/app/domain/skill/skillDamage";

interface RotationDamagePieProps {
  rotation: Rotation;
  ctx: DamageContext;
}

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

export default function RotationDamagePie({
  rotation,
  ctx,
}: RotationDamagePieProps) {
  // Tính toán damage cho mỗi skill trong rotation, merge duplicates
  const skillDamageMap = new Map<
    string,
    { name: string; value: number; skillId: string; count: number }
  >();

  rotation.skills.forEach((rotSkill) => {
    const skill = SKILLS.find((s) => s.id === rotSkill.id);
    if (!skill) return;

    const skillDamage = calculateSkillDamage(ctx, skill);
    if (!skillDamage) return;

    // Average damage = normal damage nhân với count
    const avgDamage = skillDamage.total.normal.value * rotSkill.count;

    // Merge by skillId
    const existing = skillDamageMap.get(skill.id);
    if (existing) {
      skillDamageMap.set(skill.id, {
        ...existing,
        value: existing.value + avgDamage,
        count: existing.count + rotSkill.count,
        name: `${skill.name} x${existing.count + rotSkill.count}`,
      });
    } else {
      skillDamageMap.set(skill.id, {
        name: `${skill.name} x${rotSkill.count}`,
        value: avgDamage,
        skillId: skill.id,
        count: rotSkill.count,
      });
    }
  });

  const chartData = Array.from(skillDamageMap.values());

  const total = chartData.reduce((sum, item) => sum + item.value, 0);
  // console.log("RotationDamagePie chartData:", chartData);

  if (chartData.length === 0 || total === 0) {
    return (
      <div className="h-64 w-full flex items-center justify-center text-sm text-zinc-400">
        No skills in rotation
      </div>
    );
  }

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
  }: PieLabelRenderProps) => {
    if (
      percent === undefined ||
      percent < 0.05 ||
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

  /* =======================
     Tooltip: skill + damage detail
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
    return [
      `${value.toFixed(1)} dmg (${pct.toFixed(1)}%)`,
      item?.name ?? "",
    ];
  };

  return (
    <div className="w-full">
      <div className="h-64">
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderPercentLabel}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={tooltipFormatter} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Summary */}
      <div className="mt-4 p-3 bg-zinc-800/50 rounded border border-zinc-700 space-y-1">
        <p className="text-xs font-semibold text-zinc-300 mb-2">Rotation Damage</p>
        {chartData.map((item, idx) => (
          <div key={item.skillId} className="flex justify-between items-center text-xs">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: COLORS[idx % COLORS.length] }}
              />
              <span className="text-zinc-300">{item.name}</span>
            </div>
            <div className="text-right">
              <span className="text-zinc-400">
                {item.value.toFixed(1)} dmg
              </span>
              <span className="text-zinc-500 ml-2">
                ({((item.value / total) * 100).toFixed(1)}%)
              </span>
            </div>
          </div>
        ))}
        <div className="border-t border-zinc-600 pt-2 mt-2">
          <div className="flex justify-between items-center text-xs font-semibold">
            <span className="text-zinc-200">Total</span>
            <span className="text-yellow-400">{total.toFixed(1)} dmg</span>
          </div>
        </div>
      </div>
    </div>
  );
}
