import { useStats } from "./useStats";
import { useElementStats } from "./useElementStats";
import { useGear } from "../providers/GearContext";
import { useDamage } from "./useDamage";
import { aggregateEquippedGearBonus } from "../domain/gear/gearAggregate";
import { InputStats, ElementStats, Rotation } from "../types";
import { useStatImpact } from "./useStatImpact";
import { ElementKey } from "../constants";

type ElementField = "current" | "increase";

export function useDMGOptimizer(
  initialStats: InputStats,
  initialElements: ElementStats,
  rotation?: Rotation
) {
  const { stats, setStats } = useStats(initialStats);
  const { elementStats, setElementStats } = useElementStats(initialElements);

  const { customGears, equipped } = useGear();
  const gearBonus = aggregateEquippedGearBonus(customGears, equipped);

  const damage = useDamage(stats, elementStats, gearBonus, rotation);
  const statImpact = useStatImpact(stats, elementStats, gearBonus, rotation);

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
    field: ElementField | "selected",
    value: string
  ) => {
    setElementStats((prev) => {
      // ✅ handle selected element
      if (key === "selected") {
        return {
          ...prev,
          selected: value as ElementKey,
        };
      }

      // ✅ handle martial art selection (string field)
      if (key === "martialArtsId") {
        return {
          ...prev,
          martialArtsId: value as ElementStats["martialArtsId"],
        };
      }

      // ✅ handle element stat
      return {
        ...prev,
        [key]: {
          ...prev[key],
          [field]: value === "" ? "" : Number(value),
        },
      };
    });
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
