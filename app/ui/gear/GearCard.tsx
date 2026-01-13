"use client";

import { CustomGear, ElementStats, InputStats } from "../../types";
import { useGear } from "../../providers/GearContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getStatLabel } from "@/app/utils/statLabel";
import { StatType } from "@/app/domain/gear/types";
import { STAT_BG } from "@/app/domain/gear/constants";
import { GEAR_SLOTS } from "@/app/constants";

function normalizeRarity(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, " ");
}

function getRarityPillClass(rarity: string): string {
  const r = normalizeRarity(rarity);

  // Common synonyms / variants
  if (r === "common" || r === "normal") {
    return "bg-slate-500/15 text-slate-200 border-slate-400/20";
  }
  if (r === "uncommon") {
    return "bg-lime-500/15 text-lime-200 border-lime-400/20";
  }
  if (r === "rare") {
    return "bg-sky-500/15 text-sky-200 border-sky-400/20";
  }
  if (r === "epic") {
    return "bg-violet-500/15 text-violet-200 border-violet-400/20";
  }
  if (r === "legendary") {
    return "bg-amber-500/15 text-amber-200 border-amber-400/20";
  }

  // Fallback for custom rarities
  return "bg-background/30 text-muted-foreground border-white/10";
}

interface Props {
  gear: CustomGear;
  elementStats?: ElementStats;
  onEdit: () => void;
  onDelete: () => void;
}

/* =======================
   Component
======================= */

export default function GearCard({ gear, elementStats, onEdit, onDelete }: Props) {
  const { equipped, setEquipped } = useGear();
  const isEquipped = equipped[gear.slot] === gear.id;

  const slotLabel =
    GEAR_SLOTS.find((s) => s.key === gear.slot)?.label ?? String(gear.slot);

  const equip = () => {
    setEquipped((prev) => ({
      ...prev,
      [gear.slot]: gear.id,
    }));
  };

  const unequip = () => {
    setEquipped((prev) => {
      const next = { ...prev };
      delete next[gear.slot];
      return next;
    });
  };

  /** 🔁 backward compatibility */
  const mains = gear.mains?.length
    ? gear.mains
    : gear.main
      ? [gear.main]
      : [];

  return (
    <Card
      className={
        "group relative overflow-hidden rounded-xl border border-white/10 bg-card/70 p-4 " +
        "transition-shadow hover:shadow-lg hover:shadow-black/20"
      }
    >
      {/* Accent */}
      <div
        className={
          "pointer-events-none absolute inset-x-0 top-0 h-1 " +
          (isEquipped
            ? "bg-gradient-to-r from-emerald-500/70 via-emerald-400/30 to-transparent"
            : "bg-gradient-to-r from-white/10 to-transparent")
        }
      />

      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="min-w-0 truncate text-sm font-semibold">{gear.name}</p>
            {isEquipped && (
              <span className="shrink-0 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-300">
                Equipped
              </span>
            )}
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="rounded-md border border-white/10 bg-background/30 px-2 py-0.5 text-[11px] text-muted-foreground">
              {slotLabel}
            </span>
            {gear.rarity && (
              <span
                className={
                  "rounded-md border px-2 py-0.5 text-[11px] font-medium " +
                  getRarityPillClass(gear.rarity)
                }
                title={gear.rarity}
              >
                {gear.rarity}
              </span>
            )}
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="-mr-2 -mt-1 h-9 w-9 text-muted-foreground hover:text-foreground"
              aria-label="Gear actions"
            >
              ⋮
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end">
            {isEquipped ? (
              <DropdownMenuItem onClick={unequip}>Unequip</DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={equip}>Equip</DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={onEdit}>Edit</DropdownMenuItem>
            <DropdownMenuItem className="text-red-400" onClick={onDelete}>
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Stats */}
      <div className="mt-4 space-y-3">
        {mains.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Main</p>
              <p className="text-[11px] text-muted-foreground">{mains.length}</p>
            </div>
            <div className="space-y-1.5">
              {mains.map((m, i) => (
                <StatLine
                  key={`${String(m.stat)}-${i}`}
                  stat={m.stat}
                  value={m.value}
                  type="main"
                  elementStats={elementStats}
                />
              ))}
            </div>
          </div>
        )}

        {gear.subs?.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Sub</p>
              <p className="text-[11px] text-muted-foreground">{gear.subs.length}</p>
            </div>
            <div className="space-y-1.5">
              {gear.subs.map((s, i) => (
                <StatLine
                  key={`${String(s.stat)}-${i}`}
                  stat={s.stat}
                  value={s.value}
                  type="sub"
                  elementStats={elementStats}
                />
              ))}
            </div>
          </div>
        )}

        {gear.addition && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Bonus</p>
            <StatLine
              stat={gear.addition.stat}
              value={gear.addition.value}
              type="bonus"
              elementStats={elementStats}
            />
          </div>
        )}
      </div>
    </Card>
  );
}

/* =======================
   Stat Line
======================= */

function StatLine({
  stat,
  value,
  type,
  elementStats,
}: {
  stat: keyof InputStats;
  value: number;
  type: StatType;
  elementStats?: ElementStats;
}) {
  const key = String(stat);

  return (
    <div
      className={`
        flex items-center justify-between
        px-2.5 py-2
        rounded-md
        border
        text-xs
        ${STAT_BG[type]}
      `}
    >
      <span className="min-w-0 truncate text-muted-foreground">
        {getStatLabel(key, elementStats)}
      </span>
      <span className="shrink-0 whitespace-nowrap font-semibold tabular-nums">
        +{value}
      </span>
    </div>
  );
}
