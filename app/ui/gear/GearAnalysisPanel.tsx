"use client";

import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  LabelList
} from "recharts";
import { 
  Dna, 
  ShieldCheck, 
  Zap, 
  Sword, 
  TrendingUp, 
  Camera,
  Info
} from "lucide-react";

import { useI18n } from "@/app/providers/I18nProvider";
import { getStatLabel } from "@/app/utils/statLabel";
import { STAT_GROUPS, GEAR_SLOTS } from "@/app/constants";
import { analyzeEquippedGear } from "@/app/domain/gear/gearAggregate";
import { CustomGear, GearSlot, ElementStats } from "@/app/types";
import { exportElementToPNG } from "@/app/utils/exportPng";
import { cn } from "@/lib/utils";

interface Props {
  gears: CustomGear[];
  equipped: Partial<Record<GearSlot, string | undefined>>;
  elementStats: ElementStats;
}

interface GroupedStatEntry {
  name: string;
  totalCount: number;
  subCount: number;
  totalValue: number;
  statKey: string;
  isVirtual?: boolean;
}

export default function GearAnalysisPanel({ gears, equipped, elementStats }: Props) {
  const { language } = useI18n();
  
  const text = language === "vi"
    ? {
        title: "📊 Phân tích Trang bị",
        subTitle: "Tổng hợp dòng phụ & chỉ số",
        totalSubs: "Tổng số dòng phụ",
        equipped: "Đã trang bị",
        exportPng: "📸 Xuất PNG",
        statDistribution: "Phân bổ dòng phụ",
        statDetails: "Chi tiết chỉ số",
        count: "dòng",
        total: "Tổng cộng",
        noData: "Chưa có trang bị nào để phân tích.",
        groupCore: "Cốt lõi",
        groupAttr: "Thuộc tính",
        groupRates: "Tỷ lệ",
        groupDef: "Phòng thủ",
        groupElem: "Nguyên tố",
        groupOther: "Khác"
      }
    : {
        title: "📊 Gear Analysis",
        subTitle: "Sub-stat distribution & summary",
        totalSubs: "Total Sub-lines",
        equipped: "Equipped",
        exportPng: "📸 Export PNG",
        statDistribution: "Sub-stat Distribution",
        statDetails: "Stat Details",
        count: "lines",
        total: "Total",
        noData: "No gear equipped for analysis.",
        groupCore: "Core",
        groupAttr: "Attributes",
        groupRates: "Rates",
        groupDef: "Defense",
        groupElem: "Element",
        groupOther: "Other"
      };

  const analysis = useMemo(() => analyzeEquippedGear(gears, equipped), [gears, equipped]);
  
  const chartData = useMemo(() => {
    return Object.entries(analysis.statSummary)
      .map(([stat, data]) => ({
        name: getStatLabel(stat, elementStats),
        count: data.subCount + data.additionCount, // Exclude mainCount
        statKey: stat
      }))
      .filter(d => d.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [analysis.statSummary, elementStats]);

  if (analysis.equippedCount === 0) {
    return (
      <Card className="p-8 text-center bg-card/60 border-white/10 italic text-muted-foreground">
        {text.noData}
      </Card>
    );
  }

  // Group stats for display
  const groupedStats = (() => {
    const groups: Record<string, GroupedStatEntry[]> = {
      Core: [],
      Attributes: [],
      Rates: [],
      Defense: [],
      Element: [],
      Other: []
    };

    let totalMartialArtsBoost = 0;

    Object.entries(analysis.statSummary).forEach(([stat, data]) => {
      const totalBonusCount = data.subCount + data.additionCount; // Exclude main
      if (totalBonusCount === 0 && data.total === 0) return;

      const entry: GroupedStatEntry = {
        name: getStatLabel(stat, elementStats),
        totalCount: totalBonusCount,
        subCount: data.subCount,
        totalValue: data.total, // Already excludes main from analyzeEquippedGear change
        statKey: stat
      };

      // Sum martial arts boosts
      if (stat === "MartialArtSkillDamageBoost" || stat.includes("MartialArtSkillDMGBoost")) {
          totalMartialArtsBoost += data.total;
      }

      let assigned = false;
      for (const [groupName, keys] of Object.entries(STAT_GROUPS)) {
        if (keys.includes(stat as any)) {
          groups[groupName]?.push(entry);
          assigned = true;
          break;
        }
      }

      if (!assigned) {
        if (stat.includes("Min") || stat.includes("Max") || stat.includes("Penetration") || stat.includes("DMGBonus")) {
            groups.Element.push(entry);
        } else {
            groups.Other.push(entry);
        }
      }
    });

    // Add All Martial Arts Boost if there's any value
    if (totalMartialArtsBoost > 0) {
        groups.Core.unshift({
            name: language === "vi" ? "Tổng cộng Võ học" : "All Martial Arts Boost",
            totalCount: 0,
            subCount: 0,
            totalValue: totalMartialArtsBoost,
            statKey: "ALL_MARTIAL_ARTS",
            isVirtual: true
        });
    }

    return groups;
  })();

  const getGroupIcon = (name: string) => {
    switch (name) {
      case "Core": return <Sword className="w-4 h-4" />;
      case "Attributes": return <Dna className="w-4 h-4" />;
      case "Rates": return <TrendingUp className="w-4 h-4" />;
      case "Defense": return <ShieldCheck className="w-4 h-4" />;
      case "Element": return <Zap className="w-4 h-4" />;
      default: return <Info className="w-4 h-4" />;
    }
  };

  const getGroupLabel = (name: string) => {
    switch (name) {
        case "Core": return text.groupCore;
        case "Attributes": return text.groupAttr;
        case "Rates": return text.groupRates;
        case "Defense": return text.groupDef;
        case "Element": return text.groupElem;
        default: return text.groupOther;
    }
  };

  return (
    <Card id="gear-analysis-section" className="p-4 space-y-6 bg-card/60 border-white/10 shadow-xl overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            {text.title}
          </h2>
          <p className="text-sm text-muted-foreground">{text.subTitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex flex-col items-end mr-2">
             <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">{text.totalSubs}</span>
             <span className="text-2xl font-black text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.3)]">{analysis.totalSubLines}</span>
          </div>
          <Badge variant="outline" className="h-10 px-4 border-white/20 bg-white/10 text-white font-bold">
            {analysis.equippedCount}/{GEAR_SLOTS.length} {text.equipped}
          </Badge>
          <Button 
            variant="secondary" 
            size="icon" 
            onClick={() => exportElementToPNG("gear-analysis-section")}
            className="h-10 w-10"
          >
            <Camera className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <Separator className="bg-white/5" />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Chart */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              {text.statDistribution}
            </h3>
          </div>
          
          <div className="h-[300px] w-full bg-black/20 rounded-xl p-2 border border-white/5">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 40, top: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" hide domain={[0, 'dataMax + 1']} />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  width={100} 
                  tick={{ fontSize: 10, fill: "rgba(255,255,255,0.8)" }} 
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ 
                    backgroundColor: '#18181b', 
                    borderColor: 'rgba(255,255,255,0.1)', 
                    color: '#fff', 
                    fontSize: '12px',
                    borderRadius: '8px'
                  }}
                  itemStyle={{ color: '#34d399', fontWeight: 'bold' }}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={12}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={`hsl(${index * 25 % 360}, 70%, 60%)`} />
                  ))}
                  <LabelList 
                    dataKey="count" 
                    position="right" 
                    fill="rgba(255,255,255,0.9)" 
                    fontSize={10} 
                    fontWeight="bold"
                    offset={8}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: Detailed list by group */}
        <div className="lg:col-span-3 space-y-4">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-400" />
            {text.statDetails}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-2">
            {Object.entries(groupedStats).map(([groupName, stats]) => {
              if (stats.length === 0) return null;
              return (
                <div key={groupName} className="space-y-2">
                  <div className="flex items-center gap-2 py-1 px-2 bg-white/5 rounded-md">
                    <span className="text-emerald-400">{getGroupIcon(groupName)}</span>
                    <span className="text-xs font-bold uppercase tracking-wider">{getGroupLabel(groupName)}</span>
                  </div>
                  <div className="space-y-1.5 px-1">
                    {stats.map((s: GroupedStatEntry) => (
                      <div key={s.statKey} className="group">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-muted-foreground group-hover:text-foreground transition-colors truncate max-w-[120px]">
                            {s.name}
                          </span>
                          <div className="flex items-center gap-2">
                             {!s.isVirtual && (
                                <Badge variant="outline" className="h-4 px-1 text-[9px] border-emerald-500/20 text-emerald-400 bg-emerald-500/5" title="Mains + Subs + Additions">
                                    {s.totalCount} {text.count}
                                </Badge>
                             )}
                             <span className={cn(
                                "font-mono font-bold",
                                s.isVirtual ? "text-blue-400" : "text-emerald-400"
                             )}>
                               +{s.totalValue.toFixed(1)}
                             </span>
                          </div>
                        </div>
                        {!s.isVirtual && (
                            <Progress 
                                value={Math.min(100, (s.totalCount / 12) * 100)} 
                                className="h-1 bg-white/5" 
                                indicatorClassName="bg-emerald-500"
                            />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
}
