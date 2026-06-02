import { describe, it, expect } from "vitest";
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
} from "@/app/domain/skill/skillDamage";
import { createSkillContext } from "@/app/domain/skill/skillContext";

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
});
