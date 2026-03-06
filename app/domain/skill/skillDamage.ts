// app/domain/skill/skillDamage.ts
import { calculateDamage } from "../damage/damageCalculator";
import { DamageContext } from "../damage/damageContext";
import { Skill } from "./types";
import { createSkillContext } from "./skillContext";
import { DamageResult, SkillDamageResult } from "../damage/type";
import { calcExpectedNormalBreakdown } from "../damage/damageFormula";

export const SCARLET_SPIN_SKILL_ID = "bamboocut_dust_umbrella_scarlet_spin";
export const PHANTOM_RALLY_T0_INNER_WAY_ID =
  "iw_bamboocut_dust_umbrella_phantom_rally_t0";
export const PHANTOM_RALLY_T6_INNER_WAY_ID =
  "iw_bamboocut_dust_umbrella_phantom_rally_t6";

export interface SkillDamageOptions {
  /** Optional per-skill parameters (typically sourced from RotationSkill.params). */
  params?: Record<string, number>;

  /** Active inner ways from the current rotation (for conditional skill logic). */
  activeInnerWays?: string[];

  /** Total number of times this skill is used in the current rotation. */
  skillUseCountInRotation?: number;

  /** Total use count per skill id in the current rotation. */
  skillUseCountsInRotation?: Record<string, number>;
}

export interface RotationSkillUsageLike {
  id: string;
  count: number;
}

export function buildSkillUseCountsInRotation(
  skills: RotationSkillUsageLike[] | undefined,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const s of skills ?? []) {
    const key = String(s.id || "");
    if (!key) continue;
    const count = Math.max(0, Number(s.count) || 0);
    if (count <= 0) continue;
    out[key] = (out[key] || 0) + count;
  }
  return out;
}

export function buildRotationSkillDamageOptions(
  skillId: string,
  params: Record<string, number> | undefined,
  activeInnerWays: string[] | undefined,
  skillUseCountsInRotation: Record<string, number> | undefined,
): SkillDamageOptions {
  return {
    params,
    activeInnerWays,
    skillUseCountsInRotation,
    // Backward-compatible field for older code paths.
    skillUseCountInRotation: skillUseCountsInRotation?.[skillId] ?? 0,
  };
}

function getSkillUseCountInRotation(
  opts: SkillDamageOptions | undefined,
  skillId: string,
) {
  return Math.max(
    0,
    Math.floor(
      Number(
        opts?.skillUseCountsInRotation?.[skillId] ??
          opts?.skillUseCountInRotation,
      ) || 0,
    ),
  );
}

export function getScarletSpinResonanceHitCount(
  activeInnerWays: string[] | undefined,
  scarletSpinUseCount: number,
): number {
  const uses = Math.max(0, Math.floor(Number(scarletSpinUseCount) || 0));
  if (uses <= 0) return 0;

  const active = new Set(activeInnerWays ?? []);

  if (active.has(PHANTOM_RALLY_T6_INNER_WAY_ID)) {
    return Math.max(0, 2 * uses - 1);
  }

  if (active.has(PHANTOM_RALLY_T0_INNER_WAY_ID)) {
    return Math.max(0, uses - 1);
  }

  return 0;
}

function getScarletSpinResonanceScaleFactor(opts?: SkillDamageOptions): number {
  const uses = getSkillUseCountInRotation(opts, SCARLET_SPIN_SKILL_ID);
  if (uses <= 0) return 1;

  const resonanceHits = getScarletSpinResonanceHitCount(
    opts?.activeInnerWays,
    uses,
  );
  if (resonanceHits <= 0) return 1;

  // Each resonance is modeled as 1/4 of one Scarlet Spin cast's coefficients.
  return 1 + resonanceHits / (4 * uses);
}

function scaleDamageResult(dmg: DamageResult, scale: number): DamageResult {
  const s = Number.isFinite(scale) ? scale : 1;
  return {
    min: { value: dmg.min.value * s, percent: dmg.min.percent },
    normal: { value: dmg.normal.value * s, percent: dmg.normal.percent },
    critical: { value: dmg.critical.value * s, percent: dmg.critical.percent },
    affinity: { value: dmg.affinity.value * s, percent: dmg.affinity.percent },
    averageBreakdown: dmg.averageBreakdown
      ? {
          abrasion: dmg.averageBreakdown.abrasion * s,
          affinity: dmg.averageBreakdown.affinity * s,
          critical: dmg.averageBreakdown.critical * s,
          normal: dmg.averageBreakdown.normal * s,
        }
      : dmg.averageBreakdown,
  };
}

