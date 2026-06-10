import { describe, it, expect } from "vitest";
import {
  calculateIdealGearStatsBeamSearch,
  distributeStatsToGears,
  SINGLE_LINE_STATS,
  MAX_LINES_PER_STAT,
  MAX_LINES_PER_STAT_OVERRIDES,
  CANDIDATE_STATS,
  SPECIAL_LINE_POOLS,
} from "../app/domain/gear/idealOptimizer";
import type { IdealGear } from "../app/domain/gear/idealOptimizer";

describe("Gear Distribution Rules", () => {
  function verifyGearRules(gears: IdealGear[], path: string) {
    expect(gears).toHaveLength(8);

    for (const gear of gears) {
      // Mỗi gear có 6 dòng: 1 special + 5 tuning
      expect(gear.tuningLines).toHaveLength(5);

      // Các tuning lines trong 1 gear không được trùng nhau
      expect(new Set(gear.tuningLines).size).toBe(gear.tuningLines.length);
    }

    if (path === "bellstrike") {
      // Slot 6: gears 1-4 = PhysicalPenetration, gears 5-8 = NamelessSwordChargedSkillDMGBoost
      for (const gear of gears) {
        if (gear.id <= 4) {
          expect(gear.tuningLines).toContain("PhysicalPenetration");
        } else {
          expect(gear.tuningLines).toContain("NamelessSwordChargedSkillDMGBoost");
        }
      }
    }

    // Exclusive placements
    for (const gear of gears) {
      if (gear.id === 1) {
        expect(gear.tuningLines.filter((s) => s === "ArtOfSwordDMGBoost").length)
          .toBeLessThanOrEqual(1);
      } else {
        expect(gear.tuningLines).not.toContain("ArtOfSwordDMGBoost");
      }

      if (gear.id === 7) {
        expect(gear.tuningLines.filter((s) => s === "CombatBoostAgainstBossUnits").length)
          .toBeLessThanOrEqual(1);
      } else {
        expect(gear.tuningLines).not.toContain("CombatBoostAgainstBossUnits");
      }

      if (gear.id === 3 || gear.id === 4) {
        expect(gear.tuningLines.filter((s) => s === "AllMartialArtsBoost").length)
          .toBeLessThanOrEqual(1);
      } else {
        expect(gear.tuningLines).not.toContain("AllMartialArtsBoost");
      }
    }

    // Tổng số dòng = 48 (8 special + 8×5 tuning)
    const totalLines = gears.reduce((sum, g) => sum + 1 + g.tuningLines.length, 0);
    expect(totalLines).toBe(48);
  }

  it("distributes a known result following all gear rules", () => {
    // Specials: bellstrikeMax=1, Power=2, MaxPhysicalAttack=2, CriticalRate=2, AffinityRate=1 (=8)
    const specialLines: string[] = [
      "bellstrikeMax",
      "Power",
      "MaxPhysicalAttack",
      "MaxPhysicalAttack",
      "CriticalRate",
      "AffinityRate",
      "Power",
      "CriticalRate",
    ];
    // === Total = 48 = 8 fixed (PP4+NM4) + 40 candidate stats ===
    // Candidate: 8 special + 32 tuning
    // MaxPhysicalAttack: 2 special + 8 tuning = 10
    // Power: 2 special + 8 tuning = 10
    // CriticalRate: 2 special + 8 tuning = 10
    // AffinityRate: 1 special + 7 tuning = 8
    // bellstrikeMax: 1 special + 1 tuning = 2
    // Momentum: 0 special + 0 tuning = 0
    // Total candidates = 10+10+10+8+2 = 40 ✓
    const allocations: Record<string, number> = {
      NamelessSwordChargedSkillDMGBoost: 4,
      PhysicalPenetration: 4,
      MaxPhysicalAttack: 10,
      Power: 10,
      CriticalRate: 10,
      AffinityRate: 8,
      bellstrikeMax: 2,
      Momentum: 0,
      CombatBoostAgainstBossUnits: 0,
      AllMartialArtsBoost: 0,
      ArtOfSwordDMGBoost: 0,
    };

    const gears = distributeStatsToGears({
      path: "bellstrike",
      maxDamage: 1000,
      allocations,
      stats: {},
      specialLines,
    });
    verifyGearRules(gears, "bellstrike");
  });

  it("allows tuning line to duplicate gear's special line", () => {
    // Specials: MaxPhysicalAttack=3, Power=2, CriticalRate=2, AffinityRate=1 (=8)
    const specialLines: string[] = [
      "MaxPhysicalAttack",
      "Power",
      "MaxPhysicalAttack",
      "MaxPhysicalAttack",
      "CriticalRate",
      "AffinityRate",
      "Power",
      "CriticalRate",
    ];
    // Candidate: 8 special + 32 tuning
    // MaxPhysicalAttack: 3 special + 8 tuning = 11
    // Power: 2 special + 8 tuning = 10
    // CriticalRate: 2 special + 8 tuning = 10
    // AffinityRate: 1 special + 7 tuning = 8
    // Momentum: 0 special + 1 tuning = 1
    // Total candidates = 11+10+10+8+1 = 40 ✓
    const allocations: Record<string, number> = {
      NamelessSwordChargedSkillDMGBoost: 4,
      PhysicalPenetration: 4,
      MaxPhysicalAttack: 11,
      Power: 10,
      CriticalRate: 10,
      AffinityRate: 8,
      Momentum: 1,
      bellstrikeMax: 0,
      CombatBoostAgainstBossUnits: 0,
      AllMartialArtsBoost: 0,
      ArtOfSwordDMGBoost: 0,
    };

    const gears = distributeStatsToGears({
      path: "bellstrike",
      maxDamage: 1000,
      allocations,
      stats: {},
      specialLines,
    });
    verifyGearRules(gears, "bellstrike");

    // Gear 1 special = MaxPhysicalAttack, tuning cũng có MaxPhysicalAttack
    const gear1 = gears.find((g) => g.id === 1)!;
    expect(gear1.specialLine).toBe("MaxPhysicalAttack");
    expect(gear1.tuningLines).toContain("MaxPhysicalAttack");
  });

  it("handles AllMartialArtsBoost max 2: only on gears 3-4, max 1 per gear", () => {
    // Specials: bellstrikeMax=1, Power=2, MaxPhysicalAttack=2, CriticalRate=2, AffinityRate=1 (=8)
    const specialLines: string[] = [
      "bellstrikeMax",
      "Power",
      "MaxPhysicalAttack",
      "MaxPhysicalAttack",
      "CriticalRate",
      "AffinityRate",
      "Power",
      "CriticalRate",
    ];
    // AllMartialArtsBoost: 0 special + 2 tuning = 2
    // MaxPhysicalAttack: 2 special + 8 tuning = 10
    // Power: 2 special + 8 tuning = 10
    // CriticalRate: 2 special + 8 tuning = 10
    // AffinityRate: 1 special + 5 tuning = 6
    // bellstrikeMax: 1 special + 0 tuning = 1
    // Momentum: 0 special + 1 tuning = 1
    // Total candidates = 2+10+10+10+6+1+1 = 40 ✓
    const allocations: Record<string, number> = {
      NamelessSwordChargedSkillDMGBoost: 4,
      PhysicalPenetration: 4,
      AllMartialArtsBoost: 2,
      MaxPhysicalAttack: 10,
      Power: 10,
      CriticalRate: 10,
      AffinityRate: 6,
      bellstrikeMax: 1,
      Momentum: 1,
      CombatBoostAgainstBossUnits: 0,
      ArtOfSwordDMGBoost: 0,
    };

    const gears = distributeStatsToGears({
      path: "bellstrike",
      maxDamage: 1000,
      allocations,
      stats: {},
      specialLines,
    });
    verifyGearRules(gears, "bellstrike");

    // AllMartialArtsBoost tổng cộng 2 dòng, mỗi dòng ở gear 3 hoặc 4
    const amaLines = gears.flatMap((g) =>
      g.tuningLines.filter((s) => s === "AllMartialArtsBoost")
    );
    expect(amaLines).toHaveLength(2);

    const amaGears = gears.filter((g) =>
      g.tuningLines.includes("AllMartialArtsBoost")
    );
    for (const g of amaGears) {
      expect([3, 4]).toContain(g.id);
    }
  });
});

