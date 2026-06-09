import { describe, it, expect } from "vitest";
import { INITIAL_STATS, INITIAL_ELEMENT_STATS } from "@/app/constants";
import { buildDamageContext } from "@/app/domain/damage/damageContext";
import { calculateDamage } from "@/app/domain/damage/damageCalculator";

describe("damage calculation", () => {
  it("calculates non-zero normal damage for initial stats", () => {
    const ctx = buildDamageContext(INITIAL_STATS, INITIAL_ELEMENT_STATS, {});
    const res = calculateDamage(ctx);
    expect(res).toHaveProperty("normal");
    expect(typeof res.normal).toBe("number");
    expect(res.normal).toBeGreaterThan(0);
    expect(res).toHaveProperty("affinity");
    expect(res).toHaveProperty("critical");
  });
});
