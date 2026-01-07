"use client";

import { Badge } from "@/components/ui/badge";
import { CustomGear } from "@/app/types";

interface Props {
  gear: CustomGear;
  oldGear?: CustomGear | null;
}

export default function GearHoverDetail({ gear, oldGear }: Props) {
  const newStats = [...gear.mains, ...gear.subs, gear.addition].filter(Boolean);
  const oldStats = oldGear ? [...oldGear.mains, ...oldGear.subs, oldGear.addition].filter(Boolean) : [];

  // Create a map of old stats for easy lookup
  const oldStatsMap = new Map(oldStats.map((s) => [s!.stat, s!.value]));

  // Get all unique stat keys from both gears
  const allStatKeys = new Set([
    ...newStats.map((s) => s!.stat),
    ...oldStats.map((s) => s!.stat),
  ]);

  return (
    <div className="p-3 space-y-2 text-xs">
      <div>
        <div className="font-semibold text-sm text-emerald-600">{gear.name}</div>
        <div className="flex flex-wrap gap-1 mt-1">
          <Badge variant="outline">{gear.slot}</Badge>
          {gear.rarity && <Badge>{gear.rarity}</Badge>}
        </div>
      </div>

      {oldGear && (
        <div className="border-t pt-2">
          <div className="font-semibold text-sm text-muted-foreground mb-1">
            {oldGear.name}
          </div>
        </div>
      )}

      <div className="space-y-1">
        {Array.from(allStatKeys).map((stat) => {
          const newValue = newStats.find((s) => s!.stat === stat)?.value || 0;
          const oldValue = oldStatsMap.get(stat) || 0;
          const diff = newValue - oldValue;

          return (
            <div key={stat} className="flex justify-between gap-2">
              <span className="text-muted-foreground min-w-24">{stat}</span>
              <div className="flex gap-2">
                <span className="font-medium text-emerald-600 text-right min-w-12">
                  {newValue > 0 ? "+" : ""}
                  {newValue.toFixed(1)}
                </span>
                {oldGear && (
                  <>
                    <span className="text-muted-foreground text-right min-w-12">
                      {oldValue > 0 ? "+" : ""}
                      {oldValue.toFixed(1)}
                    </span>
                    <span
                      className={`text-right min-w-12 font-medium ${diff > 0
                        ? "text-emerald-500"
                        : diff < 0
                          ? "text-red-500"
                          : "text-muted-foreground"
                        }`}
                    >
                      {diff > 0 ? "+" : ""}
                      {diff.toFixed(1)}
                    </span>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
