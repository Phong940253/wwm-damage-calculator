import { describe, it, expect } from "vitest";
import {
  generateTuneVariants,
  type TuneVariant,
} from "@/app/domain/gear/tuneAdvisor";
import type { CustomGear, ElementStats, InputStats } from "@/app/types";
import { computeOptimizeResultsAsync } from "@/app/domain/gear/gearOptimize";
import { ElementKey } from "@/app/constants";

// ============================================================
// Helpers
// ============================================================

function makeGear(overrides: Partial<CustomGear> & { id: string; slot: CustomGear["slot"] }): CustomGear {
  return {
    name: "Test Gear",
    level: 91,
    mains: [{ stat: "MaxPhysicalAttack", value: 100 }],
    subs: [
      { stat: "Momentum", value: 35 },
      { stat: "CriticalRate", value: 7.4 },
      { stat: "MaxPhysicalAttack", value: 60 },
      { stat: "AffinityRate", value: 3.5 },
      { stat: "bellstrikeMax", value: 35 },
    ],
    ...overrides,
  };
}

const bellstrikeElement: ElementKey = "bellstrike";

const baseStats: InputStats = {
  HP: { current: 60000, increase: 0 },
  MinPhysicalAttack: { current: 500, increase: 0 },
  MaxPhysicalAttack: { current: 1000, increase: 0 },
  PhysicalAttackMultiplier: { current: 100, increase: 0 },
  FlatDamage: { current: 300, increase: 0 },
  PrecisionRate: { current: 94, increase: 0 },
  CriticalRate: { current: 20, increase: 0 },
  DirectCriticalRate: { current: 0, increase: 0 },
  CriticalDMGBonus: { current: 50, increase: 0 },
  AffinityRate: { current: 15, increase: 0 },
  DirectAffinityRate: { current: 0, increase: 0 },
  AffinityDMGBonus: { current: 35, increase: 0 },
  DamageBoost: { current: 0, increase: 0 },
  CombatBoostAgainstBossUnits: { current: 0, increase: 0 },
  MartialArtSkillDamageBoost: { current: 0, increase: 0 },
  AllMartialArtsBoost: { current: 0, increase: 0 },
  ChargeSkillDamageBoost: { current: 0, increase: 0 },
  BallisticSkillDamageBoost: { current: 0, increase: 0 },
  PursuitSkillDamageBoost: { current: 0, increase: 0 },
  MoonlitShatterSpringPursuitCriticalDMGBonus: { current: 0, increase: 0 },
  ArtOfSwordDMGBoost: { current: 0, increase: 0 },
  ArtOfSpearDMGBoost: { current: 0, increase: 0 },
  ArtOfFanDMGBoost: { current: 0, increase: 0 },
  ArtOfUmbrellaDMGBoost: { current: 0, increase: 0 },
  ArtOfHorizontalBladeDMGBoost: { current: 0, increase: 0 },
  ArtOfMoBladeDMGBoost: { current: 0, increase: 0 },
  ArtOfDualBladesDMGBoost: { current: 0, increase: 0 },
  ArtOfRopeDartDMGBoost: { current: 0, increase: 0 },
  SoulshadeUmbrellaSpinningUmbrellaDMGBoost: { current: 0, increase: 0 },
  PhysicalDefense: { current: 200, increase: 0 },
  PhysicalResistance: { current: 0, increase: 0 },
  PhysicalDMGBonus: { current: 0, increase: 0 },
  PhysicalDMGReduction: { current: 0, increase: 0 },
  PhysicalPenetration: { current: 0, increase: 0 },
  Body: { current: 100, increase: 0 },
  Power: { current: 100, increase: 0 },
  Defense: { current: 50, increase: 0 },
  Agility: { current: 100, increase: 0 },
  Momentum: { current: 100, increase: 0 },
};

const baseElementStats: ElementStats = {
  selected: "bellstrike",
  martialArtsId: "bellstrike_splendor",
  MainElementMultiplier: { current: 100, increase: 0 },
  bellstrikeMin: { current: 280, increase: 0 },
  bellstrikeMax: { current: 560, increase: 0 },
  bellstrikePenetration: { current: 24, increase: 0 },
  bellstrikeDMGBonus: { current: 9, increase: 0 },
  stonesplitMin: { current: 0, increase: 0 },
  stonesplitMax: { current: 0, increase: 0 },
  stonesplitPenetration: { current: 0, increase: 0 },
  stonesplitDMGBonus: { current: 0, increase: 0 },
  silkbindMin: { current: 0, increase: 0 },
  silkbindMax: { current: 0, increase: 0 },
  silkbindPenetration: { current: 0, increase: 0 },
  silkbindDMGBonus: { current: 0, increase: 0 },
  bamboocutMin: { current: 0, increase: 0 },
  bamboocutMax: { current: 0, increase: 0 },
  bamboocutPenetration: { current: 0, increase: 0 },
  bamboocutDMGBonus: { current: 0, increase: 0 },
};

