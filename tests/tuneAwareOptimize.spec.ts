import { describe, it, expect } from "vitest";
import {
  generateTuneVariants,
  generateAdditionSwapVariants,
  computeSingleTuneSuccessRate,
  type TuneVariant,
} from "@/app/domain/gear/tuneAdvisor";
import type { CustomGear, ElementStats, InputStats, GearSlot } from "@/app/types";
import { computeOptimizeResultsAsync } from "@/app/domain/gear/gearOptimize";
import { ElementKey } from "@/app/constants";
import { LEFT_ADDITION_STATS, RIGHT_ADDITION_STATS } from "@/app/domain/gear/additionRules";

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

  it("includes only eligible stats (excluding current stat + duplicates with lines 2-5)", () => {
    // Bellstrike pool: ["MaxPhysicalAttack", "bellstrikeMax", "CriticalRate", "AffinityRate", "Power", "Momentum"]
    // rerollIndex = 2 (line 3, currently MaxPhysicalAttack).
    // Excluded (current stat): "MaxPhysicalAttack"
    // isTuneTargetAllowedBySubRules checks indices 1-4 but skips index 2.
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
    expect(variants.length).toBe(2);
    const statLabels = variants.map((v) => v.targetStat);
    expect(statLabels).toContain("Power");
    expect(statLabels).toContain("Momentum");
  });

  it("excludes tuneHistory stats on the same subIndex", () => {
    // tuneHistory records previously tuned stats on subIndex=2.
    // Excluded: current stat "MaxPhysicalAttack" + history stats (Power, CriticalRate).
    // Remaining: "bellstrikeMax", "AffinityRate", "Momentum"
    // After isTuneTargetAllowedBySubRules (rerollIndex=2): bellstrikeMax (index 4) and AffinityRate (index 3) rejected.
    // Only "Momentum" remains → 1 variant.
    const gear = makeGear({
      id: "g5b",
      slot: "head",
      tunedSubIndex: 2,
      tuneHistory: [
        { subIndex: 2, stat: "Power" },
        { subIndex: 2, stat: "CriticalRate" },
      ],
      subs: [
        { stat: "Momentum", value: 35 },
        { stat: "CriticalRate", value: 7.4 },
        { stat: "MaxPhysicalAttack", value: 60 },
        { stat: "AffinityRate", value: 3.5 },
        { stat: "bellstrikeMax", value: 35 },
      ],
    });
    const variants = generateTuneVariants(gear, bellstrikeElement);
    const statLabels = variants.map((v) => v.targetStat);
    expect(statLabels).not.toContain("MaxPhysicalAttack");
    expect(statLabels).not.toContain("Power");
    expect(statLabels).not.toContain("CriticalRate");
    expect(statLabels).toContain("Momentum");
  });

  it("excludes tuneHistory only on matching subIndex (different subIndex unaffected)", () => {
    // tuneHistory on subIndex=1 should NOT affect subIndex=3 variant generation.
    const gear = makeGear({
      id: "g5c",
      slot: "hand",
      tunedSubIndex: 3,
      tuneHistory: [
        { subIndex: 1, stat: "Power" },
        { subIndex: 1, stat: "CriticalRate" },
      ],
      subs: [
        { stat: "Momentum", value: 35 },
        { stat: "CriticalRate", value: 7.4 },
        { stat: "MaxPhysicalAttack", value: 60 },
        { stat: "AffinityRate", value: 3.5 },  // current, excluded
        { stat: "bellstrikeMax", value: 35 },
      ],
    });
    const variants = generateTuneVariants(gear, bellstrikeElement);
    // Excluded: AffinityRate (current). History on subIndex 1 does NOT affect subIndex 3.
    // Rules (rerollIndex=3): bellstrikeMax (index 4), CriticalRate (index 1), MaxPhysicalAttack (index 2) rejected.
    // Remaining: Power, Momentum → 2 variants.
    expect(variants.length).toBe(2);
    const statLabels = variants.map((v) => v.targetStat);
    expect(statLabels).toContain("Power");
    expect(statLabels).toContain("Momentum");
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
// Unit tests: computeSingleTuneSuccessRate
// ============================================================

describe("computeSingleTuneSuccessRate", () => {
  it("returns 1/eligibleCount for any target in the eligible pool", () => {
    // Bellstrike pool: [MaxPhysicalAttack, bellstrikeMax, CriticalRate, AffinityRate, Power, Momentum] → 6
    // tunedSubIndex=2, subs=[Momentum, CriticalRate, MaxPhysicalAttack, AffinityRate, bellstrikeMax]
    // current at index 2: MaxPhysicalAttack → excluded
    // Rules (rerollIndex=2): CriticalRate(index1), AffinityRate(index3), bellstrikeMax(index4) rejected
    // Eligible: Power, Momentum → 2 → rate = 1/2 = 0.5
    const gear = makeGear({
      id: "r1",
      slot: "head",
      tunedSubIndex: 2,
      subs: [
        { stat: "Momentum", value: 35 },
        { stat: "CriticalRate", value: 7.4 },
        { stat: "MaxPhysicalAttack", value: 60 },
        { stat: "AffinityRate", value: 3.5 },
        { stat: "bellstrikeMax", value: 35 },
      ],
    });
    const ratePower = computeSingleTuneSuccessRate(gear, 2, "Power", bellstrikeElement);
    const rateMomentum = computeSingleTuneSuccessRate(gear, 2, "Momentum", bellstrikeElement);
    expect(ratePower).toBeCloseTo(0.5);
    expect(rateMomentum).toBeCloseTo(0.5);
  });

  it("excludes tuneHistory stats on the same subIndex from eligible pool", () => {
    // tunedSubIndex=2, subs=[Momentum, CriticalRate, MaxPhysicalAttack, ...]
    // current stat: MaxPhysicalAttack → excluded
    // tuneHistory: [{subIndex:2, stat:"Power"}, {subIndex:2, stat:"CriticalRate"}] → Power, CriticalRate excluded
    // pool: [MaxPhysicalAttack, bellstrikeMax, CriticalRate, AffinityRate, Power, Momentum]
    // excluded: MaxPhysicalAttack, Power, CriticalRate.
    // Rules (rerollIndex=2): bellstrikeMax (index4), AffinityRate (index3) rejected.
    // Eligible: only Momentum → 1
    // rate = 1/1 = 1
    const gear = makeGear({
      id: "r3",
      slot: "head",
      tunedSubIndex: 2,
      tuneHistory: [
        { subIndex: 2, stat: "Power" },
        { subIndex: 2, stat: "CriticalRate" },
        { subIndex: 2, stat: "MaxPhysicalAttack" },
      ],
      subs: [
        { stat: "Momentum", value: 35 },
        { stat: "CriticalRate", value: 7.4 },
        { stat: "MaxPhysicalAttack", value: 60 },
        { stat: "AffinityRate", value: 3.5 },
        { stat: "bellstrikeMax", value: 35 },
      ],
    });
    const rate = computeSingleTuneSuccessRate(gear, 2, "Momentum", bellstrikeElement);
    expect(rate).toBe(1);
  });

  it("tuneHistory on a different subIndex does NOT affect rate", () => {
    // tunedSubIndex=3, tuneHistory on subIndex=1 should be ignored.
    // subs=[Momentum, CriticalRate, MaxPhysicalAttack, AffinityRate, bellstrikeMax]
    // current at index 3: AffinityRate → excluded
    // tuneHistory on subIndex=1: Power, CriticalRate → ignored for subIndex=3
    // pool: [MaxPhysicalAttack, bellstrikeMax, CriticalRate, AffinityRate, Power, Momentum]
    // excluded: AffinityRate (current)
    // Rules (rerollIndex=3): bellstrikeMax (index4), CriticalRate (index1), MaxPhysicalAttack (index2) rejected.
    // Eligible: Power, Momentum → 2
    // rate = 1/2 = 0.5
    const gear = makeGear({
      id: "r4",
      slot: "hand",
      tunedSubIndex: 3,
      tuneHistory: [
        { subIndex: 1, stat: "Power" },
        { subIndex: 1, stat: "CriticalRate" },
      ],
      subs: [
        { stat: "Momentum", value: 35 },
        { stat: "CriticalRate", value: 7.4 },
        { stat: "MaxPhysicalAttack", value: 60 },
        { stat: "AffinityRate", value: 3.5 },
        { stat: "bellstrikeMax", value: 35 },
      ],
    });
    const rate = computeSingleTuneSuccessRate(gear, 3, "Power", bellstrikeElement);
    expect(rate).toBeCloseTo(0.5);
  });

  it("returns 0 when no eligible stats remain", () => {
    // tunedSubIndex=1, subs=[Momentum, CriticalRate, MaxPhysicalAttack, AffinityRate, bellstrikeMax]
    // current at index 1: CriticalRate → excluded
    // tuneHistory: [{subIndex:1, stat:"Power"}, {subIndex:1, stat:"Momentum"}, {subIndex:1, stat:"AffinityRate"}, {subIndex:1, stat:"bellstrikeMax"}, {subIndex:1, stat:"MaxPhysicalAttack"}, {subIndex:1, stat:"CriticalRate"}]
    // excluded: CriticalRate, Power, Momentum, AffinityRate, bellstrikeMax, MaxPhysicalAttack → all 6 pool stats
    // eligible: 0
    const gear = makeGear({
      id: "r5",
      slot: "hand",
      tunedSubIndex: 1,
      tuneHistory: [
        { subIndex: 1, stat: "Power" },
        { subIndex: 1, stat: "Momentum" },
        { subIndex: 1, stat: "AffinityRate" },
        { subIndex: 1, stat: "bellstrikeMax" },
        { subIndex: 1, stat: "MaxPhysicalAttack" },
        { subIndex: 1, stat: "CriticalRate" },
      ],
      subs: [
        { stat: "Momentum", value: 35 },
        { stat: "CriticalRate", value: 7.4 },
        { stat: "MaxPhysicalAttack", value: 60 },
        { stat: "AffinityRate", value: 3.5 },
        { stat: "bellstrikeMax", value: 35 },
      ],
    });
    const rate = computeSingleTuneSuccessRate(gear, 1, "MaxPhysicalAttack", bellstrikeElement);
    expect(rate).toBe(0);
  });

  it("uses tuneHistory (not overridden subs) to determine current stat on variant gears", () => {
    // Simulate a tune variant gear: subs[1] overridden to target "Power",
    // but tuneHistory records the real current stat = bellstrikeMax.
    // Bellstrike pool: [MaxPhysicalAttack, bellstrikeMax, CriticalRate, AffinityRate, Power, Momentum] → 6
    // current (from history): bellstrikeMax → excluded
    // history on subIndex=1: AffinityRate, bellstrikeMax → AffinityRate excluded
    // Rules (rerollIndex=1): silkbindMin(index2), MaxPhysicalAttack(index3), CriticalRate(index4) rejected
    // Eligible: Power, Momentum → 2 → rate = 0.5
    const variantGear: CustomGear = {
      ...makeGear({
        id: "r6",
        slot: "chest",
        tunedSubIndex: 1,
        tuneHistory: [
          { subIndex: 1, stat: "AffinityRate" },
          { subIndex: 1, stat: "bellstrikeMax" },
        ],
        subs: [
          { stat: "CriticalRate", value: 7.4 },
          { stat: "bellstrikeMax", value: 36.2 },
          { stat: "silkbindMin", value: 33.7 },
          { stat: "MaxPhysicalAttack", value: 62.6 },
          { stat: "CriticalRate", value: 7.4 },
        ],
      }),
      // subs overridden as a tune variant would have (target stat at tunedSubIndex)
      subs: [
        { stat: "CriticalRate", value: 7.4 },
        { stat: "Power", value: 40.4 },
        { stat: "silkbindMin", value: 33.7 },
        { stat: "MaxPhysicalAttack", value: 62.6 },
        { stat: "CriticalRate", value: 7.4 },
      ],
    };
    const rate = computeSingleTuneSuccessRate(variantGear, 1, "Power", bellstrikeElement);
    expect(rate).toBeCloseTo(0.5);
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

// ============================================================
// Unit tests: generateAdditionSwapVariants
// ============================================================

describe("generateAdditionSwapVariants", () => {
  it("returns empty array for gear without addition", () => {
    const gear = makeGear({ id: "g_a1", slot: "head" });
    const variants = generateAdditionSwapVariants(gear, "head");
    expect(variants).toEqual([]);
  });

  it("uses LEFT_ADDITION_STATS for left slot", () => {
    const gear = makeGear({
      id: "g_a2",
      slot: "disc",
      addition: { stat: "PhysicalPenetration", value: 8.9 },
    });
    const variants = generateAdditionSwapVariants(gear, "disc");
    for (const v of variants) {
      expect(LEFT_ADDITION_STATS).toContain(v.targetStat);
    }
  });

  it("uses RIGHT_ADDITION_STATS for right slot", () => {
    const gear = makeGear({
      id: "g_a3",
      slot: "head",
      addition: { stat: "NamelessSwordChargedSkillDMGBoost", value: 5 },
    });
    const variants = generateAdditionSwapVariants(gear, "head");
    for (const v of variants) {
      expect(RIGHT_ADDITION_STATS).toContain(v.targetStat);
    }
  });

  it("excludes current addition stat from variants", () => {
    const gear = makeGear({
      id: "g_a4",
      slot: "disc",
      addition: { stat: "PhysicalPenetration", value: 8.9 },
    });
    const variants = generateAdditionSwapVariants(gear, "disc");
    for (const v of variants) {
      expect(v.targetStat).not.toBe("PhysicalPenetration");
    }
  });

  it("preserves the original value in overrideAddition", () => {
    const gear = makeGear({
      id: "g_a5",
      slot: "disc",
      addition: { stat: "PhysicalPenetration", value: 8.9 },
    });
    const variants = generateAdditionSwapVariants(gear, "disc");
    for (const v of variants) {
      expect(v.overrideAddition.value).toBe(8.9);
    }
  });

  it("sets overrideAddition stat to the target stat", () => {
    const gear = makeGear({
      id: "g_a6",
      slot: "head",
      addition: { stat: "NamelessSwordChargedSkillDMGBoost", value: 5 },
    });
    const variants = generateAdditionSwapVariants(gear, "head");
    for (const v of variants) {
      expect(v.overrideAddition.stat).toBe(v.targetStat);
    }
  });
});

// ============================================================
// Integration tests: addition swap variants in optimizer
// ============================================================

describe("computeOptimizeResultsAsync with addition swap", () => {
  it("considerTune = true includes addition swap variants when a better addition exists", async () => {
    const gears: CustomGear[] = [
      makeGear({
        id: "g_disc_low",
        name: "Low addition disc",
        slot: "disc",
        addition: { stat: "PhysicalPenetration", value: 8.9 },
      }),
      makeGear({
        id: "g_disc_high",
        name: "High addition disc",
        slot: "disc",
        addition: { stat: "bellstrikePenetration", value: 10.8 },
      }),
    ];
    const equipped: Partial<Record<string, string>> = {};

    const r = await computeOptimizeResultsAsync(
      baseStats, baseElementStats, gears, equipped as any, 10, undefined, undefined,
      { candidateGears: gears, slotsToOptimize: ["disc"], considerTune: true },
    );

    expect(r.results.length).toBeGreaterThan(0);
    // The low-addition gear should have a swap variant pointing to the high addition
    const hasSwapResult = r.results.some((res) => {
      const g = res.selection["disc"];
      return g && (g as any).__tuneId?.startsWith("::swap::");
    });
    expect(hasSwapResult).toBe(true);
  });

  it("considerTune = true with gear without addition produces no swap variant", async () => {
    const gears: CustomGear[] = [
      makeGear({
        id: "g_head_noswap",
        name: "No addition head",
        slot: "head",
        // no addition property
      }),
    ];
    const equipped: Partial<Record<string, string>> = {};

    const r = await computeOptimizeResultsAsync(
      baseStats, baseElementStats, gears, equipped as any, 10, undefined, undefined,
      { candidateGears: gears, slotsToOptimize: ["head"], considerTune: true },
    );

    const hasSwap = r.results.some((res) => {
      const g = res.selection["head"];
      return g && (g as any).__tuneId?.startsWith("::swap::");
    });
    expect(hasSwap).toBe(false);
  });
});
