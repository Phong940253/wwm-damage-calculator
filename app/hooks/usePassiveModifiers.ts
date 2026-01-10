import { useMemo } from "react";
import { ElementStats, InputStats, Rotation } from "@/app/types";
import { computeRotationBonuses } from "@/app/domain/skill/modifierEngine";

/**
 * Hook để tính toán bonus từ passive skills + inner ways.
 * Tất cả đều là phép cộng (flat) hoặc cộng theo tuyến tính (scale: add = source * ratio) và có thể có giới hạn.
 */
export function usePassiveModifiers(
  stats: InputStats,
  elementStats: ElementStats,
  gearBonus: Record<string, number>,
  rotation?: Rotation
): Record<string, number> {
  return useMemo(() => {
    return computeRotationBonuses(stats, elementStats, gearBonus, rotation);
  }, [stats, elementStats, gearBonus, rotation]);
}
