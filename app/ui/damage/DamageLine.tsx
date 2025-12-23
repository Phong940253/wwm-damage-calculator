// app/ui/DamageLine.tsx
"use client";

import { Badge } from "@/components/ui/badge";

interface Props {
  label: string;
  value: number;
  percent: number;
  color: "emerald" | "amber" | "silver" | "gold";
}

export default function DamageLine({
  label,
  value,
  percent,
  color,
}: Props) {
  const colorClasses = {
    emerald: "text-emerald-500",
    amber: "text-amber-500",
    silver: "text-zinc-300",
    gold: "text-yellow-300",
  };

  const glowClasses = {
    emerald: "bg-emerald-500/20",
    amber: "bg-amber-500/20",
    silver: "bg-zinc-300/20",
    gold: "bg-yellow-300/20",
  };

  return (
    <div className="space-y-1">
      <p className="text-sm text-muted-foreground">{label}</p>

      <div className="flex items-end justify-between">
        <p className={`relative text-3xl font-bold ${colorClasses[color]}`}>
          <span
            className={`absolute inset-0 blur-xl ${glowClasses[color]}`}
          />
          <span className="relative">
            {value.toLocaleString()}
          </span>
        </p>

        {percent !== 0 && (
          <Badge
            className={`
              bg-${color}-500/15
              text-${color}-400
              border border-${color}-500/30
            `}
          >
            {percent > 0 ? "+" : ""}
            {percent.toFixed(2)}%
          </Badge>
        )}
      </div>
    </div>
  );
}
