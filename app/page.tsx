"use client";

import StatsPanel from "./ui/StatsPanel";
import DamagePanel from "./ui/DamagePanel";
import FormulaPanel from "./ui/FormulaPanel";
import { useDMGOptimizer } from "./hooks/useDMGOptimizer";
import { INITIAL_ELEMENT_STATS, INITIAL_STATS } from "./constants";
import { useState } from "react";
import { ElementStats } from "./types";

export default function DMGOptimizer() {
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

  const applyIncreaseToCurrent = () => {
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

  const saveCurrentStats = () => {
    if (!confirm("Save current stats? (Increase will not be saved)")) return;

    const statsData: Record<string, number> = {};
    Object.keys(stats).forEach((k) => {
      statsData[k] = Number(stats[k].current || 0);
    });

    localStorage.setItem("wwm_dmg_current_stats", JSON.stringify(statsData));

    const elementData: Record<string, number | string> = {
      selected: elementStats.selected,
    };

    for (const key in elementStats) {
      if (key === "selected") continue;
      elementData[key] = Number(
        elementStats[key as keyof Omit<ElementStats, "selected">].current || 0
      );
    }

    localStorage.setItem("wwm_element_stats", JSON.stringify(elementData));
  };

  return (
    <div className="grid lg:grid-cols-[1fr_380px] gap-6">
      <StatsPanel
        stats={stats}
        elementStats={elementStats}
        gearBonus={gearBonus}
        statImpact={statImpact}   // ✅ ADD
        onStatChange={onStatChange}
        onElementChange={onElementChange}
      />

      <DamagePanel
        result={damage}
        warnings={warnings}
        onApplyIncrease={applyIncreaseToCurrent}
        onSaveCurrent={saveCurrentStats}
        showFormula={showFormula}
        toggleFormula={() => setShowFormula(v => !v)}
        formulaSlot={<FormulaPanel />}
      />
    </div>
  );
}
