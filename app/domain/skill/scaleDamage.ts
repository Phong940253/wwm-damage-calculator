import { DamageResult } from "../damage/type";

export function scaleDamage(dmg: DamageResult, scale: number): DamageResult {
  return {
    min: {
      value: dmg.min.value * scale,
      percent: dmg.min.percent,
    },
    normal: {
      value: dmg.normal.value * scale,
      percent: dmg.normal.percent,
    },
    critical: {
      value: dmg.critical.value * scale,
      percent: dmg.critical.percent,
    },
    affinity: {
      value: dmg.affinity.value * scale,
      percent: dmg.affinity.percent,
    },
    averageBreakdown: dmg.averageBreakdown,
  };
}
