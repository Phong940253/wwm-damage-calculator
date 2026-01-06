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
  localValue,
  localIncreaseValue,
  onTotalChange,
  onTotalBlur,
  onIncreaseChange,
  onIncreaseBlur,
}: StatCardProps) {
  return (
    <Card
      className="
        bg-card/60 border border-[#2b2a33]
        hover:bg-card/80 hover:border-emerald-500/40
        transition-all
      "
    >
      <CardContent className="pt-4 space-y-3">
        {/* ---------- Title & Badges ---------- */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">
            {getStatLabel(statKey, elementStats)}
          </span>

          <div className="flex gap-2">
            {impact !== 0 && (
              <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                {impact > 0 ? "+" : ""}
                {impact.toFixed(3)}%
              </Badge>
            )}
          </div>
        </div>

        {/* ---------- TOTAL INPUT (Editable) ---------- */}
        <Input
          type="number"
          value={
            localValue !== undefined
              ? localValue
              : total === 0
              ? ""
              : total
          }
          onChange={(e) => onTotalChange(e.target.value)}
          onBlur={onTotalBlur}
          onWheel={(e) => e.currentTarget.blur()}
          className="bg-background/60 border-[#363b3d]"
        />

        {/* ---------- Breakdown ---------- */}
        <div className="flex text-xs text-muted-foreground gap-2 lg:flex-row flex-col">
          {base !== 0 && (
            <Badge className="bg-gray-500/15 text-gray-400 border border-gray-500/30">
              Base {base.toFixed(2)}
            </Badge>
          )}
          {gear !== 0 && (
            <Badge className="bg-blue-500/15 text-blue-400 border border-blue-500/30">
              Gear {gear > 0 ? "+" : ""}
              {gear.toFixed(2)}
            </Badge>
          )}
          {derivedValue !== 0 && (
            <Badge className="bg-purple-500/15 text-purple-400 border border-purple-500/30">
              Attr +{derivedValue.toFixed(2)}
            </Badge>
          )}
        </div>

        {/* ---------- Increase ---------- */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Increase</span>
          <Input
            type="number"
            value={localIncreaseValue !== undefined ? localIncreaseValue : ""}
            onChange={(e) => onIncreaseChange(e.target.value)}
            onBlur={onIncreaseBlur}
            onWheel={(e) => e.currentTarget.blur()}
            className="bg-background/60 border-[#363b3d]"
          />
        </div>
      </CardContent>
    </Card>
  );
}
