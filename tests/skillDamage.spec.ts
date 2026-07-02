import { describe, it, expect, afterEach } from "vitest";
import { INITIAL_STATS, INITIAL_ELEMENT_STATS } from "@/app/constants";
import { buildDamageContext } from "@/app/domain/damage/damageContext";
import { calculateDamage } from "@/app/domain/damage/damageCalculator";
import { SKILLS } from "@/app/domain/skill/skills";
import {
  calculateSkillDamage,
  buildSkillUseCountsInRotation,
  buildRotationSkillDamageOptions,
  createRotationSkillRuntimeState,
  advanceRotationSkillRuntimeState,
  HOMELESS_CHARGE_STAGE_3_SKILL_ID,
} from "@/app/domain/skill/skillDamage";
import { SWORD_MORPH_T3_INNER_WAY_ID } from "@/app/domain/skill/innerWays";
import { createSkillContext } from "@/app/domain/skill/skillContext";
import {
  PASSIVE_SKILLS,
  setPassiveSkills,
} from "@/app/domain/skill/passiveSkills";
import {
  INNER_WAYS,
  setInnerWays,
} from "@/app/domain/skill/innerWays";
import { computeExhaustedBonuses } from "@/app/domain/skill/modifierEngine";
import type { PassiveSkill, InnerWay, PassiveModifier } from "@/app/domain/skill/passiveSkillTypes";
import type { Rotation } from "@/app/types";

