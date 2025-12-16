"use client";

import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ArrowUpRight, Swords, Zap, Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";

interface Stat {
  current: number;
  increase: number;
}

interface InputStats {
  [key: string]: Stat;
}

const STAT_GROUPS: Record<string, string[]> = {
  Core: [
    "MinPhysicalAttack",
    "MaxPhysicalAttack",
    "PhysicalAttackMultiplier",
    "FlatDamage",
  ],
  Element: [
    "MINAttributeAttackOfYOURType",
    "MAXAttributeAttackOfYOURType",
    "MainElementMultiplier",
    "AttributeAttackPenetrationOfYOURType",
    "AttributeAttackDMGBonusOfYOURType",
  ],
  Secondary: ["MINAttributeAttackOfOtherType", "MAXAttributeAttackOfOtherType"],
  Rates: [
    "PrecisionRate",
    "CriticalRate",
    "CriticalDMGBonus",
    "AffinityRate",
    "AffinityDMGBonus",
  ],
  Defense: [
    "HP",
    "PhysicalDefense",
    "PhysicalResistance",
    "PhysicalDMGReduction",
  ],
};

export default function DMGOptimizer() {
  const { theme, setTheme } = useTheme();

  const [stats, setStats] = useState<InputStats>({
    HP: { current: 36264, increase: 0 },
    PhysicalAttackMultiplier: { current: 326.29, increase: 0 },
    PhysicalDefense: { current: 179, increase: 0 },
    FlatDamage: { current: 378, increase: 0 },
    MinPhysicalAttack: { current: 325, increase: 0 },
    MainElementMultiplier: { current: 100, increase: 0 },
    MaxPhysicalAttack: { current: 689, increase: 0 },
    PrecisionRate: { current: 80.2, increase: 0 },
    CriticalRate: { current: 11.0, increase: 0 },
    CriticalDMGBonus: { current: 50.0, increase: 0 },
    AffinityRate: { current: 5.1, increase: 0 },
    AffinityDMGBonus: { current: 35.0, increase: 0 },
    MINAttributeAttackOfYOURType: { current: 64, increase: 0 },
    MAXAttributeAttackOfYOURType: { current: 153, increase: 0 },
    MINAttributeAttackOfOtherType: { current: 9, increase: 0 },
    MAXAttributeAttackOfOtherType: { current: 17, increase: 0 },
    PhysicalPenetration: { current: 2.4, increase: 0 },
    PhysicalResistance: { current: 1.8, increase: 0 },
    PhysicalDMGBonus: { current: 0.0, increase: 0 },
    PhysicalDMGReduction: { current: 0.0, increase: 0 },
    AttributeAttackPenetrationOfYOURType: { current: 3.1, increase: 0 },
    AttributeAttackDMGBonusOfYOURType: { current: 1.6, increase: 0 },
  });

  const onChange = (k: string, f: keyof Stat, v: number) => {
    setStats((s) => ({ ...s, [k]: { ...s[k], [f]: v } }));
  };

  const result = useMemo(() => {
    const g = (k: string) => stats[k].current + stats[k].increase;

    const normalAvg =
      (((g("MinPhysicalAttack") + g("MaxPhysicalAttack")) *
        (1 + g("PhysicalPenetration") / 200) *
        (1 + g("PhysicalDMGBonus")) +
        (g("MINAttributeAttackOfOtherType") >=
        g("MAXAttributeAttackOfOtherType")
          ? g("MINAttributeAttackOfOtherType") * 2
          : g("MINAttributeAttackOfOtherType") +
            g("MAXAttributeAttackOfOtherType"))) /
        2) *
        (g("PhysicalAttackMultiplier") / 100) +
      g("FlatDamage") +
      ((g("MINAttributeAttackOfYOURType") + g("MAXAttributeAttackOfYOURType")) /
        2) *
        (g("MainElementMultiplier") / 100) *
        (1 +
          g("AttributeAttackPenetrationOfYOURType") / 200 +
          g("AttributeAttackDMGBonusOfYOURType") / 100);

    const affinity =
      ((g("MaxPhysicalAttack") *
        (1 + g("PhysicalPenetration") / 200) *
        (1 + g("PhysicalDMGBonus")) +
        Math.max(
          g("MINAttributeAttackOfOtherType"),
          g("MAXAttributeAttackOfOtherType")
        )) *
        (g("PhysicalAttackMultiplier") / 100) +
        g("FlatDamage") +
        g("MAXAttributeAttackOfYOURType") *
          (g("MainElementMultiplier") / 100) *
          (1 +
            g("AttributeAttackPenetrationOfYOURType") / 200 +
            g("AttributeAttackDMGBonusOfYOURType") / 100)) *
      (1 + g("AffinityDMGBonus") / 100);

    const criticalAvg = normalAvg * (1 + g("CriticalDMGBonus") / 100);

    return {
      normal: Math.round(normalAvg * 10) / 10,
      critical: Math.round(criticalAvg * 10) / 10,
      affinity: Math.round(affinity * 10) / 10,
    };
  }, [stats]);

  return (
    <div
      className="min-h-screen p-6 text-foreground transition-colors
      bg-gradient-to-br from-background via-background/95 to-muted/40"
    >
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
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
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex items-center gap-2 rounded-xl border border-border/50
              bg-card/60 px-3 py-2 text-sm hover:bg-card transition"
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            {theme === "dark" ? "Light" : "Dark"}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
          {/* LEFT */}
          <Card
            className="
              bg-card/70 backdrop-blur-xl
              border border-white/10

              shadow-[0_20px_50px_-12px_rgba(0,0,0,0.45)]
              ring-1 ring-white/5

              transition-all duration-300
              hover:-translate-y-1
              hover:shadow-[0_30px_70px_-15px_rgba(0,0,0,0.55),0_0_40px_rgba(16,185,129,0.15)]
            "
          >
            <CardContent className="pt-6">
              <Tabs defaultValue="All">
                <TabsList>
                  <TabsTrigger value="All">All Stats</TabsTrigger>
                </TabsList>

                <TabsContent value="All" className="mt-6 space-y-8">
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
                            className="bg-card/60 border border-[#2b2a33]
                              hover:bg-card/80 hover:border-emerald-500/40
                              transition-all"
                          >
                            <CardContent className="pt-4 space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">
                                  {k
                                    .replace(/([a-z])([A-Z])/g, "$1 $2")
                                    .replace(/YOUR Type/g, "Your Type")
                                    .replace(/DMG/g, "DMG ")
                                    .replace(/MIN/g, "Min ")
                                    .replace(/MAX/g, "Max ")
                                    .trim()}
                                </span>
                                {stats[k].increase !== 0 && (
                                  <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                    +{stats[k].increase}
                                  </Badge>
                                )}
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <Input
                                  type="number"
                                  value={stats[k].current}
                                  onChange={(e) =>
                                    onChange(k, "current", +e.target.value)
                                  }
                                  className="bg-background/60 border-[#363b3d]
                                    focus-visible:ring-2 focus-visible:ring-emerald-500/40"
                                />
                                <Input
                                  type="number"
                                  value={stats[k].increase}
                                  onChange={(e) =>
                                    onChange(k, "increase", +e.target.value)
                                  }
                                  className="bg-background/60 border-[#363b3d]
                                    focus-visible:ring-2 focus-visible:ring-emerald-500/40"
                                />
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </section>
                  ))}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* RIGHT */}
          <Card
            className="
              sticky top-6
              bg-gradient-to-b from-card/95 to-card/60
              border border-yellow-500/30

              shadow-[0_25px_60px_-15px_rgba(0,0,0,0.6)]
              shadow-yellow-500/20

              ring-1 ring-yellow-500/20
              backdrop-blur-xl

              transition-all duration-300
            "
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="text-yellow-500" /> Damage Output
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-6">
              <DamageLine
                label="Normal Average"
                value={result.normal}
                color="emerald"
              />
              <DamageLine
                label="Critical Average"
                value={result.critical}
                color="yellow"
              />
              <DamageLine
                label="Affinity"
                value={result.affinity}
                color="rose"
              />

              <Separator className="bg-gradient-to-r from-transparent via-border to-transparent" />

              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <ArrowUpRight size={14} /> Auto update · Min–Max formula
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function DamageLine({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: "emerald" | "yellow" | "rose";
}) {
  return (
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={`relative text-3xl font-bold text-${color}-500`}>
        <span className={`absolute inset-0 blur-xl bg-${color}-500/20`} />
        <span className="relative">{value.toLocaleString()}</span>
      </p>
    </div>
  );
}
