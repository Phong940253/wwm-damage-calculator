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
  current: number | "";
  increase: number | "";
}

interface InputStats {
  [key: string]: Stat;
}

const clamp01 = (v: number) => Math.min(Math.max(v, 0), 1);

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

  const STORAGE_KEY = "wwm_dmg_current_stats";

  const saveCurrentStats = () => {
    const ok = window.confirm(
      "Save current stats?\n(Increase values will NOT be saved)"
    );
    if (!ok) return;

    const data: Record<string, number> = {};
    Object.keys(stats).forEach((k) => {
      data[k] = Number(stats[k].current || 0);
    });

    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  };

  const applyIncreaseToCurrent = () => {
    setStats((prev) => {
      const next: InputStats = { ...prev };

      Object.keys(next).forEach((k) => {
        const cur = Number(next[k].current || 0);
        const inc = Number(next[k].increase || 0);

        next[k] = {
          current: cur + inc,
          increase: 0,
        };
      });

      return next;
    });
  };

  React.useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    try {
      const saved = JSON.parse(raw) as Record<string, number>;
      setStats((prev) => {
        const next = { ...prev };
        Object.keys(saved).forEach((k) => {
          if (next[k]) {
            next[k] = {
              current: saved[k],
              increase: 0,
            };
          }
        });
        return next;
      });
    } catch { }
  }, []);


  const onChange = (
    k: string,
    f: keyof Stat,
    v: string
  ) => {
    setStats((s) => ({
      ...s,
      [k]: {
        ...s[k],
        [f]: v === "" ? "" : Number(v),
      },
    }));
  };

  const calcExpectedNormal = (g: (k: string) => number) => {
    const baseNormal =
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
      ((g("MINAttributeAttackOfYOURType") +
        g("MAXAttributeAttackOfYOURType")) /
        2) *
      (g("MainElementMultiplier") / 100) *
      (1 +
        g("AttributeAttackPenetrationOfYOURType") / 200 +
        g("AttributeAttackDMGBonusOfYOURType") / 100);

    const affinityDamage = calcAffinityDamage(g);

    // ---- SAFE & CAPPED RATES ----
    const Pp = clamp01(g("PrecisionRate") / 100);

    const PcRaw = clamp01(g("CriticalRate") / 100);
    const PaRaw = clamp01(g("AffinityRate") / 100);

    // Crit + Affinity cannot exceed 100% of precision
    const scale = PcRaw + PaRaw > 1 ? 1 / (PcRaw + PaRaw) : 1;

    const Pc = PcRaw * scale;
    const Pa = PaRaw * scale;

    const critBonus = g("CriticalDMGBonus") / 100;

    return (
      baseNormal +
      Pp * Pc * baseNormal * critBonus +
      Pp * Pa * (affinityDamage - baseNormal)
    );
  };


  const calcAffinityDamage = (g: (k: string) => number) => {
    return (
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
          g("AttributeAttackDMGBonusOfYOURType") / 100)
      ) * (1 + g("AffinityDMGBonus") / 100)
    );
  };



  const result = useMemo(() => {
    const gBase = (k: string) =>
      Number(stats[k].current || 0);

    const gFinal = (k: string) =>
      Number(stats[k].current || 0) + Number(stats[k].increase || 0);

    const calc = (g: (k: string) => number) => {
      return {
        normal: calcExpectedNormal(g),
        affinity: calcAffinityDamage(g),
      };
    };

    const base = calc(gBase);
    const final = calc(gFinal);

    const pct = (b: number, f: number) =>
      b === 0 ? 0 : ((f - b) / b) * 100;

    return {
      normal: {
        value: Math.round(final.normal * 10) / 10,
        percent: pct(base.normal, final.normal),
      },
      affinity: {
        value: Math.round(final.affinity * 10) / 10,
        percent: pct(base.affinity, final.affinity),
      },
    };
  }, [stats]);

  const statImpact = useMemo(() => {
    const baseG = (k: string) =>
      Number(stats[k].current || 0);

    const baseDmg = calcExpectedNormal(baseG);

    const result: Record<string, number> = {};

    Object.keys(stats).forEach((key) => {
      const inc = Number(stats[key].increase || 0);
      if (inc === 0 || baseDmg === 0) {
        result[key] = 0;
        return;
      }

      const testG = (k: string) =>
        k === key
          ? Number(stats[k].current || 0) + inc
          : Number(stats[k].current || 0);

      const dmg = calcExpectedNormal(testG);
      result[key] = ((dmg - baseDmg) / baseDmg) * 100;
    });

    return result;
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
                                    .replace(/YOURType/g, "Your Type")
                                    .replace(/DMG/g, "DMG ")
                                    .replace(/MIN/g, "Min ")
                                    .replace(/MAX/g, "Max ")
                                    .trim()}
                                </span>
                                <div className="flex items-center gap-2">
                                  {stats[k].increase !== 0 && (
                                    <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                      {Number(stats[k].increase) > 0 ? "+" : ""}
                                      {stats[k].increase}
                                    </Badge>
                                  )}

                                  {statImpact[k] !== 0 && (
                                    <Badge
                                      className="
                                      bg-emerald-500/15 text-emerald-400
                                      border-emerald-500/30
                                    "
                                    >
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
                                  className="bg-background/60 border-[#363b3d]
                                    focus-visible:ring-2 focus-visible:ring-emerald-500/40"
                                  onWheel={(e) => e.currentTarget.blur()}
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
                                  className="bg-background/60 border-[#363b3d]
                                    focus-visible:ring-2 focus-visible:ring-emerald-500/40"
                                  onWheel={(e) => e.currentTarget.blur()}
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
              max-h-[calc(100vh-3rem)]   /* 24px top + breathing room */
              flex flex-col              /* IMPORTANT */

              bg-gradient-to-b from-card/95 to-card/60
              border border-yellow-500/30
              shadow-[0_25px_60px_-15px_rgba(0,0,0,0.6)]
              shadow-yellow-500/20
              ring-1 ring-yellow-500/20
              backdrop-blur-xl
            "
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="text-yellow-500" /> Damage Output
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-6">
              <DamageLine
                label="Normal Average (Expected)"
                value={result.normal.value}
                percent={result.normal.percent}
                color="emerald"
              />

              <DamageLine
                label="Affinity (Max Proc)"
                value={result.affinity.value}
                percent={result.affinity.percent}
                color="amber"
              />

              <Separator className="bg-gradient-to-r from-transparent via-border to-transparent" />

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={applyIncreaseToCurrent}
                  className="
                    rounded-xl px-3 py-2 text-sm font-medium
                    bg-emerald-500/15 text-emerald-400
                    border border-emerald-500/30
                    hover:bg-emerald-500/25
                    transition
                  "
                >
                  Apply Increase → Current
                </button>

                <button
                  onClick={saveCurrentStats}
                  className="
                    rounded-xl px-3 py-2 text-sm font-medium
                    bg-amber-500/15 text-amber-400
                    border border-amber-500/30
                    hover:bg-amber-500/25
                    transition
                  "
                >
                  Save Current
                </button>
              </div>

              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <ArrowUpRight size={14} /> Auto update · Min–Max formula
              </div>

              {Number(stats.CriticalRate.current || 0) + Number(stats.AffinityRate.current || 0) > 100 && (
                <Badge className="bg-red-500/15 text-red-400 border border-red-500/30">
                  Crit + Affinity &gt; 100%
                </Badge>
              )}

              {Number(stats.AffinityRate.current || 0) + Number(stats.AffinityRate.increase || 0) > 100 && (
                <Badge className="bg-red-500/15 text-red-400 border border-red-500/30">
                  Affinity &gt; 100%
                </Badge>
              )}
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
  percent,
  color,
}: {
  label: string;
  value: number;
  percent: number;
  color: "emerald" | "amber";
}) {
  const colorClasses = {
    emerald: "text-emerald-500",
    amber: "text-amber-500",
  };
  const bgClasses = {
    emerald: "bg-emerald-500/20",
    amber: "bg-amber-500/20",
  };

  return (
    <div className="space-y-1">
      <p className="text-sm text-muted-foreground">{label}</p>

      <div className="flex items-end justify-between">
        <p className={`relative text-3xl font-bold ${colorClasses[color]}`}>
          <span className={`absolute inset-0 blur-xl ${bgClasses[color]}`} />
          <span className="relative">{value.toLocaleString()}</span>
        </p>

        {percent !== 0 && (
          <Badge
            className={`
              bg-${color}-500/15
              text-${color}-400
              border border-${color}-500/30
            `}
          >
            {percent > 0 ? "+" : ""}
            {percent.toFixed(2)}%
          </Badge>
        )}
      </div>
    </div>
  );
}
