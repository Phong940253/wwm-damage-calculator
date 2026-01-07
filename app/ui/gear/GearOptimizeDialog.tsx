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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl md:max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Find Optimize Gear</DialogTitle>
        </DialogHeader>

        <div className="max-h-[62vh] overflow-y-auto space-y-4">
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Calculating every gear combination...
            </p>
          ) : error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : (
            <>
              <div className="flex justify-between text-sm">
                <span>Current damage: {baseDamage.toFixed(1)}</span>
                <span>Combos: {combos.toLocaleString()}</span>
              </div>

              <label className="flex items-center gap-2 text-xs">
                Max results
                <Input
                  type="number"
                  value={maxDisplay}
                  className="h-8 w-24"
                  onChange={(e) => setMaxDisplay(Number(e.target.value) || 1)}
                />
                <Button size="sm" onClick={onRecalculate}>
                  Recalculate
                </Button>
              </label>

              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">#</th>
                      <th className="text-right p-2">Damage</th>
                      <th className="text-right p-2">Gain</th>
                      {GEAR_SLOTS.map(({ label }) => (
                        <th key={label} className="text-left p-2">
                          {label}
                        </th>
                      ))}
                      <th className="text-center p-2">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r, i) => (
                      <tr key={r.key} className="border-b hover:bg-muted/50">
                        <td className="p-2">{i + 1}</td>
                        <td className="text-right p-2 font-bold">
                          {r.damage.toFixed(1)}
                        </td>
                        <td
                          className={`text-right p-2 font-medium ${
                            r.percentGain < 0 ? "text-red-500" : "text-emerald-500"
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
                            <td key={key} className="p-2">
                              {isNew && g ? (
                                <HoverCard openDelay={150}>
                                  <HoverCardTrigger asChild>
                                    <span className="cursor-help underline decoration-dotted text-emerald-600">
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
                              ) : null}
                            </td>
                          );
                        })}
                        <td className="p-2 text-center">
                          <Button
                            size="sm"
                            onClick={() => onApply(r.selection)}
                            variant="outline"
                          >
                            Equip
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
