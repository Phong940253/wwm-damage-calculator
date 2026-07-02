import { clamp01 } from "@/app/utils/clamp";

type DamageCache = Record<string, number>;

/* =========================
   Formula Pipeline types
   ========================= */

export type BinOpType = "+" | "×" | "−" | "/" | "=";

export type ExprNode =
  | { t: "num"; v: number }
  | { t: "stat"; key: string; value: number }
  | { t: "comp"; label: string; value: number; explain: string }
  | { t: "name"; label: string }
  | { t: "binop"; op: BinOpType; left: ExprNode; right: ExprNode }
  | { t: "call"; name: string; args: ExprNode[] }
  | { t: "text"; text: string }
  | { t: "clamp01"; arg: ExprNode };

export const num = (v: number): ExprNode => ({ t: "num", v });
export const stat = (key: string, value: number): ExprNode => ({ t: "stat", key, value });
export const comp = (label: string, value: number, explain: string): ExprNode => ({ t: "comp", label, value, explain });
export const name = (label: string): ExprNode => ({ t: "name", label });
export const binop = (op: BinOpType, left: ExprNode, right: ExprNode): ExprNode => ({ t: "binop", op, left, right });
export const call = (fn: string, ...args: ExprNode[]): ExprNode => ({ t: "call", name: fn, args });
export const text = (s: string): ExprNode => ({ t: "text", text: s });
export const clamp01_ = (arg: ExprNode): ExprNode => ({ t: "clamp01", arg });

export const add = (l: ExprNode, r: ExprNode) => binop("+", l, r);
export const mul = (l: ExprNode, r: ExprNode) => binop("×", l, r);
export const sub = (l: ExprNode, r: ExprNode) => binop("−", l, r);
export const div = (l: ExprNode, r: ExprNode) => binop("/", l, r);

export interface StepDef {
  label: string;
  result: number;
  expr: ExprNode;
}

export interface FormulaGroup {
  id: string;
  title: string;
  steps: StepDef[];
  showFlatDamage?: boolean;
}

export function buildDamageCache(g: (k: string) => number): DamageCache {
  const $ = (k: string) => { const v = g(k); return Number.isFinite(v) ? v : 0; };
  return {
    minPhysAtk: $("MinPhysicalAttack"),
    maxPhysAtk: $("MaxPhysicalAttack"),
    physPen: $("PhysicalPenetration"),
    physMul: $("PhysicalAttackMultiplier"),
    minOtherAttr: $("MINAttributeAttackOfOtherType"),
    maxOtherAttr: $("MAXAttributeAttackOfOtherType"),
    flatDmg: $("FlatDamage"),
    minYourAttr: $("MINAttributeAttackOfYOURType"),
    maxYourAttr: $("MAXAttributeAttackOfYOURType"),
    eleMul: $("MainElementMultiplier"),
    elePen: $("AttributeAttackPenetrationOfYOURType"),
    attrDmgBonus: $("AttributeAttackDMGBonusOfYOURType"),
    physDmgBonus: $("PhysicalDMGBonus"),
    dmgBoost: $("DamageBoost"),
    bossDmgBoost: $("CombatBoostAgainstBossUnits"),
    familyDmgBonus: $("FamilyDMGBoost"),
    critDmgBonus: $("CriticalDMGBonus"),
    affinityDmgBonus: $("AffinityDMGBonus"),
    bossDef: $("BossDef"),
    skillPhysMult: $("SkillPhysicalMultiplier") || 1,
    skillElemMult: $("SkillElementMultiplier") || 1,
  };
};

/* =========================
   Core calculation helpers
========================= */

const calcPhysComp = (
  physAtk: number,
  otherAttr: number,
  skillPhysMult: number,
  mul: number,
  pen: number,
  dmgBonus: number,
  flat: number,
): number => {
  return (physAtk + otherAttr) * skillPhysMult * (mul / 100) * (1 + pen / 173) * (1 + dmgBonus / 100) + flat;
};

const calcEleComp = (
  attr: number,
  skillElemMult: number,
  mul: number,
  pen: number,
  dmgBonus: number,
): number => {
  return attr * skillElemMult * (mul / 100) * (1 + pen / 173) * (1 + dmgBonus / 100);
};

export function calcBaseDamage(
  physAtk: number,
  otherAttr: number,
  yourAttr: number,
  cache: DamageCache,
): number {
  const physComp = calcPhysComp(physAtk, otherAttr, cache.skillPhysMult, cache.physMul, cache.physPen, cache.physDmgBonus, cache.flatDmg);
  const eleComp = calcEleComp(yourAttr, cache.skillElemMult, cache.eleMul, cache.elePen, cache.attrDmgBonus);
  const basePhys = Math.max(0, physComp - cache.bossDef);
  return basePhys + eleComp;
};