// ============================================================
// Unit tests: generateTuneVariants
// ============================================================

describe("generateTuneVariants", () => {
  it("returns empty array for gear without tunedSubIndex", () => {
    const gear = makeGear({ id: "g1", slot: "head", tunedSubIndex: undefined });
    expect(generateTuneVariants(gear, bellstrikeElement)).toEqual([]);
  });

  it("returns empty array for gear with tunedSubIndex = null", () => {
    const gear = makeGear({ id: "g2", slot: "head", tunedSubIndex: null });
    expect(generateTuneVariants(gear, bellstrikeElement)).toEqual([]);
  });

  it("returns empty array for gear with tunedSubIndex = 0 (line 1 not tunable)", () => {
    const gear = makeGear({ id: "g3", slot: "head", tunedSubIndex: 0 });
    expect(generateTuneVariants(gear, bellstrikeElement)).toEqual([]);
  });

  it("returns empty array when tunedSubIndex is out of bounds", () => {
    const gear = makeGear({ id: "g4", slot: "head", tunedSubIndex: 10, subs: [{ stat: "Momentum", value: 35 }] });
    expect(generateTuneVariants(gear, bellstrikeElement)).toEqual([]);
  });

  it("includes only eligible stats (excluding duplicates with lines 2-5)", () => {
    // Bellstrike pool: ["MaxPhysicalAttack", "bellstrikeMax", "CriticalRate", "AffinityRate", "Power", "Momentum"]
    // rerollIndex = 2 (line 3, currently MaxPhysicalAttack).
    // isTuneTargetAllowedBySubRules checks indices 1-4 but skips index 2.
    // - "MaxPhysicalAttack": no other line 1-4 has it (skip index 2) → ALLOWED
    // - "bellstrikeMax": line 5 (index 4) has bellstrikeMax → NOT allowed
    // - "CriticalRate": line 2 (index 1) has CriticalRate → NOT allowed
    // - "AffinityRate": line 4 (index 3) has AffinityRate → NOT allowed
    // - "Power": no duplicate → ALLOWED
    // - "Momentum": line 1 (index 0) — only checks index 1-4, so no duplicate → ALLOWED
    const gear = makeGear({
      id: "g5",
      slot: "head",
      tunedSubIndex: 2,
      subs: [
        { stat: "Momentum", value: 35 },  // index 0 (line 1) - can duplicate
        { stat: "CriticalRate", value: 7.4 }, // index 1 (line 2)
        { stat: "MaxPhysicalAttack", value: 60 }, // index 2 (line 3) - tuned sub
        { stat: "AffinityRate", value: 3.5 }, // index 3 (line 4)
        { stat: "bellstrikeMax", value: 35 }, // index 4 (line 5)
      ],
    });
    const variants = generateTuneVariants(gear, bellstrikeElement);
    expect(variants.length).toBe(3);
    const statLabels = variants.map((v) => v.targetStat);
    expect(statLabels).toContain("Power");
    expect(statLabels).toContain("Momentum");
    expect(statLabels).toContain("MaxPhysicalAttack");
  });

  it("produces overrideSubs that keep untouched subs unchanged", () => {
    const gear = makeGear({
      id: "g6",
      slot: "hand",
      tunedSubIndex: 1,
      subs: [
        { stat: "Momentum", value: 35 },
        { stat: "CriticalRate", value: 7.4 },
        { stat: "MaxPhysicalAttack", value: 60 },
      ],
    });
    const variants = generateTuneVariants(gear, bellstrikeElement);
    expect(variants.length).toBeGreaterThan(0);
    for (const v of variants) {
      expect(v.overrideSubs.length).toBe(3);
      // sub 0 and 2 should be unchanged
      expect(v.overrideSubs[0]).toEqual({ stat: "Momentum", value: 35 });
      expect(v.overrideSubs[2]).toEqual({ stat: "MaxPhysicalAttack", value: 60 });
      // sub 1 should be the target
      expect(v.overrideSubs[1].stat).toBe(v.targetStat);
      expect(typeof v.overrideSubs[1].value).toBe("number");
    }
  });

  it("assigns correct maxPerLine value from DEFAULT_TUNE_LIMITS", () => {
    const gear = makeGear({
      id: "g7",
      slot: "hand",
      tunedSubIndex: 1,
      subs: [
        { stat: "Momentum", value: 35 },
        { stat: "CriticalRate", value: 7.4 },
        { stat: "MaxPhysicalAttack", value: 60 },
        { stat: "AffinityRate", value: 3.5 },
        { stat: "bellstrikeMax", value: 35 },
      ],
    });
    const variants = generateTuneVariants(gear, bellstrikeElement);
    for (const v of variants) {
      if (v.targetStat === "Power") {
        expect(v.targetValue).toBe(40.4);
      }
      if (v.targetStat === "Momentum") {
        expect(v.targetValue).toBe(40.4);
      }
    }
  });

  it("includes correct label for each variant", () => {
    const gear = makeGear({
      id: "g8",
      slot: "hand",
      tunedSubIndex: 3,
      subs: [
        { stat: "Momentum", value: 35 },
        { stat: "CriticalRate", value: 7.4 },
        { stat: "MaxPhysicalAttack", value: 60 },
        { stat: "AffinityRate", value: 3.5 },
        { stat: "bellstrikeMax", value: 35 },
      ],
    });
    const variants = generateTuneVariants(gear, bellstrikeElement);
    for (const v of variants) {
      expect(v.label).toContain("→");
      expect(v.label).toContain(v.targetStat);
    }
  });
});

