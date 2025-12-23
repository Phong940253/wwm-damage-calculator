// app/gear/GearCompareTab.tsx
"use client";

import { useState } from "react";
import { useGear } from "./GearContext";
import { InputStats, ElementStats } from "../types";
import { Button } from "@/components/ui/button";
import { ArrowLeftRight, TrendingUp, TrendingDown } from "lucide-react";
import { calculateDamageWithGear } from "../utils/calculateDamageWithGear";
import { calculateTotalGearBonus } from "../utils/gearStats";

interface GearCompareTabProps {
  stats: InputStats;
  elementStats: ElementStats;
}

export default function GearCompareTab({ stats, elementStats }: GearCompareTabProps) {
  const { customGears } = useGear();

  const [gearA, setGearA] = useState<string>("");
  const [gearB, setGearB] = useState<string>("");

  const selectedGearA = customGears.find((g) => g.id === gearA);
  const selectedGearB = customGears.find((g) => g.id === gearB);

  const handleSwap = () => {
    const temp = gearA;
    setGearA(gearB);
    setGearB(temp);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Gear Comparison</h2>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleSwap}
          disabled={!gearA || !gearB}
        >
          <ArrowLeftRight className="w-4 h-4 mr-2" />
          Swap
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border rounded-lg p-4">
          <label className="block text-sm font-medium mb-2 text-emerald-500">
            Gear A
          </label>
          <select
            className="w-full border rounded px-3 py-2 bg-background"
            value={gearA}
            onChange={(e) => setGearA(e.target.value)}
          >
            <option value="">Select a gear...</option>
            {customGears.map((gear) => (
              <option key={gear.id} value={gear.id}>
                {gear.name} ({gear.slot})
              </option>
            ))}
          </select>
        </div>

        <div className="border rounded-lg p-4">
          <label className="block text-sm font-medium mb-2 text-blue-500">
            Gear B
          </label>
          <select
            className="w-full border rounded px-3 py-2 bg-background"
            value={gearB}
            onChange={(e) => setGearB(e.target.value)}
          >
            <option value="">Select a gear...</option>
            {customGears.map((gear) => (
              <option key={gear.id} value={gear.id}>
                {gear.name} ({gear.slot})
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedGearA && selectedGearB ? (
        <div className="space-y-4">
          {(selectedGearA.mains.length > 0 || selectedGearB.mains.length > 0) && (
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted/50 px-4 py-2">
                <h3 className="font-medium">Main Attributes</h3>
              </div>
              <table className="w-full">
                <thead className="bg-muted/30">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm">Stat</th>
                    <th className="px-4 py-2 text-right text-sm text-emerald-500">Gear A</th>
                    <th className="px-4 py-2 text-right text-sm text-blue-500">Gear B</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {Array.from(
                    new Set([
                      ...selectedGearA.mains.map((m) => m.stat),
                      ...selectedGearB.mains.map((m) => m.stat),
                    ])
                  ).map((stat) => {
                    const valueA = selectedGearA.mains.find((m) => m.stat === stat)?.value;
                    const valueB = selectedGearB.mains.find((m) => m.stat === stat)?.value;
                    return (
                      <tr key={stat}>
                        <td className="px-4 py-2 text-sm font-medium">{stat}</td>
                        <td className="px-4 py-2 text-right text-sm">
                          {valueA !== undefined ? valueA : "-"}
                        </td>
                        <td className="px-4 py-2 text-right text-sm">
                          {valueB !== undefined ? valueB : "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {(selectedGearA.subs.length > 0 || selectedGearB.subs.length > 0) && (
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted/50 px-4 py-2">
                <h3 className="font-medium">Sub Attributes</h3>
              </div>
              <table className="w-full">
                <thead className="bg-muted/30">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm">Stat</th>
                    <th className="px-4 py-2 text-right text-sm text-emerald-500">Gear A</th>
                    <th className="px-4 py-2 text-right text-sm text-blue-500">Gear B</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {Array.from(
                    new Set([
                      ...selectedGearA.subs.map((s) => s.stat),
                      ...selectedGearB.subs.map((s) => s.stat),
                    ])
                  ).map((stat) => {
                    const valueA = selectedGearA.subs.find((s) => s.stat === stat)?.value;
                    const valueB = selectedGearB.subs.find((s) => s.stat === stat)?.value;
                    return (
                      <tr key={stat}>
                        <td className="px-4 py-2 text-sm font-medium">{stat}</td>
                        <td className="px-4 py-2 text-right text-sm">
                          {valueA !== undefined ? valueA : "-"}
                        </td>
                        <td className="px-4 py-2 text-right text-sm">
                          {valueB !== undefined ? valueB : "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Damage Comparison */}
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-muted/50 px-4 py-2">
              <h3 className="font-medium">Damage Comparison</h3>
            </div>
            <table className="w-full">
              <thead className="bg-muted/30">
                <tr>
                  <th className="px-4 py-2 text-left text-sm">Damage Type</th>
                  <th className="px-4 py-2 text-right text-sm text-emerald-500">Gear A</th>
                  <th className="px-4 py-2 text-right text-sm text-blue-500">Gear B</th>
                  <th className="px-4 py-2 text-right text-sm">Difference</th>
                  <th className="px-4 py-2 text-right text-sm">Change %</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(() => {
                  // Calculate total bonus including derived stats
                  const bonusA = calculateTotalGearBonus(selectedGearA, stats);
                  const bonusB = calculateTotalGearBonus(selectedGearB, stats);

                  // Calculate damage for both gears
                  const damageA = calculateDamageWithGear(stats, elementStats, bonusA);
                  const damageB = calculateDamageWithGear(stats, elementStats, bonusB);

                  const rows = [
                    { label: "Min Damage", valueA: damageA.min, valueB: damageB.min },
                    { label: "Average Damage", valueA: damageA.normal, valueB: damageB.normal },
                    { label: "Affinity Damage", valueA: damageA.affinity, valueB: damageB.affinity },
                  ];

                  return rows.map((row) => {
                    const diff = row.valueB - row.valueA;
                    const percent = row.valueA === 0 ? 0 : (diff / row.valueA) * 100;
                    const isPositive = diff > 0;
                    const isNegative = diff < 0;

                    return (
                      <tr key={row.label}>
                        <td className="px-4 py-2 text-sm font-medium">{row.label}</td>
                        <td className="px-4 py-2 text-right text-sm">
                          {row.valueA.toLocaleString()}
                        </td>
                        <td className="px-4 py-2 text-right text-sm">
                          {row.valueB.toLocaleString()}
                        </td>
                        <td className={`px-4 py-2 text-right text-sm font-medium ${
                          isPositive ? "text-green-500" : isNegative ? "text-red-500" : ""
                        }`}>
                          <div className="flex items-center justify-end gap-1">
                            {isPositive && <TrendingUp className="w-4 h-4" />}
                            {isNegative && <TrendingDown className="w-4 h-4" />}
                            {diff > 0 ? "+" : ""}{diff.toLocaleString()}
                          </div>
                        </td>
                        <td className={`px-4 py-2 text-right text-sm font-medium ${
                          isPositive ? "text-green-500" : isNegative ? "text-red-500" : ""
                        }`}>
                          {percent > 0 ? "+" : ""}{percent.toFixed(2)}%
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="border rounded-lg p-8 text-center text-muted-foreground">
          Select two gears to compare their stats
        </div>
      )}
    </div>
  );
}
