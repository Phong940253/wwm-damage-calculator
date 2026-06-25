// app/gear/GearOptimizeDialog.tsx
"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { GEAR_SLOTS } from "@/app/constants";
import { OptimizeResult } from "../../domain/gear/gearOptimize";
import { CustomGear, ElementStats, GearSlot, InputStats, Rotation } from "@/app/types";
import { aggregateEquippedGearBonus } from "@/app/domain/gear/gearAggregate";

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import GearHoverDetail from "./GearHoverDetail";
import { useI18n } from "@/app/providers/I18nProvider";
import { getTuneSuccessRateToneClass, getTuneSystemStatPool } from "@/app/domain/gear/tuneAdvisor";

type GearWithTune = CustomGear & { __tuneId?: string; __tuneLabel?: string; __tuneFrom?: string };
const getTuneMeta = (g: CustomGear | undefined): GearWithTune | undefined => g as GearWithTune;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  loading: boolean;
  error: string | null;
  results: OptimizeResult[];
  baseDamage: number;
  combos: number;
  stats: InputStats;
  elementStats: ElementStats;
  rotation?: Rotation;
  maxDisplay: number;
  setMaxDisplay: (v: number) => void;
  perSlotCap: number;
  setPerSlotCap: (v: number) => void;
  onRecalculate: () => void;
  onApply: (s: OptimizeResult["selection"]) => void;
  equipped?: Partial<Record<GearSlot, string>>;
  customGears?: CustomGear[];
}

