"use client";

import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CustomGear } from "@/app/types";
import { ElementStats } from "@/app/types";
import { getStatLabel } from "@/app/utils/statLabel";

interface Props {
  gear: CustomGear;
  oldGear?: CustomGear | null;
  elementStats: ElementStats;
}

function getGearStatTotals(gear?: CustomGear | null): Map<string, number> {
  const totals = new Map<string, number>();
  if (!gear) return totals;

  const attrs = [gear.main, ...gear.mains, ...gear.subs, gear.addition].filter(Boolean);
  for (const a of attrs) {
    const key = String(a!.stat);
    totals.set(key, (totals.get(key) ?? 0) + (a!.value ?? 0));
  }
  return totals;
}

export default function GearHoverDetail({ gear, oldGear, elementStats }: Props) {
  const newTotals = getGearStatTotals(gear);
  const oldTotals = getGearStatTotals(oldGear);

  const allKeys = new Set<string>([...newTotals.keys(), ...oldTotals.keys()]);

  const rows = Array.from(allKeys)
    .map((statKey) => {
      const newValue = newTotals.get(statKey) ?? 0;
      const oldValue = oldTotals.get(statKey) ?? 0;
      const diff = newValue - oldValue;
      return {
        statKey,
        label: getStatLabel(statKey, elementStats),
        newValue,
        oldValue,
        diff,
      };
    })
    // Hide completely-empty rows
    .filter((r) => r.newValue !== 0 || r.oldValue !== 0)
    .sort((a, b) => {
      // Prefer the most impactful changes first
      const da = Math.abs(a.diff);
      const db = Math.abs(b.diff);
      if (da !== db) return db - da;
      return a.label.localeCompare(b.label);
    });

  const changedCount = rows.reduce((acc, r) => acc + (r.diff !== 0 ? 1 : 0), 0);

  return (
    <div className="w-[380px] p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold truncate">{gear.name}</div>
          <div className="mt-1 flex flex-wrap items-center gap-1">
            <Badge className="bg-emerald-500/15 text-emerald-700" variant="outline">
              New
            </Badge>
            <Badge variant="secondary">{gear.slot}</Badge>
            {gear.rarity && <Badge variant="secondary">{gear.rarity}</Badge>}
            {oldGear && (
              <Badge variant="outline" className="text-muted-foreground">
                Δ {changedCount}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {oldGear && (
        <>
          <Separator className="my-3" />
          <div className="text-xs text-muted-foreground">
            Equipped: <span className="font-medium text-foreground">{oldGear.name}</span>
          </div>
        </>
      )}

      <Separator className="my-3" />

      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 gap-y-1 text-xs">
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Stat</div>
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground text-right">New</div>
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground text-right">Old</div>
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground text-right">Δ</div>

        {rows.map((r) => {
          const diffTone =
            r.diff > 0
              ? "text-emerald-600"
              : r.diff < 0
                ? "text-red-600"
                : "text-muted-foreground";

          return (
            <div key={r.statKey} className="contents">
              <div className="min-w-0 truncate" title={r.label}>
                {r.label}
              </div>
              <div className="text-right tabular-nums font-medium text-emerald-700">
                {r.newValue > 0 ? "+" : ""}
                {r.newValue.toFixed(1)}
              </div>
              <div className="text-right tabular-nums text-muted-foreground">
                {r.oldValue > 0 ? "+" : ""}
                {r.oldValue.toFixed(1)}
              </div>
              <div className={`text-right tabular-nums font-semibold ${diffTone}`}>
                {r.diff > 0 ? "+" : ""}
                {r.diff.toFixed(1)}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 text-[11px] text-muted-foreground">
        Note: duplicate stats are summed before comparing.
      </div>
    </div>
  );
}
