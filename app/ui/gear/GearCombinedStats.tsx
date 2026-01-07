"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { STAT_LABELS } from "@/app/constants";

import { Button } from "@/components/ui/button";
import { exportElementToPNG } from "@/app/utils/exportPng";

interface Props {
  bonus: Record<string, number>;
}

export default function GearCombinedStats({ bonus }: Props) {
  const entries = Object.entries(bonus).filter(([, v]) => v !== 0);

  if (entries.length === 0) return null;

  return (
    <Card
      className="
        p-4 space-y-3
        bg-card/70
        border border-white/10
        shadow-lg
      "
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">⚙️ Gear Bonus (Combined)</h3>
        <Badge variant="secondary">{entries.length} stats</Badge>
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
        {entries.map(([stat, value]) => (
          <div
            key={stat}
            className="flex justify-between border-b border-white/5 pb-0.5"
          >
            <span className="text-muted-foreground">
              {STAT_LABELS[stat] ?? stat}
            </span>
            <span className="font-medium text-green-400">+{value.toFixed(1)}</span>
          </div>
        ))}
      </div>
      <Button
        size="sm"
        variant="secondary"
        onClick={() => exportElementToPNG("gear-combined-stats")}
      >
        📸 Export PNG
      </Button>
    </Card>
  );
}
