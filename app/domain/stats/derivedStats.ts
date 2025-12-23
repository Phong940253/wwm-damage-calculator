import { InputStats } from "@/app/types";

export function computeDerivedStats(
  stats: InputStats,
  gearBonus: Record<string, number>
) {
  const v = (k: keyof InputStats) =>
    Number(stats[k]?.current || 0) + (gearBonus[k] || 0);

  const agility = v("Agility");
  const momentum = v("Momentum");
  const power = v("Power");

  return {
    minAtk: agility * 1 + power * 0.246,
    maxAtk: momentum * 0.9 + power * 1.315,
    critRate: agility * 0.075,
    affinityRate: momentum * 0.04,
  };
}
