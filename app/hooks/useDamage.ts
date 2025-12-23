import { useMemo } from "react";
import { buildDamageContext } from "@/app/domain/damage/damageContext";
import { calculateDamage } from "@/app/domain/damage/damageCalculator";
import { InputStats, ElementStats } from "@/app/types";

export function useDamage(
  stats: InputStats,
  elementStats: ElementStats,
  gearBonus: Record<string, number>
) {
  return useMemo(() => {
    const ctx = buildDamageContext(stats, elementStats, gearBonus);
    return calculateDamage(ctx);
  }, [stats, elementStats, gearBonus]);
}
