import { ElementKey, INITIAL_STATS, INITIAL_ELEMENT_STATS } from "@/app/constants";
import { buildDamageContext } from "../damage/damageContext";
import { calculateDamage } from "../damage/damageCalculator";
import { TuneStatKey, getPlayerTuneStatRange } from "./tuneAdvisor";
import { InputStats, ElementStats, Rotation } from "@/app/types";
import { computeIncludedInStatsGearBonus } from "@/app/domain/skill/includedInStatsImpact";
import { computeRotationBonuses, sumBonuses } from "@/app/domain/skill/modifierEngine";
import { SKILLS } from "@/app/domain/skill/skills";
import {
  calculateSkillDamage,
  createRotationSkillRuntimeState,
  advanceRotationSkillRuntimeState,
  buildSkillUseCountsInRotation,
  buildRotationSkillDamageOptions,
} from "@/app/domain/skill/skillDamage";

export interface IdealGearResult {
  path: ElementKey;
  maxDamage: number;
  allocations: Record<string, number>; // number of lines
  stats: Record<string, number>; // total stat value from these lines
}

function evaluateDamage(
  gearBonus: Record<string, number>, 
  path: ElementKey, 
  rotation?: Rotation,
  baseStats?: InputStats,
  baseElementStats?: ElementStats
): { dmg: number, totalRate: number, critRate: number } {
  const elementStats = baseElementStats || { ...INITIAL_ELEMENT_STATS, selected: path };
  const stats = baseStats || INITIAL_STATS;

  const includedAbs = computeIncludedInStatsGearBonus(stats, elementStats, rotation, gearBonus);
  const effectiveGearBonus = sumBonuses(gearBonus, includedAbs);
  const rotationBonuses = computeRotationBonuses(stats, elementStats, effectiveGearBonus, rotation);
  const finalBonus = sumBonuses(effectiveGearBonus, rotationBonuses);

  const ctx = buildDamageContext(stats, elementStats, finalBonus, undefined, { playerLevel: 91, enemyLevel: 91 });
  const totalRate = ctx.get("FinalCriticalRate") + ctx.get("FinalAffinityRate");
  const critRate = ctx.get("FinalCriticalRate");

  if (rotation && rotation.skills.length > 0) {
    const skillUseCountsInRotation = buildSkillUseCountsInRotation(rotation.skills);
    let totalNormal = 0;
    const runtimeState = createRotationSkillRuntimeState();

    for (const rotSkill of rotation.skills) {
      const skill = SKILLS.find((s) => s.id === rotSkill.id);
      if (!skill) continue;

      const entryOpts = buildRotationSkillDamageOptions(
        rotSkill.id,
        rotSkill.params,
        rotation.activeInnerWays,
        skillUseCountsInRotation,
        rotSkill.count,
        rotation.activePassiveSkills,
        runtimeState.priorHitsBySkill,
      );

      const skillDmg = calculateSkillDamage(ctx, skill, entryOpts);
      if (!rotSkill.cancelled) {
        totalNormal += skillDmg.total.normal.value * rotSkill.count;
      }

      advanceRotationSkillRuntimeState(runtimeState, skill, entryOpts, rotSkill.count);
    }
    return { dmg: totalNormal, totalRate, critRate };
  }

  return { dmg: calculateDamage(ctx).normal, totalRate, critRate };
}

function getValPerLine(stat: string): number {
  return getPlayerTuneStatRange(stat as TuneStatKey, 91).maxPerLine;
}