/* =========================
   Formula Pipeline (generic step builder)
   ========================= */

/** Build the formula pipeline from a DamageCache.  This is the single source
 *  of truth for all formula display in the skill damage breakdown dialog. */
export function buildFormulaPipeline(cache: DamageCache): FormulaGroup[] {
  const avgPhysAtk = (cache.minPhysAtk + cache.maxPhysAtk) / 2;
  const avgOtherAttr =
    cache.minOtherAttr >= cache.maxOtherAttr
      ? cache.minOtherAttr
      : (cache.minOtherAttr + cache.maxOtherAttr) / 2;
  const avgYourAttr = (cache.minYourAttr + cache.maxYourAttr) / 2;

  const physAtkMult = cache.physMul / 100;
  const elemMult = cache.eleMul / 100;
  const physPenFactor = 1 + cache.physPen / 173;
  const physBonusFactor = 1 + cache.physDmgBonus / 100;
  const elePenFactor = 1 + cache.elePen / 173;
  const eleDmgBonusFactor = 1 + cache.attrDmgBonus / 100;
  const dmgTotal = cache.dmgBoost + cache.bossDmgBoost;
  const dmgMult = 1 + dmgTotal / 100;
  const familyMult = 1 + cache.familyDmgBonus / 100;
  const maxOtherAttr = Math.max(cache.minOtherAttr, cache.maxOtherAttr);
  const affinityBonus = 1 + cache.affinityDmgBonus / 100;
  const criticalBonus = 1 + cache.critDmgBonus / 100;

  const calcPhys = (physAtk: number, other: number, flat: number) =>
    (physAtk + other) * cache.skillPhysMult * physAtkMult * physPenFactor * physBonusFactor + flat;
  const calcEle = (attr: number) =>
    attr * cache.skillElemMult * elemMult * elePenFactor * eleDmgBonusFactor;
  const calcBase = (phys: number, ele: number) => Math.max(0, phys - cache.bossDef) + ele;

  const avgPhysComp = calcPhys(avgPhysAtk, avgOtherAttr, cache.flatDmg);
  const maxPhysComp = calcPhys(cache.maxPhysAtk, maxOtherAttr, cache.flatDmg);
  const avgEleComp = calcEle(avgYourAttr);
  const maxEleComp = calcEle(cache.maxYourAttr);
  const avgBasePhys = Math.max(0, avgPhysComp - cache.bossDef);
  const avgBase = avgBasePhys + avgEleComp;
  const avgBaseHit = avgBase * familyMult * dmgMult;
  const minAvgPhysComp = calcPhys(cache.minPhysAtk, cache.minOtherAttr, cache.flatDmg);
  const minAvgBase = calcBase(minAvgPhysComp, calcEle(cache.minYourAttr));
  const minDamage = minAvgBase * familyMult * dmgMult;

  const physExprBody = (physAtk: ExprNode, other: ExprNode): ExprNode =>
    mul(
      mul(
        mul(
          mul(
            add(physAtk, other),
            comp("skillPhysMult", cache.skillPhysMult, "skill physicalMultiplier"),
          ),
          comp("physAtkMult", physAtkMult, "PhysicalAttackMultiplier / 100"),
        ),
        comp("physPenFactor", physPenFactor, "1 + PhysPen/173"),
      ),
      comp("physBonusFactor", physBonusFactor, "1 + PhysDmgBonus/100"),
    );

  const eleExprBody = (attr: ExprNode): ExprNode =>
    mul(
      mul(
        mul(
          mul(attr, comp("skillElemMult", cache.skillElemMult, "skill elementMultiplier")),
          comp("elemMult", elemMult, "MainElementMultiplier / 100"),
        ),
        comp("elePenFactor", elePenFactor, "1 + ElePen/173"),
      ),
      comp("eleDmgBonusFactor", eleDmgBonusFactor, "1 + AttrDmgBonus/100"),
    );

  return [
    {
      id: "physComp",
      title: "Physical Component",
      steps: [
        {
          label: "PhysComp (avg)",
          result: avgPhysComp,
          expr: add(physExprBody(num(avgPhysAtk), num(avgOtherAttr)), stat("FlatDamage", cache.flatDmg)),
        },
        {
          label: "PhysComp (max)",
          result: maxPhysComp,
          expr: add(
            physExprBody(
              stat("MaxPhysicalAttack", cache.maxPhysAtk),
              call("max", num(cache.minOtherAttr), num(cache.maxOtherAttr)),
            ),
            stat("FlatDamage", cache.flatDmg),
          ),
        },
        {
          label: "OtherAttr (max)",
          result: maxOtherAttr,
          expr: call("max", num(cache.minOtherAttr), num(cache.maxOtherAttr)),
        },
      ],
    },
    {
      id: "eleComp",
      title: "Element Component",
      steps: [
        {
          label: "EleComp (avg)",
          result: avgEleComp,
          expr: eleExprBody(num(avgYourAttr)),
        },
        {
          label: "EleComp (max)",
          result: maxEleComp,
          expr: eleExprBody(stat("MAXAttributeAttackOfYOURType", cache.maxYourAttr)),
        },
      ],
    },
    {
      id: "baseDamage",
      title: "Base Damage",
      steps: [
        {
          label: "basePhys (avg)",
          result: avgBasePhys,
          expr: call("max", num(0), sub(num(avgPhysComp), stat("BossDef", cache.bossDef))),
        },
        {
          label: "base (avg)",
          result: avgBase,
          expr: add(num(avgBasePhys), num(avgEleComp)),
        },
      ],
    },
    {
      id: "multipliers",
      title: "Multipliers",
      steps: [
        {
          label: "dmgBoost total",
          result: dmgTotal,
          expr: add(
            stat("DamageBoost", cache.dmgBoost),
            stat("CombatBoostAgainstBossUnits", cache.bossDmgBoost),
          ),
        },
        {
          label: "familyMult",
          result: familyMult,
          expr: add(num(1), div(stat("FamilyDMGBoost", cache.familyDmgBonus), num(100))),
        },
        {
          label: "dmgMult",
          result: dmgMult,
          expr: add(num(1), div(num(dmgTotal), num(100))),
        },
        {
          label: "affinityBonus",
          result: affinityBonus,
          expr: add(num(1), div(stat("AffinityDMGBonus", cache.affinityDmgBonus), num(100))),
        },
        {
          label: "criticalBonus",
          result: criticalBonus,
          expr: add(num(1), div(stat("CriticalDMGBonus", cache.critDmgBonus), num(100))),
        },
      ],
    },
    {
      id: "baseHit",
      title: "Base Hit",
      steps: [
        {
          label: "baseHit (avg)",
          result: avgBaseHit,
          expr: mul(mul(num(avgBase), num(familyMult)), num(dmgMult)),
        },
      ],
    },
    {
      id: "hitTypes",
      title: "Hit Types",
      steps: [
        {
          label: "minDamage",
          result: minDamage,
          expr: mul(
            mul(
              add(
                call("max", num(0), sub(num(minAvgPhysComp), stat("BossDef", cache.bossDef))),
                num(calcEle(cache.minYourAttr)),
              ),
              num(familyMult),
            ),
            num(dmgMult),
          ),
        },
        {
          label: "criticalDamage",
          result: calcBase(maxPhysComp, maxEleComp) * familyMult * dmgMult * criticalBonus,
          expr: mul(
            mul(
              mul(
                add(
                  call("max", num(0), sub(num(maxPhysComp), stat("BossDef", cache.bossDef))),
                  num(maxEleComp),
                ),
                num(familyMult),
              ),
              num(dmgMult),
            ),
            num(criticalBonus),
          ),
        },
        {
          label: "affinityDamage",
          result: calcBase(maxPhysComp, maxEleComp) * familyMult * dmgMult * affinityBonus,
          expr: mul(
            mul(
              mul(
                add(
                  call("max", num(0), sub(num(maxPhysComp), stat("BossDef", cache.bossDef))),
                  num(maxEleComp),
                ),
                num(familyMult),
              ),
              num(dmgMult),
            ),
            num(affinityBonus),
          ),
        },
      ],
    },
  ];
}

