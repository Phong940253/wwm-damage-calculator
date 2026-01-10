import { ElementStats, InputStats, Rotation } from "@/app/types";
import { INNER_WAYS } from "./innerWays";
import { PASSIVE_SKILLS } from "./passiveSkills";
import { PassiveModifier, StatKey } from "./passiveSkillTypes";

function clamp(value: number, min?: number, max?: number) {
  if (typeof min === "number") value = Math.max(min, value);
  if (typeof max === "number") value = Math.min(max, value);
  return value;
}

function sumRecords(...records: Array<Record<string, number> | undefined>) {
  const out: Record<string, number> = {};
  for (const record of records) {
    if (!record) continue;
    for (const [key, value] of Object.entries(record)) {
      out[key] = (out[key] || 0) + value;
    }
  }
  return out;
}

function readStatValue(
  stats: InputStats,
  elementStats: ElementStats,
  bonus: Record<string, number>,
  key: StatKey
) {
  const k = String(key);

  const inputStat = (
    stats as Record<string, { current?: number | ""; increase?: number | "" }>
  )[k];
  if (inputStat && typeof inputStat === "object") {
    return (
      Number(inputStat.current || 0) +
      Number(inputStat.increase || 0) +
      (bonus[k] || 0)
    );
  }

  const elementStat = (
    elementStats as unknown as Record<
      string,
      { current?: number | ""; increase?: number | "" }
    >
  )[k];
  if (elementStat && typeof elementStat === "object") {
    return (
      Number(elementStat.current || 0) +
      Number(elementStat.increase || 0) +
      (bonus[k] || 0)
    );
  }

  return bonus[k] || 0;
}

export function collectRotationModifiers(
  rotation?: Rotation,
  martialArtId?: ElementStats["martialArtsId"]
): PassiveModifier[] {
  if (!rotation) return [];

  const modifiers: PassiveModifier[] = [];

  for (const passiveId of rotation.activePassiveSkills) {
    const passive = PASSIVE_SKILLS.find((p) => p.id === passiveId);
    if (!passive) continue;
    modifiers.push(...passive.modifiers);
  }

  for (const innerId of rotation.activeInnerWays) {
    const inner = INNER_WAYS.find((i) => i.id === innerId);
    if (!inner) continue;

    if (inner.applicableToMartialArtId && martialArtId) {
      if (inner.applicableToMartialArtId !== martialArtId) continue;
    }

    modifiers.push(...inner.modifiers);
  }

  return modifiers;
}

/**
 * Returns ONLY the bonuses coming from passive skills + inner ways.
 * These are additive bonuses that should be summed with gear bonuses.
 */
export function computeRotationBonuses(
  stats: InputStats,
  elementStats: ElementStats,
  gearBonus: Record<string, number>,
  rotation?: Rotation
): Record<string, number> {
  if (!rotation) return {};

  const uptimePctForPassive = (passiveId: string) => {
    const explicit = rotation.passiveUptimes?.[passiveId];
    if (typeof explicit === "number" && !Number.isNaN(explicit))
      return explicit;

    const passive = PASSIVE_SKILLS.find((p) => p.id === passiveId);
    if (passive && typeof passive.defaultUptimePercent === "number") {
      return passive.defaultUptimePercent;
    }

    return 100;
  };

  const uptimeFactor = (passiveId: string) =>
    clamp(uptimePctForPassive(passiveId), 0, 100) / 100;

  // 1) Apply all flat modifiers first (weighted by uptime for passives)
  const flatBonus: Record<string, number> = {};

  for (const passiveId of rotation.activePassiveSkills) {
    const passive = PASSIVE_SKILLS.find((p) => p.id === passiveId);
    if (!passive) continue;
    const f = uptimeFactor(passiveId);
    if (f <= 0) continue;

    for (const modifier of passive.modifiers) {
      if (modifier.type !== "flat") continue;
      const key = String(modifier.stat);
      const add = clamp(modifier.value, modifier.min, modifier.max) * f;
      flatBonus[key] = (flatBonus[key] || 0) + add;
    }
  }

  for (const innerId of rotation.activeInnerWays) {
    const inner = INNER_WAYS.find((i) => i.id === innerId);
    if (!inner) continue;

    if (inner.applicableToMartialArtId && elementStats.martialArtsId) {
      if (inner.applicableToMartialArtId !== elementStats.martialArtsId)
        continue;
    }

    for (const modifier of inner.modifiers) {
      if (modifier.type !== "flat") continue;
      const key = String(modifier.stat);
      const add = clamp(modifier.value, modifier.min, modifier.max);
      flatBonus[key] = (flatBonus[key] || 0) + add;
    }
  }

  // 2) Compute scale modifiers from (base + gear + flat)
  const baseForScale = sumRecords(gearBonus, flatBonus);
  const scaleBonus: Record<string, number> = {};

  for (const passiveId of rotation.activePassiveSkills) {
    const passive = PASSIVE_SKILLS.find((p) => p.id === passiveId);
    if (!passive) continue;
    const f = uptimeFactor(passiveId);
    if (f <= 0) continue;

    for (const modifier of passive.modifiers) {
      if (modifier.type !== "scale") continue;

      const targetKey = String(modifier.stat);
      const sourceValue = readStatValue(
        stats,
        elementStats,
        baseForScale,
        modifier.sourceStat
      );

      const addRaw = sourceValue * modifier.ratio;
      const addCapped = clamp(addRaw, modifier.min, modifier.max);
      const add = addCapped * f;
      scaleBonus[targetKey] = (scaleBonus[targetKey] || 0) + add;
    }
  }

  for (const innerId of rotation.activeInnerWays) {
    const inner = INNER_WAYS.find((i) => i.id === innerId);
    if (!inner) continue;

    if (inner.applicableToMartialArtId && elementStats.martialArtsId) {
      if (inner.applicableToMartialArtId !== elementStats.martialArtsId)
        continue;
    }

    for (const modifier of inner.modifiers) {
      if (modifier.type !== "scale") continue;

      const targetKey = String(modifier.stat);
      const sourceValue = readStatValue(
        stats,
        elementStats,
        baseForScale,
        modifier.sourceStat
      );

      const addRaw = sourceValue * modifier.ratio;
      const add = clamp(addRaw, modifier.min, modifier.max);
      scaleBonus[targetKey] = (scaleBonus[targetKey] || 0) + add;
    }
  }

  return sumRecords(flatBonus, scaleBonus);
}

export function sumBonuses(
  base: Record<string, number>,
  extra?: Record<string, number>
): Record<string, number> {
  return sumRecords(base, extra);
}