export function calculateIdealGearStats(
  path: ElementKey, 
  rotation?: Rotation,
  baseStats?: InputStats,
  baseElementStats?: ElementStats
): IdealGearResult {
  const TOTAL_LINES = 40; // 48 total - 4 phys pen - 4 empty = 40 lines to work with
  const RESERVED_LINES = 2; // 1 weapon dmg bonus + 1 pendant martial art dmg bonus
  const THRESHOLD_LINES = 6; // 6 lines * 40.4 = 242.4 (Reaches the 225 threshold)
  const REMAINING_LINES = TOTAL_LINES - RESERVED_LINES - THRESHOLD_LINES; // 32 lines for greedy tuning

  // Base setup
  const gearBonus: Record<string, number> = {};

  // Reserved Additions:
  // 4 Additions for DMG Boost (Head, Chest, Hand, Leg) gives 5.4% each
  gearBonus["DamageBoost"] = 4 * 5.4;

  // 1 Reserved Tune Line for Pendant gives 5.9%
  gearBonus["AllMartialArtsBoost"] = 1 * 5.9;

  // Weapon & Path Bonus depending on path
  if (path === "bellstrike") {
    gearBonus["ArtOfSwordDMGBoost"] = 1 * 5.9;
    gearBonus["NamelessSwordChargedSkillDMGBoost"] = 4 * 4.5;
  } else {
    gearBonus["DamageBoost"] = (gearBonus["DamageBoost"] || 0) + 1 * 5.9;
    gearBonus[`${path}DMGBonus`] = 4 * 4.5;
  }

  // 4 Fixed lines for Physical Penetration
  gearBonus["PhysicalPenetration"] = 4 * 9.0;

  // Base gear main stats (from Weapons, Disc, Pendant)
  gearBonus["MinPhysicalAttack"] = 71 + 53 + 53; // 177
  gearBonus["MaxPhysicalAttack"] = 106 + 124 + 124; // 354

  let candidates: string[] = [];
  if (path === "bellstrike") {
    candidates = [
      "MaxPhysicalAttack",
      "bellstrikeMax",
      "bellstrikePenetration",
      "CriticalRate",
      "AffinityRate",
      "Momentum",
      "Power"
    ];
  } else {
    candidates = [
      "MinPhysicalAttack",
      `${path}Min`,
      `${path}Penetration`,
      "CriticalRate",
      "AffinityRate",
      "Agility",
      "Power"
    ];
  }

  const allocations: Record<string, number> = {};
  for (const c of candidates) allocations[c] = 0;

  // Pre-allocate Phys Pen (4 lines) - Not part of the 40 lines budget, but added to allocations for UI
  allocations["PhysicalPenetration"] = 4;
  
  // Pre-allocate to hit the 225 threshold
  if (path === "bellstrike") {
    allocations["Momentum"] = THRESHOLD_LINES;
  } else {
    allocations["Agility"] = THRESHOLD_LINES;
  }

  // Greedy Algorithm
  for (let i = 0; i < REMAINING_LINES; i++) {
    let bestCandidate = "";
    let bestDmg = -1;

    for (const c of candidates) {
      if (c === "PhysicalPenetration" && allocations[c] >= 4) continue;
      if (c === "Momentum" && allocations[c] >= THRESHOLD_LINES) continue;
      if (c === "Agility" && allocations[c] >= THRESHOLD_LINES) continue;
      if ((c === "MaxPhysicalAttack" || c === "MinPhysicalAttack") && allocations[c] >= 12) continue;
      if (c === "Power" && allocations[c] >= 8) continue;
      if (allocations[c] >= 16) continue;

      const testBonus = { ...gearBonus };
      for (const cand of candidates) {
        const lines = allocations[cand] + (cand === c ? 1 : 0);
        if (lines > 0) {
          testBonus[cand] = (testBonus[cand] || 0) + lines * getValPerLine(cand);
        }
      }

      const evalResult = evaluateDamage(testBonus, path, rotation);
      
      // Soft constraint: Heavily weight total rate progress until 90% is reached
      const rateProgress = Math.min(90, evalResult.totalRate);
      
      // Penalty: If we exceed ~92%, heavily penalize it so it stops picking rate stats
      let penalty = 0;
      if (evalResult.totalRate > 92) {
        penalty += (evalResult.totalRate - 92) * 10000000;
      }
      
      // Penalty: Final Critical Rate should stay around 35% (cap it softly at ~37%)
      if (evalResult.critRate > 37) {
        penalty += (evalResult.critRate - 37) * 10000000;
      }
      
      const score = evalResult.dmg + (rateProgress * 1000000) - penalty;

      if (score > bestDmg) {
        bestDmg = score;
        bestCandidate = c;
      }
    }

    if (bestCandidate) {
      allocations[bestCandidate]++;
    } else {
      break; // Should not happen unless all candidates hit max limit
    }
  }

  // Calculate final max damage with chosen allocations
  const finalBonus = { ...gearBonus };
  const finalStats: Record<string, number> = {};
  for (const cand of candidates) {
    const val = allocations[cand] * getValPerLine(cand);
    if (allocations[cand] > 0) {
      finalBonus[cand] = (finalBonus[cand] || 0) + val;
    }
    finalStats[cand] = val;
  }

  const finalEval = evaluateDamage(finalBonus, path, rotation, baseStats, baseElementStats);
  const maxDamage = finalEval.dmg;

  const finalAllocations = { ...allocations };
  const finalStatsResult = { ...finalStats };

  // Explicitly add the reserved fixed lines so they show up in the UI
  if (path === "bellstrike") {
    finalAllocations["ArtOfSwordDMGBoost"] = 1;
    finalStatsResult["ArtOfSwordDMGBoost"] = 1 * 5.9;

    finalAllocations["NamelessSwordChargedSkillDMGBoost"] = 4;
    finalStatsResult["NamelessSwordChargedSkillDMGBoost"] = 4 * 4.5;
  } else {
    finalAllocations["WeaponDMGBoost"] = 1;
    finalStatsResult["WeaponDMGBoost"] = 1 * 5.9;

    finalAllocations["PathBonus"] = 4;
    finalStatsResult["PathBonus"] = 4 * 4.5;
  }

  finalAllocations["AllMartialArtsBoost"] = 1;
  finalStatsResult["AllMartialArtsBoost"] = 1 * 5.9;

  finalAllocations["PhysicalPenetration"] = 4;
  finalStatsResult["PhysicalPenetration"] = 4 * 9.0;

  // Add the base DMG boost (4 pieces)
  finalStatsResult["DamageBoost"] = (finalStatsResult["DamageBoost"] || 0) + 4 * 5.4;

  // Add the base main stats (Weapons, Disc, Pendant)
  finalStatsResult["MinPhysicalAttack"] = (finalStatsResult["MinPhysicalAttack"] || 0) + 177;
  finalStatsResult["MaxPhysicalAttack"] = (finalStatsResult["MaxPhysicalAttack"] || 0) + 354;

  return {
    path,
    maxDamage,
    allocations: finalAllocations,
    stats: finalStatsResult,
  };
}
