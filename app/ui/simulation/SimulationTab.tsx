"use client";

import React, { useState, useMemo } from "react";
import { Rotation } from "@/app/types";
import { DamageContext } from "@/app/domain/damage/damageContext";
import { SKILLS } from "@/app/domain/skill/skills";
import { SWORD_MORPH_INNER_WAY_IDS } from "@/app/domain/skill/innerWays";
import {
  HOMELESS_CHARGE_STAGE_3_SKILL_ID,
  buildSkillUseCountsInRotation,
  buildRotationSkillDamageOptions,
  getEffectiveSkillHits,
  createRotationSkillRuntimeState,
  advanceRotationSkillRuntimeState,
} from "@/app/domain/skill/skillDamage";
import { computeExhaustedBonuses } from "@/app/domain/skill/modifierEngine";
import {
  getSkillDurationScale,
  computeRotationPartyBuff,
} from "@/app/domain/skill/skillBehaviors";
import { createSkillContext } from "@/app/domain/skill/skillContext";
import {
  calcMinimumDamage,
  calcAffinityDamage,
  calcBaseDamage,
  buildDamageCache,
} from "@/app/domain/damage/damageFormula";
import { Button } from "@/components/ui/button";
import SimulationOutcomePie from "./SimulationOutcomePie";
import SimulationSkillBar from "./SimulationSkillBar";

interface SimulationTabProps {
  rotation?: Rotation;
  ctx: DamageContext;
}

type OutcomeType = "abrasion" | "normal" | "critical" | "affinity";

interface SimHit {
  outcome: OutcomeType;
  damage: number;
  forced?: boolean;
}

interface SkillSimData {
  skillName: string;
  cancelled: boolean;
  exhausted: boolean;
  count: number;
  hits: SimHit[];
  subtotalNormal: number;
  subtotalAbrasion: number;
  subtotalCritical: number;
  subtotalAffinity: number;
  precisionRate: number;
  affinityRate: number;
  criticalRate: number;
}

interface SimCounts {
  abrasion: number;
  normal: number;
  critical: number;
  affinity: number;
}

const OUTCOME_LABELS: Record<OutcomeType, string> = {
  abrasion: "Abrasion",
  normal: "Normal",
  critical: "CRIT!",
  affinity: "AFFINITY!",
};

const OUTCOME_COLORS: Record<OutcomeType, string> = {
  abrasion: "text-slate-400",
  normal: "text-emerald-500",
  critical: "text-amber-500",
  affinity: "text-yellow-500",
};

function simulateOutcome(
  min: number,
  aff: number,
  computeRandomized: (outcome: "normal" | "critical") => number,
  P: number,
  As: number,
  Cs: number,
  t3Exhausted: boolean,
  isHomeless3: boolean,
  hitLocalIndex: number,
): { outcome: OutcomeType; damage: number; forced?: boolean } {
  // OVERRIDE: Sword Morph T3 + exhausted + Homeless + 3rd hit → forced Affinity
  if (t3Exhausted && isHomeless3 && hitLocalIndex === 2) {
    return { outcome: "affinity", damage: aff, forced: true };
  }

  const r1 = Math.random();

  if (r1 < P) {
    const r2 = Math.random();
    if (r2 < As) return { outcome: "affinity", damage: aff };
    if (r2 < As + Cs) return { outcome: "critical", damage: computeRandomized("critical") };
    return { outcome: "normal", damage: computeRandomized("normal") };
  } else {
    const r2 = Math.random();
    if (r2 < As) return { outcome: "affinity", damage: aff };
    // OVERRIDE: T3 + exhausted + Homeless hits 1-2 → Abrasion becomes Normal
    if (t3Exhausted && isHomeless3 && hitLocalIndex < 2) {
      return { outcome: "normal", damage: computeRandomized("normal"), forced: true };
    }
    return { outcome: "abrasion", damage: min };
  }
}

