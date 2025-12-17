import { CustomGear } from "../types";

export const aggregateGearStats = (
  gears: CustomGear[],
  equipped: Record<string, string | undefined>
) => {
  const bonus: Record<string, number> = {};

  Object.values(equipped).forEach((id) => {
    const gear = gears.find(g => g.id === id);
    if (!gear) return;

    [gear.main, ...gear.subs, gear.addition]
      .filter(Boolean)
      .forEach(attr => {
        bonus[attr!.stat] =
          (bonus[attr!.stat] || 0) + attr!.value;
      });
  });

  return bonus;
};