describe("skill damage", () => {
  it("matches single-hit manual calculation for a simple skill", () => {
    const ctx = buildDamageContext(INITIAL_STATS, INITIAL_ELEMENT_STATS, {});
    const skill = SKILLS.find((s) => s.id === "heavenquaker_light");
    expect(skill).toBeDefined();
    if (!skill) return;

    // calculate via calculateSkillDamage
    const skillRes = calculateSkillDamage(ctx, skill);
    expect(skillRes.total.normal.value).toBeGreaterThan(0);

    // manual: take first hit template and build a hit context
    const hit = (skill.hits && skill.hits[0]) || {
      physicalMultiplier: 1,
      elementMultiplier: 1,
      hits: 1,
    };
    const hitCtx = createSkillContext(ctx, {
      skillId: skill.id,
      category: skill.category,
      physicalMultiplier: hit.physicalMultiplier,
      elementMultiplier: hit.elementMultiplier,
      flatPhysical: hit.flatPhysical,
      flatAttribute: hit.flatAttribute,
      damageSkillTypes: skill.damageSkillType ?? ["normal"],
      weaponType: skill.weaponType,
    });

    const manual = calculateDamage(hitCtx);
    // skillRes.total.normal equals manual.normal * hits
    const expected = manual.normal * (hit.hits || 1);
    expect(skillRes.total.normal.value).toBeCloseTo(expected, 6);
  });

  it("aggregates simple rotation damage correctly", () => {
    const ctx = buildDamageContext(INITIAL_STATS, INITIAL_ELEMENT_STATS, {});
    const skill = SKILLS.find((s) => s.id === "heavenquaker_light");
    expect(skill).toBeDefined();
    if (!skill) return;

    // Build a simple rotation: two entries of same skill with counts
    const rotationEntries = [
      { id: skill.id, count: 2 },
      { id: skill.id, count: 3 },
    ];
    const counts = buildSkillUseCountsInRotation(rotationEntries);

    // Sum damage by calling calculateSkillDamage per entry with proper opts
    let sumDamage = 0;
    const runtimeState = createRotationSkillRuntimeState();
    for (const entry of rotationEntries) {
      const opts = buildRotationSkillDamageOptions(
        entry.id,
        undefined,
        [],
        counts,
        entry.count,
        [],
        runtimeState.priorHitsBySkill,
      );

      const s = SKILLS.find((x) => x.id === entry.id);
      expect(s).toBeDefined();
      if (!s) continue;

      const r = calculateSkillDamage(ctx, s, opts);
      // r.total.normal is damage per use (already accumulative per hit template)
      sumDamage += r.total.normal.value * entry.count;

      // advance runtime state as rotation would
      advanceRotationSkillRuntimeState(runtimeState, s, opts, entry.count);
    }

    // Compare against naive per-hit manual calculation: use first hit template * total uses
    const hit = (skill.hits && skill.hits[0]) || {
      physicalMultiplier: 1,
      elementMultiplier: 1,
      hits: 1,
    };
    const hitCtx = createSkillContext(ctx, {
      skillId: skill.id,
      category: skill.category,
      physicalMultiplier: hit.physicalMultiplier,
      elementMultiplier: hit.elementMultiplier,
      flatPhysical: hit.flatPhysical,
      flatAttribute: hit.flatAttribute,
      damageSkillTypes: skill.damageSkillType ?? ["normal"],
      weaponType: skill.weaponType,
    });
    const manual = calculateDamage(hitCtx);
    const totalUses = rotationEntries.reduce((s, e) => s + e.count, 0);
    const expected = manual.normal * (hit.hits || 1) * totalUses;

    expect(sumDamage).toBeCloseTo(expected, 6);
  });

  it("T3 Sword Morph + exhausted forces affinity on hit 3 for Homeless Charge Stage 3", () => {
    const ctx = buildDamageContext(INITIAL_STATS, INITIAL_ELEMENT_STATS, {});
    const skill = SKILLS.find((s) => s.id === HOMELESS_CHARGE_STAGE_3_SKILL_ID);
    expect(skill).toBeDefined();
    if (!skill) return;

    const result = calculateSkillDamage(ctx, skill, {
      exhausted: true,
      activeInnerWays: [SWORD_MORPH_T3_INNER_WAY_ID],
      activePassiveSkills: [],
    });

    expect(result.perHit[2].averageBreakdown?.affinity).toBeGreaterThan(0);
    expect(result.perHit[2].averageBreakdown?.abrasion).toBe(0);
    expect(result.perHit[2].averageBreakdown?.normal).toBe(0);
    expect(result.perHit[2].averageBreakdown?.critical).toBe(0);

    expect(result.perHit[0].averageBreakdown?.abrasion).toBe(0);
    expect(result.perHit[1].averageBreakdown?.abrasion).toBe(0);

    expect(result.perHit[2].affinity.value).toBeGreaterThan(result.perHit[0].normal.value);
  });

  it("without exhausted, T3 has no effect on Homeless Charge Stage 3", () => {
    const ctx = buildDamageContext(INITIAL_STATS, INITIAL_ELEMENT_STATS, {});
    const skill = SKILLS.find((s) => s.id === HOMELESS_CHARGE_STAGE_3_SKILL_ID);
    expect(skill).toBeDefined();
    if (!skill) return;

    const result = calculateSkillDamage(ctx, skill, {
      exhausted: false,
      activeInnerWays: [SWORD_MORPH_T3_INNER_WAY_ID],
      activePassiveSkills: [],
    });

    // Hit 3: normal and abrasion should be present (no override)
    expect(result.perHit[2].averageBreakdown?.normal).toBeGreaterThan(0);
    expect(result.perHit[2].averageBreakdown?.abrasion).toBeGreaterThan(0);

    // Hits 1-2: abrasion should still exist
    expect(result.perHit[0].averageBreakdown?.abrasion).toBeGreaterThan(0);
    expect(result.perHit[1].averageBreakdown?.abrasion).toBeGreaterThan(0);
  });
});

/* ============================================================
   exhaustedExtra tests
   ============================================================ */

