import { describe, it, expect } from "vitest";
import { calculateIdealGearStatsBeamSearch } from "../app/domain/gear/idealOptimizer";

describe("Beam Search Gear Optimization", () => {
  it("generates valid stats for bellstrike_splendor", async () => {
    const result = await calculateIdealGearStatsBeamSearch("bellstrike", undefined, undefined, undefined, {
      beamWidth: 50, // Small width for fast testing
    });

    expect(result.specialLines.length).toBe(8);
    // 4 NamelessSwordChargedSkillDMGBoost + 4 PhysicalPenetration should be in allocations
    expect(result.allocations["NamelessSwordChargedSkillDMGBoost"]).toBeGreaterThanOrEqual(4);
    expect(result.allocations["PhysicalPenetration"]).toBeGreaterThanOrEqual(4);
    
    // Check for exclusive boost constraints (max 1 line for these)
    expect(result.allocations["CombatBoostAgainstBossUnits"]).toBeLessThanOrEqual(1);
    expect(result.allocations["AllMartialArtsBoost"]).toBeLessThanOrEqual(1);
    expect(result.allocations["ArtOfSwordDMGBoost"]).toBeLessThanOrEqual(1);
    
    expect(result.maxDamage).toBeGreaterThan(0);
  });
});
