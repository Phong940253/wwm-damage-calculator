import { CustomGear, GearSlot } from "@/app/types";

/** Aggregate all equipped gears into flat stat bonus */
export function aggregateEquippedGearBonus(
  gears: CustomGear[],
  equipped: Partial<Record<GearSlot, string | undefined>>
): Record<string, number> {
  const bonus: Record<string, number> = {};

  Object.values(equipped).forEach((id) => {
    if (!id) return;
    const gear = gears.find((g) => g.id === id);
    if (!gear) return;

    [...gear.mains, ...gear.subs, gear.addition]
      .filter(Boolean)
      .forEach((a) => {
        bonus[a!.stat] = (bonus[a!.stat] || 0) + a!.value;
      });
  });

  return bonus;
}
