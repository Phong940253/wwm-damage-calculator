"use client";

import React, { useState } from "react";
import { Swords, Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import { Badge } from "@/components/ui/badge";

import { useStats } from "./hooks/useStats";
import { useGear } from "./gear/GearContext";
import { useDamage } from "./hooks/useDamage";

import { aggregateGearStats } from "./utils/gear";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

import StatsPanel from "./ui/StatsPanel";
import DamagePanel from "./ui/DamagePanel";
import FormulaPanel from "./ui/FormulaPanel";

import GearEquippedTab from "./gear/GearEquippedTab";
import GearCustomizeTab from "./gear/GearCustomizeTab";

import { InputStats, ElementStats } from "./types";
import { ELEMENT_DEFAULTS } from "./constants";

/* ------------------ initial stats ------------------ */

const INITIAL_STATS: InputStats = {
  HP: { current: 50000, increase: 0 },
  PhysicalAttackMultiplier: { current: 326.29, increase: 0 },
  PhysicalDefense: { current: 179, increase: 0 },
  FlatDamage: { current: 378, increase: 0 },
  MinPhysicalAttack: { current: 500, increase: 0 },
  MainElementMultiplier: { current: 420, increase: 0 },
  MaxPhysicalAttack: { current: 1000, increase: 0 },
  PrecisionRate: { current: 85, increase: 0 },
  CriticalRate: { current: 35, increase: 0 },
  CriticalDMGBonus: { current: 50.0, increase: 0 },
  AffinityRate: { current: 25, increase: 0 },
  AffinityDMGBonus: { current: 35.0, increase: 0 },
  PhysicalPenetration: { current: 10, increase: 0 },
  PhysicalResistance: { current: 1.8, increase: 0 },
  PhysicalDMGBonus: { current: 0.0, increase: 0 },
  PhysicalDMGReduction: { current: 0.0, increase: 0 },
  DamageBoost: { current: 0.0, increase: 0 },
};

const INITIAL_ELEMENT_STATS: ElementStats = {
  selected: "bellstrike",
  bellstrikeMin: { current: ELEMENT_DEFAULTS.bellstrike.min, increase: 0 },
  bellstrikeMax: { current: ELEMENT_DEFAULTS.bellstrike.max, increase: 0 },
  bellstrikePenetration: {
    current: ELEMENT_DEFAULTS.bellstrike.penetration,
    increase: 0,
  },
  bellstrikeDMGBonus: {
    current: ELEMENT_DEFAULTS.bellstrike.bonus,
    increase: 0,
  },
  stonesplitMin: { current: ELEMENT_DEFAULTS.stonesplit.min, increase: 0 },
  stonesplitMax: { current: ELEMENT_DEFAULTS.stonesplit.max, increase: 0 },
  stonesplitPenetration: {
    current: ELEMENT_DEFAULTS.stonesplit.penetration,
    increase: 0,
  },
  stonesplitDMGBonus: {
    current: ELEMENT_DEFAULTS.stonesplit.bonus,
    increase: 0,
  },
  silkbindMin: { current: ELEMENT_DEFAULTS.silkbind.min, increase: 0 },
  silkbindMax: { current: ELEMENT_DEFAULTS.silkbind.max, increase: 0 },
  silkbindPenetration: {
    current: ELEMENT_DEFAULTS.silkbind.penetration,
    increase: 0,
  },
  silkbindDMGBonus: {
    current: ELEMENT_DEFAULTS.silkbind.bonus,
    increase: 0,
  },
  bamboocutMin: { current: ELEMENT_DEFAULTS.bamboocut.min, increase: 0 },
  bamboocutMax: { current: ELEMENT_DEFAULTS.bamboocut.max, increase: 0 },
  bamboocutPenetration: {
    current: ELEMENT_DEFAULTS.bamboocut.penetration,
    increase: 0,
  },
  bamboocutDMGBonus: {
    current: ELEMENT_DEFAULTS.bamboocut.bonus,
    increase: 0,
  },
};

/* ------------------ main component ------------------ */

export default function DMGOptimizer() {
  const { theme, setTheme } = useTheme();
  const [showFormula, setShowFormula] = useState(false);

  /* ---------- stats ---------- */
  const { stats, setStats } = useStats(INITIAL_STATS);
  const [elementStats, setElementStats] = useState<ElementStats>(
    INITIAL_ELEMENT_STATS
  );

  /* ---------- gear ---------- */
  const { customGears, equipped } = useGear();
  const gearBonus = aggregateGearStats(customGears, equipped);

  /* ---------- damage ---------- */
  const { result, statImpact } = useDamage(stats, elementStats, gearBonus);

  /* ---------- handlers ---------- */

  const onChange = (
    key: string,
    field: "current" | "increase",
    value: string
  ) => {
    setStats((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: value === "" ? "" : Number(value),
      },
    }));
  };

  const onElementChange = (
    key: keyof ElementStats,
    field: "current" | "increase" | "selected",
    value: string
  ) => {
    setElementStats((prev) => ({ ...prev, [key]: value }));
  };

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
        const stat = next[key as keyof Omit<ElementStats, "selected">];
        next[key as keyof Omit<ElementStats, "selected">] = {
          current: Number(stat.current || 0) + Number(stat.increase || 0),
          increase: 0,
        };
      }
      return next;
    });
  };

  const saveCurrentStats = () => {
    const ok = window.confirm(
      "Save current stats?\n(Increase values will NOT be saved)"
    );
    if (!ok) return;

    const data: Record<string, number> = {};
    Object.keys(stats).forEach((k) => {
      data[k] = Number(stats[k].current || 0);
    });
    localStorage.setItem("wwm_dmg_current_stats", JSON.stringify(data));

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

  /* ---------- warnings ---------- */

  const warnings: string[] = [];

  if (
    Number(stats.CriticalRate.current || 0) +
    Number(stats.AffinityRate.current || 0) >
    100
  ) {
    warnings.push("Crit + Affinity > 100%");
  }

  if (
    Number(stats.AffinityRate.current || 0) +
    Number(stats.AffinityRate.increase || 0) >
    100
  ) {
    warnings.push("Affinity > 100%");
  }

  /* ------------------ render ------------------ */

  return (
    <div
      className="
        min-h-screen p-6 text-foreground transition-colors
        bg-gradient-to-br from-background via-background/95 to-muted/40
      "
    >
      <div className="max-w-7xl mx-auto space-y-6">
        {/* ---------- header ---------- */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Swords className="text-emerald-500" />
            <h1 className="text-2xl font-bold tracking-tight">
              Where Winds Meet – DMG Optimizer
            </h1>
            <Badge className="border border-emerald-500/40 text-emerald-500">
              Realtime
            </Badge>
          </div>

          <button
            onClick={() =>
              setTheme(theme === "dark" ? "light" : "dark")
            }
            className="
              flex items-center gap-2 rounded-xl
              border border-border/50
              bg-card/60 px-3 py-2 text-sm
              hover:bg-card transition
            "
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            {theme === "dark" ? "Light" : "Dark"}
          </button>
        </div>

        {/* ---------- content ---------- */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">

          {/* ================= LEFT ================= */}
          <Tabs defaultValue="stats" className="space-y-4">

            <TabsList className="w-full justify-start">
              <TabsTrigger value="stats">All Stats</TabsTrigger>
              <TabsTrigger value="equipped">Gear Equipped</TabsTrigger>
              <TabsTrigger value="custom">Gear Customize</TabsTrigger>
            </TabsList>

            {/* -------- All Stats -------- */}
            <TabsContent value="stats" className="mt-4">
              <StatsPanel
                stats={stats}
                elementStats={elementStats}
                statImpact={statImpact}
                onChange={onChange}
                onElementChange={onElementChange}
                gearBonus={gearBonus}
              />
            </TabsContent>

            {/* -------- Gear Equipped -------- */}
            <TabsContent value="equipped" className="mt-4">
              <GearEquippedTab />
            </TabsContent>

            {/* -------- Gear Customize -------- */}
            <TabsContent value="custom" className="mt-4">
              <GearCustomizeTab stats={stats} elementStats={elementStats} />
            </TabsContent>

          </Tabs>

          {/* ================= RIGHT ================= */}
          <DamagePanel
            result={result}
            onApplyIncrease={applyIncreaseToCurrent}
            onSaveCurrent={saveCurrentStats}
            showFormula={showFormula}
            toggleFormula={() => setShowFormula(v => !v)}
            formulaSlot={<FormulaPanel />}
            warnings={warnings}
          />
        </div>
      </div>
    </div>
  );
}
