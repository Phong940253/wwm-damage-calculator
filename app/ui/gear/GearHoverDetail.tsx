"use client";

import { Badge } from "@/components/ui/badge";
import { CustomGear } from "@/app/types";

interface Props {
  gear: CustomGear;
}

export default function GearHoverDetail({ gear }: Props) {
  const allStats = [...gear.mains, ...gear.subs, gear.addition].filter(Boolean);

  return (
    <div className="p-3 w-64 space-y-2 text-xs">
      <div className="font-semibold text-sm">{gear.name}</div>

      <div className="flex flex-wrap gap-1">
        <Badge variant="outline">{gear.slot}</Badge>
        {gear.rarity && <Badge>{gear.rarity}</Badge>}
      </div>

      <div className="space-y-1">
        {allStats.map((s, i) => (
          <div key={i} className="flex justify-between">
            <span className="text-muted-foreground">{s!.stat}</span>
            <span className="font-medium">
              {s!.value > 0 ? "+" : ""}
              {s!.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
