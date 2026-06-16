// app/ui/FormulaPanel.tsx
"use client";

import React, { useMemo } from "react";
import { Separator } from "@/components/ui/separator";
import { MathFormula, FormulaLegend } from "../../formula";
import { BlockMath } from "react-katex";
import { DamageContext } from "@/app/domain/damage/damageContext";
import { DamageResult } from "@/app/domain/damage/type";
import { explainCalcExpectedNormal } from "@/app/domain/damage/damageFormula";

function fmt(n: number) {
  if (!Number.isFinite(n)) return "NaN";
  const rounded = Math.round(n * 1e6) / 1e6;
  return String(rounded);
}

export default function FormulaPanel({
  ctx,
  result,
}: {
  ctx?: DamageContext;
  result?: DamageResult;
}) {
  const steps = useMemo(() => {
    if (!ctx || !result) return null;
    return explainCalcExpectedNormal(ctx.get, result.affinity.value);
  }, [ctx, result]);

  const baseParts = useMemo(() => {
    if (!steps) return null;
    const c = steps.cache;
    const physPenMod = 1 + c.physPen / 173;
    const physBonus = 1 + c.physDmgBonus / 100;
    const elemMod = (1 + c.elePen / 173) * (1 + c.attrDmgBonus / 100);
    const physMulPct = c.physMul / 100;
    const eleMulPct = c.eleMul / 100;

    const physPartInner =
      steps.avgPhysAtk * c.skillPhysMult * physPenMod * physBonus * physMulPct +
      steps.avgOtherAttr * c.skillPhysMult * physPenMod * physBonus * physMulPct;
    const elePart =
      steps.avgYourAttr * c.skillElemMult * eleMulPct * elemMod;
    const innerSum = physPartInner + c.flatDmg + elePart;
    const baseRecomputed = Math.max(0, innerSum - c.bossDef);

    return {
      physPenMod,
      physBonus,
      elemMod,
      physMulPct,
      eleMulPct,
      physPartInner,
      elePart,
      innerSum,
      baseRecomputed,
    };
  }, [steps]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-top-1">
      <MathFormula
        title="Minimum Damage"
        formula={`
\\text{DMG}_{min} =
\\operatorname{ROUND}\\Bigg(
\\Big[
M_{min}
\\cdot (1 + \\frac{P_{pen}}{173})
\\cdot (1 + B_{phys})
+ A_{other}^{min}
\\Big]
\\cdot M_{atk}
+ D_{flat}
+ A_{your}^{min}
\\cdot M_{elem}
\\cdot
\\Big(1 + \\frac{P_{elem}}{173}\\Big)
\\cdot (1 + B_{elem})
\\Bigg)
`}
      />

      <MathFormula
        title="Expected (Average) Damage"
        formula={`
\\text{DMG}_{avg} =
B
+ P_{prec} \\cdot P_{crit} \\cdot B \\cdot B_{crit}
+ P_{prec} \\cdot P_{aff} \\cdot (DMG_{aff} - B)
`}
      />

      <MathFormula
        title="Base Damage (B)"
        formula={`
    B=
    \\Big[
    M_{avg}
    \\cdot (1 + \\frac{P_{pen}}{173})
    \\cdot (1 + B_{phys})
    + A_{other}^{avg}
    \\Big]
    \\cdot M_{atk}
    + D_{flat}
    + A_{your}^{avg}
    \\cdot M_{elem}
    \\cdot
    \\Big(1 + \\frac{P_{elem}}{173}\\Big)
    \\cdot (1 + B_{elem})
    `}
      />

      <MathFormula
        title="Affinity Damage"
        formula={`
DMG_{aff} =
\\Big[
M_{max}
\\cdot (1 + \\frac{P_{pen}}{173})
\\cdot (1 + B_{phys})
+ \\max(A_{other})
\\Big]
\\cdot M_{atk}
+ D_{flat}
+ A_{your}^{max}
\\cdot M_{elem}
\\cdot
\\Big(1 + \\frac{P_{elem}}{173}\\Big)
\\cdot (1 + B_{elem})
\\Big]
\\cdot (1 + B_{aff})
`}
      />

      <Separator className="bg-gradient-to-r from-transparent via-border to-transparent" />

      {steps && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">
            Expected Normal (Step-by-step · current stats)
          </p>

          <div
            className="
              rounded-xl p-4
              bg-muted/70
              border border-border
              overflow-x-auto
              space-y-3
            "
          >
            <BlockMath
              math={`\\textbf{Inputs}\\;\\; minPhysAtk=${fmt(
                steps.cache.minPhysAtk
              )},\\; maxPhysAtk=${fmt(steps.cache.maxPhysAtk)},\\; minOther=${fmt(
                steps.cache.minOtherAttr
              )},\\; maxOther=${fmt(
                steps.cache.maxOtherAttr
              )},\\; minYour=${fmt(steps.cache.minYourAttr)},\\; maxYour=${fmt(
                steps.cache.maxYourAttr
              )}`}
            />

            <BlockMath
              math={`\\textbf{Modifiers}\\;\\; dmgBoost=1+\\frac{${fmt(
                steps.cache.dmgBoost
              )}}{100}=${fmt(steps.dmgMult)},\\; physPen=1+\\frac{${fmt(
                steps.cache.physPen
              )}}{173}=${fmt(baseParts?.physPenMod ?? 0)},\\; physDmgBonus=1+\\frac{${fmt(
                steps.cache.physDmgBonus
              )}}{100}=${fmt(baseParts?.physBonus ?? 0)},\\; elePen=1+\\frac{${fmt(
                steps.cache.elePen
              )}}{173}=\\cdots`}
            />

            <BlockMath
              math={`avgPhysAtk=\\frac{minPhysAtk+maxPhysAtk}{2}=\\frac{${fmt(
                steps.cache.minPhysAtk
              )}+${fmt(steps.cache.maxPhysAtk)}}{2}=${fmt(steps.avgPhysAtk)}`}
            />

            <BlockMath
              math={`avgOtherAttr=\\frac{minOther+maxOther}{2}=\\frac{${fmt(
                steps.cache.minOtherAttr
              )}+${fmt(steps.cache.maxOtherAttr)}}{2}=${fmt(steps.avgOtherAttr)}`}
            />

            <BlockMath
              math={`avgYourAttr=\\frac{minYour+maxYour}{2}=\\frac{${fmt(
                steps.cache.minYourAttr
              )}+${fmt(steps.cache.maxYourAttr)}}{2}=${fmt(steps.avgYourAttr)}`}
            />

            <BlockMath
              math={`physComp=calcPhysComp(${fmt(steps.avgPhysAtk)},${fmt(steps.avgOtherAttr)},\\dots)=${fmt(steps.physComp)}`}
            />

            <BlockMath
              math={`eleComp=calcEleComp(${fmt(steps.avgYourAttr)},\\dots)=${fmt(steps.eleComp)}`}
            />

            <BlockMath
              math={`basePhys=max(0,physComp-bossDef)=max(0,${fmt(steps.physComp)}-${fmt(steps.cache.bossDef)})=${fmt(steps.basePhys)}`}
            />

            <BlockMath
              math={`base=basePhys+eleComp=${fmt(steps.basePhys)}+${fmt(steps.eleComp)}=${fmt(steps.base)}`}
            />

            {baseParts && (
              <>
                <BlockMath
                  math={`baseHit=base\\cdot familyMult\\cdot dmgMult=${fmt(steps.base)}\\cdot ${fmt(steps.familyMult)}\\cdot ${fmt(steps.dmgMult)}=${fmt(steps.baseHit)}`}
                />

                <BlockMath
                  math={`minDamage=${fmt(steps.minDamage)},\\; maxDamage(affinity)=${fmt(steps.maxDamage)}`}
                />

                <BlockMath
                  math={`P_{raw}=\\frac{PrecisionRate}{100}=${fmt(steps.P_raw)},\\; A_{raw}=\\frac{AffinityRate}{100}=${fmt(steps.A_raw)},\\; C_{raw}=\\frac{CriticalRate}{100}=${fmt(steps.C_raw)}`}
                />

                <BlockMath
                  math={`P=clamp01(P_{raw})=${fmt(steps.P)},\\; A=clamp01(A_{raw})=${fmt(steps.A)},\\; C=clamp01(C_{raw})=${fmt(steps.C)},\\; CD=\\frac{CriticalDMGBonus}{100}=${fmt(steps.CD)}`}
                />

                <BlockMath
                  math={`scale=${fmt(steps.scale)},\\; A_s=A\\cdot scale=${fmt(steps.As)},\\; C_s=C\\cdot scale=${fmt(steps.Cs)}`}
                />

                <BlockMath
                  math={`noPrecision=A_s\\cdot maxDamage+(1-A_s)\\cdot minDamage=${fmt(steps.noPrecision)}`}
                />

                <BlockMath
                  math={`precision=A_s\\cdot maxDamage+C_s\\cdot baseHit\\cdot(1+CD)+(1-A_s-C_s)\\cdot baseHit=${fmt(steps.precision)}`}
                />

                <BlockMath
                  math={`\\textbf{Expected}\\;\\; (1-P)\\cdot noPrecision+P\\cdot precision=${fmt(steps.expected)}`}
                />
              </>
            )}
          </div>
        </div>
      )}

      <FormulaLegend />
    </div>
  );
}
