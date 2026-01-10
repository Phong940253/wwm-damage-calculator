"use client";

import { useSearchParams } from "next/navigation";
import StatsPanel from "../stats/StatsPanel";
import ImportExportTab from "../import-export/ImportExportTab";
import RotationPanel from "../rotation/RotationPanel";
import DamagePanel from "../damage/DamagePanel";
import FormulaPanel from "../formula/FormulaPanel";
import { useDMGOptimizer } from "@/app/hooks/useDMGOptimizer";
import { useRotation } from "@/app/hooks/useRotation";
import { useDamageContextWithModifiers } from "@/app/hooks/useDamageContextWithModifiers";
import { INITIAL_STATS, INITIAL_ELEMENT_STATS } from "@/app/constants";
import { useState } from "react";
import { ElementStats } from "@/app/types";

export default function MainTabLayout() {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") ?? "stats";

  const {
    rotations,
    selectedRotationId,
    selectedRotation,
    setSelectedRotationId,
    createRotation,
    deleteRotation,
    renameRotation,
    addSkillToRotation,
    removeSkillFromRotation,
    moveSkill,
    updateSkillCount,
    togglePassiveSkill,
    toggleInnerWay,
    updatePassiveUptime,
  } = useRotation();

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
  } = useDMGOptimizer(INITIAL_STATS, INITIAL_ELEMENT_STATS, selectedRotation);

  const [showFormula, setShowFormula] = useState(false);

  // Build context with passive skills + inner ways modifiers
  const ctx = useDamageContextWithModifiers(
    stats,
    elementStats,
    gearBonus,
    selectedRotation
  );

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
        if (key === "selected" || key === "martialArtsId") continue;
        const s = next[key as keyof ElementStats];
        if (typeof s === "object" && s !== null && "current" in s && "increase" in s) {
          (next as Record<string, unknown>)[key] = {
            current: Number((s as { current: number | "" }).current || 0) +
              Number((s as { increase: number | "" }).increase || 0),
            increase: 0,
          };
        }
      }
      return next;
    });
  };

  const onSaveCurrent = () => {
    if (!confirm("Save current stats?")) return;

    localStorage.setItem(
      "wwm_dmg_current_stats",
      JSON.stringify(
        Object.fromEntries(
          Object.entries(stats).map(([k, v]) => [k, Number(v.current || 0)])
        )
      )
    );
    alert("Stats saved!");
  };

  return (
    <div
      className="
        grid grid-cols-1 md:grid-cols-2 gap-6
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

        {tab === "rotation" && (
          <RotationPanel
            rotations={rotations}
            selectedRotationId={selectedRotationId}
            elementStats={elementStats}
            onSelectRotation={setSelectedRotationId}
            onCreateRotation={createRotation}
            onDeleteRotation={deleteRotation}
            onRenameRotation={renameRotation}
            onAddSkill={addSkillToRotation}
            onRemoveSkill={removeSkillFromRotation}
            onMoveSkill={moveSkill}
            onUpdateSkillCount={updateSkillCount}
            onTogglePassiveSkill={togglePassiveSkill}
            onUpdatePassiveUptime={updatePassiveUptime}
            onToggleInnerWay={toggleInnerWay}
          />
        )}
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
          elementStats={elementStats}
          rotation={selectedRotation}
        />
      </div>
    </div>
  );
}
