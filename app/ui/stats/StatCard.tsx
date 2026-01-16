// app/ui/stats/StatCard.tsx
"use client";
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { getStatLabel } from "@/app/utils/statLabel";
import { ElementStats } from "../../types";

interface StatCardProps {
  statKey: string;
  elementStats: ElementStats;
  impact: number;
  gear: number;
  derivedValue: number;
  base: number;
  total: number;
  increase: number | "";
  localValue: string | undefined;
  localIncreaseValue: string | undefined;
  onTotalChange: (value: string) => void;
  onTotalBlur: () => void;
  onIncreaseChange: (value: string) => void;
  onIncreaseBlur: () => void;
}

export default function StatCard({
  statKey,
  elementStats,
  impact,
  gear,
  derivedValue,
  base,
  total,
  increase,
  localValue,
  localIncreaseValue,
  onTotalChange,
  onTotalBlur,
  onIncreaseChange,
  onIncreaseBlur,
}: StatCardProps) {
  return (
    <Card className="group bg-card/55 border border-white/10 ring-1 ring-white/5 backdrop-blur-xl transition-all hover:bg-card/65 hover:border-emerald-500/20 hover:shadow-[0_18px_45px_-22px_rgba(0,0,0,0.55)] focus-within:border-emerald-500/30 focus-within:ring-emerald-500/20">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">
              {getStatLabel(statKey, elementStats)}
            </div>
            <div className="mt-0.5 text-[11px] text-muted-foreground truncate">
              {statKey}
            </div>
          </div>

          {impact !== 0 && (
            <Badge
              className={
                impact > 0
                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                  : "bg-red-500/15 text-red-400 border border-red-500/30"
              }
            >
              {impact > 0 ? "+" : ""}
              {impact.toFixed(3)}%
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2 space-y-1">
            <div className="text-[11px] text-muted-foreground">Total</div>
            <Input
              type="number"
              value={localValue !== undefined ? localValue : total === 0 ? "" : total}
              onChange={(e) => onTotalChange(e.target.value)}
              onBlur={onTotalBlur}
              onWheel={(e) => e.currentTarget.blur()}
              className="h-10 bg-background/50 border-white/10 text-base font-semibold tracking-tight focus-visible:ring-emerald-500/25 focus-visible:border-emerald-500/30"
            />
          </div>

          <div className="col-span-1 space-y-1">
            <div className="text-[11px] text-muted-foreground">Increase</div>
            <Input
              type="number"
              value={
                localIncreaseValue !== undefined
                  ? localIncreaseValue
                  : increase === 0 || increase === ""
                    ? ""
                    : increase
              }
              onChange={(e) => onIncreaseChange(e.target.value)}
              onBlur={onIncreaseBlur}
              onWheel={(e) => e.currentTarget.blur()}
              className="h-10 bg-background/50 border-white/10 focus-visible:ring-emerald-500/25 focus-visible:border-emerald-500/30"
            />
          </div>
        </div>

        {(base !== 0 || gear !== 0 || derivedValue !== 0) && (
          <div className="flex flex-wrap gap-2 pt-1">
            {base !== 0 && (
              <Badge className="bg-gray-500/15 text-gray-300 border border-gray-500/25">
                Base {base.toFixed(2)}
              </Badge>
            )}
            {gear !== 0 && (
              <Badge className="bg-blue-500/15 text-blue-300 border border-blue-500/25">
                Gear {gear > 0 ? "+" : ""}
                {gear.toFixed(2)}
              </Badge>
            )}
            {derivedValue !== 0 && (
              <Badge className="bg-purple-500/15 text-purple-300 border border-purple-500/25">
                Attr {derivedValue > 0 ? "+" : ""}
                {derivedValue.toFixed(2)}
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
