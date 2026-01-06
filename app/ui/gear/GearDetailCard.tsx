"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getStatLabel } from "@/app/utils/statLabel";
import { CustomGear, InputStats } from "@/app/types";
import { StatType } from "@/app/domain/gear/types";
import { STAT_BG } from "@/app/domain/gear/constants";

interface Props {
  gear: CustomGear;
}
/* =======================
   Component
======================= */

export default function GearDetailCard({ gear }: Props) {
  return (
    <Card className="p-3 space-y-2 border border-white/10 bg-card/70">
      {/* Gear name */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold truncate">{gear.name}</p>
        <Badge variant="secondary">{gear.slot}</Badge>
      </div>

      {/* Main stat (single) */}
      {gear.main && (
        <div>
          <p className="text-xs text-muted-foreground mb-1">Main</p>
          <StatLine stat={gear.main.stat} value={gear.main.value} type="main" />
        </div>
      )}

      {/* Main stats (multi-main support) */}
      {gear.mains.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-1">Main Stats</p>
          <div className="space-y-1">
            {gear.mains.map((m, i) => (
              <StatLine key={i} stat={m.stat} value={m.value} type="main" />
            ))}
          </div>
        </div>
      )}

      {/* Sub stats */}
      {gear.subs.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-1">Sub Stats</p>
          <div className="space-y-1">
            {gear.subs.map((s, i) => (
              <StatLine key={i} stat={s.stat} value={s.value} type="sub" />
            ))}
          </div>
        </div>
      )}

      {/* Bonus / Addition */}
      {gear.addition && (
        <div>
          <p className="text-xs text-muted-foreground mb-1">Bonus</p>
          <StatLine
            stat={gear.addition.stat}
            value={gear.addition.value}
            type="bonus"
          />
        </div>
      )}
    </Card>
  );
}

/* =======================
   Stat Line
======================= */

function StatLine({
  stat,
  value,
  type,
}: {
  stat: keyof InputStats;
  value: number;
  type: StatType;
}) {
  const key = String(stat);

  return (
    <div
      className={`
        flex items-center justify-between
        px-2 py-1.5
        rounded-md
        border
        text-xs
        ${STAT_BG[type]}
      `}
    >
      <span className="text-muted-foreground truncate">
        {getStatLabel(key)}
      </span>
      <span className="font-medium whitespace-nowrap">+{value}</span>
    </div>
  );
}
