import { Rotation, InputStats } from "@/app/types";
import { PASSIVE_SKILLS } from "./passiveSkills";
import type { PassiveModifier } from "./passiveSkillTypes";
import type { ElementStats } from "@/app/types";
import { computeDerivedStats } from "../stats/derivedStats";

function clamp(value: number, min?: number, max?: number) {
  if (typeof min === "number") value = Math.max(min, value);
  if (typeof max === "number") value = Math.min(max, value);
  return value;
}

function readCurrent(stats: InputStats, key: string): number {
  const entry = stats[key];
  if (!entry) return 0;
  return Number(entry.current || 0);
}

function addToCurrent(stats: InputStats, key: string, add: number) {
  const entry = stats[key];
  if (entry) {
    entry.current = Number(entry.current || 0) + add;
    return;
  }

  // Defensive fallback (shouldn't happen for known stats)
  stats[key] = { current: add, increase: 0 };
}

function applyScaleDelta(
  baseStats: InputStats,
  testStats: InputStats,
  modifier: Extract<PassiveModifier, { type: "scale" }>,
) {
  const sourceKey = String(modifier.sourceStat);
  const targetKey = String(modifier.stat);

  const baseSource = readCurrent(baseStats, sourceKey);
  const testSource = readCurrent(testStats, sourceKey);

  const baseAdd = clamp(
    baseSource * modifier.ratio,
    modifier.min,
    modifier.max,
  );
  const testAdd = clamp(
    testSource * modifier.ratio,
    modifier.min,
    modifier.max,
  );

  const delta = testAdd - baseAdd;
  if (delta === 0) return;

  addToCurrent(testStats, targetKey, delta);
}

function readStatValueWithGear(
  stats: InputStats,
  elementStats: ElementStats,
  gearBonus: Record<string, number>,
  key: string,
): number {
  const input = stats[key];
  if (input && typeof input === "object") {
    return (
      Number(input.current || 0) +
      Number(input.increase || 0) +
      (gearBonus[key] || 0)
    );
  }

  const el = (
    elementStats as unknown as Record<
      string,
      { current?: number | ""; increase?: number | "" }
    >
  )[key];
  if (el && typeof el === "object") {
    return (
      Number(el.current || 0) + Number(el.increase || 0) + (gearBonus[key] || 0)
    );
  }

  return gearBonus[key] || 0;
}

function computeDerivedForScaleWithGear(
  stats: InputStats,
  gearBonus: Record<string, number>,
) {
  const derivedInput: InputStats = Object.fromEntries(
    Object.keys(stats).map((k) => [
      k,
      {
        current:
          Number(stats[k]?.current || 0) +
          Number(stats[k]?.increase || 0) +
          (gearBonus[k] || 0),
        increase: 0,
      },
    ]),
  ) as InputStats;

  return computeDerivedStats(derivedInput, {});
}

function readScaleSourceValueWithGear(
  stats: InputStats,
  elementStats: ElementStats,
  gearBonus: Record<string, number>,
  key: string,
  derivedForScale: { minAtk: number; maxAtk: number },
): number {
  const base = readStatValueWithGear(stats, elementStats, gearBonus, key);
  if (key === "MinPhysicalAttack") return base + derivedForScale.minAtk;
  if (key === "MaxPhysicalAttack") return base + derivedForScale.maxAtk;
  return base;
}

function computeScaleAddWithGear(
  stats: InputStats,
  elementStats: ElementStats,
  gearBonus: Record<string, number>,
  modifier: Extract<PassiveModifier, { type: "scale" }>,
  derivedForScale: { minAtk: number; maxAtk: number },
): number {
  const sourceKey = String(modifier.sourceStat);
  const sourceValue = readScaleSourceValueWithGear(
    stats,
    elementStats,
    gearBonus,
    sourceKey,
    derivedForScale,
  );

  const addRaw = sourceValue * modifier.ratio;
  return clamp(addRaw, modifier.min, modifier.max);
}

/**
 * Compute the delta bonus record for `includedInStats` passives when gearBonus changes.
 *
 * We return ONLY (test - base) so that baseline input stats are not double-counted.
 */
export function computeIncludedInStatsGearBonusDelta(
  stats: InputStats,
  elementStats: ElementStats,
  rotation: Rotation | undefined,
  baseGearBonus: Record<string, number>,
  testGearBonus: Record<string, number>,
): Record<string, number> {
  if (!rotation) return {};

  const includedPassives = rotation.activePassiveSkills
    .map((id) => PASSIVE_SKILLS.find((p) => p.id === id))
    .filter((p) => !!p?.includedInStats) as Array<
    NonNullable<(typeof PASSIVE_SKILLS)[number]>
  >;

  if (includedPassives.length === 0) return {};

  const out: Record<string, number> = {};

  const needsDerived = includedPassives.some((p) =>
    p.modifiers.some(
      (m) =>
        m.type === "scale" &&
        (String(m.sourceStat) === "MinPhysicalAttack" ||
          String(m.sourceStat) === "MaxPhysicalAttack"),
    ),
  );

  const derivedBase = needsDerived
    ? computeDerivedForScaleWithGear(stats, baseGearBonus)
    : { minAtk: 0, maxAtk: 0, critRate: 0, affinityRate: 0 };
  const derivedTest = needsDerived
    ? computeDerivedForScaleWithGear(stats, testGearBonus)
    : { minAtk: 0, maxAtk: 0, critRate: 0, affinityRate: 0 };

  for (const passive of includedPassives) {
    for (const modifier of passive.modifiers) {
      if (modifier.type !== "scale") continue;

      const baseAdd = computeScaleAddWithGear(
        stats,
        elementStats,
        baseGearBonus,
        modifier,
        derivedBase,
      );
      const testAdd = computeScaleAddWithGear(
        stats,
        elementStats,
        testGearBonus,
        modifier,
        derivedTest,
      );

      const delta = testAdd - baseAdd;
      if (delta === 0) continue;

      const targetKey = String(modifier.stat);
      out[targetKey] = (out[targetKey] || 0) + delta;
    }
  }

  return out;
}

/**
 * Apply delta effects of `PassiveSkill.includedInStats` passives when a stat changes.
 *
 * Important: We apply ONLY the *difference* between base and test, because the base
 * input stats are assumed to already include the passive's current bonus.
 */
export function applyIncludedInStatsPassiveImpact(
  baseStats: InputStats,
  testStats: InputStats,
  rotation?: Rotation,
) {
  if (!rotation) return;

  for (const passiveId of rotation.activePassiveSkills) {
    const passive = PASSIVE_SKILLS.find((p) => p.id === passiveId);
    if (!passive?.includedInStats) continue;

    for (const modifier of passive.modifiers) {
      if (modifier.type !== "scale") continue;
      applyScaleDelta(baseStats, testStats, modifier);
    }
  }
}
