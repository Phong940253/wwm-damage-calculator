import { BlockMath } from "react-katex";

export function MathFormula({
  title,
  formula,
}: {
  title: string;
  formula: string;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-muted-foreground">{title}</p>

      <div
        className="
          rounded-xl p-4
          bg-black/40
          border border-white/10
          overflow-x-auto
        "
      >
        <BlockMath math={formula} />
      </div>
    </div>
  );
}


export function FormulaLegend() {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-muted-foreground">
        Formula Notation & Abbreviations
      </p>

      <div
        className="
          rounded-xl p-4
          bg-black/30
          border border-white/10
          text-xs text-zinc-300
          space-y-2
        "
      >
        <LegendRow symbol="DMG_min" desc="Minimum damage (abrasion / lowest roll)" />
        <LegendRow symbol="DMG_avg" desc="Expected average damage per hit" />
        <LegendRow symbol="DMG_aff" desc="Damage when Affinity is triggered" />

        <LegendRow symbol="M_min / M_max" desc="Minimum / Maximum Physical Attack" />
        <LegendRow symbol="M_atk" desc="Physical Attack Multiplier" />
        <LegendRow symbol="D_flat" desc="Flat damage added after multipliers" />

        <LegendRow
          symbol="A_your^{min/max}"
          desc="Min / Max Attribute Attack of your main element"
        />
        <LegendRow
          symbol="A_other^{min/max}"
          desc="Min / Max Attribute Attack of other elements"
        />

        <LegendRow symbol="M_elem" desc="Main Element damage multiplier" />

        <LegendRow
          symbol="P_pen"
          desc="Physical penetration (reduces enemy defense)"
        />
        <LegendRow
          symbol="P_elem"
          desc="Elemental penetration of your main element"
        />

        <LegendRow symbol="B_phys" desc="Physical damage bonus" />
        <LegendRow symbol="B_elem" desc="Elemental damage bonus" />
        <LegendRow symbol="B_crit" desc="Critical damage bonus" />
        <LegendRow symbol="B_aff" desc="Affinity damage bonus" />

        <LegendRow symbol="P_prec" desc="Precision rate (chance to trigger special hit)" />
        <LegendRow symbol="P_crit" desc="Critical hit rate (within precision)" />
        <LegendRow symbol="P_aff" desc="Affinity hit rate (within precision)" />

        <LegendRow
          symbol="ROUND(x, 1)"
          desc="Round the final result to 1 decimal place"
        />
      </div>
    </div>
  );
}

export function LegendRow({
  symbol,
  desc,
}: {
  symbol: string;
  desc: string;
}) {
  return (
    <div className="flex justify-between gap-4">
      <span className="font-mono text-zinc-100">{symbol}</span>
      <span className="text-right text-muted-foreground">{desc}</span>
    </div>
  );
}