// ============================================================
// Integration tests: optimizer with considerTune
// ============================================================

describe("computeOptimizeResultsAsync with considerTune", () => {
  it("considerTune = false returns same result as without the option", async () => {
    const gears: CustomGear[] = [
      makeGear({
        id: "g_head_1",
        name: "Head A",
        slot: "head",
        subs: [
          { stat: "Momentum", value: 35 },
          { stat: "CriticalRate", value: 7.4 },
          { stat: "Power", value: 38 },
          { stat: "AffinityRate", value: 3.5 },
          { stat: "bellstrikeMax", value: 35 },
        ],
      }),
    ];
    const equipped: Partial<Record<string, string>> = { head: "g_head_1" };

    const r1 = await computeOptimizeResultsAsync(
      baseStats, baseElementStats, gears, equipped as any, 10, undefined, undefined,
      { candidateGears: gears, slotsToOptimize: ["head"] },
    );
    const r2 = await computeOptimizeResultsAsync(
      baseStats, baseElementStats, gears, equipped as any, 10, undefined, undefined,
      { candidateGears: gears, slotsToOptimize: ["head"], considerTune: false },
    );

    expect(r1.baseDamage).toBe(r2.baseDamage);
    expect(r1.results.length).toBe(r2.results.length);
    for (let i = 0; i < r1.results.length; i++) {
      expect(r1.results[i].damage).toBe(r2.results[i].damage);
    }
  }); // considerTune = false → same result

  it("considerTune = true includes tune variants in selection", async () => {
    // Create a gear with tunedSubIndex → should generate variants
    const gears: CustomGear[] = [
      makeGear({
        id: "g_head_tunable",
        name: "Tunable Head",
        slot: "head",
        tunedSubIndex: 2,
        subs: [
          { stat: "Momentum", value: 35 },
          { stat: "CriticalRate", value: 7.4 },
          { stat: "Power", value: 38 },
          { stat: "AffinityRate", value: 3.5 },
          { stat: "bellstrikeMax", value: 35 },
        ],
        tuneHistory: [{ subIndex: 2, stat: "Power" }],
      }),
    ];
    const equipped: Partial<Record<string, string>> = {};

    const r = await computeOptimizeResultsAsync(
      baseStats, baseElementStats, gears, equipped as any, 10, undefined, undefined,
      { candidateGears: gears, slotsToOptimize: ["head"], considerTune: true },
    );

    expect(r.results.length).toBeGreaterThan(0);
    // At least one result should have a head gear with __tuneId
    const hasTuneResult = r.results.some((res) => {
      const g = res.selection["head"];
      return g && (g as any).__tuneId;
    });
    expect(hasTuneResult).toBe(true);
  }); // considerTune = true → includes tune variants

  it("considerTune = true with no tunable gear produces same results as false", async () => {
    const gears: CustomGear[] = [
      makeGear({
        id: "g_head_notunable",
        name: "Non-tunable Head",
        slot: "head",
        // no tunedSubIndex
        subs: [
          { stat: "Momentum", value: 35 },
          { stat: "CriticalRate", value: 7.4 },
          { stat: "Power", value: 38 },
          { stat: "AffinityRate", value: 3.5 },
          { stat: "bellstrikeMax", value: 35 },
        ],
      }),
    ];
    const equipped: Partial<Record<string, string>> = {};

    const r1 = await computeOptimizeResultsAsync(
      baseStats, baseElementStats, gears, equipped as any, 10, undefined, undefined,
      { candidateGears: gears, slotsToOptimize: ["head"], considerTune: false },
    );
    const r2 = await computeOptimizeResultsAsync(
      baseStats, baseElementStats, gears, equipped as any, 10, undefined, undefined,
      { candidateGears: gears, slotsToOptimize: ["head"], considerTune: true },
    );

    expect(r1.baseDamage).toBe(r2.baseDamage);
    expect(r1.results.length).toBe(r2.results.length);
    // No result should have __tuneId
    const hasTune = r2.results.some((res) => {
      const g = res.selection["head"];
      return g && (g as any).__tuneId;
    });
    expect(hasTune).toBe(false);
  }); // 0 tunable gear → same as false
});
