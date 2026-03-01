// app/gear/GearOptimizeDialog.tsx
"use client";

import { useMemo, useState } from "react";
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

import GearHoverDetail from "./GearHoverDetail";
import { useI18n } from "@/app/providers/I18nProvider";

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
      controlsHint: "Điều chỉnh số kết quả tối đa rồi tính lại để cập nhật bảng.",
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
      controlsHint: "Adjust max results then recalculate to update the table.",
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
      action: "Action",
      empty: "No results found. Try changing filters or running the optimizer.",
      equip: "Equip",
      noResultCell: "—",
    };

  const baseGearBonus = useMemo(
    () => aggregateEquippedGearBonus(customGears, equipped),
    [customGears, equipped]
  );

  const [resultQuery, setResultQuery] = useState("");
  const [upgradesOnly, setUpgradesOnly] = useState(true);
  const [resultSort, setResultSort] = useState<"gain" | "damage">("gain");
  const [resultDir, setResultDir] = useState<"desc" | "asc">("desc");

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

    const dir = resultDir === "asc" ? 1 : -1;
    const sorted = [...list].sort((a, b) => {
      const primary =
        resultSort === "gain"
          ? a.percentGain - b.percentGain
          : a.damage - b.damage;
      if (primary !== 0) return primary * dir;
      // deterministic tie-breakers
      if (a.damage !== b.damage) return (a.damage - b.damage) * dir;
      return a.key.localeCompare(b.key);
    });

    return sorted;
  }, [results, upgradesOnly, resultQuery, resultSort, resultDir]);

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

        <div className="max-h-[70vh] overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-pulse text-sm text-muted-foreground">
                {text.calculating}
              </div>
            </div>
          ) : error ? (
            <div className="p-6">
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
                {error}
              </div>
            </div>
          ) : (
            <>
              <div className="p-6 space-y-4">
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
                        variant={resultSort === "gain" ? "default" : "outline"}
                        onClick={() => setResultSort("gain")}
                      >
                        {text.sortGain}
                      </Button>
                      <Button
                        size="sm"
                        variant={resultSort === "damage" ? "default" : "outline"}
                        onClick={() => setResultSort("damage")}
                      >
                        {text.sortDamage}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setResultDir((d) => (d === "desc" ? "asc" : "desc"))}
                        title="Toggle sort direction"
                      >
                        {resultDir === "desc" ? "↓" : "↑"}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Results Table */}
                {displayedResults.length > 0 ? (
                  <div className="rounded-lg border overflow-hidden bg-card">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead className="sticky top-0 z-10 bg-background/80 backdrop-blur border-b">
                          <tr>
                            <th className="text-left p-3 font-semibold">{text.row}</th>
                            <th className="text-right p-3 font-semibold">{text.damage}</th>
                            <th className="text-right p-3 font-semibold">{text.gain}</th>
                            <th className="text-center p-3 font-semibold whitespace-nowrap">
                              {text.changes}
                            </th>
                            {GEAR_SLOTS.map(({ label }) => (
                              <th
                                key={label}
                                className="text-left p-3 font-semibold whitespace-nowrap"
                              >
                                {label}
                              </th>
                            ))}
                            <th className="text-center p-3 font-semibold">{text.action}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {displayedResults.map((r, i) => {
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
                                <td className="p-3 font-medium">{i + 1}</td>
                                <td className="text-right p-3 font-bold text-base tabular-nums">
                                  {r.damage.toFixed(1)}
                                </td>
                                <td className="text-right p-3">
                                  <Badge
                                    variant="outline"
                                    className={`ml-auto tabular-nums ${gainTone}`}
                                  >
                                    {gainLabel}
                                  </Badge>
                                </td>
                                <td className="p-3 text-center">
                                  <Badge
                                    variant="secondary"
                                    className="tabular-nums"
                                    title="How many slots change vs equipped"
                                  >
                                    {changeCount}
                                  </Badge>
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
                                              <span className="inline-flex items-center px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-700 cursor-help underline decoration-dotted hover:bg-emerald-500/20 transition-colors truncate max-w-[140px]">
                                                {g.name}
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
                                          <span className="text-muted-foreground truncate inline-block max-w-[140px]">
                                            {g.name}
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
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border bg-muted/20 p-10 text-center text-muted-foreground">
                    {text.empty}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
