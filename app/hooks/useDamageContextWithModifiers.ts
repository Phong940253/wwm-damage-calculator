import { InputStats, ElementStats, Rotation } from "@/app/types";
import {
  buildDamageContext,
  DamageContext,
} from "@/app/domain/damage/damageContext";
import { useMemo } from "react";
import {
  computeRotationBonusesWithBreakdown,
  sumBonuses,
} from "@/app/domain/skill/modifierEngine";
import type { LevelContext } from "@/app/domain/level/levelSettings";

/**
 * Enhanced version of buildDamageContext that includes passive skills + inner ways
 * TEMPORARILY DISABLED: Passive modifiers are not applied to avoid calculation errors
 * UI components remain intact for future use
 */
export function useDamageContextWithModifiers(
  stats: InputStats,
  elementStats: ElementStats,
  gearBonus: Record<string, number>,
  rotation?: Rotation,
  levelContext?: LevelContext,
): DamageContext {
  const breakdown = useMemo(
    () =>
      computeRotationBonusesWithBreakdown(
        stats,
        elementStats,
        gearBonus,
        rotation,
      ),
    [stats, elementStats, gearBonus, rotation],
  );

  const combinedBonus = sumBonuses(gearBonus, breakdown.total);

  return buildDamageContext(
    stats,
    elementStats,
    combinedBonus,
    {
      gear: gearBonus,
      passives: Object.fromEntries(
        Object.entries(breakdown.byPassive).map(([id, bonus]) => [
          id,
          {
            name: breakdown.meta.passives[id]?.name ?? id,
            uptimePct: breakdown.meta.passives[id]?.uptimePct,
            bonus,
          },
        ]),
      ),
      innerWays: Object.fromEntries(
        Object.entries(breakdown.byInnerWay).map(([id, bonus]) => [
          id,
          { name: breakdown.meta.innerWays[id]?.name ?? id, bonus },
        ]),
      ),
    },
    levelContext,
  );
}