/* =========================
   Minimum Damage
========================= */

export const calcMinimumDamage = (g: (k: string) => number) => {
  const cache = buildDamageCache(g);
  const base = calcBaseDamage(cache.minPhysAtk, cache.minOtherAttr, cache.minYourAttr, cache);

  const dmgBonusTotal = cache.dmgBoost + cache.bossDmgBoost;
  const familyMult = 1 + cache.familyDmgBonus / 100;
  const dmgMult = 1 + dmgBonusTotal / 100;

  return base * familyMult * dmgMult;
};

/* =========================
   Critical Damage
========================= */

export const calcCriticalDamage = (g: (k: string) => number) => {
  const cache = buildDamageCache(g);
  const otherMax = Math.max(cache.minOtherAttr, cache.maxOtherAttr);
  const base = calcBaseDamage(cache.maxPhysAtk, otherMax, cache.maxYourAttr, cache);

  const dmgBonusTotal = cache.dmgBoost + cache.bossDmgBoost;
  const familyMult = 1 + cache.familyDmgBonus / 100;
  const dmgMult = 1 + dmgBonusTotal / 100;

  return base * familyMult * dmgMult * (1 + cache.critDmgBonus / 100);
};

/* =========================
   Affinity Damage
========================= */

export const calcAffinityDamage = (g: (k: string) => number) => {
  const cache = buildDamageCache(g);
  const otherMax = Math.max(cache.minOtherAttr, cache.maxOtherAttr);
  const base = calcBaseDamage(cache.maxPhysAtk, otherMax, cache.maxYourAttr, cache);

  const dmgBonusTotal = cache.dmgBoost + cache.bossDmgBoost;
  const familyMult = 1 + cache.familyDmgBonus / 100;
  const dmgMult = 1 + dmgBonusTotal / 100;

  return base * familyMult * dmgMult * (1 + cache.affinityDmgBonus / 100);
};

