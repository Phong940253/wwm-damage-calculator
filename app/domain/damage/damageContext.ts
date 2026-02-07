import {
  InputStats,
  ElementStats,
  ElementStatKey,
  ElementStatSuffix,
} from "@/app/types";
import { ELEMENT_TYPES, ElementKey } from "@/app/constants";
import { computeDerivedStats } from "../stats/derivedStats";
import {
  getBossResistancePct,
  getPlayerDirectPrecisionPct,
  getStoredLevelContext,
  type LevelContext,
} from "../level/levelSettings";

function elementKey(
  element: ElementKey,
  suffix: ElementStatSuffix,
): ElementStatKey {
  return `${element}${suffix}` as ElementStatKey;
}

export interface DamageContext {
  get: (key: string) => number;
  /** Optional, best-effort stat backpropagation for UI/debug. */
  explain?: (key: string) => StatExplanation | null;
}

export type StatSourceKind =
  | "base"
  | "increase"
  | "gear"
  | "passive"
  | "inner-way"
  | "derived"
  | "element-other";

export interface DamageBonusBreakdown {
  /** Raw gear-only bonus (without passives/inner ways). */
  gear?: Record<string, number>;
  passives?: Record<
    string,
    { name: string; uptimePct?: number; bonus: Record<string, number> }
  >;
  innerWays?: Record<string, { name: string; bonus: Record<string, number> }>;
}

export interface StatSourceLine {
  kind: StatSourceKind;
  label: string;
  value: number;
  note?: string;
}

export interface StatExplanation {
  key: string;
  total: number;
  lines: StatSourceLine[];
  formula?: string;
}

