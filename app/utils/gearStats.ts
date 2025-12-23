import { CustomGear, InputStats } from "../types";

/**
 * Calculate derived stats from attributes (Agility, Momentum, Power)
 * These derived stats are added to the corresponding combat stats
 */
export function calculateDerivedStats(
  stats: InputStats,
  gearBonus: Record<string, number>
) {
  const agility = (stats.Agility?.current || 0) + (gearBonus.Agility || 0);
  const momentum = (stats.Momentum?.current || 0) + (gearBonus.Momentum || 0);
  const power = (stats.Power?.current || 0) + (gearBonus.Power || 0);

  return {
    minAtk: agility * 1 + power * 0.246,
    maxAtk: momentum * 0.9 + power * 1.315,
    critRate: agility * 0.075,
    affinityRate: momentum * 0.04,
  };
}

/**
 * Aggregate all stats from a gear piece (mains + subs + addition)
 * Returns a flat object with stat names as keys and total values
 */
export function aggregateGearBonus(gear: CustomGear): Record<string, number> {
  const bonus: Record<string, number> = {};

  gear.mains.forEach((m) => {
    const statKey = String(m.stat);
    bonus[statKey] = (bonus[statKey] || 0) + m.value;
  });

  gear.subs.forEach((s) => {
    const statKey = String(s.stat);
    bonus[statKey] = (bonus[statKey] || 0) + s.value;
  });

  if (gear.addition) {
    const statKey = String(gear.addition.stat);
    bonus[statKey] = (bonus[statKey] || 0) + gear.addition.value;
  }

  return bonus;
}

/**
 * Calculate total bonus including derived stats from attributes
 * This is the complete bonus that should be passed to damage calculation
 */
export function calculateTotalGearBonus(
  gear: CustomGear,
  stats: InputStats
): Record<string, number> {
  const bonus = aggregateGearBonus(gear);
  const derived = calculateDerivedStats(stats, bonus);

  // Add derived stats to bonus
  bonus.MinPhysicalAttack = (bonus.MinPhysicalAttack || 0) + derived.minAtk;
  bonus.MaxPhysicalAttack = (bonus.MaxPhysicalAttack || 0) + derived.maxAtk;
  bonus.CriticalRate = (bonus.CriticalRate || 0) + derived.critRate;
  bonus.AffinityRate = (bonus.AffinityRate || 0) + derived.affinityRate;

  return bonus;
}
