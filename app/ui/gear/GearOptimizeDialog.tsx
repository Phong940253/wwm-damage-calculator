// app/gear/GearOptimizeDialog.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { GEAR_SLOTS } from "@/app/constants";
import { OptimizeResult } from "../../domain/gear/gearOptimize";
import { CustomGear, GearSlot } from "@/app/types";

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
      <DialogContent className="max-w-6xl md:max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="text-lg">Optimize Gear Results</DialogTitle>
        </DialogHeader>

        <div className="max-h-[70vh] overflow-y-auto space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-pulse text-sm text-muted-foreground">
                Calculating every gear combination...
              </div>
            </div>
          ) : error ? (
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded text-sm text-destructive">
              {error}
            </div>
          ) : (
            <>
              {/* Stats Header */}
              <div className="bg-muted/50 p-4 rounded-lg border space-y-2">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Current Damage:</span>
                    <div className="text-2xl font-bold text-foreground">
                      {baseDamage.toFixed(1)}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total Combos:</span>
                    <div className="text-2xl font-bold text-foreground">
                      {combos.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Max results:</span>
                  <Input
                    type="number"
                    value={maxDisplay}
                    className="h-9 w-20"
                    onChange={(e) => setMaxDisplay(Number(e.target.value) || 1)}
                    min={1}
                  />
                </label>
                <Button size="sm" onClick={onRecalculate}>
                  Recalculate
                </Button>
              </div>

              {/* Results Table */}
              {results.length > 0 ? (
                <div className="rounded-lg border overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-muted border-b">
                          <th className="text-left p-3 font-semibold">#</th>
                          <th className="text-right p-3 font-semibold">Damage</th>
                          <th className="text-right p-3 font-semibold">Gain %</th>
                          {GEAR_SLOTS.map(({ label }) => (
                            <th key={label} className="text-left p-3 font-semibold whitespace-nowrap">
                              {label}
                            </th>
                          ))}
                          <th className="text-center p-3 font-semibold">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.map((r, i) => (
                          <tr
                            key={r.key}
                            className="border-b hover:bg-muted/40 transition-colors even:bg-muted/20"
                          >
                            <td className="p-3 font-medium">{i + 1}</td>
                            <td className="text-right p-3 font-bold text-base">
                              {r.damage.toFixed(1)}
                            </td>
                            <td
                              className={`text-right p-3 font-semibold ${r.percentGain < 0
                                  ? "text-red-600"
                                  : r.percentGain > 0
                                    ? "text-emerald-600"
                                    : "text-muted-foreground"
                                }`}
                            >
                              {r.percentGain >= 0 ? "+" : ""}
                              {r.percentGain.toFixed(2)}%
                            </td>
                            {GEAR_SLOTS.map(({ key, label }) => {
                              const g = r.selection[key];
                              const currentEquipped = equipped[key];
                              const isNew = g && g.id !== currentEquipped;

                              // Find the old gear by ID
                              const oldGear = currentEquipped
                                ? customGears.find((gear) => gear.id === currentEquipped)
                                : null;

                              return (
                                <td key={key} className="p-3">
                                  {isNew && g ? (
                                    <HoverCard openDelay={150}>
                                      <HoverCardTrigger asChild>
                                        <span className="inline-block px-2 py-1 rounded bg-emerald-100 text-emerald-700 cursor-help underline decoration-dotted hover:bg-emerald-200 transition-colors truncate max-w-[120px]">
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
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No results found. Try running the optimizer.
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
