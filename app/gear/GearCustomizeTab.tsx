// app/gear/GearCustomizeTab.tsx
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useGear } from "./GearContext";
import GearCard from "./GearCard";
import GearForm from "./GearForm";
import GearOptimizeDialog from "./GearOptimizeDialog";
import { CustomGear, InputStats, ElementStats, GearSlot } from "@/app/types";
import { GEAR_SLOTS } from "@/app/constants";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useGearOptimize } from "../hooks/useGearOptimize";

interface Props {
  stats: InputStats;
  elementStats: ElementStats;
}

export default function GearCustomizeTab({ stats, elementStats }: Props) {
  const { customGears, setCustomGears, equipped, setEquipped } = useGear();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CustomGear | null>(null);
  const [optOpen, setOptOpen] = useState(false);
  const [maxDisplay, setMaxDisplay] = useState(200);

  const opt = useGearOptimize(stats, elementStats, customGears, equipped);

  useEffect(() => {
    if (optOpen) opt.run(maxDisplay);
  }, [optOpen]);

  const apply = (sel: Partial<Record<GearSlot, CustomGear>>) => {
    setEquipped(() => {
      const next: Partial<Record<GearSlot, string>> = {};
      GEAR_SLOTS.forEach(({ key }) => {
        if (sel[key]) next[key] = sel[key]!.id;
      });
      return next;
    });
    setOptOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <h3 className="text-lg font-semibold">Custom Gear</h3>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setOptOpen(true)}>
            Optimize
          </Button>
          <Button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            + Add Gear
          </Button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {customGears.map((g) => (
          <GearCard
            key={g.id}
            gear={g}
            onEdit={() => {
              setEditing(g);
              setOpen(true);
            }}
            onDelete={() =>
              setCustomGears((x) => x.filter((i) => i.id !== g.id))
            }
          />
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Gear" : "Add New Gear"}</DialogTitle>
          </DialogHeader>

          <GearForm initialGear={editing} onSuccess={() => setOpen(false)} />
        </DialogContent>
      </Dialog>

      <GearOptimizeDialog
        open={optOpen}
        onOpenChange={setOptOpen}
        loading={opt.loading}
        error={opt.error}
        results={opt.results}
        baseDamage={opt.baseDamage}
        combos={opt.combos}
        maxDisplay={maxDisplay}
        setMaxDisplay={setMaxDisplay}
        onRecalculate={() => opt.run(maxDisplay)}
        onApply={apply}
      />
    </div>
  );
}
