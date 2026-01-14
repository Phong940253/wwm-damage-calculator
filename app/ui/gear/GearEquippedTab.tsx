"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useMemo } from "react";
import { useGear } from "../../providers/GearContext";
import { GEAR_SLOTS } from "../../constants";
import GearDetailCard from "@/app/ui/gear/GearDetailCard";
import GearCombinedStats from "./GearCombinedStats";
import { aggregateEquippedGearBonus } from "@/app/domain/gear/gearAggregate";
import { useStats } from "@/app/hooks/useStats";
import { useElementStats } from "@/app/hooks/useElementStats";
import { useRotation } from "@/app/hooks/useRotation";
import { INITIAL_ELEMENT_STATS, INITIAL_STATS } from "@/app/constants";
import { buildDamageContext } from "@/app/domain/damage/damageContext";
import { calculateDamage } from "@/app/domain/damage/damageCalculator";
import { computeRotationBonuses, sumBonuses } from "@/app/domain/skill/modifierEngine";
import { SKILLS } from "@/app/domain/skill/skills";
import { calculateSkillDamage } from "@/app/domain/skill/skillDamage";
import type { ElementStats, GearSlot, InputStats, Rotation } from "@/app/types";

function calcRotationAwareNormalDamage(
  stats: InputStats,
  elementStats: ElementStats,
  gearBonus: Record<string, number>,
  rotation?: Rotation
): number {
  const rotationBonuses = computeRotationBonuses(
    stats,
    elementStats,
    gearBonus,
    rotation
  );

  const ctx = buildDamageContext(
    stats,
    elementStats,
    sumBonuses(gearBonus, rotationBonuses)
  );

  if (rotation && rotation.skills.length > 0) {
    let totalNormal = 0;
    for (const rotSkill of rotation.skills) {
      const skill = SKILLS.find((s) => s.id === rotSkill.id);
      if (!skill) continue;
      const dmg = calculateSkillDamage(ctx, skill);
      totalNormal += dmg.total.normal.value * rotSkill.count;
    }
    return totalNormal;
  }

  return calculateDamage(ctx).normal || 0;
}

export default function GearEquippedTab() {
  const { customGears, equipped, setEquipped } = useGear();

  // Pull the same saved Stats/Element/Rotation that drive the rest of the app
  const { stats } = useStats(INITIAL_STATS);
  const { elementStats } = useElementStats(INITIAL_ELEMENT_STATS);
  const { selectedRotation } = useRotation();

  const bonus = useMemo(
    () => aggregateEquippedGearBonus(customGears, equipped),
    [customGears, equipped]
  );

  const fullDamage = useMemo(() => {
    return calcRotationAwareNormalDamage(
      stats,
      elementStats,
      bonus,
      selectedRotation
    );
  }, [stats, elementStats, bonus, selectedRotation]);

  const slotsWithImpact = useMemo(() => {
    const rows = GEAR_SLOTS.map(({ key, label }) => {
      const equippedId = equipped[key];
      const equippedGear = customGears.find((g) => g.id === equippedId);

      const equippedWithoutSlot: Partial<Record<GearSlot, string>> = {
        ...equipped,
      };
      delete equippedWithoutSlot[key];

      const bonusWithoutSlot = aggregateEquippedGearBonus(
        customGears,
        equippedWithoutSlot
      );
      const damageWithoutSlot = calcRotationAwareNormalDamage(
        stats,
        elementStats,
        bonusWithoutSlot,
        selectedRotation
      );

      const diff = fullDamage - damageWithoutSlot;
      const percent =
        damageWithoutSlot <= 0 ? 0 : (diff / damageWithoutSlot) * 100;

      return {
        key,
        label,
        equippedId,
        equippedGear,
        damageWithoutSlot,
        diff,
        percent,
      };
    });

    const worst = rows
      .filter((r) => !!r.equippedGear)
      .sort((a, b) => a.percent - b.percent)[0]?.key;

    return { rows, worstKey: worst };
  }, [customGears, equipped, stats, elementStats, selectedRotation, fullDamage]);

  return (
    <div className="space-y-4" id="gear-combined-stats">
      {/* Combined result */}
      <GearCombinedStats bonus={bonus} />
      <Card className="p-4 border border-white/10 bg-card/60 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="text-sm font-semibold">📈 Gear DMG Impact</div>
            <div className="text-xs text-muted-foreground">
              Shows gain vs leaving that slot empty (rotation-aware).
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">
              Avg DMG: {Math.round(fullDamage).toLocaleString()}
            </Badge>
            <Badge variant="outline" className="text-muted-foreground">
              {slotsWithImpact.rows.filter((r) => r.equippedGear).length}/
              {GEAR_SLOTS.length} equipped
            </Badge>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {slotsWithImpact.rows.map((row) => {
          const available = customGears.filter((g) => g.slot === row.key);

          const pctText =
            row.equippedGear && row.damageWithoutSlot > 0
              ? `${row.percent >= 0 ? "+" : ""}${row.percent.toFixed(2)}%`
              : "0.00%";

          const isWorst =
            !!row.equippedGear && row.key === slotsWithImpact.worstKey;

          const diffTone =
            row.diff > 0
              ? "text-emerald-600"
              : row.diff < 0
                ? "text-red-600"
                : "text-muted-foreground";

          return (
            <Card
              key={row.key}
              className={cn(
                "p-3 space-y-3 border shadow-sm bg-card/50",
                "border-white/10",
                isWorst && "ring-1 ring-amber-400/40"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{row.label}</p>
                  <p className="text-sm font-semibold truncate">
                    {row.equippedGear?.name ?? "Empty"}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-1">
                  <Badge
                    variant={row.diff >= 0 ? "secondary" : "outline"}
                    className={cn(
                      row.diff > 0 && "bg-emerald-500/15 text-emerald-700",
                      row.diff < 0 && "bg-red-500/10 text-red-700"
                    )}
                  >
                    {pctText}
                  </Badge>
                  {isWorst && (
                    <Badge className="bg-amber-500/15 text-amber-700" variant="outline">
                      Worst
                    </Badge>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                <div className="text-muted-foreground">Without this slot</div>
                <div className="text-right">
                  {Math.round(row.damageWithoutSlot).toLocaleString()}
                </div>
                <div className="text-muted-foreground">With current gear</div>
                <div className="text-right">
                  {Math.round(fullDamage).toLocaleString()}
                </div>
                <div className="text-muted-foreground">Δ from this slot</div>
                <div className={cn("text-right font-medium", diffTone)}>
                  {row.diff > 0 ? "+" : ""}
                  {Math.round(row.diff).toLocaleString()}
                </div>
              </div>

              <Separator className="bg-white/5" />

              <select
                value={row.equippedId || ""}
                onChange={(e) =>
                  setEquipped((prev) => {
                    const next = { ...prev };
                    const v = e.target.value;
                    if (!v) {
                      delete next[row.key];
                    } else {
                      next[row.key] = v;
                    }
                    return next;
                  })
                }
                className={cn(
                  "w-full rounded-md border bg-background px-2 py-2 text-sm",
                  "border-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/15"
                )}
              >
                <option value="">Empty</option>
                {available.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>

              {row.equippedGear ? (
                <GearDetailCard gear={row.equippedGear} />
              ) : (
                <div className="h-36 rounded bg-muted/40 flex items-center justify-center text-xs text-muted-foreground">
                  {row.label}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
