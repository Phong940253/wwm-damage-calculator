import { describe, it, expect } from "vitest";
import type { CustomGear, GearSlot } from "@/app/types";
import { aggregateEquippedGearBonus } from "@/app/domain/gear/gearAggregate";

function modifyGearStats(
  bonus: Record<string, number>,
  gear: CustomGear,
  sign: 1 | -1,
): void {
  const items = [gear.main, ...gear.mains, ...gear.subs, gear.addition];
  for (const a of items) {
    if (!a) continue;
    const key = String(a.stat);
    const val = typeof a.value === "number" ? a.value : 0;
    bonus[key] = (bonus[key] || 0) + sign * val;
  }
}

function buildGearBonusFromSelection(
  customGears: CustomGear[],
  equipped: Partial<Record<GearSlot, string | undefined>>,
  selection: Partial<Record<GearSlot, CustomGear>>,
): Record<string, number> {
  const bonus = aggregateEquippedGearBonus(customGears, equipped);

  for (const [slotStr, selectedGear] of Object.entries(selection)) {
    const slot = slotStr as GearSlot;
    if (!selectedGear) continue;

    const equippedId = equipped[slot];
    if (equippedId) {
      const equippedGear = customGears.find((g) => g.id === equippedId);
      if (equippedGear) {
        modifyGearStats(bonus, equippedGear, -1);
      }
    }
    modifyGearStats(bonus, selectedGear, 1);
  }

  return bonus;
}

function makeGear(
  id: string,
  slot: GearSlot,
  overrides?: Partial<CustomGear>,
): CustomGear {
  return {
    id,
    name: id,
    slot,
    mains: [{ stat: "MaxPhysicalAttack", value: 100 }],
    subs: [
      { stat: "Momentum", value: 35 },
      { stat: "CriticalRate", value: 7.4 },
    ],
    ...overrides,
  };
}

describe("buildGearBonusFromSelection", () => {
  it("includes stats from non-optimized slots", () => {
    // gearA has only its overridden stats (no default mains/subs)
    const gearA: CustomGear = {
      id: "A", name: "A", slot: "weapon_1",
      mains: [{ stat: "MinPhysicalAttack", value: 200 }],
      subs: [],
    };
    const gearB: CustomGear = {
      id: "B", name: "B", slot: "head",
      mains: [{ stat: "PhysicalPenetration", value: 150 }],
      subs: [],
    };
    const gearC: CustomGear = {
      id: "C", name: "C", slot: "chest",
      mains: [{ stat: "FlatDamage", value: 50 }],
      subs: [],
    };

    const customGears = [gearA, gearB, gearC];
    const equipped = { weapon_1: "A", head: "B", chest: "C" };

    // Optimize only weapon_1 — select a different weapon
    const newWeapon: CustomGear = {
      id: "X", name: "X", slot: "weapon_1",
      mains: [{ stat: "MinPhysicalAttack", value: 500 }],
      subs: [{ stat: "Power", value: 20 }],
    };

    const selection: Partial<Record<GearSlot, CustomGear>> = {
      weapon_1: newWeapon,
    };

    const result = buildGearBonusFromSelection(customGears, equipped, selection);

    // Old approach (only selection): MinPhysicalAttack = 500, Power = 20
    //                    Missing: PhysPen = 150 (gearB), FlatDmg = 50 (gearC)
    // New approach (base + swap): MinPhysicalAttack = 500 (newWeapon)
    //                             PhysPen = 150 (gearB, unchanged)
    //                             FlatDmg = 50 (gearC, unchanged)
    //                             Power = 20 (newWeapon)
    //                             Old gearA stats are subtracted
    // gearA's stats (subs=[]) have no Momentum/CriticalRate
    // gearB/gearC contribute their default Momentum/CriticalRate via base bonus
    // After subtracting gearA (no stats) and adding newWeapon (no Momentum/CriticalRate),
    // those values come from gearB/gearC
    expect(result["MinPhysicalAttack"]).toBe(500);
    expect(result["PhysicalPenetration"]).toBe(150);
    expect(result["FlatDamage"]).toBe(50);
    expect(result["Power"]).toBe(20);
  });

  it("handles same-id gear tune variant correctly", () => {
    const baseGear: CustomGear = {
      id: "A", name: "Sword", slot: "weapon_1",
      mains: [{ stat: "MinPhysicalAttack", value: 200 }],
      subs: [
        { stat: "Momentum", value: 35 },
        { stat: "CriticalRate", value: 7.4 },
      ],
    };

    const tunedGear: CustomGear = {
      id: "A", name: "Sword", slot: "weapon_1",
      mains: [{ stat: "MinPhysicalAttack", value: 200 }],
      subs: [
        { stat: "Power", value: 40 },
        { stat: "CriticalRate", value: 7.4 },
      ],
    };

    const customGears = [baseGear];
    const equipped = { weapon_1: "A" };
    const selection: Partial<Record<GearSlot, CustomGear>> = {
      weapon_1: tunedGear,
    };

    const result = buildGearBonusFromSelection(customGears, equipped, selection);

    // Subtract base (id="A" from customGears): removes Momentum 35, CritRate 7.4
    // Add tuned: adds Power 40, CritRate 7.4
    // Momentum ends up as 0 (not in tuned, subtracted from base)
    expect(result["MinPhysicalAttack"]).toBe(200);
    expect(result["Power"]).toBe(40);
    expect(result["CriticalRate"]).toBe(7.4);
    expect(result["Momentum"]).toBe(0);
  });

  it("handles empty selection (no optimized slots)", () => {
    const gearA: CustomGear = {
      id: "A", name: "A", slot: "weapon_1",
      mains: [{ stat: "MinPhysicalAttack", value: 200 }],
      subs: [],
    };
    const gearB: CustomGear = {
      id: "B", name: "B", slot: "head",
      mains: [{ stat: "PhysicalPenetration", value: 150 }],
      subs: [],
    };

    const customGears = [gearA, gearB];
    const equipped = { weapon_1: "A", head: "B" };

    const result = buildGearBonusFromSelection(customGears, equipped, {});

    expect(result["MinPhysicalAttack"]).toBe(200);
    expect(result["PhysicalPenetration"]).toBe(150);
  });

  it("handles partial selection where selected gear matches equipped", () => {
    const gearA: CustomGear = {
      id: "A", name: "A", slot: "weapon_1",
      mains: [{ stat: "MinPhysicalAttack", value: 200 }],
      subs: [],
    };

    const customGears = [gearA];
    const equipped = { weapon_1: "A" };
    const selection: Partial<Record<GearSlot, CustomGear>> = {
      weapon_1: gearA,
    };

    const result = buildGearBonusFromSelection(customGears, equipped, selection);

    // Subtract A, add A → cancels out
    expect(result["MinPhysicalAttack"]).toBe(200);
  });
});
