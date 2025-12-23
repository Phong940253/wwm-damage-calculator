"use client";

import StatsPanel from "./ui/StatsPanel";
import DamagePanel from "./ui/DamagePanel";
import FormulaPanel from "./ui/FormulaPanel";
import { useDMGOptimizer } from "./hooks/useDMGOptimizer";
import { INITIAL_ELEMENT_STATS, INITIAL_STATS } from "./constants";
import { useState } from "react";
import { ElementStats } from "./types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import GearEquippedTab from "./gear/GearEquippedTab";
import GearCustomizeTab from "./gear/GearCustomizeTab";
import GearCompareTab from "./gear/GearCompareTab";
import { useTheme } from "next-themes";
import { Badge } from "@/components/ui/badge";
import { Moon, Sun, Swords } from "lucide-react";

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

  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

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

    <div className="min-h-screen p-6 bg-gradient-to-br from-background via-background/95 to-muted/40">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* ---------- HEADER ---------- */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Swords className="text-emerald-500" />
            <h1 className="text-2xl font-bold">
              Where Winds Meet – DMG Optimizer
            </h1>
            <Badge className="border border-emerald-500/40 text-emerald-500">
              Realtime
            </Badge>
          </div>

          {mounted && (
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="rounded-xl border px-3 py-2 flex items-center gap-2"
            >
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
              {theme === "dark" ? "Light" : "Dark"}
            </button>
          )}
        </div>

        {/* ---------- CONTENT ---------- */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
          {/* LEFT */}
          <Tabs defaultValue="stats">
            <TabsList>
              <TabsTrigger value="stats">All Stats</TabsTrigger>
              <TabsTrigger value="equipped">Gear Equipped</TabsTrigger>
              <TabsTrigger value="custom">Gear Customize</TabsTrigger>
              <TabsTrigger value="compare">Gear Compare</TabsTrigger>
            </TabsList>

            <TabsContent value="stats">
              <StatsPanel
                stats={stats}
                elementStats={elementStats}
                gearBonus={gearBonus}
                statImpact={statImpact}   // ✅ ADD
                onStatChange={onStatChange}
                onElementChange={onElementChange}
              />
            </TabsContent>

            <TabsContent value="equipped">
              <GearEquippedTab />
            </TabsContent>

            <TabsContent value="custom">
              <GearCustomizeTab stats={stats} elementStats={elementStats} />
            </TabsContent>

            <TabsContent value="compare">
              <GearCompareTab stats={stats} elementStats={elementStats} />
            </TabsContent>
          </Tabs>

          {/* RIGHT */}
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
      </div>
    </div>

  );
}
