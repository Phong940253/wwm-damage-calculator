// app/gear/GearOptimizeDialog.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { GEAR_SLOTS } from "@/app/constants";
import { OptimizeResult } from "../../domain/gear/gearOptimize";

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

              <div className="grid sm:grid-cols-2 gap-4">
                {results.map((r, i) => (
                  <Card key={r.key} className="p-4 space-y-2">
                    <div className="flex justify-between">
                      <span>#{i + 1}</span>
                      <span className="text-emerald-500">
                        {r.percentGain >= 0 ? "+" : ""}
                        {r.percentGain.toFixed(2)}%
                      </span>
                    </div>
                    <div className="text-2xl font-bold">
                      {r.damage.toFixed(1)}
                    </div>
                    {GEAR_SLOTS.map(({ key, label }) => {
                      const g = r.selection[key];
                      return g ? (
                        <div key={key} className="text-xs flex justify-between">
                          <span>{label}</span>
                          <span>{g.name}</span>
                        </div>
                      ) : null;
                    })}
                    <Button size="sm" onClick={() => onApply(r.selection)}>
                      Equip
                    </Button>
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
