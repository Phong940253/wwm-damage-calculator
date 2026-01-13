// app/gear/GearOptimizeDialog.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { CustomGear } from "@/app/types";

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

import GearHoverDetail from "./GearHoverDetail";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  loading: boolean;
  error: string | null;
  results: OptimizeResult[];
  baseDamage: number;
  combos: number;
  maxDisplay: number;
  setMaxDisplay: (v: number) => void;
  onRecalculate: () => void;
  onApply: (s: OptimizeResult["selection"]) => void;
  equipped?: Partial<Record<string, string>>;
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
  maxDisplay,
  setMaxDisplay,
  onRecalculate,
  onApply,
  equipped = {},
  customGears = [],
}: Props) {
  return (
    <Dialog open={open && !loading} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-7xl md:max-h-[85vh] p-0 overflow-hidden">
        <div className="p-6 pb-4">
          <DialogHeader>
            <DialogTitle className="text-xl">Optimize Gear Results</DialogTitle>
          </DialogHeader>

          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="secondary">Combos: {combos.toLocaleString()}</Badge>
            <Badge variant="secondary">Current dmg: {baseDamage.toFixed(1)}</Badge>
            <span>Hover a highlighted gear name to compare.</span>
          </div>
        </div>

        <Separator />

        <div className="max-h-[70vh] overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-pulse text-sm text-muted-foreground">
                Calculating every gear combination...
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
                      <div className="text-sm font-medium">Controls</div>
                      <div className="text-xs text-muted-foreground">
                        Adjust max results then recalculate to update the table.
                      </div>
                    </div>

                    <div className="flex items-end gap-3">
                      <label className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">Max results</span>
                        <Input
                          type="number"
                          value={maxDisplay}
                          className="h-9 w-24"
                          onChange={(e) => setMaxDisplay(Number(e.target.value) || 1)}
                          min={1}
                        />
                      </label>
                      <Button size="sm" onClick={onRecalculate}>
                        Recalculate
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Results Table */}
                {results.length > 0 ? (
                  <div className="rounded-lg border overflow-hidden bg-card">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead className="sticky top-0 z-10 bg-background/80 backdrop-blur border-b">
                          <tr>
                            <th className="text-left p-3 font-semibold">#</th>
                            <th className="text-right p-3 font-semibold">Damage</th>
                            <th className="text-right p-3 font-semibold">Gain</th>
                            {GEAR_SLOTS.map(({ label }) => (
                              <th
                                key={label}
                                className="text-left p-3 font-semibold whitespace-nowrap"
                              >
                                {label}
                              </th>
                            ))}
                            <th className="text-center p-3 font-semibold">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {results.map((r, i) => {
                            const gainLabel = `${r.percentGain >= 0 ? "+" : ""}${r.percentGain.toFixed(2)}%`;
                            const gainTone =
                              r.percentGain > 0
                                ? "bg-emerald-500/15 text-emerald-700 border-emerald-500/25"
                                : r.percentGain < 0
                                  ? "bg-destructive/15 text-destructive border-destructive/25"
                                  : "bg-muted text-muted-foreground border-border";

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
                                {GEAR_SLOTS.map(({ key }) => {
                                  const g = r.selection[key];
                                  const currentEquipped = equipped[key];
                                  const isNew = g && g.id !== currentEquipped;

                                  const oldGear = currentEquipped
                                    ? customGears.find((gear) => gear.id === currentEquipped)
                                    : null;

                                  return (
                                    <td key={key} className="p-3">
                                      {isNew && g ? (
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
                                            <GearHoverDetail gear={g} oldGear={oldGear} />
                                          </HoverCardContent>
                                        </HoverCard>
                                      ) : (
                                        <span className="text-muted-foreground text-xs">—</span>
                                      )}
                                    </td>
                                  );
                                })}
                                <td className="p-3 text-center">
                                  <Button
                                    size="sm"
                                    onClick={() => onApply(r.selection)}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                  >
                                    Equip
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
                    No results found. Try running the optimizer.
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
