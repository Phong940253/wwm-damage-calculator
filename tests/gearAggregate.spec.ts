import { describe, it, expect } from "vitest";
import {
  aggregateEquippedGearBonus,
  analyzeEquippedGear,
} from "@/app/domain/gear/gearAggregate";

// Minimal CustomGear shape
const gear1 = {
  id: "g1",
  name: "Test Gear 1",
  slot: "head",
  mains: [],
  subs: [
    { stat: "CriticalRate", value: 3 },
    { stat: "PhysicalPenetration", value: 4 },
  ],
  addition: null,
};

const gear2 = {
  id: "g2",
  name: "Test Gear 2",
  slot: "chest",
  mains: [],
  subs: [{ stat: "CriticalRate", value: 2 }],
  addition: { stat: "AffinityRate", value: 1 },
};

describe("gear aggregation", () => {
  it("aggregates equipped gear bonus correctly", () => {
    const gears = [gear1 as any, gear2 as any];
    const equipped = { head: "g1", chest: "g2" };
    const bonus = aggregateEquippedGearBonus(gears, equipped);
    expect(bonus.CriticalRate).toBe(5);
    expect(bonus.PhysicalPenetration).toBe(4);
    expect(bonus.AffinityRate).toBe(1);
  });

  it("analyzes equipped gear", () => {
    const gears = [gear1 as any, gear2 as any];
    const equipped = { head: "g1", chest: "g2" };
    const analysis = analyzeEquippedGear(gears, equipped);
    expect(analysis.equippedCount).toBe(2);
    expect(analysis.totalSubLines).toBe(3);
    expect(analysis.statSummary["CriticalRate"].total).toBe(5);
  });
});
