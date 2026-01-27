import { ElementStats, InputStats, Rotation } from "@/app/types";
import { INNER_WAYS } from "./innerWays";
import { PASSIVE_SKILLS } from "./passiveSkills";
import { PassiveModifier, StatKey } from "./passiveSkillTypes";

export interface RotationBonusBreakdown {
  /** Total bonus = sum of all sources (passives + inner ways) */
  total: Record<string, number>;
  byPassive: Record<string, Record<string, number>>;
  byInnerWay: Record<string, Record<string, number>>;
  meta: {
    passives: Record<string, { name: string; uptimePct: number }>;
    innerWays: Record<string, { name: string }>;
  };
}

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
  key: StatKey,
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
  martialArtId?: ElementStats["martialArtsId"],
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
  rotation?: Rotation,
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
        modifier.sourceStat,
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
        modifier.sourceStat,
      );

      const addRaw = sourceValue * modifier.ratio;
      const add = clamp(addRaw, modifier.min, modifier.max);
      scaleBonus[targetKey] = (scaleBonus[targetKey] || 0) + add;
    }
  }

  return sumRecords(flatBonus, scaleBonus);
}

/**
 * Like computeRotationBonuses(), but also returns a breakdown by passive/inner-way.
 * NOTE: scale modifiers are computed using the same shared baseForScale as the total,
 * so per-source scale contributions are attributable but still depend on global state.
 */
export function computeRotationBonusesWithBreakdown(
  stats: InputStats,
  elementStats: ElementStats,
  gearBonus: Record<string, number>,
  rotation?: Rotation,
): RotationBonusBreakdown {
  if (!rotation) {
    return {
      total: {},
      byPassive: {},
      byInnerWay: {},
      meta: { passives: {}, innerWays: {} },
    };
  }

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

  const byPassiveFlat: Record<string, Record<string, number>> = {};
  const byInnerFlat: Record<string, Record<string, number>> = {};
  const metaPassives: RotationBonusBreakdown["meta"]["passives"] = {};
  const metaInner: RotationBonusBreakdown["meta"]["innerWays"] = {};

  const addTo = (
    bucket: Record<string, number>,
    key: string,
    value: number,
  ) => {
    bucket[key] = (bucket[key] || 0) + value;
  };

  // 1) Flat modifiers
  for (const passiveId of rotation.activePassiveSkills) {
    const passive = PASSIVE_SKILLS.find((p) => p.id === passiveId);
    if (!passive) continue;

    const uptimePct = clamp(uptimePctForPassive(passiveId), 0, 100);
    metaPassives[passiveId] = { name: passive.name, uptimePct };

    const f = uptimePct / 100;
    if (f <= 0) continue;

    const bucket = (byPassiveFlat[passiveId] ??= {});
    for (const modifier of passive.modifiers) {
      if (modifier.type !== "flat") continue;
      const key = String(modifier.stat);
      const add = clamp(modifier.value, modifier.min, modifier.max) * f;
      addTo(bucket, key, add);
    }
  }

  for (const innerId of rotation.activeInnerWays) {
    const inner = INNER_WAYS.find((i) => i.id === innerId);
    if (!inner) continue;

    if (inner.applicableToMartialArtId && elementStats.martialArtsId) {
      if (inner.applicableToMartialArtId !== elementStats.martialArtsId)
        continue;
    }

    metaInner[innerId] = { name: inner.name };

    const bucket = (byInnerFlat[innerId] ??= {});
    for (const modifier of inner.modifiers) {
      if (modifier.type !== "flat") continue;
      const key = String(modifier.stat);
      const add = clamp(modifier.value, modifier.min, modifier.max);
      addTo(bucket, key, add);
    }
  }

  const flatTotal = sumRecords(
    ...Object.values(byPassiveFlat),
    ...Object.values(byInnerFlat),
  );

  // 2) Scale modifiers (from base + gear + flat)
  const baseForScale = sumRecords(gearBonus, flatTotal);

  const byPassiveScale: Record<string, Record<string, number>> = {};
  const byInnerScale: Record<string, Record<string, number>> = {};

  for (const passiveId of rotation.activePassiveSkills) {
    const passive = PASSIVE_SKILLS.find((p) => p.id === passiveId);
    if (!passive) continue;
    const f = uptimeFactor(passiveId);
    if (f <= 0) continue;

    const bucket = (byPassiveScale[passiveId] ??= {});
    for (const modifier of passive.modifiers) {
      if (modifier.type !== "scale") continue;

      const targetKey = String(modifier.stat);
      const sourceValue = readStatValue(
        stats,
        elementStats,
        baseForScale,
        modifier.sourceStat,
      );

      const addRaw = sourceValue * modifier.ratio;
      const addCapped = clamp(addRaw, modifier.min, modifier.max);
      const add = addCapped * f;
      addTo(bucket, targetKey, add);
    }
  }

  for (const innerId of rotation.activeInnerWays) {
    const inner = INNER_WAYS.find((i) => i.id === innerId);
    if (!inner) continue;

    if (inner.applicableToMartialArtId && elementStats.martialArtsId) {
      if (inner.applicableToMartialArtId !== elementStats.martialArtsId)
        continue;
    }

    const bucket = (byInnerScale[innerId] ??= {});
    for (const modifier of inner.modifiers) {
      if (modifier.type !== "scale") continue;

      const targetKey = String(modifier.stat);
      const sourceValue = readStatValue(
        stats,
        elementStats,
        baseForScale,
        modifier.sourceStat,
      );

      const addRaw = sourceValue * modifier.ratio;
      const add = clamp(addRaw, modifier.min, modifier.max);
      addTo(bucket, targetKey, add);
    }
  }

  const byPassive: Record<string, Record<string, number>> = {};
  for (const id of new Set([
    ...Object.keys(byPassiveFlat),
    ...Object.keys(byPassiveScale),
  ])) {
    byPassive[id] = sumRecords(byPassiveFlat[id], byPassiveScale[id]);
  }

  const byInnerWay: Record<string, Record<string, number>> = {};
  for (const id of new Set([
    ...Object.keys(byInnerFlat),
    ...Object.keys(byInnerScale),
  ])) {
    byInnerWay[id] = sumRecords(byInnerFlat[id], byInnerScale[id]);
  }

  const total = sumRecords(
    ...Object.values(byPassive),
    ...Object.values(byInnerWay),
  );

  return {
    total,
    byPassive,
    byInnerWay,
    meta: { passives: metaPassives, innerWays: metaInner },
  };
}

export function sumBonuses(
  base: Record<string, number>,
  extra?: Record<string, number>,
): Record<string, number> {
  return sumRecords(base, extra);
}
