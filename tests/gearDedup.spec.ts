import { describe, it, expect } from "vitest";
import type { CustomGear, ElementStats, InputStats } from "@/app/types";
import { computeOptimizeResultsAsync } from "@/app/domain/gear/gearOptimize";

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

const DESIRED = 100;

/** Assert every result has a unique key. */
function expectUniqueKeys(results: { key: string }[]) {
  const keys = results.map((r) => r.key);
  expect(new Set(keys).size).toBe(keys.length);
}

describe("optimizer result dedup", () => {
  it("all keys unique with basic multi-gear slot", async () => {
    const gears: CustomGear[] = [
      makeGear({ id: "g_a", slot: "head" }),
      makeGear({ id: "g_b", slot: "head" }),
      makeGear({ id: "g_c", slot: "head" }),
    ];
    const r = await computeOptimizeResultsAsync(
      baseStats, baseElementStats, gears, {} as any, DESIRED, undefined, undefined,
      { candidateGears: gears, slotsToOptimize: ["head"] },
    );
    expectUniqueKeys(r.results);
    expect(r.results.length).toBe(gears.length); // all 3 combos survive
  });

  it("all keys unique with considerTune enabled", async () => {
    const gears: CustomGear[] = [
      makeGear({
        id: "g_tunable",
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
      makeGear({ id: "g_plain", slot: "head" }),
    ];
    const r = await computeOptimizeResultsAsync(
      baseStats, baseElementStats, gears, {} as any, DESIRED, undefined, undefined,
      { candidateGears: gears, slotsToOptimize: ["head"], considerTune: true },
    );
    expectUniqueKeys(r.results);
    // Base gear + tune variants for g_tunable + g_plain
    expect(r.results.length).toBeGreaterThan(gears.length);
  });

  it("all keys unique with addition swap", async () => {
    const gears: CustomGear[] = [
      makeGear({
        id: "g_disc_low",
        slot: "disc",
        addition: { stat: "PhysicalPenetration", value: 8.9 },
      }),
      makeGear({
        id: "g_disc_high",
        slot: "disc",
        addition: { stat: "bellstrikePenetration", value: 10.8 },
      }),
    ];
    const r = await computeOptimizeResultsAsync(
      baseStats, baseElementStats, gears, {} as any, DESIRED, undefined, undefined,
      { candidateGears: gears, slotsToOptimize: ["disc"], considerTune: true },
    );
    expectUniqueKeys(r.results);
  });

  it("all keys unique with considerTune + addition swap combined", async () => {
    const gears: CustomGear[] = [
      makeGear({
        id: "g_head_tune",
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
      makeGear({
        id: "g_disc_swap",
        slot: "disc",
        addition: { stat: "PhysicalPenetration", value: 8.9 },
      }),
      makeGear({
        id: "g_disc_better",
        slot: "disc",
        addition: { stat: "bellstrikePenetration", value: 10.8 },
      }),
    ];
    const r = await computeOptimizeResultsAsync(
      baseStats, baseElementStats, gears, {} as any, DESIRED, undefined, undefined,
      { candidateGears: gears, slotsToOptimize: ["head", "disc"], considerTune: true },
    );
    expectUniqueKeys(r.results);
  });

  it("removes duplicates when same gear ID appears twice in candidate list", async () => {
    // Two gear objects with identical id in the same slot → the DFS can
    // explore the same combination twice, producing duplicate keys.
    const gears: CustomGear[] = [
      makeGear({ id: "dup_id", slot: "head", name: "Duplicate A" }),
      makeGear({ id: "dup_id", slot: "head", name: "Duplicate B" }),
      makeGear({ id: "unique", slot: "head" }),
    ];
    const r = await computeOptimizeResultsAsync(
      baseStats, baseElementStats, gears, {} as any, DESIRED, undefined, undefined,
      { candidateGears: gears, slotsToOptimize: ["head"] },
    );
    // After dedup, there should be at most 2 unique combos: one for dup_id, one for unique.
    // (Both dup entries collapse to the same key.)
    expectUniqueKeys(r.results);
    expect(r.results.length).toBe(2);
  });

  it("dedup handles duplicate IDs with considerTune", async () => {
    const gears: CustomGear[] = [
      makeGear({
        id: "dup_tune",
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
      // Same gear ID again — should produce duplicate keys for base + all tune variants
      makeGear({
        id: "dup_tune",
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
    const r = await computeOptimizeResultsAsync(
      baseStats, baseElementStats, gears, {} as any, DESIRED, undefined, undefined,
      { candidateGears: gears, slotsToOptimize: ["head"], considerTune: true },
    );
    expectUniqueKeys(r.results);
    // dup_tune (base) + tune variants should appear only once per unique key
    const uniqueTuneIds = new Set(
      r.results.map((res) => {
        const g = res.selection["head"] as any;
        return g ? g.id + (g.__tuneId ?? "") : "";
      }),
    );
    const seenTuneIds = r.results.map((res) => {
      const g = res.selection["head"] as any;
      return g ? g.id + (g.__tuneId ?? "") : "";
    });
    expect(uniqueTuneIds.size).toBe(seenTuneIds.length);
  });

  it("no false dedup — unique IDs all survive", async () => {
    const gears: CustomGear[] = [
      makeGear({ id: "g1", slot: "head" }),
      makeGear({ id: "g2", slot: "head" }),
      makeGear({ id: "g3", slot: "head" }),
      makeGear({ id: "g4", slot: "head" }),
    ];
    const r = await computeOptimizeResultsAsync(
      baseStats, baseElementStats, gears, {} as any, DESIRED, undefined, undefined,
      { candidateGears: gears, slotsToOptimize: ["head"] },
    );
    expectUniqueKeys(r.results);
    expect(r.results.length).toBe(gears.length);
  });
});
