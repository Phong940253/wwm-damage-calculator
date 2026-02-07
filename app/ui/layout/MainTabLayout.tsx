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
import { useEffect, useMemo, useRef, useState } from "react";
import { ElementStats } from "@/app/types";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export default function MainTabLayout() {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") ?? "stats";

  // On sm + md: stack panels (two rows). On lg+: show two columns.
  const [isStacked, setIsStacked] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const apply = () => setIsStacked(!mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  // Vertical resizer state (only used in stacked mode)
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerHeight, setContainerHeight] = useState(0);
  const [splitRatio, setSplitRatio] = useState(0.55);
  const draggingRef = useRef(false);
  const dragStartYRef = useRef(0);
  const dragStartTopPxRef = useRef(0);

  const HANDLE_HEIGHT = 10;
  const MIN_PANE_PX = 180;

  useEffect(() => {
    if (!isStacked) return;
    if (!containerRef.current) return;

    const el = containerRef.current;
    const ro = new ResizeObserver((entries) => {
      const h = entries[0]?.contentRect?.height ?? 0;
      setContainerHeight(h);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [isStacked]);

  const topPaneHeightPx = useMemo(() => {
    const available = Math.max(0, containerHeight - HANDLE_HEIGHT);
    const maxTop = Math.max(MIN_PANE_PX, available - MIN_PANE_PX);
    const raw = splitRatio * available;
    return clamp(raw, MIN_PANE_PX, maxTop);
  }, [containerHeight, splitRatio]);

  const {
    rotations,
    selectedRotationId,
    selectedRotation,
    setSelectedRotationId,
    createRotation,
    duplicateRotation,
    deleteRotation,
    renameRotation,
    addSkillToRotation,
    removeSkillFromRotation,
    moveSkill,
    updateSkillCount,
    updateSkillParams,
    togglePassiveSkill,
    toggleInnerWay,
    setInnerWayTier,
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
    levelContext,
    setPlayerLevel,
    setEnemyLevel,
  } = useDMGOptimizer(INITIAL_STATS, INITIAL_ELEMENT_STATS, selectedRotation);

  const [showFormula, setShowFormula] = useState(false);

  // Build context with passive skills + inner ways modifiers
  const ctx = useDamageContextWithModifiers(
    stats,
    elementStats,
    gearBonus,
    selectedRotation,
    levelContext,
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
    <div className="h-[calc(100vh-180px)]">
      {isStacked ? (
        <div ref={containerRef} className="flex h-full flex-col">
          {/* TOP (LEFT PANEL) */}
          <div
            className="overflow-y-auto px-2 scrollbar-thin scrollbar-thumb-zinc-600/40"
            style={{ height: topPaneHeightPx }}
          >
            {tab === "stats" && (
              <StatsPanel
                stats={stats}
                elementStats={elementStats}
                gearBonus={gearBonus}
                statImpact={statImpact}
                levelContext={levelContext}
                setPlayerLevel={setPlayerLevel}
                setEnemyLevel={setEnemyLevel}
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
                onDuplicateRotation={duplicateRotation}
                onDeleteRotation={deleteRotation}
                onRenameRotation={renameRotation}
                onAddSkill={addSkillToRotation}
                onRemoveSkill={removeSkillFromRotation}
                onMoveSkill={moveSkill}
                onUpdateSkillCount={updateSkillCount}
                onUpdateSkillParams={updateSkillParams}
                onTogglePassiveSkill={togglePassiveSkill}
                onUpdatePassiveUptime={updatePassiveUptime}
                onToggleInnerWay={toggleInnerWay}
                onSetInnerWayTier={setInnerWayTier}
              />
            )}
          </div>

          {/* RESIZER */}
          <div
            role="separator"
            aria-orientation="horizontal"
            className="h-[10px] cursor-row-resize bg-muted active:bg-muted/80"
            onPointerDown={(e) => {
              if (!containerRef.current) return;
              const available = Math.max(0, containerHeight - HANDLE_HEIGHT);
              const currentTopPx = clamp(
                splitRatio * available,
                MIN_PANE_PX,
                Math.max(MIN_PANE_PX, available - MIN_PANE_PX)
              );

              draggingRef.current = true;
              dragStartYRef.current = e.clientY;
              dragStartTopPxRef.current = currentTopPx;
              (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
              if (!draggingRef.current) return;
              const available = Math.max(0, containerHeight - HANDLE_HEIGHT);
              const maxTop = Math.max(MIN_PANE_PX, available - MIN_PANE_PX);
              const delta = e.clientY - dragStartYRef.current;
              const nextTopPx = clamp(dragStartTopPxRef.current + delta, MIN_PANE_PX, maxTop);
              setSplitRatio(available === 0 ? 0.55 : nextTopPx / available);
            }}
            onPointerUp={() => {
              draggingRef.current = false;
            }}
            onPointerCancel={() => {
              draggingRef.current = false;
            }}
          />

          {/* BOTTOM (RIGHT PANEL) */}
          <div className="min-h-0 flex-1 overflow-y-auto px-2 scrollbar-thin scrollbar-thumb-yellow-500/40">
            <DamagePanel
              ctx={ctx}
              result={damage}
              warnings={warnings}
              showFormula={showFormula}
              toggleFormula={() => setShowFormula((v) => !v)}
              formulaSlot={<FormulaPanel ctx={ctx} result={damage} />}
              elementStats={elementStats}
              rotation={selectedRotation}
            />
          </div>
        </div>
      ) : (
        <div className="grid h-full grid-cols-1 gap-6 lg:grid-cols-2">
          {/* LEFT PANEL */}
          <div className="overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-zinc-600/40">
            {tab === "stats" && (
              <StatsPanel
                stats={stats}
                elementStats={elementStats}
                gearBonus={gearBonus}
                statImpact={statImpact}
                levelContext={levelContext}
                setPlayerLevel={setPlayerLevel}
                setEnemyLevel={setEnemyLevel}
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
                onDuplicateRotation={duplicateRotation}
                onDeleteRotation={deleteRotation}
                onRenameRotation={renameRotation}
                onAddSkill={addSkillToRotation}
                onRemoveSkill={removeSkillFromRotation}
                onMoveSkill={moveSkill}
                onUpdateSkillCount={updateSkillCount}
                onUpdateSkillParams={updateSkillParams}
                onTogglePassiveSkill={togglePassiveSkill}
                onUpdatePassiveUptime={updatePassiveUptime}
                onToggleInnerWay={toggleInnerWay}
                onSetInnerWayTier={setInnerWayTier}
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
              formulaSlot={<FormulaPanel ctx={ctx} result={damage} />}
              elementStats={elementStats}
              rotation={selectedRotation}
            />
          </div>
        </div>
      )}
    </div>
  );
}