describe("exhaustedExtra", () => {
  const originalPassives = PASSIVE_SKILLS;
  const originalInnerWays = INNER_WAYS;

  afterEach(() => {
    setPassiveSkills(originalPassives);
    setInnerWays(originalInnerWays);
  });

  it("computeExhaustedBonuses returns values from passive exhaustedExtra modifiers", () => {
    const testPassive: PassiveSkill = {
      id: "ps_test_exhausted",
      name: "Test Exhausted",
      description: "",
      modifiers: [
        { stat: "MinPhysicalAttack", type: "flat", value: 50, exhaustedExtra: 30, applyUptime: false },
      ],
    };
    setPassiveSkills([testPassive]);

    const rotation = {
      id: "test",
      name: "test",
      skills: [],
      activeInnerWays: [],
      activePassiveSkills: ["ps_test_exhausted"],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    } satisfies Rotation;

    const result = computeExhaustedBonuses(rotation);
    expect(result.MinPhysicalAttack).toBeCloseTo(30);
  });

  it("computeExhaustedBonuses returns values from inner way exhaustedExtra modifiers", () => {
    const testInner: InnerWay = {
      id: "iw_test_exhausted",
      name: "Test Inner Way Exhausted",
      description: "",
      modifiers: [
        { stat: "MinPhysicalAttack", type: "flat", value: 50, exhaustedExtra: 20 },
      ],
      level: 1,
    };
    setInnerWays([testInner]);

    const rotation = {
      id: "test",
      name: "test",
      skills: [],
      activeInnerWays: ["iw_test_exhausted"],
      activePassiveSkills: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    } satisfies Rotation;

    const result = computeExhaustedBonuses(rotation);
    expect(result.MinPhysicalAttack).toBeCloseTo(20);
  });

  it("calculateSkillDamage with exhausted and exhaustedBonuses applies the per-stat bonus", () => {
    // Inject a passive with +100 MinPhysicalAttack and +50 exhaustedExtra
    const testPassive: PassiveSkill = {
      id: "ps_test_exhausted_damage",
      name: "Test Exhausted Damage",
      description: "",
      modifiers: [
        { stat: "MinPhysicalAttack", type: "flat", value: 100, exhaustedExtra: 50, applyUptime: false },
      ],
    };
    setPassiveSkills([testPassive]);

    const ctx = buildDamageContext(INITIAL_STATS, INITIAL_ELEMENT_STATS, {});
    const skill = SKILLS.find((s) => s.id === "heavenquaker_light");
    expect(skill).toBeDefined();
    if (!skill) return;

    const exhaustedBonuses = computeExhaustedBonuses({
      id: "test",
      name: "test",
      skills: [],
      activeInnerWays: [],
      activePassiveSkills: ["ps_test_exhausted_damage"],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    } satisfies Rotation);

    // With exhausted: true → should apply exhaustedExtra
    const resultWithExhausted = calculateSkillDamage(ctx, skill, {
      exhausted: true,
      exhaustedBonuses,
    });

    // Without exhausted → should NOT apply exhaustedExtra
    const resultWithoutExhausted = calculateSkillDamage(ctx, skill, {
      exhausted: false,
      exhaustedBonuses,
    });

    // Damage should be higher with exhaustedExtra applied
    expect(resultWithExhausted.total.normal.value).toBeGreaterThan(
      resultWithoutExhausted.total.normal.value,
    );
  });

  it("createSkillContext applies exhaustedStatOverrides on stat get", () => {
    const ctx = buildDamageContext(INITIAL_STATS, INITIAL_ELEMENT_STATS, {});
    const skill = SKILLS.find((s) => s.id === "heavenquaker_light");
    expect(skill).toBeDefined();
    if (!skill) return;

    const hit = skill.hits![0];
    const hitCtxWith = createSkillContext(ctx, {
      skillId: skill.id,
      category: skill.category,
      physicalMultiplier: hit.physicalMultiplier,
      elementMultiplier: hit.elementMultiplier,
      flatPhysical: hit.flatPhysical,
      flatAttribute: hit.flatAttribute,
      damageSkillTypes: skill.damageSkillType ?? ["normal"],
      weaponType: skill.weaponType,
      exhaustedStatOverrides: { MinPhysicalAttack: 99 },
    });

    const hitCtxWithout = createSkillContext(ctx, {
      skillId: skill.id,
      category: skill.category,
      physicalMultiplier: hit.physicalMultiplier,
      elementMultiplier: hit.elementMultiplier,
      flatPhysical: hit.flatPhysical,
      flatAttribute: hit.flatAttribute,
      damageSkillTypes: skill.damageSkillType ?? ["normal"],
      weaponType: skill.weaponType,
    });

    // MinPhysicalAttack should be higher with override
    const dmgWith = calculateDamage(hitCtxWith);
    const dmgWithout = calculateDamage(hitCtxWithout);

    expect(dmgWith.normal).toBeGreaterThan(dmgWithout.normal);
  });
});