function computeSimulation(rotation: Rotation, ctx: DamageContext): {
  skills: SkillSimData[];
  totalNormal: number;
  totalAbrasion: number;
  totalCritical: number;
  totalAffinity: number;
  counts: SimCounts;
} {
  const skillUseCountsInRotation = buildSkillUseCountsInRotation(
    rotation.skills,
  );
  const runtimeState = createRotationSkillRuntimeState();
  const activeSet = new Set(rotation.activeInnerWays ?? []);
  const t3Active = SWORD_MORPH_INNER_WAY_IDS.some((id) => activeSet.has(id));
  const exhaustedBonuses = computeExhaustedBonuses(rotation);

  const allSkills: SkillSimData[] = [];
  let totalNormal = 0;
  let totalAbrasion = 0;
  let totalCritical = 0;
  let totalAffinity = 0;
  const counts: SimCounts = { abrasion: 0, normal: 0, critical: 0, affinity: 0 };

  for (const rotSkill of rotation.skills) {
    const skill = SKILLS.find((s) => s.id === rotSkill.id);
    if (!skill) continue;

    const opts = buildRotationSkillDamageOptions(
      rotSkill.id,
      rotSkill.params,
      rotation.activeInnerWays,
      skillUseCountsInRotation,
      rotSkill.count,
      rotation.activePassiveSkills,
      runtimeState.priorHitsBySkill,
      rotSkill.cancelled,
      rotSkill.exhausted,
      exhaustedBonuses,
    );
    opts.rotationSkills = rotation.skills;

    const cancelled = !!rotSkill.cancelled;
    const exhausted = !!rotSkill.exhausted;

    // Compute party buff for this skill
    const partyBuff = opts.rotationSkills
      ? computeRotationPartyBuff(opts.params, opts.rotationSkills)
      : 0;
    const exhaustedDmgBoost = exhausted ? 10 : 0;
    const totalExtraDmgBoost = (opts.extraDmgBoost ?? 0) + partyBuff + exhaustedDmgBoost;

    const effectiveHits = cancelled
      ? skill.id === "mystic_flute_of_the_tides"
        ? getEffectiveSkillHits(skill, opts).filter((_, i) => i !== 0)
        : []
      : getEffectiveSkillHits(skill, opts);
    const durationScale = getSkillDurationScale(skill, opts.params);
    const damageSkillTypes = skill.damageSkillType ?? ["normal"];

    // Compute rates once per skill (they don't change per hit)
    const P_ctx = Math.max(0, Math.min(1, ctx.get("PrecisionRate") / 100));
    const rawA = Math.max(0, Math.min(1, ctx.get("FinalAffinityRate") / 100));
    const rawC = Math.max(0, Math.min(1, ctx.get("FinalCriticalRate") / 100));
    const scale = rawA + rawC > 1 ? 1 / (rawA + rawC) : 1;
    const As = rawA * scale;
    const Cs = rawC * scale;

    const useCount = Math.max(1, Math.floor(Number(rotSkill.count) || 1));
    const expandedHits: SimHit[] = [];

    // Pre-compute per-hit data (cache, multipliers) — same for all uses
    const perHitData: Array<{
      rMin: number;
      rAff: number;
      hits: number;
      computeRandomized: (outcome: "normal" | "critical") => number;
      isHomeless3: boolean;
      t3Exhausted: boolean;
    }> = [];

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
        buffDmgBoostPct:
          opts.params?.buffDmgBoostPct ?? skill.selfDamageBoostPct ?? 0,
        extraDmgBoost: totalExtraDmgBoost,
        exhaustedStatOverrides: exhausted ? exhaustedBonuses : undefined,
      });

      const g = hitCtx.get;
      const cache = buildDamageCache(g);

      const dmgBonusTotal = cache.dmgBoost + cache.bossDmgBoost;
      const familyMult = 1 + cache.familyDmgBonus / 100;
      const dmgMult = 1 + dmgBonusTotal / 100;
      const critMult = 1 + cache.critDmgBonus / 100;

      const rMin = Math.round(calcMinimumDamage(g) * durationScale * 10) / 10;
      const rAff = Math.round(calcAffinityDamage(g) * durationScale * 10) / 10;

      const computeRandomized = (outcome: "normal" | "critical") => {
        const randBetween = (lo: number, hi: number) => {
          const a = Math.min(lo, hi);
          const b = Math.max(lo, hi);
          return a + Math.random() * (b - a);
        };
        const physAtk = randBetween(cache.minPhysAtk, cache.maxPhysAtk);
        const otherAttr = randBetween(cache.minOtherAttr, cache.maxOtherAttr);
        const yourAttr = randBetween(cache.minYourAttr, cache.maxYourAttr);
        const base = calcBaseDamage(physAtk, otherAttr, yourAttr, cache);
        let result = base * familyMult * dmgMult;
        if (outcome === "critical") result *= critMult;
        return Math.round(result * durationScale * 10) / 10;
      };

      const isHomeless3 = skill.id === HOMELESS_CHARGE_STAGE_3_SKILL_ID;
      const t3Exhausted = t3Active && exhausted;

      perHitData.push({ rMin, rAff, hits: hit.hits, computeRandomized, isHomeless3, t3Exhausted });
    }

    // Simulate each use independently (each gets its own random rolls)
    for (let u = 0; u < useCount; u++) {
      let useHitCount = 0;
      for (const ph of perHitData) {
        for (let i = 0; i < ph.hits; i++) {
          const result = simulateOutcome(
            ph.rMin, ph.rAff, ph.computeRandomized,
            P_ctx, As, Cs,
            ph.t3Exhausted, ph.isHomeless3, useHitCount,
          );
          expandedHits.push(result);
          counts[result.outcome]++;
          useHitCount++;
        }
      }
    }

    const subtotalNormal = expandedHits
      .filter((h) => h.outcome === "normal")
      .reduce((s, h) => s + h.damage, 0);
    const subtotalAbrasion = expandedHits
      .filter((h) => h.outcome === "abrasion")
      .reduce((s, h) => s + h.damage, 0);
    const subtotalCritical = expandedHits
      .filter((h) => h.outcome === "critical")
      .reduce((s, h) => s + h.damage, 0);
    const subtotalAffinity = expandedHits
      .filter((h) => h.outcome === "affinity")
      .reduce((s, h) => s + h.damage, 0);

    totalNormal += subtotalNormal;
    totalAbrasion += subtotalAbrasion;
    totalCritical += subtotalCritical;
    totalAffinity += subtotalAffinity;

    allSkills.push({
      skillName: skill.name,
      cancelled,
      exhausted,
      count: useCount,
      hits: expandedHits,
      subtotalNormal,
      subtotalAbrasion,
      subtotalCritical,
      subtotalAffinity,
      precisionRate: P_ctx * 100,
      affinityRate: As * 100,
      criticalRate: Cs * 100,
    });

    advanceRotationSkillRuntimeState(runtimeState, skill, opts, rotSkill.count);
  }

  return {
    skills: allSkills,
    totalNormal,
    totalAbrasion,
    totalCritical,
    totalAffinity,
    counts,
  };
}

