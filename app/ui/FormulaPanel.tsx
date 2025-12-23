// app/ui/FormulaPanel.tsx
"use client";

import { Separator } from "@/components/ui/separator";
import { MathFormula, FormulaLegend } from "../formula";

export default function FormulaPanel() {
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

      <FormulaLegend />
    </div>
  );
}
