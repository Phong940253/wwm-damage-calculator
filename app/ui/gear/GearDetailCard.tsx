"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getStatLabel } from "@/app/utils/statLabel";
import { CustomGear, ElementStats } from "@/app/types";
import { StatType } from "@/app/domain/gear/types";
import { STAT_BG } from "@/app/domain/gear/constants";
import { useI18n } from "@/app/providers/I18nProvider";
import { getGearTuneHistorySubIndexSet } from "@/app/domain/gear/tuneAdvisor";

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
  const { t } = useI18n();
  const tunedSubIndexSet = getGearTuneHistorySubIndexSet(gear);

  return (
    <Card className="p-3 space-y-2 border border-white/10 bg-card/70">
      {/* Gear name */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold truncate">{gear.name}</p>
        <div className="flex items-center gap-1.5">
          <Badge variant="outline">
            {t("gearCard.detailLevel")} {typeof gear.level === "number" && Number.isFinite(gear.level) ? gear.level : 91}
          </Badge>
          <Badge variant="secondary">{gear.slot}</Badge>
        </div>
      </div>

      {/* Main stat (single) */}
      {gear.main && (
        <div>
          <p className="text-xs text-muted-foreground mb-1">{t("gearCard.detailMain")}</p>
          <StatLine
            stat={String(gear.main.stat)}
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
          <p className="text-xs text-muted-foreground mb-1">{t("gearCard.detailMainStats")}</p>
          <div className="space-y-1">
            {gear.mains.map((m, i) => (
              <StatLine
                key={i}
                stat={String(m.stat)}
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
          <p className="text-xs text-muted-foreground mb-1">{t("gearCard.detailSubStats")}</p>
          <div className="space-y-1">
            {gear.subs.map((s, i) => (
              <StatLine
                key={i}
                stat={String(s.stat)}
                value={s.value}
                type="sub"
                elementStats={elementStats}
                impactPct={
                  impactPctByLineKey?.[`subs:${i}`] ??
                  impactPctByStat?.[String(s.stat)]
                }
                isTuned={tunedSubIndexSet.has(i)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Bonus / Addition */}
      {gear.addition && (
        <div>
          <p className="text-xs text-muted-foreground mb-1">{t("gearCard.detailBonus")}</p>
          <div className="space-y-1">
            <StatLine
              stat={String(gear.addition.stat)}
              value={gear.addition.value}
              type="bonus"
              elementStats={elementStats}
              impactPct={
                impactPctByLineKey?.["addition:0"] ??
                impactPctByStat?.[String(gear.addition.stat)]
              }
            />
          </div>
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
  isTuned,
}: {
  stat: string;
  value: number;
  type: StatType;
  elementStats?: ElementStats;
  impactPct?: number;
  isTuned?: boolean;
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
      className={cn(
        "flex items-center justify-between px-2 py-1.5 rounded-md border text-xs",
        STAT_BG[type],
        isTuned && "!border-red-500/40 !bg-red-500/15 !text-red-200"
      )}
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
