import { InputStats } from "@/app/types";

export function computeDerivedStats(
  stats: InputStats,
  gearBonus: Record<string, number>,
) {
  const v = (k: keyof InputStats) =>
    Number(stats[k]?.current || 0) + (gearBonus[k] || 0);

  const agility = v("Agility");
  const momentum = v("Momentum");
  const power = v("Power");
  const body = v("Body");
  const defense = v("Defense");

  return {
    minAtk: agility * 0.9 + power * 0.22,
    maxAtk: momentum * 0.9 + power * 1.36,
    critRate: agility * 0.076,
    affinityRate: momentum * 0.038,
    hp: body * 60 + defense * 17,
    physicalDefense: defense * 0.57,
  };
}
