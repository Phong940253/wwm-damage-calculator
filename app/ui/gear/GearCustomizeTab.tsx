"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { useGear } from "../../providers/GearContext";
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
import { useGearOptimize } from "../../hooks/useGearOptimize";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/* =======================
   Helpers
======================= */

function getStatTotal(gear: CustomGear, stat: string): number {
  let total = 0;

  const eq = (a?: string | number) => String(a) === stat;

  if (eq(gear.main?.stat)) {
    total += gear.main!.value;
  }

  gear.mains?.forEach((m) => {
    if (eq(m.stat)) total += m.value;
  });

  gear.subs?.forEach((s) => {
    if (eq(s.stat)) total += s.value;
  });

  if (gear.addition && eq(gear.addition.stat)) {
    total += gear.addition.value;
  }

  return total;
}

/* =======================
   Props
======================= */

interface Props {
  stats: InputStats;
  elementStats: ElementStats;
}

/* =======================
   Component
======================= */

export default function GearCustomizeTab({ stats, elementStats }: Props) {
  const { customGears, setCustomGears, equipped, setEquipped } = useGear();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CustomGear | null>(null);
  const [optOpen, setOptOpen] = useState(false);
  const [maxDisplay, setMaxDisplay] = useState(200);

  /* ===== Filter / Sort state ===== */

  const [slotFilter, setSlotFilter] = useState<Set<GearSlot>>(new Set());
  const [statFilter, setStatFilter] = useState<Set<string>>(new Set());

  const [sortStat, setSortStat] = useState<string>("none");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const opt = useGearOptimize(stats, elementStats, customGears, equipped);

  function toggleSet<T>(set: Set<T>, value: T): Set<T> {
    const next = new Set(set);
    next.has(value) ? next.delete(value) : next.add(value);
    return next;
  }

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

  /* =======================
     Collect stat options
  ======================= */

  const statOptions = useMemo(() => {
    const set = new Set<string>();

    customGears.forEach((g) => {
      if (g.main) set.add(String(g.main.stat));
      g.mains?.forEach((m) => set.add(String(m.stat)));
      g.subs?.forEach((s) => set.add(String(s.stat)));
      if (g.addition) set.add(String(g.addition.stat));
    });

    return Array.from(set).sort();
  }, [customGears]);

  /* =======================
     Filter + Sort gears
  ======================= */

  const displayGears = useMemo(() => {
    let list = [...customGears];

    // Slot filter (multi)
    if (slotFilter.size > 0) {
      list = list.filter((g) => slotFilter.has(g.slot));
    }

    // Stat filter (multi)
    if (statFilter.size > 0) {
      list = list.filter((g) =>
        Array.from(statFilter).some((stat) => getStatTotal(g, stat) > 0)
      );
    }

    // Sort
    if (sortStat !== "none") {
      list.sort((a, b) => {
        const va = getStatTotal(a, sortStat);
        const vb = getStatTotal(b, sortStat);
        return sortDir === "asc" ? va - vb : vb - va;
      });
    }

    return list;
  }, [customGears, slotFilter, statFilter, sortStat, sortDir]);

  return (
    <div className="space-y-6">
      {/* Header */}
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

      {/* =======================
          Filters
      ======================= */}
      <div className="flex flex-wrap gap-2">
        {/* SLOT FILTER */}
        <div className="relative group">
          <Button variant="outline">Slot Filter</Button>

          <div
            className="
        absolute z-50 mt-2 w-48
        rounded-lg border bg-card shadow-lg
        p-2 space-y-1
        hidden group-hover:block
      "
          >
            {GEAR_SLOTS.map((s) => (
              <label
                key={s.key}
                className="flex items-center gap-2 text-sm cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={slotFilter.has(s.key)}
                  onChange={() =>
                    setSlotFilter((prev) => toggleSet(prev, s.key))
                  }
                />
                {s.key}
              </label>
            ))}
          </div>
        </div>

        {/* STAT FILTER */}
        <div className="relative group">
          <Button variant="outline">Stat Filter</Button>

          <div
            className="
        absolute z-50 mt-2 w-56 max-h-64 overflow-auto
        rounded-lg border bg-card shadow-lg
        p-2 space-y-1
        hidden group-hover:block
      "
          >
            {statOptions.map((stat) => (
              <label
                key={stat}
                className="flex items-center gap-2 text-sm cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={statFilter.has(stat)}
                  onChange={() =>
                    setStatFilter((prev) => toggleSet(prev, stat))
                  }
                />
                {stat}
              </label>
            ))}
          </div>
        </div>

        {/* CLEAR */}
        {(slotFilter.size > 0 || statFilter.size > 0) && (
          <Button
            variant="ghost"
            onClick={() => {
              setSlotFilter(new Set());
              setStatFilter(new Set());
            }}
          >
            Clear Filter
          </Button>
        )}
      </div>

      {/* =======================
          Gear list
      ======================= */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayGears.map((g) => (
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

      {/* =======================
          Dialogs
      ======================= */}

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