export function buildDamageContext(
  stats: InputStats,
  elementStats: ElementStats,
  gearBonus: Record<string, number>,
  bonusBreakdown?: DamageBonusBreakdown,
  levelContext?: Partial<LevelContext>,
): DamageContext {
  /* ============================
     Helpers
  ============================ */

  // Base stat + increase + gear (all additive)
  const cur = (k: keyof InputStats): number => {
    return (
      Number(stats[k]?.current || 0) +
      Number(stats[k]?.increase || 0) +
      (gearBonus[k] || 0)
    );
  };

  // Element stat + increase + gear (all additive)
  const ele = (k: ElementStatKey): number => {
    return (
      Number(elementStats[k]?.current || 0) +
      Number(elementStats[k]?.increase || 0) +
      (gearBonus[k] || 0)
    );
  };

  /* ============================
     Derived stats (increase-aware)
  ============================ */

  // Build derived-input stats that already include increase + gear
  const derivedInput: InputStats = Object.fromEntries(
    Object.keys(stats).map((k) => [
      k,
      { current: cur(k as keyof InputStats), increase: 0 },
    ]),
  ) as InputStats;

  const derived = computeDerivedStats(derivedInput, {});

  /* ============================
     Enemy resistance / direct stats
  ============================ */

  const storedLevels = getStoredLevelContext();
  const playerLevel =
    typeof levelContext?.playerLevel === "number"
      ? levelContext.playerLevel
      : storedLevels.playerLevel;
  const enemyLevel =
    typeof levelContext?.enemyLevel === "number"
      ? levelContext.enemyLevel
      : storedLevels.enemyLevel;

  const bossResistance = getBossResistancePct(enemyLevel) / 100;
  const levelDirectPrecision = getPlayerDirectPrecisionPct(playerLevel);

  const applyBossResistanceToRate = (basePct: number) =>
    basePct * (1 - bossResistance);

  /* ============================
     Cache for OTHER elements
  ============================ */

  // Pre-calculate other elements min/max to avoid filtering on every call
  const otherElementsFilter = ELEMENT_TYPES.filter(
    (e) => e.key !== elementStats.selected,
  );

  const cachedOtherMinAttr = otherElementsFilter.reduce(
    (sum, e) => sum + ele(elementKey(e.key, "Min")),
    0,
  );

  const cachedOtherMaxAttr = otherElementsFilter.reduce((sum, e) => {
    const min = ele(elementKey(e.key, "Min"));
    const max = ele(elementKey(e.key, "Max"));

    // If user input makes Min > Max, treat Max as Min for calculations.
    return sum + Math.max(max, min);
  }, 0);

  /* ============================
     Context getter
  ============================ */

  const get = (k: string): number => {
    /* ---------- YOUR Element ---------- */

    if (k === "MINAttributeAttackOfYOURType")
      return ele(elementKey(elementStats.selected, "Min"));

    if (k === "MAXAttributeAttackOfYOURType")
      return ele(elementKey(elementStats.selected, "Max"));

    if (k === "AttributeAttackPenetrationOfYOURType")
      return ele(elementKey(elementStats.selected, "Penetration"));

    if (k === "AttributeAttackDMGBonusOfYOURType")
      return ele(elementKey(elementStats.selected, "DMGBonus"));

    if (k === "MainElementMultiplier") return ele("MainElementMultiplier");

    /* ---------- OTHER Elements (cached) ---------- */

    if (k === "MINAttributeAttackOfOtherType") {
      return cachedOtherMinAttr;
    }

    if (k === "MAXAttributeAttackOfOtherType") {
      return cachedOtherMaxAttr;
    }

    /* ---------- Derived ---------- */

    if (k === "MinPhysicalAttack")
      return cur("MinPhysicalAttack") + derived.minAtk;
    if (k === "MaxPhysicalAttack")
      return cur("MaxPhysicalAttack") + derived.maxAtk;

    // Boss resistance applies only to: PrecisionRate, CriticalRate, AffinityRate
    // - Precision: final = (base + direct) * (1 - bossResistance)
    // - Critical/Affinity: final = base * (1 - bossResistance) + direct
    if (k === "PrecisionRate") {
      const base = cur("PrecisionRate");
      const direct = cur("DirectPrecisionRate") + levelDirectPrecision;
      return applyBossResistanceToRate(base + direct);
    }

    if (k === "CriticalRate") {
      const base = cur("CriticalRate") + derived.critRate;
      const direct = cur("DirectCriticalRate");
      return applyBossResistanceToRate(base) + direct;
    }

    if (k === "AffinityRate") {
      const base = cur("AffinityRate") + derived.affinityRate;
      const direct = cur("DirectAffinityRate");
      return applyBossResistanceToRate(base) + direct;
    }

    /* ---------- Fallback ---------- */

    return cur(k as keyof InputStats);
  };

  const explain = (k: string): StatExplanation | null => {
    const total = get(k);

    const makeLine = (
      kind: StatSourceKind,
      label: string,
      value: number,
      note?: string,
    ): StatSourceLine => ({ kind, label, value, note });

    const passiveEntries = bonusBreakdown?.passives
      ? Object.entries(bonusBreakdown.passives)
      : [];

    const innerEntries = bonusBreakdown?.innerWays
      ? Object.entries(bonusBreakdown.innerWays)
      : [];

    const gearOnly = bonusBreakdown?.gear;

    const explainBonusLines = (key: string): StatSourceLine[] => {
      const lines: StatSourceLine[] = [];

      // Gear-only bonus if we have it; otherwise fall back to merged bonus.
      const gearValue = (gearOnly ? gearOnly[key] : gearBonus[key]) || 0;
      if (gearValue !== 0) {
        lines.push(makeLine("gear", "Gear", gearValue));
      }

      for (const [, p] of passiveEntries) {
        const v = p.bonus[key] || 0;
        if (v === 0) continue;
        const note =
          typeof p.uptimePct === "number" && p.uptimePct !== 100
            ? `Uptime ${p.uptimePct}%`
            : undefined;
        lines.push(makeLine("passive", `Passive: ${p.name}`, v, note));
      }

      for (const [, iw] of innerEntries) {
        const v = iw.bonus[key] || 0;
        if (v === 0) continue;
        lines.push(makeLine("inner-way", `Inner Way: ${iw.name}`, v));
      }

      return lines;
    };

    const explainInputStat = (key: keyof InputStats): StatSourceLine[] => {
      const base = Number(stats[key]?.current || 0);
      const inc = Number(stats[key]?.increase || 0);

      const lines: StatSourceLine[] = [
        makeLine("base", "Base", base),
        makeLine("increase", "Increase", inc),
        ...explainBonusLines(String(key)),
      ];

      return lines.filter((x) => x.value !== 0);
    };

    const explainRateWithBossResistance = (args: {
      key: string;
      baseKey: keyof InputStats;
      directKey: keyof InputStats;
      derivedAdd?: number;
      levelDirectAdd?: number;
      resistanceAppliesToDirect?: boolean;
    }): StatExplanation => {
      const baseLines = explainInputStat(args.baseKey);
      const directLines = explainInputStat(args.directKey);

      const derivedAdd = args.derivedAdd ?? 0;
      const levelDirectAdd = args.levelDirectAdd ?? 0;
      const resistanceAppliesToDirect = args.resistanceAppliesToDirect ?? false;

      const basePre = cur(args.baseKey) + derivedAdd;
      const directPre = cur(args.directKey) + levelDirectAdd;
      const preResist = basePre + directPre;

      const totalPost = resistanceAppliesToDirect
        ? applyBossResistanceToRate(preResist)
        : applyBossResistanceToRate(basePre) + directPre;

      const lines: StatSourceLine[] = [];
      lines.push(...baseLines);

      if (derivedAdd !== 0) {
        lines.push(makeLine("derived", "Derived", derivedAdd));
      }

      if (bossResistance !== 0) {
        // Represent resistance as a derived-style adjustment so UI legend works without new kinds.
        const delta = resistanceAppliesToDirect
          ? totalPost - preResist
          : applyBossResistanceToRate(basePre) - basePre;
        lines.push(
          makeLine(
            "derived",
            "Boss resistance",
            delta,
            `Enemy Lv ${enemyLevel} (${(bossResistance * 100).toFixed(1)}%)`,
          ),
        );
      }

      // Keep direct stat breakdown grouped
      for (const l of directLines) {
        lines.push({ ...l, label: `Direct: ${l.label}` });
      }

      if (levelDirectAdd !== 0) {
        lines.push(
          makeLine(
            "derived",
            "Direct (Player level)",
            levelDirectAdd,
            `Player Lv ${playerLevel}`,
          ),
        );
      }

      return {
        key: args.key,
        total: totalPost,
        lines: lines.filter((x) => x.value !== 0),
        formula: resistanceAppliesToDirect
          ? `(base + direct) × (1 - resistance)`
          : `base × (1 - resistance) + direct`,
      };
    };

    const explainElementStat = (key: ElementStatKey): StatSourceLine[] => {
      const base = Number(elementStats[key]?.current || 0);
      const inc = Number(elementStats[key]?.increase || 0);

      const lines: StatSourceLine[] = [
        makeLine("base", "Base", base),
        makeLine("increase", "Increase", inc),
        ...explainBonusLines(String(key)),
      ];

      return lines.filter((x) => x.value !== 0);
    };

    // YOUR element keys
    if (k === "MINAttributeAttackOfYOURType") {
      const key = elementKey(elementStats.selected, "Min");
      return { key: k, total, lines: explainElementStat(key) };
    }
    if (k === "MAXAttributeAttackOfYOURType") {
      const key = elementKey(elementStats.selected, "Max");
      return { key: k, total, lines: explainElementStat(key) };
    }
    if (k === "AttributeAttackPenetrationOfYOURType") {
      const key = elementKey(elementStats.selected, "Penetration");
      return { key: k, total, lines: explainElementStat(key) };
    }
    if (k === "AttributeAttackDMGBonusOfYOURType") {
      const key = elementKey(elementStats.selected, "DMGBonus");
      return { key: k, total, lines: explainElementStat(key) };
    }
    if (k === "MainElementMultiplier") {
      return {
        key: k,
        total,
        lines: explainElementStat("MainElementMultiplier"),
      };
    }

    if (k === "PrecisionRate") {
      return explainRateWithBossResistance({
        key: k,
        baseKey: "PrecisionRate",
        directKey: "DirectPrecisionRate",
        levelDirectAdd: levelDirectPrecision,
        resistanceAppliesToDirect: true,
      });
    }

    if (k === "CriticalRate") {
      return explainRateWithBossResistance({
        key: k,
        baseKey: "CriticalRate",
        directKey: "DirectCriticalRate",
        derivedAdd: derived.critRate,
      });
    }

    if (k === "AffinityRate") {
      return explainRateWithBossResistance({
        key: k,
        baseKey: "AffinityRate",
        directKey: "DirectAffinityRate",
        derivedAdd: derived.affinityRate,
      });
    }

    // OTHER elements (cached): report by source-kind sums for transparency.
    if (k === "MINAttributeAttackOfOtherType") {
      let baseSum = 0;
      let incSum = 0;
      let gearSum = 0;
      let passiveSum = 0;
      let innerSum = 0;
      for (const e of otherElementsFilter) {
        const ek = elementKey(e.key, "Min");
        baseSum += Number(elementStats[ek]?.current || 0);
        incSum += Number(elementStats[ek]?.increase || 0);

        gearSum +=
          (gearOnly ? gearOnly[String(ek)] : gearBonus[String(ek)]) || 0;

        for (const [, p] of passiveEntries)
          passiveSum += p.bonus[String(ek)] || 0;
        for (const [, iw] of innerEntries)
          innerSum += iw.bonus[String(ek)] || 0;
      }
      const lines: StatSourceLine[] = [
        makeLine(
          "element-other",
          "Other elements (base)",
          baseSum,
          "Sum of Min across all non-selected elements",
        ),
        makeLine("increase", "Other elements (increase)", incSum),
        makeLine("gear", "Other elements (gear)", gearSum),
        makeLine("passive", "Other elements (passives)", passiveSum),
        makeLine("inner-way", "Other elements (inner ways)", innerSum),
      ].filter((x) => x.value !== 0);
      return { key: k, total, lines };
    }

    if (k === "MAXAttributeAttackOfOtherType") {
      let baseSum = 0;
      let incSum = 0;
      let gearSum = 0;
      let passiveSum = 0;
      let innerSum = 0;

      for (const e of otherElementsFilter) {
        const minK = elementKey(e.key, "Min");
        const maxK = elementKey(e.key, "Max");

        const baseMin = Number(elementStats[minK]?.current || 0);
        const baseMax = Number(elementStats[maxK]?.current || 0);
        baseSum += Math.max(baseMax, baseMin);

        const incMin = Number(elementStats[minK]?.increase || 0);
        const incMax = Number(elementStats[maxK]?.increase || 0);
        incSum += Math.max(incMax, incMin);

        const gearMin = gearBonus[String(minK)] || 0;
        const gearMax = gearBonus[String(maxK)] || 0;

        const gearMinOnly = (gearOnly ? gearOnly[String(minK)] : gearMin) || 0;
        const gearMaxOnly = (gearOnly ? gearOnly[String(maxK)] : gearMax) || 0;
        gearSum += Math.max(gearMaxOnly, gearMinOnly);

        // For passives/inner ways, sum max-clamped too.
        let pMin = 0;
        let pMax = 0;
        for (const [, p] of passiveEntries) {
          pMin += p.bonus[String(minK)] || 0;
          pMax += p.bonus[String(maxK)] || 0;
        }
        passiveSum += Math.max(pMax, pMin);

        let iwMin = 0;
        let iwMax = 0;
        for (const [, iw] of innerEntries) {
          iwMin += iw.bonus[String(minK)] || 0;
          iwMax += iw.bonus[String(maxK)] || 0;
        }
        innerSum += Math.max(iwMax, iwMin);
      }

      const lines: StatSourceLine[] = [
        makeLine(
          "element-other",
          "Other elements (base)",
          baseSum,
          "Sum of Max (clamped by Min) across all non-selected elements",
        ),
        makeLine("increase", "Other elements (increase)", incSum),
        makeLine("gear", "Other elements (gear)", gearSum),
        makeLine("passive", "Other elements (passives)", passiveSum),
        makeLine("inner-way", "Other elements (inner ways)", innerSum),
      ].filter((x) => x.value !== 0);

      return { key: k, total, lines };
    }

    // Derived stats: show base stat + attribute-derived component.
    if (k === "MinPhysicalAttack") {
      const agility = cur("Agility");
      const power = cur("Power");
      return {
        key: k,
        total,
        formula: "Agility×1 + Power×0.246",
        lines: [
          ...explainInputStat("MinPhysicalAttack"),
          makeLine("derived", "From Agility", agility * 1),
          makeLine("derived", "From Power", power * 0.246),
        ].filter((x) => x.value !== 0),
      };
    }

    if (k === "MaxPhysicalAttack") {
      const momentum = cur("Momentum");
      const power = cur("Power");

      return {
        key: k,
        total,
        formula: "Momentum×0.9 + Power×1.315",
        lines: [
          ...explainInputStat("MaxPhysicalAttack"),
          makeLine("derived", "From Momentum", momentum * 0.9),
          makeLine("derived", "From Power", power * 1.315),
        ].filter((x) => x.value !== 0),
      };
    }

    if (k === "CriticalRate") {
      const agility = cur("Agility");
      return {
        key: k,
        total,
        formula: "Agility×0.075",
        lines: [
          ...explainInputStat("CriticalRate"),
          makeLine("derived", "From Agility", agility * 0.075),
        ].filter((x) => x.value !== 0),
      };
    }

    if (k === "AffinityRate") {
      const momentum = cur("Momentum");
      return {
        key: k,
        total,
        formula: "Momentum×0.04",
        lines: [
          ...explainInputStat("AffinityRate"),
          makeLine("derived", "From Momentum", momentum * 0.04),
        ].filter((x) => x.value !== 0),
      };
    }

    // Fallback: if the key exists in stats or elementStats, expose (base/increase/gear).
    if (k in stats) {
      return { key: k, total, lines: explainInputStat(k as keyof InputStats) };
    }
    if (k in elementStats) {
      return { key: k, total, lines: explainElementStat(k as ElementStatKey) };
    }

    return { key: k, total, lines: [] };
  };

  return { get, explain };
}