describe("Optimizer Cap Rules", () => {
  it("beam search result respects per-stat caps", async () => {
    const result = await calculateIdealGearStatsBeamSearch(
      "bellstrike",
      undefined,
      undefined,
      undefined,
      { beamWidth: 50 },
    );

    const { allocations } = result;
    expect(result.specialLines).toHaveLength(8);

    // Special lines phải thuộc pool tương ứng
    for (let i = 0; i < 8; i++) {
      expect(SPECIAL_LINE_POOLS[i]).toContain(result.specialLines[i]);
    }

    // Fixed lines cho bellstrike
    expect(allocations["NamelessSwordChargedSkillDMGBoost"]).toBeGreaterThanOrEqual(4);
    expect(allocations["PhysicalPenetration"]).toBeGreaterThanOrEqual(4);

    // Hard caps (tính cả fixed lines)
    const hardCaps: Record<string, number> = {};
    for (const stat of CANDIDATE_STATS) {
      if (MAX_LINES_PER_STAT_OVERRIDES[stat] !== undefined) {
        hardCaps[stat] = MAX_LINES_PER_STAT_OVERRIDES[stat]!;
      } else if (SINGLE_LINE_STATS.has(stat)) {
        hardCaps[stat] = 1;
      }
    }
    for (const [stat, cap] of Object.entries(hardCaps)) {
      expect(allocations[stat]).toBeLessThanOrEqual(cap);
    }

    // Normal stats: tuning lines (total - special) ≤ MAX_LINES_PER_STAT
    const specialCounts: Record<string, number> = {};
    for (const s of result.specialLines) {
      specialCounts[s] = (specialCounts[s] || 0) + 1;
    }
    for (const stat of CANDIDATE_STATS) {
      if (hardCaps[stat] !== undefined) continue;
      const total = allocations[stat] || 0;
      const special = specialCounts[stat] || 0;
      const tuning = total - special;
      expect(tuning).toBeLessThanOrEqual(MAX_LINES_PER_STAT);
    }

    expect(result.maxDamage).toBeGreaterThan(0);
  }, 60000);

  it("beam search result distributes correctly to gears", async () => {
    const result = await calculateIdealGearStatsBeamSearch(
      "bellstrike",
      undefined,
      undefined,
      undefined,
      { beamWidth: 50 },
    );

    const gears = distributeStatsToGears(result);
    expect(gears).toHaveLength(8);

    for (const gear of gears) {
      // 5 tuning lines per gear
      expect(gear.tuningLines).toHaveLength(5);

      // No duplicate tuning lines in same gear
      expect(new Set(gear.tuningLines).size).toBe(gear.tuningLines.length);
    }

    // Slot 6 checks
    for (const gear of gears) {
      if (gear.id <= 4) {
        expect(gear.tuningLines).toContain("PhysicalPenetration");
      } else {
        expect(gear.tuningLines).toContain("NamelessSwordChargedSkillDMGBoost");
      }
    }

    // Exclusive placements
    for (const gear of gears) {
      if (gear.id !== 1) {
        expect(gear.tuningLines).not.toContain("ArtOfSwordDMGBoost");
      }
      if (gear.id !== 7) {
        expect(gear.tuningLines).not.toContain("CombatBoostAgainstBossUnits");
      }
      if (gear.id !== 3 && gear.id !== 4) {
        expect(gear.tuningLines).not.toContain("AllMartialArtsBoost");
      }
    }

    // Total lines = 48
    const totalLines = gears.reduce((s, g) => s + 1 + g.tuningLines.length, 0);
    expect(totalLines).toBe(48);
  }, 60000);
});
