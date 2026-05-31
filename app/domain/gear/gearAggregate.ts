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

    [gear.main, ...gear.mains, ...gear.subs, ...(gear.additions ?? []), gear.addition]
      .filter(Boolean)
      .forEach((a) => {
        bonus[a!.stat] = (bonus[a!.stat] || 0) + a!.value;
      });
  });

  return bonus;
}

export interface GearAnalysis {
  statSummary: Record<
    string,
    {
      total: number;
      subCount: number;
      mainCount: number;
      additionCount: number;
    }
  >;
  totalSubLines: number;
  equippedCount: number;
}

/** Detailed analysis of equipped gear stats and line distribution */
export function analyzeEquippedGear(
  gears: CustomGear[],
  equipped: Partial<Record<GearSlot, string | undefined>>
): GearAnalysis {
  const statSummary: Record<
    string,
    {
      total: number;
      subCount: number;
      mainCount: number;
      additionCount: number;
    }
  > = {};
  let totalSubLines = 0;
  let equippedCount = 0;

  Object.values(equipped).forEach((id) => {
    if (!id) return;
    const gear = gears.find((g) => g.id === id);
    if (!gear) return;

    equippedCount++;

    const process = (
      attr: { stat: string; value: number } | null | undefined,
      type: "main" | "sub" | "addition"
    ) => {
      if (!attr) return;
      if (!statSummary[attr.stat]) {
        statSummary[attr.stat] = {
          total: 0,
          subCount: 0,
          mainCount: 0,
          additionCount: 0,
        };
      }
      
      // ONLY sum values from sub and addition
      if (type !== "main") {
        statSummary[attr.stat].total += attr.value;
      }

      if (type === "sub") {
        statSummary[attr.stat].subCount++;
        totalSubLines++;
      } else if (type === "main") {
        statSummary[attr.stat].mainCount++;
      } else {
        statSummary[attr.stat].additionCount++;
      }
    };

    process(gear.main, "main");
    gear.mains.forEach((m) => process(m, "main"));
    gear.subs.forEach((s) => process(s, "sub"));
    (gear.additions ?? []).forEach((a) => process(a, "addition"));
    process(gear.addition, "addition");
  });

  return { statSummary, totalSubLines, equippedCount };
}
