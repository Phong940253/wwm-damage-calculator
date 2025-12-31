"use client";

import { useSearchParams } from "next/navigation";
import StatsPanel from "../stats/StatsPanel";
import ImportExportTab from "../import-export/ImportExportTab";
import DamagePanel from "../damage/DamagePanel";
import FormulaPanel from "../formula/FormulaPanel";
import { useDMGOptimizer } from "@/app/hooks/useDMGOptimizer";
import { INITIAL_STATS, INITIAL_ELEMENT_STATS } from "@/app/constants";
import { useState } from "react";
import { ElementStats } from "@/app/types";
import { buildDamageContext } from "@/app/domain/damage/damageContext";

export default function MainTabLayout() {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") ?? "stats";

  const {
    stats,
    setStats,
    elementStats,
    setElementStats,
    gearBonus,
    damage,
    statImpact,
    warnings,
    onStatChange,
    onElementChange,
  } = useDMGOptimizer(INITIAL_STATS, INITIAL_ELEMENT_STATS);

  const [showFormula, setShowFormula] = useState(false);

  const ctx = buildDamageContext(stats, elementStats, gearBonus);

  /* ---------- ACTIONS (GIỮ NGUYÊN) ---------- */
  const onApplyIncrease = () => {
    setStats((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((k) => {
        next[k] = {
          current: Number(next[k].current || 0) + Number(next[k].increase || 0),
          increase: 0,
        };
      });
      return next;
    });

    setElementStats((prev) => {
      const next = { ...prev };
      for (const key in next) {
        if (key === "selected") continue;
        const s = next[key as keyof Omit<ElementStats, "selected">];
        next[key as keyof Omit<ElementStats, "selected">] = {
          current: Number(s.current || 0) + Number(s.increase || 0),
          increase: 0,
        };
      }
      return next;
    });
  };

  const onSaveCurrent = () => {
    localStorage.setItem(
      "wwm_dmg_current_stats",
      JSON.stringify(
        Object.fromEntries(
          Object.entries(stats).map(([k, v]) => [k, Number(v.current || 0)])
        )
      )
    );
  };

  return (
    <div
      className="
        grid grid-cols-1 lg:grid-cols-2 gap-6
        h-[calc(100vh-180px)]
      "
    >
      {/* LEFT PANEL */}
      <div className="overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-zinc-600/40">
        {tab === "stats" && (
          <StatsPanel
            stats={stats}
            elementStats={elementStats}
            gearBonus={gearBonus}
            statImpact={statImpact}
            onStatChange={onStatChange}
            onElementChange={onElementChange}
            onApplyIncrease={onApplyIncrease}
            onSaveCurrent={onSaveCurrent}
          />
        )}

        {tab === "import" && <ImportExportTab />}
      </div>

      {/* RIGHT PANEL */}
      <div className="overflow-y-auto pl-2 scrollbar-thin scrollbar-thumb-yellow-500/40">
        <DamagePanel
          ctx={ctx}
          result={damage}
          warnings={warnings}
          showFormula={showFormula}
          toggleFormula={() => setShowFormula((v) => !v)}
          formulaSlot={<FormulaPanel />}
        />
      </div>
    </div>
  );
}
