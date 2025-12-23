import {
  calcMinimumDamage,
  calcAffinityDamage,
  calcExpectedNormal,
  calcCriticalDamage,
} from "./damageFormula";
import { DamageContext } from "./damageContext";

export function calculateDamage(ctx: DamageContext) {
  const g = ctx.get;

  const affinity = calcAffinityDamage(g);

  return {
    min: calcMinimumDamage(g),
    normal: calcExpectedNormal(g, affinity),
    critical: calcCriticalDamage(g),
    affinity,
  };
}
