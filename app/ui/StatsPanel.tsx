// app/ui/StatsPanel.tsx
"use client";
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { STAT_GROUPS, ELEMENT_TYPES } from "../constants";
import { InputStats, ElementStats } from "../types";
import { getStatLabel } from "@/app/utils/statLabel";

/* =======================
   Types
======================= */

type StatKey = Extract<keyof InputStats, string>;
type ElementStatKey = Exclude<keyof ElementStats, "selected">;

interface Props {
  stats: InputStats;
  elementStats: ElementStats;
  statImpact: Partial<Record<StatKey | ElementStatKey, number>>;
  gearBonus: Record<string, number>;
  onChange: (
    key: StatKey,
    field: "current" | "increase",
    value: string
  ) => void;
  onElementChange: (
    key: ElementStatKey | "selected",
    field: "current" | "increase" | "selected",
    value: string
  ) => void;
}

const getDerivedFromAttributes = (
  stats: InputStats,
  gearBonus: Record<string, number>
) => {
  const v = (k: keyof InputStats) =>
    Number(stats[k]?.current || 0) + (gearBonus[k] || 0);

  const agility = v("Agility");
  const momentum = v("Momentum");
  const power = v("Power");

  return {
    MinPhysicalAttack: agility * 1 + power * 0.246,
    MaxPhysicalAttack: momentum * 0.9 + power * 1.315,
    CriticalRate: agility * 0.075,
    AffinityRate: momentum * 0.04,
  };
};

/* =======================
   Component
======================= */

export default function StatsPanel({
  stats,
  elementStats,
  statImpact,
  gearBonus,
  onChange,
  onElementChange,
}: Props) {
  const getStatValue = (
    key: string,
    field: "current" | "increase"
  ) => {
    return isElementKey(key)
      ? elementStats[key]?.[field]
      : stats[key as StatKey]?.[field];
  };

  const isElementKey = (key: string): key is ElementStatKey =>
    key in elementStats && key !== "selected";

  const handleStatChange = (
    key: string,
    field: "current" | "increase",
    value: string
  ) => {
    if (isElementKey(key)) {
      onElementChange(key, field, value);
    } else {
      onChange(key as StatKey, field, value);
    }
  };


  return (
    <Card
      className="
        bg-card/70 backdrop-blur-xl
        border border-white/10
        shadow-[0_20px_50px_-12px_rgba(0,0,0,0.45)]
        ring-1 ring-white/5
      "
    >
      <CardContent className="pt-6 space-y-10">
        {/* Element Selection */}
        <section className="space-y-5">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">Elements</h2>
            <Separator className="flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Main Element</label>
            <select
              className="w-full border rounded px-2 py-2 bg-background"
              value={elementStats.selected}
              onChange={(e) =>
                onElementChange("selected", "selected", e.target.value)
              }
            >
              {ELEMENT_TYPES.map((el) => (
                <option key={el.key} value={el.key}>
                  {el.label}
                </option>
              ))}
            </select>
          </div>
        </section>

        {Object.entries(STAT_GROUPS).map(([group, keys]) => (
          <section key={group} className="space-y-5">
            {/* ---------- Group Header ---------- */}
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold">{group}</h2>
              <Separator className="flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
            </div>

            {/* ---------- Stats Grid ---------- */}
            <div className="grid md:grid-cols-2 gap-4">
              {(keys as (StatKey | ElementStatKey)[]).map((k) => {
                const stat = isElementKey(k)
                  ? elementStats[k]
                  : stats[k as StatKey];
                if (!stat) return null;

                const impact = statImpact[k] ?? 0;

                const derived = getDerivedFromAttributes(stats, gearBonus);

                const gear = gearBonus[k] || 0;
                const derivedValue = derived[k as keyof typeof derived] || 0;
                const base = Number(stat.current || 0);
                const total = base + gear + derivedValue;

                return (
                  <Card
                    key={k}
                    className="
                      bg-card/60 border border-[#2b2a33]
                      hover:bg-card/80 hover:border-emerald-500/40
                      transition-all
                    "
                  >
                    <CardContent className="pt-4 space-y-3">
                      {/* ---------- Title & Badges ---------- */}
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">
                          {getStatLabel(k, elementStats)}
                        </span>

                        <div className="flex gap-2">
                          {impact !== 0 && (
                            <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                              {impact > 0 ? "+" : ""}
                              {impact.toFixed(2)}%
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* ---------- TOTAL INPUT (Editable) ---------- */}
                      <Input
                        type="number"
                        value={total === 0 ? "" : total}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (v === "") {
                            handleStatChange(k, "current", "");
                            return;
                          }

                          // Base = Total - Gear
                          const nextBase = Number(v) - gear - derivedValue;
                          handleStatChange(k, "current", String(nextBase));
                        }}
                        onBlur={() => {
                          if (getStatValue(k, "current") === "") {
                            handleStatChange(k, "current", "0");
                          }
                        }}
                        onWheel={(e) => e.currentTarget.blur()}
                        className="bg-background/60 border-[#363b3d]"
                      />
                      {/* ---------- Breakdown ---------- */}
                      <div className="flex text-xs text-muted-foreground gap-2">
                        {
                          base !== 0 && (
                            <Badge className="bg-gray-500/15 text-gray-400 border border-gray-500/30">
                              Base {base.toFixed(2)}
                            </Badge>
                          )
                        }
                        {gear !== 0 && (
                          <Badge className="bg-blue-500/15 text-blue-400 border border-blue-500/30">
                            Gear {gear > 0 ? "+" : ""}
                            {gear.toFixed(2)}
                          </Badge>
                        )}
                        {
                          derivedValue !== 0 && (
                            <Badge className="bg-purple-500/15 text-purple-400 border border-purple-500/30">
                              Attr +{derivedValue.toFixed(2)}
                            </Badge>
                          )
                        }
                      </div>


                      {/* ---------- Increase ---------- */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          Increase
                        </span>
                        <Input
                          type="number"
                          value={getStatValue(k, "increase") === 0 ? "" : getStatValue(k, "increase")}
                          onChange={(e) =>
                            handleStatChange(k, "increase", e.target.value)
                          }
                          onBlur={() => {
                            if (getStatValue(k, "increase") === "") {
                              handleStatChange(k, "increase", "0");
                            }
                          }}
                          onWheel={(e) => e.currentTarget.blur()}
                          className="bg-background/60 border-[#363b3d]"
                        />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        ))}
      </CardContent>
    </Card>
  );
}