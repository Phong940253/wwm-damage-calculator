"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { STAT_GROUPS } from "../constants";
import { InputStats } from "../types";

interface Props {
  stats: InputStats;
  statImpact: Record<string, number>;
  onChange: (
    key: string,
    field: "current" | "increase",
    value: string
  ) => void;
}

export default function StatsPanel({
  stats,
  statImpact,
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
      <CardContent className="pt-6 space-y-8">
        {Object.entries(STAT_GROUPS).map(([group, keys]) => (
          <section key={group} className="space-y-4">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">{group}</h2>
              <Separator className="flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {keys.map((k) => (
                <Card
                  key={k}
                  className="
                    bg-card/60 border border-[#2b2a33]
                    hover:bg-card/80 hover:border-emerald-500/40
                    transition-all
                  "
                >
                  <CardContent className="pt-4 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">
                        {formatStatName(k)}
                      </span>

                      <div className="flex gap-2">
                        {stats[k].increase !== 0 && (
                          <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            {Number(stats[k].increase) > 0 ? "+" : ""}
                            {stats[k].increase}
                          </Badge>
                        )}

                        {statImpact[k] !== 0 && (
                          <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            {statImpact[k] > 0 ? "+" : ""}
                            {statImpact[k].toFixed(2)}%
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="number"
                        value={stats[k].current === 0 ? "" : stats[k].current}
                        onChange={(e) =>
                          onChange(k, "current", e.target.value)
                        }
                        onBlur={() => {
                          if (stats[k].current === "") {
                            onChange(k, "current", "0");
                          }
                        }}
                        onWheel={(e) => e.currentTarget.blur()}
                        className="bg-background/60 border-[#363b3d]"
                      />

                      <Input
                        type="number"
                        value={stats[k].increase === 0 ? "" : stats[k].increase}
                        onChange={(e) =>
                          onChange(k, "increase", e.target.value)
                        }
                        onBlur={() => {
                          if (stats[k].increase === "") {
                            onChange(k, "increase", "0");
                          }
                        }}
                        onWheel={(e) => e.currentTarget.blur()}
                        className="bg-background/60 border-[#363b3d]"
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        ))}
      </CardContent>
    </Card>
  );
}

function formatStatName(k: string) {
  return k
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/YOURType/g, "Your Type")
    .replace(/DMG/g, "DMG ")
    .replace(/MIN/g, "Min ")
    .replace(/MAX/g, "Max ")
    .trim();
}
