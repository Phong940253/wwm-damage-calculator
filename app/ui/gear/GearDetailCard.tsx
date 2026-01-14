"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getStatLabel } from "@/app/utils/statLabel";
import { CustomGear, ElementStats } from "@/app/types";
import { StatType } from "@/app/domain/gear/types";
import { STAT_BG } from "@/app/domain/gear/constants";

interface Props {
  gear: CustomGear;
  elementStats?: ElementStats;
  /** Percent impact per stat key (vs baseline), e.g. { CriticalRate: 1.23 } */
  impactPctByStat?: Record<string, number>;
  /** Percent impact per specific stat line key (preferred if provided) */
  impactPctByLineKey?: Record<string, number>;
}
/* =======================
   Component
======================= */

export default function GearDetailCard({
  gear,
  elementStats,
  impactPctByStat,
  impactPctByLineKey,
}: Props) {
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
          <StatLine
            stat={gear.main.stat}
            value={gear.main.value}
            type="main"
            elementStats={elementStats}
            impactPct={
              impactPctByLineKey?.["main:0"] ??
              impactPctByStat?.[String(gear.main.stat)]
            }
          />
        </div>
      )}

      {/* Main stats (multi-main support) */}
      {gear.mains.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-1">Main Stats</p>
          <div className="space-y-1">
            {gear.mains.map((m, i) => (
              <StatLine
                key={i}
                stat={m.stat}
                value={m.value}
                type="main"
                elementStats={elementStats}
                impactPct={
                  impactPctByLineKey?.[`mains:${i}`] ??
                  impactPctByStat?.[String(m.stat)]
                }
              />
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
              <StatLine
                key={i}
                stat={s.stat}
                value={s.value}
                type="sub"
                elementStats={elementStats}
                impactPct={
                  impactPctByLineKey?.[`subs:${i}`] ??
                  impactPctByStat?.[String(s.stat)]
                }
              />
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
            elementStats={elementStats}
            impactPct={
              impactPctByLineKey?.["addition:0"] ??
              impactPctByStat?.[String(gear.addition.stat)]
            }
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
  elementStats,
  impactPct,
}: {
  stat: string;
  value: number;
  type: StatType;
  elementStats?: ElementStats;
  impactPct?: number;
}) {
  const key = String(stat);
  const pct = impactPct;
  const showPct = typeof pct === "number" && Number.isFinite(pct) && Math.abs(pct) >= 0.01;
  const pctTone =
    !showPct
      ? "text-muted-foreground"
      : pct! > 0
        ? "text-emerald-600"
        : pct! < 0
          ? "text-red-600"
          : "text-muted-foreground";

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
        {getStatLabel(key, elementStats)}
      </span>
      <span className="font-medium whitespace-nowrap">
        +{Number(value).toFixed(1)}
        {showPct && (
          <span className={`ml-1 font-normal ${pctTone}`}>
            ({pct! >= 0 ? "+" : ""}
            {pct!.toFixed(2)}%)
          </span>
        )}
      </span>
    </div>
  );
}