/* =========================
   Normal Base Hit Damage
========================= */

export const calcNormalBaseDamage = (g: (k: string) => number): number => {
  const cache = buildDamageCache(g);

  const avgPhysAtk = (cache.minPhysAtk + cache.maxPhysAtk) / 2;
  const avgOtherAttr =
    cache.minOtherAttr >= cache.maxOtherAttr
      ? cache.minOtherAttr
      : (cache.minOtherAttr + cache.maxOtherAttr) / 2;
  const avgYourAttr = (cache.minYourAttr + cache.maxYourAttr) / 2;
  const base = calcBaseDamage(avgPhysAtk, avgOtherAttr, avgYourAttr, cache);

  const dmgBonusTotal = cache.dmgBoost + cache.bossDmgBoost;
  const familyMult = 1 + cache.familyDmgBonus / 100;
  const dmgMult = 1 + dmgBonusTotal / 100;

  return base * familyMult * dmgMult;
};

/* =========================
   Expected Average Damage
========================= */

export const calcExpectedNormal = (
  g: (k: string) => number,
  affinityDamage: number,
) => {
  const cache = buildDamageCache(g);

  const avgPhysAtk = (cache.minPhysAtk + cache.maxPhysAtk) / 2;
  const avgOtherAttr =
    cache.minOtherAttr >= cache.maxOtherAttr
      ? cache.minOtherAttr
      : (cache.minOtherAttr + cache.maxOtherAttr) / 2;
  const avgYourAttr = (cache.minYourAttr + cache.maxYourAttr) / 2;
  const base = calcBaseDamage(avgPhysAtk, avgOtherAttr, avgYourAttr, cache);

  const dmgBonusTotal = cache.dmgBoost + cache.bossDmgBoost;
  const familyMult = 1 + cache.familyDmgBonus / 100;
  const dmgMult = 1 + dmgBonusTotal / 100;

  const baseHit = base * familyMult * dmgMult;
  const minDamage = calcMinimumDamage(g);
  const maxDamage = affinityDamage;

  const P = clamp01(g("PrecisionRate") / 100);
  const A = clamp01(g("FinalAffinityRate") / 100);
  const C = clamp01(g("FinalCriticalRate") / 100);
  const CD = cache.critDmgBonus / 100;

  const scale = A + C > 1 ? 1 / (A + C) : 1;
  const As = A * scale;
  const Cs = C * scale;

  const critHit = baseHit * (1 + CD);

  const noPrecision = As * maxDamage + (1 - As) * minDamage;
  const precision =
    As * maxDamage + Cs * critHit + (1 - As - Cs) * baseHit;

  return (1 - P) * noPrecision + P * precision;
};

/* =========================
   Breakdown (UI debug)
========================= */

