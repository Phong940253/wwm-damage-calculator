"use client";

import { CustomGear, InputStats } from "../../types";
import { useGear } from "../../providers/GearContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { STAT_LABELS } from "@/app/constants";
import { StatType } from "@/app/domain/gear/types";
import { STAT_BG } from "@/app/domain/gear/constants";

interface Props {
  gear: CustomGear;
  onEdit: () => void;
  onDelete: () => void;
}

/* =======================
   Component
======================= */

export default function GearCard({ gear, onEdit, onDelete }: Props) {
  const { equipped, setEquipped } = useGear();
  const isEquipped = equipped[gear.slot] === gear.id;

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
  const mains = gear.mains;

  return (
    <Card className="p-4 space-y-3 relative border border-white/10 bg-card/70">
      {/* Equipped badge */}
      {isEquipped ? (
        <span className="absolute top-2 right-2 text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
          Equipped
        </span>
      ) : (
        <span className="absolute top-2 right-2 text-xs hidden px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
          Equipped
        </span>
      )}

      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <p className="font-semibold truncate">{gear.name}</p>
          <p className="text-xs text-muted-foreground">{gear.slot}</p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost">
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

      {/* 🔥 Main stats */}
      {mains.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Main</p>
          {mains.map((m, i) => (
            <StatLine key={i} stat={m.stat} value={m.value} type="main" />
          ))}
        </div>
      )}

      {/* Sub stats */}
      {gear.subs?.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Sub</p>
          {gear.subs.map((s, i) => (
            <StatLine key={i} stat={s.stat} value={s.value} type="sub" />
          ))}
        </div>
      )}

      {/* Bonus */}
      {gear.addition && (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Bonus</p>
          <StatLine
            stat={gear.addition.stat}
            value={gear.addition.value}
            type="bonus"
          />
        </div>
      )}
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
}: {
  stat: keyof InputStats;
  value: number;
  type: StatType;
}) {
  const key = String(stat);

  return (
    <div
      className={`
        flex items-center justify-between
        px-2 py-1.5
        rounded-md
        border
        text-xs
        ${STAT_BG[type]}
      `}
    >
      <span className="text-muted-foreground truncate">
        {STAT_LABELS[key] ?? key}
      </span>
      <span className="font-medium whitespace-nowrap">+{value}</span>
    </div>
  );
}
