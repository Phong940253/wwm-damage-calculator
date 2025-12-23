import { useStats } from "./useStats";
import { useElementStats } from "./useElementStats";
import { useGear } from "../gear/GearContext";
import { useDamage } from "./useDamage";
import { aggregateEquippedGearBonus } from "../domain/gear/gearAggregate";
import { InputStats, ElementStats } from "../types";
import { useStatImpact } from "./useStatImpact";

export function useDMGOptimizer(
  initialStats: InputStats,
  initialElements: ElementStats
) {
  const { stats, setStats } = useStats(initialStats);
  const { elementStats, setElementStats } = useElementStats(initialElements);

  const { customGears, equipped } = useGear();
  const gearBonus = aggregateEquippedGearBonus(customGears, equipped);

  const damage = useDamage(stats, elementStats, gearBonus);
  const statImpact = useStatImpact(stats, elementStats, gearBonus);

  /* ---------- handlers ---------- */

  const onStatChange = (
    key: keyof InputStats,
    field: "current" | "increase",
    value: string
  ) => {
    setStats((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: value === "" ? "" : Number(value) },
    }));
  };

  const onElementChange = (
    key: keyof ElementStats | "selected",
    field: "current" | "increase" | "selected",
    value: string
  ) => {
    setElementStats((prev) =>
      key === "selected"
        ? { ...prev, selected: value as any }
        : {
            ...prev,
            [key]: {
              ...prev[key],
              [field]: value === "" ? "" : Number(value),
            },
          }
    );
  };

  const warnings: string[] = [];
  if (
    Number(stats.CriticalRate.current) + Number(stats.AffinityRate.current) >
    100
  ) {
    warnings.push("Crit + Affinity > 100%");
  }

  return {
    stats,
    setStats,
    elementStats,
    setElementStats,
    gearBonus,
    damage,
    statImpact,
    warnings,
    onStatChange,
    onElementChange,
  };
}
