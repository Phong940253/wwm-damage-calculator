import { CustomGear, GearSlot } from "@/app/types";

export function mergeCustomGears(
  local: CustomGear[],
  incoming: CustomGear[]
): CustomGear[] {
  const map = new Map<string, CustomGear>();

  // ưu tiên local
  local.forEach((g) => map.set(g.id, g));
  incoming.forEach((g) => {
    if (!map.has(g.id)) {
      map.set(g.id, g);
    }
  });

  return Array.from(map.values());
}

export function mergeEquipped(
  local: Partial<Record<GearSlot, string>>,
  incoming: Partial<Record<GearSlot, string>>
): Partial<Record<GearSlot, string>> {
  const result = { ...local };

  (Object.keys(incoming) as GearSlot[]).forEach((slot) => {
    if (!result[slot] && incoming[slot]) {
      result[slot] = incoming[slot];
    }
  });

  return result;
}