function getEffectiveSkillHits(skill: Skill, opts?: SkillDamageOptions) {
  // Default: use JSON hits as-is.
  const baseHits = skill.hits ?? [];

  const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

  // Unfaded Flower: model as a time-based projectile skill.
  // Tooltip: consumes 10 Blossoms per second; user can input Blossoms to scale duration.
  if (skill.id === "vernal_unfaded_flower") {
    const blossomsRaw = opts?.params?.blossoms;
    const blossoms = Math.max(
      0,
      Number.isFinite(blossomsRaw as number) ? (blossomsRaw as number) : 100,
    );
    const seconds = Math.max(1, Math.floor(blossoms / 10));

    // Interpret the first hit entry as "one projectile" and scale its hit count by duration seconds.
    const template = baseHits[0] ?? {
      physicalMultiplier: 1,
      elementMultiplier: 1,
      hits: 1,
    };

    return [
      {
        ...template,
        hits: seconds,
      },
    ];
  }

  // Generic per-hit scaling, driven entirely by JSON (SkillHit.scale).
  if (!opts?.params) return baseHits;

  return baseHits.map((hit) => {
    if (!hit.scale) return hit;

    const raw = opts.params?.[hit.scale.paramKey];
    const v = Number.isFinite(raw as number) ? (raw as number) : undefined;

    const inputMin = Number.isFinite(hit.scale.inputMin as number)
      ? (hit.scale.inputMin as number)
      : 0;
    const inputMax = Number.isFinite(hit.scale.inputMax as number)
      ? (hit.scale.inputMax as number)
      : 100;

    const t = clamp01(
      inputMax === inputMin
        ? 1
        : ((v ?? inputMax) - inputMin) / (inputMax - inputMin),
    );

    const roundFlats = hit.scale.roundFlats ?? true;
    const to = hit.scale.to;

    const flatPhysical = lerp(hit.flatPhysical ?? 0, to.flatPhysical ?? 0, t);
    const flatAttribute = lerp(
      hit.flatAttribute ?? 0,
      to.flatAttribute ?? 0,
      t,
    );

    return {
      ...hit,
      physicalMultiplier: lerp(
        hit.physicalMultiplier,
        to.physicalMultiplier,
        t,
      ),
      elementMultiplier: lerp(hit.elementMultiplier, to.elementMultiplier, t),
      flatPhysical: roundFlats ? Math.round(flatPhysical) : flatPhysical,
      flatAttribute: roundFlats ? Math.round(flatAttribute) : flatAttribute,
    };
  });
}

export function calculateSkillDamage(
  ctx: DamageContext,
  skill: Skill,
  opts?: SkillDamageOptions,
): SkillDamageResult {
  const perHit: DamageResult[] = [];

  const damageSkillTypes = skill.damageSkillType ?? ["normal"];

  const effectiveHits = getEffectiveSkillHits(skill, opts);

  // Umbrella - Spring Away: DPS-based skill.
  // Interpret the JSON hit template as "damage per second", then scale linearly by Duration seconds (float).
  const durationScale = (() => {
    if (skill.id !== "vernal_umbrella_light_spring_away") return 1;
    const raw = opts?.params?.duration;
    const v = Number.isFinite(raw as number) ? (raw as number) : 1;
    return Math.max(0, v);
  })();

  // Process each hit type and multiply by hit count
  for (const hit of effectiveHits) {
    const hitCtx = createSkillContext(ctx, {
      skillId: skill.id,
      category: skill.category,
      physicalMultiplier: hit.physicalMultiplier,
      elementMultiplier: hit.elementMultiplier,
      flatPhysical: hit.flatPhysical,
      flatAttribute: hit.flatAttribute,
      damageSkillTypes,
      weaponType: skill.weaponType,
    });

    const damage = calculateDamage(hitCtx);
    const breakdown = calcExpectedNormalBreakdown(hitCtx.get, damage.affinity);

    // Create damage object once and reuse for multiple hits
    const hitDamageBase: DamageResult = {
      min: { value: damage.min, percent: 0 },
      normal: { value: damage.normal, percent: 0 },
      critical: { value: damage.critical, percent: 0 },
      affinity: { value: damage.affinity, percent: 0 },
      averageBreakdown: breakdown,
    };

    const hitDamage =
      durationScale === 1
        ? hitDamageBase
        : scaleDamageResult(hitDamageBase, durationScale);

    // Add hit count times instead of creating separate objects
    for (let i = 0; i < hit.hits; i++) {
      perHit.push(hitDamage);
    }
  }

  // Accumulate damage efficiently
  const total: DamageResult = {
    min: { value: 0, percent: 0 },
    normal: { value: 0, percent: 0 },
    critical: { value: 0, percent: 0 },
    affinity: { value: 0, percent: 0 },
    averageBreakdown: { abrasion: 0, affinity: 0, critical: 0, normal: 0 },
  };

  // Single pass accumulation
  for (const h of perHit) {
    total.min.value += h.min.value;
    total.normal.value += h.normal.value;
    total.critical.value += h.critical.value;
    total.affinity.value += h.affinity.value;
    if (total.averageBreakdown && h.averageBreakdown) {
      total.averageBreakdown.abrasion += h.averageBreakdown.abrasion;
      total.averageBreakdown.affinity += h.averageBreakdown.affinity;
      total.averageBreakdown.critical += h.averageBreakdown.critical;
      total.averageBreakdown.normal += h.averageBreakdown.normal;
    }
  }

  if (skill.id === SCARLET_SPIN_SKILL_ID) {
    const resonanceScale = getScarletSpinResonanceScaleFactor(opts);
    if (resonanceScale !== 1) {
      return {
        total: scaleDamageResult(total, resonanceScale),
        perHit: perHit.map((h) => scaleDamageResult(h, resonanceScale)),
      };
    }
  }

  return { total, perHit };
}