export const calcExpectedNormalBreakdown = (
  g: (k: string) => number,
  affinityDamage: number,
) => {
  const cache = buildDamageCache(g);

  const avgPhysAtk = (cache.minPhysAtk + cache.maxPhysAtk) / 2;
  const avgOtherAttr =
    cache.minOtherAttr >= cache.maxOtherAttr
      ? cache.minOtherAttr
      : (cache.minOtherAttr + cache.maxOtherAttr) / 2;
  const avgYourAttr = (cache.minYourAttr + cache.maxYourAttr) / 2;
  const base = calcBaseDamage(avgPhysAtk, avgOtherAttr, avgYourAttr, cache);

  const dmgBonusTotal = cache.dmgBoost + cache.bossDmgBoost;
  const familyMult = 1 + cache.familyDmgBonus / 100;
  const dmgMult = 1 + dmgBonusTotal / 100;

  const baseHit = base * familyMult * dmgMult;
  const minDamage = calcMinimumDamage(g);
  const maxDamage = affinityDamage;

  const P = clamp01(g("PrecisionRate") / 100);
  const A = clamp01(g("FinalAffinityRate") / 100);
  const C = clamp01(g("FinalCriticalRate") / 100);
  const CD = cache.critDmgBonus / 100;

  const scale = A + C > 1 ? 1 / (A + C) : 1;
  const As = A * scale;
  const Cs = C * scale;

  const critHit = baseHit * (1 + CD);

  const abrasionDmg = (1 - P) * (1 - As) * minDamage;
  const affinityDmg = ((1 - P) * As + P * As) * maxDamage;
  const criticalDmg = P * Cs * critHit;
  const normalDmg = P * (1 - As - Cs) * baseHit;

  return {
    abrasion: abrasionDmg,
    affinity: affinityDmg,
    critical: criticalDmg,
    normal: normalDmg,
  };
};

/* =========================
   Explain / debug steps
========================= */

export interface CalcExpectedNormalSteps {
  cache: DamageCache;
  dmgBonusTotal: number;
  familyMult: number;
  dmgMult: number;
  avgPhysAtk: number;
  avgOtherAttr: number;
  avgYourAttr: number;
  physComp: number;
  eleComp: number;
  basePhys: number;
  base: number;
  baseHit: number;
  minDamage: number;
  maxDamage: number;
  P_raw: number;
  A_raw: number;
  C_raw: number;
  P: number;
  A: number;
  C: number;
  CD: number;
  scale: number;
  As: number;
  Cs: number;
  noPrecision: number;
  precision: number;
  expected: number;
}

export const explainCalcExpectedNormal = (
  g: (k: string) => number,
  affinityDamage: number,
): CalcExpectedNormalSteps => {
  const cache = buildDamageCache(g);

  const avgPhysAtk = (cache.minPhysAtk + cache.maxPhysAtk) / 2;
  const avgOtherAttr =
    cache.minOtherAttr >= cache.maxOtherAttr
      ? cache.minOtherAttr
      : (cache.minOtherAttr + cache.maxOtherAttr) / 2;
  const avgYourAttr = (cache.minYourAttr + cache.maxYourAttr) / 2;

  const physComp = calcPhysComp(avgPhysAtk, avgOtherAttr, cache.skillPhysMult, cache.physMul, cache.physPen, cache.physDmgBonus, cache.flatDmg);
  const eleComp = calcEleComp(avgYourAttr, cache.skillElemMult, cache.eleMul, cache.elePen, cache.attrDmgBonus);
  const basePhys = Math.max(0, physComp - cache.bossDef);
  const base = basePhys + eleComp;

  const dmgBonusTotal = cache.dmgBoost + cache.bossDmgBoost;
  const familyMult = 1 + cache.familyDmgBonus / 100;
  const dmgMult = 1 + dmgBonusTotal / 100;

  const baseHit = base * familyMult * dmgMult;
  const minDamage = calcMinimumDamage(g);
  const maxDamage = affinityDamage;

  const P_raw = g("PrecisionRate") / 100;
  const A_raw = g("FinalAffinityRate") / 100;
  const C_raw = g("FinalCriticalRate") / 100;
  const P = clamp01(P_raw);
  const A = clamp01(A_raw);
  const C = clamp01(C_raw);
  const CD = cache.critDmgBonus / 100;

  const scale = A + C > 1 ? 1 / (A + C) : 1;
  const As = A * scale;
  const Cs = C * scale;

  const critHit = baseHit * (1 + CD);

  const noPrecision = As * maxDamage + (1 - As) * minDamage;
  const precision =
    As * maxDamage + Cs * critHit + (1 - As - Cs) * baseHit;

  const expected = (1 - P) * noPrecision + P * precision;

  return {
    cache,
    dmgBonusTotal,
    familyMult,
    dmgMult,
    avgPhysAtk,
    avgOtherAttr,
    avgYourAttr,
    physComp,
    eleComp,
    basePhys,
    base,
    baseHit,
    minDamage,
    maxDamage,
    P_raw,
    A_raw,
    C_raw,
    P,
    A,
    C,
    CD,
    scale,
    As,
    Cs,
    noPrecision,
    precision,
    expected,
  };
};
