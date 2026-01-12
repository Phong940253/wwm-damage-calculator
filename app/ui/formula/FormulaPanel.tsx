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
  // keep enough precision for debugging but readable
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
    const physAtkMult = steps.cache.physAtkMult / 100;
    const elemMult = steps.cache.elementMult / 100;
    const physPartInner =
      steps.avgPhysAtk * steps.physModifier * steps.physBonus +
      steps.avgOtherAttr;
    const physPart = physPartInner * physAtkMult;
    const elemPart = steps.avgYourAttr * elemMult * steps.elementModifier;
    const innerSum = physPart + steps.cache.flatDmg + elemPart;
    const baseRecomputed = innerSum * steps.dmgBoost;

    return {
      physAtkMult,
      elemMult,
      physPartInner,
      physPart,
      elemPart,
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
\\cdot (1 + \\frac{P_{pen}}{200})
\\cdot (1 + B_{phys})
+ A_{other}^{min}
\\Big]
\\cdot M_{atk}
+ D_{flat}
+ A_{your}^{min}
\\cdot M_{elem}
\\cdot
\\Big(1 + \\frac{P_{elem}}{200} + B_{elem}\\Big)
\\Bigg)
\\cdot 1.02
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
        title="Affinity Damage"
        formula={`
DMG_{aff} =
\\Big[
M_{max}
\\cdot (1 + \\frac{P_{pen}}{200})
\\cdot (1 + B_{phys})
+ \\max(A_{other})
\\Big]
\\cdot M_{atk}
+ D_{flat}
+ A_{your}^{max}
\\cdot M_{elem}
\\cdot
\\Big(1 + \\frac{P_{elem}}{200} + B_{elem}\\Big)
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
              bg-black/40
              border border-white/10
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
              )}}{100}=${fmt(steps.dmgBoost)},\\; physMod=${fmt(
                steps.physModifier
              )},\\; physBonus=${fmt(steps.physBonus)},\\; elemMod=${fmt(
                steps.elementModifier
              )}`}
            />

            <BlockMath
              math={`avgPhysAtk=\\frac{minPhysAtk+maxPhysAtk}{2}=\\frac{${fmt(
                steps.cache.minPhysAtk
              )}+${fmt(steps.cache.maxPhysAtk)}}{2}=${fmt(steps.avgPhysAtk)}`}
            />

            <BlockMath
              math={`avgOtherAttr=${steps.avgOtherAttrMode === "min"
                ? `minOther\\;\\;(\\text{since }minOther\\ge maxOther)`
                : `\\frac{minOther+maxOther}{2}`
                }=${fmt(steps.avgOtherAttr)}`}
            />

            <BlockMath
              math={`avgYourAttr=\\frac{minYour+maxYour}{2}=\\frac{${fmt(
                steps.cache.minYourAttr
              )}+${fmt(steps.cache.maxYourAttr)}}{2}=${fmt(steps.avgYourAttr)}`}
            />

            <BlockMath
              math={`base=\\Big((avgPhysAtk\\cdot physMod\\cdot physBonus+avgOtherAttr)\\cdot\\frac{physAtkMult}{100}+flatDmg+avgYourAttr\\cdot\\frac{elemMult}{100}\\cdot elemMod\\Big)\\cdot dmgBoost=${fmt(
                steps.base
              )}`}
            />

            {baseParts && (
              <>
                <BlockMath
                  math={`\\textbf{Thế\u0020số}\\; base=\\Big((${fmt(
                    steps.avgPhysAtk
                  )}\\cdot ${fmt(steps.physModifier)}\\cdot ${fmt(
                    steps.physBonus
                  )}+${fmt(steps.avgOtherAttr)})\\cdot\\frac{${fmt(
                    steps.cache.physAtkMult
                  )}}{100}+${fmt(steps.cache.flatDmg)}+${fmt(
                    steps.avgYourAttr
                  )}\\cdot\\frac{${fmt(
                    steps.cache.elementMult
                  )}}{100}\\cdot ${fmt(steps.elementModifier)}\\Big)\\cdot ${fmt(
                    steps.dmgBoost
                  )}`}
                />

                <BlockMath
                  math={`physPartInner=${fmt(steps.avgPhysAtk)}\\cdot ${fmt(
                    steps.physModifier
                  )}\\cdot ${fmt(steps.physBonus)}+${fmt(
                    steps.avgOtherAttr
                  )}=${fmt(baseParts.physPartInner)}`}
                />

                <BlockMath
                  math={`physPart=physPartInner\\cdot\\frac{${fmt(
                    steps.cache.physAtkMult
                  )}}{100}=${fmt(baseParts.physPart)}`}
                />

                <BlockMath
                  math={`elemPart=${fmt(steps.avgYourAttr)}\\cdot\\frac{${fmt(
                    steps.cache.elementMult
                  )}}{100}\\cdot ${fmt(steps.elementModifier)}=${fmt(
                    baseParts.elemPart
                  )}`}
                />

                <BlockMath
                  math={`innerSum=physPart+flatDmg+elemPart=${fmt(
                    baseParts.physPart
                  )}+${fmt(steps.cache.flatDmg)}+${fmt(
                    baseParts.elemPart
                  )}=${fmt(baseParts.innerSum)}`}
                />

                <BlockMath
                  math={`base=innerSum\\cdot dmgBoost=${fmt(
                    baseParts.innerSum
                  )}\\cdot ${fmt(steps.dmgBoost)}=${fmt(
                    baseParts.baseRecomputed
                  )}`}
                />
              </>
            )}

            <BlockMath
              math={`minDamage=${fmt(steps.minDamage)},\\; maxDamage(affinity)=${fmt(
                steps.maxDamage
              )}`}
            />

            <BlockMath
              math={`P_{raw}=\\frac{PrecisionRate}{100}=${fmt(
                steps.P_raw
              )},\\; A_{raw}=\\frac{AffinityRate}{100}=${fmt(
                steps.A_raw
              )},\\; C_{raw}=\\frac{CriticalRate}{100}=${fmt(
                steps.C_raw
              )}`}
            />

            <BlockMath
              math={`P=clamp01(P_{raw})=${fmt(steps.P)},\\; A=clamp01(A_{raw})=${fmt(
                steps.A
              )},\\; C=clamp01(C_{raw})=${fmt(steps.C)},\\; CD=\\frac{CriticalDMGBonus}{100}=${fmt(
                steps.CD
              )}`}
            />

            <BlockMath
              math={`scale=${fmt(
                steps.scale
              )},\\; A_s=A\\cdot scale=${fmt(steps.As)},\\; C_s=C\\cdot scale=${fmt(
                steps.Cs
              )}`}
            />

            <BlockMath
              math={`noPrecision=A_s\\cdot maxDamage+(1-A_s)\\cdot minDamage=${fmt(
                steps.noPrecision
              )}`}
            />

            <BlockMath
              math={`precision=A_s\\cdot maxDamage+C_s\\cdot base\\cdot(1+CD)+(1-A_s-C_s)\\cdot base=${fmt(
                steps.precision
              )}`}
            />

            <BlockMath
              math={`\\textbf{Expected}\\;\\; (1-P)\\cdot noPrecision+P\\cdot precision=${fmt(
                steps.expected
              )}`}
            />
          </div>
        </div>
      )}

      <FormulaLegend />
    </div>
  );
}