export default function GearOptimizeDialog({
  open,
  onOpenChange,
  loading,
  error,
  results,
  baseDamage,
  combos,
  stats,
  elementStats,
  rotation,
  maxDisplay,
  setMaxDisplay,
  perSlotCap,
  setPerSlotCap,
  onRecalculate,
  onApply,
  equipped = {},
  customGears = [],
}: Props) {
  const { language } = useI18n();
  const text = language === "vi"
    ? {
      title: "Kết quả tối ưu trang bị",
      combos: "Tổ hợp",
      currentDamage: "Sát thương hiện tại",
      showing: "Hiển thị",
      hoverHint: "Di chuột vào tên trang bị được tô sáng để so sánh.",
      calculating: "Đang tính mọi tổ hợp trang bị...",
      controls: "Điều khiển",
      controlsHint: "Thay đổi số KQ tối đa để ẩn/bớt kết quả ngay lập tức. Bấm 'Tính lại' để tối ưu với bộ lọc mới.",
      maxResults: "KQ tối đa",
      itemPerSlotCap: "Giới hạn/ô",
      recalculate: "Tính lại",
      upgradesOnly: "Chỉ hiển thị nâng cấp",
      searchPlaceholder: "Tìm kết quả theo tên trang bị...",
      sortGain: "Sắp xếp: Tăng %",
      sortDamage: "Sắp xếp: Sát thương",
      row: "#",
      damage: "Sát thương",
      gain: "Tăng",
      changes: "Thay đổi",
      tune: "Tune/Swap",
      rate: "Tỉ lệ",
      action: "Hành động",
      empty: "Không có kết quả. Hãy đổi bộ lọc hoặc chạy lại tối ưu.",
      equip: "Trang bị",
      noResultCell: "—",
    }
    : {
      title: "Optimize Gear Results",
      combos: "Combos",
      currentDamage: "Current dmg",
      showing: "Showing",
      hoverHint: "Hover a highlighted gear name to compare.",
      calculating: "Calculating every gear combination...",
      controls: "Controls",
      controlsHint: "Change max results to show/hide results instantly. Click 'Recalculate' to re-run with new filters.",
      maxResults: "Max results",
      itemPerSlotCap: "Items/slot cap",
      recalculate: "Recalculate",
      upgradesOnly: "Upgrades only",
      searchPlaceholder: "Search results by gear name...",
      sortGain: "Sort: Gain",
      sortDamage: "Sort: Damage",
      row: "#",
      damage: "Damage",
      gain: "Gain",
      changes: "Changes",
      tune: "Tune/Swap",
      rate: "Rate",
      action: "Action",
      empty: "No results found. Try changing filters or running the optimizer.",
      equip: "Equip",
      noResultCell: "—",
    };

  const baseGearBonus = useMemo(
    () => aggregateEquippedGearBonus(customGears, equipped),
    [customGears, equipped]
  );

  const tunePoolSize = useMemo(
    () => getTuneSystemStatPool(elementStats.selected).length,
    [elementStats.selected],
  );
  const compositeSuccessRate = useCallback((r: OptimizeResult): number => {
    let composite = 1;
    for (const { key } of GEAR_SLOTS) {
      const meta = getTuneMeta(r.selection[key]);
      const id = meta?.__tuneId;
      if (!id) continue;
      if (id.startsWith("::swap::")) continue;
      if (id.startsWith("::tune::")) {
        const parts = id.split("::");
        const subIndex = parseInt(parts[2], 10);
        const currentStat = String(meta.subs?.[subIndex]?.stat ?? "");
        const excluded = new Set<string>();
        if (currentStat) excluded.add(currentStat);
        const hist = (meta as CustomGear).tuneHistory ?? [];
        for (const entry of hist) {
          if (entry.subIndex === subIndex && entry.stat) {
            excluded.add(entry.stat);
          }
        }
        const effectivePool = tunePoolSize - excluded.size;
        if (effectivePool <= 0) return 0;
        composite *= (1 / effectivePool);
      }
    }
    return composite;
  }, [tunePoolSize]);

  const [resultQuery, setResultQuery] = useState("");
  const [upgradesOnly, setUpgradesOnly] = useState(true);
  type SortCol = "gain" | "damage" | "changes" | "tune" | "rate";
  type SortAction = { type: "setCol"; col: SortCol } | { type: "toggleDir" };
  const [sort, dispatchSort] = useReducer(
    (prev: { col: SortCol; dir: "desc" | "asc" }, action: SortAction): typeof prev => {
      if (action.type === "setCol") {
        return prev.col === action.col
          ? { ...prev, dir: prev.dir === "desc" ? "asc" : "desc" }
          : { col: action.col, dir: "desc" };
      }
      return { ...prev, dir: prev.dir === "desc" ? "asc" : "desc" };
    },
    { col: "gain", dir: "desc" }
  );

  const displayedResults = useMemo(() => {
    let list = results;

    if (upgradesOnly) {
      list = list.filter((r) => r.percentGain > 0);
    }



    const q = resultQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((r) => {
        for (const { key } of GEAR_SLOTS) {
          const g = r.selection[key];
          if (g?.name && g.name.toLowerCase().includes(q)) return true;
        }
        return false;
      });
    }

    const changeCount = (r: OptimizeResult) =>
      GEAR_SLOTS.reduce((acc, { key }) => acc + (r.selection[key] && r.selection[key]!.id !== equipped[key] ? 1 : 0), 0);

    const tuneSwapCount = (r: OptimizeResult) =>
      GEAR_SLOTS.reduce((acc, { key }) => acc + ((r.selection[key] as GearWithTune)?.__tuneId ? 1 : 0), 0);

    const dir = sort.dir === "asc" ? 1 : -1;
    const sorted = [...list].sort((a, b) => {
      let primary = 0;
      if (sort.col === "gain") primary = a.percentGain - b.percentGain;
      else if (sort.col === "damage") primary = a.damage - b.damage;
      else if (sort.col === "changes") primary = changeCount(a) - changeCount(b);
      else if (sort.col === "tune") primary = tuneSwapCount(a) - tuneSwapCount(b);
      else if (sort.col === "rate") primary = compositeSuccessRate(a) - compositeSuccessRate(b);
      if (primary !== 0) return primary * dir;
      // tie-breaker: Gain always descending
      if (a.percentGain !== b.percentGain) return b.percentGain - a.percentGain;
      return a.key.localeCompare(b.key);
    });

    return sorted.slice(0, maxDisplay);
  }, [results, upgradesOnly, resultQuery, sort.col, sort.dir, equipped, maxDisplay, compositeSuccessRate]);

  const handleSort = (col: SortCol) => {
    dispatchSort({ type: "setCol", col });
  };

  /* ===== Virtual scrolling ===== */
  const ROW_H = 36;
  const OVERSCAN = 20;
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewH, setViewH] = useState(800);

  useEffect(() => {
    setViewH(scrollRef.current?.clientHeight ?? 800);
  }, []);

  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (el) setScrollTop(el.scrollTop);
  }, []);

  const startIdx = Math.max(0, Math.floor(scrollTop / ROW_H) - OVERSCAN);
  const endIdx = Math.min(displayedResults.length, Math.ceil((scrollTop + viewH) / ROW_H) + OVERSCAN);
  const visibleRows = displayedResults.slice(startIdx, endIdx);

  return (
    <Dialog open={open && !loading} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-7xl md:max-h-[85vh] p-0 overflow-hidden">
        <div className="p-6 pb-4">
          <DialogHeader>
            <DialogTitle className="text-xl">{text.title}</DialogTitle>
          </DialogHeader>

          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="secondary">{text.combos}: {combos.toLocaleString()}</Badge>
            <Badge variant="secondary">{text.currentDamage}: {baseDamage.toFixed(1)}</Badge>
            <Badge variant="secondary">
              {text.showing}: {displayedResults.length.toLocaleString()} / {results.length.toLocaleString()}
            </Badge>
            <span>{text.hoverHint}</span>
          </div>
        </div>

        <Separator />

        {loading ? (
            <div className="max-h-[70vh] overflow-y-auto">
              <div className="flex flex-col items-center justify-center py-12">
                <div className="animate-pulse text-sm text-muted-foreground">
                  {text.calculating}
                </div>
              </div>
            </div>
          ) : error ? (
            <div className="max-h-[70vh] overflow-y-auto">
              <div className="p-6">
                <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
                  {error}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col max-h-[70vh] overflow-hidden">
              <div className="p-6 pb-4 flex-shrink-0">
                {/* Controls */}
                <div className="rounded-lg border bg-muted/30 p-4 flex flex-col gap-3">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div className="space-y-1">
                      <div className="text-sm font-medium">{text.controls}</div>
                      <div className="text-xs text-muted-foreground">
                        {text.controlsHint}
                      </div>
                    </div>

                    <div className="flex items-end gap-3">
                      <label className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">{text.maxResults}</span>
                        <Input
                          type="number"
                          value={maxDisplay}
                          className="h-9 w-24"
                          onChange={(e) => setMaxDisplay(Number(e.target.value) || 1)}
                          min={1}
                        />
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">{text.itemPerSlotCap}</span>
                        <Input
                          type="number"
                          value={perSlotCap}
                          className="h-9 w-24"
                          onChange={(e) => setPerSlotCap(Math.max(0, Number(e.target.value) || 0))}
                          min={0}
                          title="0 = auto (no fixed per-slot cap)"
                        />
                      </label>
                      <Button data-tour="gear-optimize-recalculate" size="sm" onClick={onRecalculate}>
                        {text.recalculate}
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="opt-upgrades-only"
                        checked={upgradesOnly}
                        onCheckedChange={(v) => setUpgradesOnly(Boolean(v))}
                      />
                      <label
                        htmlFor="opt-upgrades-only"
                        className="text-sm text-muted-foreground select-none"
                      >
                        {text.upgradesOnly}
                      </label>
                    </div>

                    <div className="flex-1 min-w-[220px]">
                      <Input
                        value={resultQuery}
                        onChange={(e) => setResultQuery(e.target.value)}
                        placeholder={text.searchPlaceholder}
                        className="h-9"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant={sort.col === "gain" ? "default" : "outline"}
                        onClick={() => dispatchSort({ type: "setCol", col: "gain" })}
                      >
                        {text.sortGain}
                      </Button>
                      <Button
                        size="sm"
                        variant={sort.col === "damage" ? "default" : "outline"}
                        onClick={() => dispatchSort({ type: "setCol", col: "damage" })}
                      >
                        {text.sortDamage}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => dispatchSort({ type: "toggleDir" })}
                        title="Toggle sort direction"
                      >
                        {sort.dir === "desc" ? "↓" : "↑"}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
              <div ref={scrollRef} onScroll={onScroll} className="px-6 pb-6 flex-1 min-h-0 overflow-auto">
                {displayedResults.length > 0 ? (
                  <div className="rounded-lg border bg-card" style={{ minWidth: 2040 }}>
                    <table className="w-full text-xs border-collapse">
                        <thead className="sticky top-0 z-40 bg-background/80 backdrop-blur border-b">
                          <tr>
                            <th style={{ position: "sticky", left: 0, zIndex: 30, width: 60, backgroundColor: "hsl(var(--background))" }} className="text-left p-3 font-semibold">{text.row}</th>
                            <th style={{ position: "sticky", left: 60, zIndex: 30, width: 120, backgroundColor: "hsl(var(--background))", cursor: "pointer" }} className="text-right p-3 font-semibold select-none" onClick={() => handleSort("damage")}>
                              {text.damage}{sort.col === "damage" ? (sort.dir === "desc" ? " ↓" : " ↑") : ""}
                            </th>
                            <th style={{ position: "sticky", left: 180, zIndex: 30, width: 110, backgroundColor: "hsl(var(--background))", cursor: "pointer" }} className="text-right p-3 font-semibold select-none" onClick={() => handleSort("gain")}>
                              {text.gain}{sort.col === "gain" ? (sort.dir === "desc" ? " ↓" : " ↑") : ""}
                            </th>
                            <th style={{ position: "sticky", left: 290, zIndex: 30, width: 80, backgroundColor: "hsl(var(--background))", cursor: "pointer" }} className="text-center p-3 font-semibold select-none" onClick={() => handleSort("changes")}>
                              {text.changes}{sort.col === "changes" ? (sort.dir === "desc" ? " ↓" : " ↑") : ""}
                            </th>
                            <th style={{ position: "sticky", left: 370, zIndex: 30, width: 120, backgroundColor: "hsl(var(--background))", cursor: "pointer" }} className="text-center p-3 font-semibold select-none" onClick={() => handleSort("tune")}>
                              {text.tune}{sort.col === "tune" ? (sort.dir === "desc" ? " ↓" : " ↑") : ""}
                            </th>
                            <th style={{ position: "sticky", left: 490, zIndex: 30, width: 90, boxShadow: "inset -1px 0 0 0 hsl(var(--border))", backgroundColor: "hsl(var(--background))", cursor: "pointer" }} className="text-center p-3 font-semibold select-none" onClick={() => handleSort("rate")}>
                              {text.rate}{sort.col === "rate" ? (sort.dir === "desc" ? " ↓" : " ↑") : ""}
                            </th>
                            {GEAR_SLOTS.map(({ label }) => (
                              <th
                                key={label}
                                style={{ backgroundColor: "hsl(var(--background))" }}
                                className="text-left p-3 font-semibold whitespace-nowrap"
                              >
                                {label}
                              </th>
                            ))}
                            <th style={{ backgroundColor: "hsl(var(--background))" }} className="text-center p-3 font-semibold">{text.action}</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr style={{ height: startIdx * ROW_H, display: 'block' }} />
                          {visibleRows.map((r, i) => {
                            const gainLabel = `${r.percentGain >= 0 ? "+" : ""}${r.percentGain.toFixed(2)}%`;
                            const gainTone =
                              r.percentGain > 0
                                ? "bg-emerald-500/15 text-emerald-700 border-emerald-500/25"
                                : r.percentGain < 0
                                  ? "bg-destructive/15 text-destructive border-destructive/25"
                                  : "bg-muted text-muted-foreground border-border";

                            const changeCount = GEAR_SLOTS.reduce((acc, { key }) => {
                              const g = r.selection[key];
                              const currentEquipped = equipped[key];
                              return acc + (g && g.id !== currentEquipped ? 1 : 0);
                            }, 0);

                            return (
                              <tr
                                key={r.key}
                                className="border-b hover:bg-muted/40 transition-colors even:bg-muted/10"
                              >
                                <td style={{ position: "sticky", left: 0, zIndex: 20, width: 60, backgroundColor: "hsl(var(--card))" }} className="p-3 font-medium">{startIdx + i + 1}</td>
                                <td style={{ position: "sticky", left: 60, zIndex: 20, width: 120, backgroundColor: "hsl(var(--card))" }} className="text-right p-3 font-bold text-base tabular-nums">
                                  {r.damage.toFixed(1)}
                                </td>
                                <td style={{ position: "sticky", left: 180, zIndex: 20, width: 110, backgroundColor: "hsl(var(--card))" }} className="text-right p-3">
                                  <Badge
                                    variant="outline"
                                    className={`ml-auto tabular-nums ${gainTone}`}
                                  >
                                    {gainLabel}
                                  </Badge>
                                </td>
                                <td style={{ position: "sticky", left: 290, zIndex: 20, width: 80, backgroundColor: "hsl(var(--card))" }} className="p-3 text-center">
                                  <Badge
                                    variant="secondary"
                                    className="tabular-nums"
                                    title="How many slots change vs equipped"
                                  >
                                    {changeCount}
                                  </Badge>
                                </td>
                                <td style={{ position: "sticky", left: 370, zIndex: 20, width: 120, backgroundColor: "hsl(var(--card))" }} className="p-3 text-center">
                                  {(() => {
                                    let tune = 0, swap = 0;
                                    interface TuneDetailItem {
                                      slot: string;
                                      type: string;
                                      fromText: string;
                                      toText: string;
                                      successRate: number;
                                    }
                                    const tuneDetail: TuneDetailItem[] = [];
                                    const tunePoolSize = getTuneSystemStatPool(elementStats.selected).length;
                                    for (const { key, label } of GEAR_SLOTS) {
                                      const meta = getTuneMeta(r.selection[key]);
                                      const id = meta?.__tuneId;
                                      if (meta && id?.startsWith("::tune::")) {
                                        tune++;
                                        const parts = id.split("::");
                                        const subIndex = parseInt(parts[2], 10);
                                        const currentStat = String(meta.subs?.[subIndex]?.stat ?? "");
                                        const excludedLocal = new Set<string>();
                                        if (currentStat) excludedLocal.add(currentStat);
                                        const hist = (meta as CustomGear).tuneHistory ?? [];
                                        for (const entry of hist) {
                                          if (entry.subIndex === subIndex && entry.stat) {
                                            excludedLocal.add(entry.stat);
                                          }
                                        }
                                        const effectivePool = tunePoolSize - excludedLocal.size;
                                        tuneDetail.push({
                                          slot: label,
                                          type: "T",
                                          fromText: meta.__tuneFrom ?? "",
                                          toText: meta.__tuneLabel?.replace(/^→ /, "") ?? "",
                                          successRate: effectivePool > 0 ? (1 / effectivePool) * 100 : 0,
                                        });
                                      } else if (meta && id?.startsWith("::swap::")) {
                                        swap++;
                                        tuneDetail.push({
                                          slot: label,
                                          type: "A",
                                          fromText: meta.__tuneFrom ?? "",
                                          toText: meta.__tuneLabel?.replace(/^Swap → /, "") ?? "",
                                          successRate: 100,
                                        });
                                      }
                                    }
                                    const parts: string[] = [];
                                    if (tune > 0) parts.push(`${tune}T`);
                                    if (swap > 0) parts.push(`${swap}A`);
                                    return parts.length > 0 ? (
                                      <div className="inline-flex items-center gap-1">
                                        <Badge variant="outline" className="tabular-nums text-amber-600 border-amber-300 bg-amber-500/10">
                                          {parts.join(" + ")}
                                        </Badge>
                                        {tuneDetail.length > 0 && (
                                          <Popover>
                                            <PopoverTrigger asChild>
                                              <Button variant="ghost" size="sm" className="h-5 w-5 p-0 rounded-full text-xs text-muted-foreground hover:text-foreground">
                                                i
                                              </Button>
                                            </PopoverTrigger>
                                            <PopoverContent side="right" align="start" className="w-72 p-3 text-xs">
                                              <div className="font-medium mb-2">Tune/Swap Details</div>
                                              <div className="space-y-2">
                                                {tuneDetail.map((d, i) => (
                                                  <div key={i} className="border-b border-border/40 pb-1.5 last:border-0 last:pb-0">
                                                    <div className="flex items-center gap-2 mb-0.5">
                                                      <span className="text-muted-foreground font-medium">{d.slot}</span>
                                                      <span className={`text-[10px] font-bold rounded-sm px-1 leading-tight ${d.type === "T" ? "text-amber-600 bg-amber-200/40" : "text-sky-600 bg-sky-200/40"}`}>
                                                        {d.type}
                                                      </span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-muted-foreground pl-1">
                                                      <span className="text-foreground">{d.fromText}</span>
                                                      <span className="text-muted-foreground/50">→</span>
                                                      <span className="text-foreground">{d.toText}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 pl-1 mt-0.5">
                                                      <span className="text-muted-foreground">Tỉ lệ:</span>
                                                      <Badge variant="outline" className={`tabular-nums text-[10px] px-1.5 py-0 ${getTuneSuccessRateToneClass(d.successRate)}`}>
                                                        {d.successRate.toFixed(d.successRate === 100 ? 0 : 1)}%
                                                      </Badge>
                                                    </div>
                                                  </div>
                                                ))}
                                              </div>
                                            </PopoverContent>
                                          </Popover>
                                        )}
                                      </div>
                                    ) : null;
                                  })()}
                                </td>
                                <td style={{ position: "sticky", left: 490, zIndex: 20, width: 90, boxShadow: "inset -1px 0 0 0 hsl(var(--border))", backgroundColor: "hsl(var(--card))" }} className="p-3 text-center">
                                  {(() => {
                                    const rate = compositeSuccessRate(r);
                                    const hasAny = GEAR_SLOTS.some(({ key }) => (r.selection[key] as GearWithTune)?.__tuneId);
                                    if (!hasAny) return <span className="text-muted-foreground">—</span>;
                                    const pct = rate * 100;
                                    return (
                                      <Badge variant="outline" className={`tabular-nums ${getTuneSuccessRateToneClass(pct)}`}>
                                        {pct.toFixed(pct === 100 ? 0 : 1)}%
                                      </Badge>
                                    );
                                  })()}
                                </td>
                                {GEAR_SLOTS.map(({ key }) => {
                                  const g = r.selection[key];
                                  const currentEquipped = equipped[key];
                                  const isNew = g && g.id !== currentEquipped;

                                  const oldGear = currentEquipped
                                    ? customGears.find((gear) => gear.id === currentEquipped)
                                    : null;

                                  return (
                                    <td key={key} className="p-3">
                                      {g ? (
                                        isNew ? (
                                          <HoverCard openDelay={150}>
                                            <HoverCardTrigger asChild>
                                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-700 cursor-help underline decoration-dotted hover:bg-emerald-500/20 transition-colors truncate max-w-[140px]">
                                                {g.name}
                                                {(() => {
                                                  const meta = getTuneMeta(g);
                                                  if (!meta?.__tuneId) return null;
                                                  const isTune = meta.__tuneId.startsWith("::tune::");
                                                  return (
                                                    <span className={`text-[10px] font-bold rounded-sm px-1 leading-tight ${isTune ? "text-amber-600 bg-amber-200/40" : "text-sky-600 bg-sky-200/40"}`} title={meta.__tuneLabel}>
                                                      {isTune ? "T" : "A"}
                                                    </span>
                                                  );
                                                })()}
                                              </span>
                                            </HoverCardTrigger>
                                            <HoverCardContent
                                              side="right"
                                              align="start"
                                              className="p-0 w-auto"
                                            >
                                              <GearHoverDetail
                                                gear={g}
                                                oldGear={oldGear}
                                                elementStats={elementStats}
                                                stats={stats}
                                                rotation={rotation}
                                                baseGearBonus={baseGearBonus}
                                                baseDamage={baseDamage}
                                              />
                                            </HoverCardContent>
                                          </HoverCard>
                                        ) : (
                                          <span className="text-muted-foreground truncate inline-flex items-center gap-1 max-w-[140px]">
                                            {g.name}
                                            {(() => {
                                              const meta = getTuneMeta(g);
                                              if (!meta?.__tuneId) return null;
                                              const isTune = meta.__tuneId.startsWith("::tune::");
                                              return (
                                                <span className={`text-[10px] font-bold rounded-sm px-1 leading-tight ${isTune ? "text-amber-600 bg-amber-200/40" : "text-sky-600 bg-sky-200/40"}`} title={meta.__tuneLabel}>
                                                  {isTune ? "T" : "A"}
                                                </span>
                                              );
                                            })()}
                                          </span>
                                        )
                                      ) : (
                                        <span className="text-muted-foreground text-xs">{text.noResultCell}</span>
                                      )}
                                    </td>
                                  );
                                })}
                                <td className="p-3 text-center">
                                  <Button
                                    data-tour="gear-optimize-equip"
                                    size="sm"
                                    onClick={() => onApply(r.selection)}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                  >
                                    {text.equip}
                                  </Button>
                                </td>
                              </tr>
                            );
                          })}
                          <tr style={{ height: (displayedResults.length - endIdx) * ROW_H, display: 'block' }} />
                        </tbody>
                        </table>
                  </div>
                ) : (
                  <div className="rounded-lg border bg-muted/20 p-10 text-center text-muted-foreground flex items-center justify-center">
                    {text.empty}
                  </div>
                )}
              </div>
            </div>
          )}
      </DialogContent>
    </Dialog>
  );
}