const fmtr = (n: number) => n.toLocaleString("en-US");

export default function SimulationTab({ rotation, ctx }: SimulationTabProps) {
  const [simKey, setSimKey] = useState(0);

  const data = useMemo(() => {
    if (!rotation?.skills?.length) return null;
    return computeSimulation(rotation, ctx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rotation, ctx, simKey]);

  if (!rotation?.skills?.length) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        Select a rotation to simulate
      </div>
    );
  }

  if (!data || data.skills.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        No skills found in rotation
      </div>
    );
  }

  const grandTotal =
    data.totalNormal +
    data.totalAbrasion +
    data.totalCritical +
    data.totalAffinity;

  const totalHits =
    data.counts.abrasion +
    data.counts.normal +
    data.counts.critical +
    data.counts.affinity;

  const pct = (v: number) =>
    totalHits > 0 ? ((v / totalHits) * 100).toFixed(1) : "0";

  const DEFAULT_ROTATION_SECONDS = 60;
  const dps = grandTotal / DEFAULT_ROTATION_SECONDS;

  const skillBarData = data.skills.map((sk) => ({
    skillName: sk.skillName,
    subtotal:
      sk.subtotalNormal +
      sk.subtotalAbrasion +
      sk.subtotalCritical +
      sk.subtotalAffinity,
  }));

  return (
    <div className="flex flex-col gap-3 h-full p-1">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">
          Simulation — &ldquo;{rotation.name}&rdquo;
        </h3>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={() => setSimKey((k) => k + 1)}
        >
          Re-simulate
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="rounded border border-border p-3">
          <h4 className="text-xs font-semibold mb-2 text-foreground">Outcome Breakdown</h4>
          <SimulationOutcomePie
            totalNormal={data.totalNormal}
            totalAbrasion={data.totalAbrasion}
            totalCritical={data.totalCritical}
            totalAffinity={data.totalAffinity}
          />
        </div>
        <div className="rounded border border-border p-3">
          <h4 className="text-xs font-semibold mb-2 text-foreground">Skill Damage Breakdown</h4>
          <SimulationSkillBar skills={skillBarData} grandTotal={grandTotal} />
        </div>
      </div>

      <div className="overflow-y-auto flex-1">
        <table className="w-full text-xs border-collapse">
          <thead className="sticky top-0 bg-background">
            <tr className="text-muted-foreground border-b border-border">
              <th className="text-left py-1 pr-2 font-medium">Skill</th>
              <th className="text-left py-1 pr-2 font-medium w-[50px]">Hit</th>
              <th className="text-left py-1 pr-2 font-medium w-[80px]">Outcome</th>
              <th className="text-right py-1 font-medium w-[80px]">Damage</th>
            </tr>
          </thead>
          <tbody>
            {data.skills.map((sk, skIdx) => {
              const subTotal =
                sk.subtotalNormal +
                sk.subtotalAbrasion +
                sk.subtotalCritical +
                sk.subtotalAffinity;
              return (
                <React.Fragment key={skIdx}>
                  {sk.hits.length > 0 &&
                    sk.hits.map((hit, hIdx) => {
                      const hitsPerUse = sk.count > 0 ? Math.floor(sk.hits.length / sk.count) : 1;
                      const localHit = (hIdx % hitsPerUse) + 1;
                      // Compute per-skill outcome breakdown on first hit only
                      if (hIdx !== 0) {
                        return (
                          <tr
                            key={hIdx}
                            className="border-b border-border/30"
                          >
                            <td className="py-1 pr-2 text-muted-foreground">
                              H{localHit}
                            </td>
                            <td
                              className={`py-1 pr-2 font-medium ${OUTCOME_COLORS[hit.outcome]}`}
                            >
                              {OUTCOME_LABELS[hit.outcome]}{hit.forced && <span className="text-[9px] text-muted-foreground ml-0.5">(forced)</span>}
                            </td>
                            <td
                              className={`py-1 text-right font-mono ${OUTCOME_COLORS[hit.outcome]}`}
                            >
                              {fmtr(Math.round(hit.damage))}
                            </td>
                          </tr>
                        );
                      }
                      const nAbr = sk.hits.filter(h => h.outcome === "abrasion").length;
                      const nNor = sk.hits.filter(h => h.outcome === "normal").length;
                      const nCrit = sk.hits.filter(h => h.outcome === "critical").length;
                      const nAff = sk.hits.filter(h => h.outcome === "affinity").length;
                      const nHits = sk.hits.length;
                      const pct = (n: number) => nHits > 0 ? ((n / nHits) * 100).toFixed(1) : "0";
                      return (
                        <tr
                          key={hIdx}
                          className="border-b border-border/30"
                        >
                          <td
                            className="py-1 pr-2 align-top"
                            rowSpan={sk.hits.length + 1}
                          >
                            <span className="font-medium">{sk.skillName}</span>
                            {sk.exhausted && (
                              <span className="ml-1 text-yellow-500 text-[10px]" title="Exhausted">
                                ♻️
                              </span>
                            )}
                            <span className="ml-1 text-muted-foreground">
                              x{sk.count}
                            </span>
                            <div className="text-[10px] text-muted-foreground mt-0.5 leading-tight whitespace-nowrap">
                              Abr {pct(nAbr)}% · Nor {pct(nNor)}% · Crit {pct(nCrit)}% · Aff {pct(nAff)}%
                            </div>
                            <div className="text-[10px] text-muted-foreground leading-tight whitespace-nowrap">
                              P {sk.precisionRate.toFixed(1)}% · Af {sk.affinityRate.toFixed(1)}% · Cr {sk.criticalRate.toFixed(1)}%
                            </div>
                          </td>
                          <td className="py-1 pr-2 text-muted-foreground">
                            H{localHit}
                          </td>
                          <td
                            className={`py-1 pr-2 font-medium ${OUTCOME_COLORS[hit.outcome]}`}
                          >
                            {OUTCOME_LABELS[hit.outcome]}{hit.forced && <span className="text-[9px] text-muted-foreground ml-0.5">(forced)</span>}
                          </td>
                          <td
                            className={`py-1 text-right font-mono ${OUTCOME_COLORS[hit.outcome]}`}
                          >
                            {fmtr(Math.round(hit.damage))}
                          </td>
                        </tr>
                      );
                    })}
                  {sk.hits.length === 0 && (
                    <tr className="border-b border-border/30">
                      <td className="py-2 text-center text-muted-foreground italic" colSpan={4}>
                        — Cancelled —
                      </td>
                    </tr>
                  )}
                  {sk.hits.length > 0 && (
                    <tr className="border-b border-border bg-muted/20">
                      <td />
                      <td className="py-1 pr-2 text-right text-[10px] text-muted-foreground" colSpan={2}>
                        Subtotal
                      </td>
                      <td className="py-1 text-right font-mono text-[10px]">
                        {fmtr(Math.round(subTotal))}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-border font-semibold">
              <td colSpan={3} className="py-2 text-right pr-2">
                TOTAL
              </td>
              <td className="py-2 text-right font-mono">
                {fmtr(Math.round(grandTotal))}
              </td>
            </tr>
            <tr className="text-muted-foreground text-[10px]">
              <td colSpan={3} className="py-1 text-right pr-2">
                DPS ({DEFAULT_ROTATION_SECONDS}s)
              </td>
              <td className="py-1 text-right font-mono">
                {fmtr(Math.round(dps * 10) / 10)}
              </td>
            </tr>
            <tr className="text-muted-foreground text-[10px]">
              <td colSpan={4} className="py-1 text-center border-t border-border pt-1">
                Abr {pct(data.counts.abrasion)}% · Nor {pct(data.counts.normal)}% ·
                Crit {pct(data.counts.critical)}% · Aff {pct(data.counts.affinity)}%
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
