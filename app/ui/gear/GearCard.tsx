// app/gear/GearCard.tsx
"use client";

import { CustomGear } from "../../types";
import { useGear } from "../../providers/GearContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Props {
  gear: CustomGear;
  onEdit: () => void;
  onDelete: () => void;
}

export default function GearCard({ gear, onEdit, onDelete }: Props) {
  const { equipped, setEquipped } = useGear();

  const isEquipped = equipped[gear.slot] === gear.id;

  const equip = () => {
    setEquipped(prev => ({
      ...prev,
      [gear.slot]: gear.id,
    }));
  };

  const unequip = () => {
    setEquipped(prev => {
      const next = { ...prev };
      delete next[gear.slot];
      return next;
    });
  };

  /** 🔁 backward compatibility */
  const mains = gear.mains;

  return (
    <Card className="p-4 space-y-3 relative">
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
          <p className="font-semibold">{gear.name}</p>
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
              <DropdownMenuItem onClick={unequip}>
                Unequip
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={equip}>
                Equip
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={onEdit}>Edit</DropdownMenuItem>
            <DropdownMenuItem
              className="text-red-400"
              onClick={onDelete}
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* 🔥 Main stats */}
      {mains.length > 0 && (
        <div className="border border-yellow-500/30 bg-yellow-500/5 p-2 rounded-lg space-y-1">
          <p className="text-xs text-muted-foreground">Main</p>
          {mains.map((m, i) => (
            <p key={i} className="text-sm font-medium">
              • {m.stat} +{m.value}
            </p>
          ))}
        </div>
      )}

      {/* Sub stats */}
      {gear.subs?.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Sub</p>
          {gear.subs.map((s, i) => (
            <p key={i} className="text-xs">
              • {s.stat} +{s.value}
            </p>
          ))}
        </div>
      )}

      {/* Addition */}
      {gear.addition && (
        <div className="text-xs text-amber-400">
          + {gear.addition.stat} {gear.addition.value}
        </div>
      )}
    </Card>
  );
}
