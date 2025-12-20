"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { STAT_GROUPS } from "../constants";
import { InputStats } from "../types";


/* =======================
   Types
======================= */

type StatKey = Extract<keyof InputStats, string>;

interface Props {
  stats: InputStats;
  statImpact: Partial<Record<StatKey, number>>;
  gearBonus: Record<string, number>;
  onChange: (
    key: StatKey,
    field: "current" | "increase",
    value: string
  ) => void;
}

/* =======================
   Component
======================= */

export default function StatsPanel({
  stats,
  statImpact,
  gearBonus,
  onChange,
}: Props) {
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
        {Object.entries(STAT_GROUPS).map(([group, keys]) => (
          <section key={group} className="space-y-5">
            {/* ---------- Group Header ---------- */}
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold">{group}</h2>
              <Separator className="flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
            </div>

            {/* ---------- Stats Grid ---------- */}
            <div className="grid md:grid-cols-2 gap-4">
              {(keys as StatKey[]).map((k) => {
                const stat = stats[k];
                const impact = statImpact[k] ?? 0;

                const gear = gearBonus[k] || 0;
                const base = Number(stat.current || 0);
                const total = base + gear;

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
                          {formatStatName(k)}
                        </span>

                        <div className="flex gap-2">
                          {gear !== 0 && (
                            <Badge className="bg-blue-500/15 text-blue-400 border border-blue-500/30">
                              Gear {gear > 0 ? "+" : ""}
                              {gear}
                            </Badge>
                          )}

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
                            onChange(k, "current", "");
                            return;
                          }

                          // Base = Total - Gear
                          const nextBase = Number(v) - gear;
                          onChange(k, "current", String(nextBase));
                        }}
                        onBlur={() => {
                          if (stat.current === "") {
                            onChange(k, "current", "0");
                          }
                        }}
                        onWheel={(e) => e.currentTarget.blur()}
                        className="bg-background/60 border-[#363b3d]"
                      />




                      {/* ---------- Breakdown ---------- */}
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Base: {base}</span>
                        <span className="text-blue-400">
                          Gear: {gear > 0 ? "+" : ""}
                          {gear}
                        </span>
                      </div>

                      {/* ---------- Increase ---------- */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          Increase
                        </span>
                        <Input
                          type="number"
                          value={stat.increase === 0 ? "" : stat.increase}
                          onChange={(e) =>
                            onChange(k, "increase", e.target.value)
                          }
                          onBlur={() => {
                            if (stat.increase === "") {
                              onChange(k, "increase", "0");
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

/* =======================
   Utils
======================= */

function formatStatName(k: string) {
  return k
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/YOURType/g, "Your Type")
    .replace(/DMG/g, "DMG ")
    .replace(/MIN/g, "Min ")
    .replace(/MAX/g, "Max ")
    .trim();
}
