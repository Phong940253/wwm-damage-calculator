"use client";

import { Skill } from "@/app/domain/skill/types";
import { getSkillParamSchema, ParamsSchemaItem } from "@/app/domain/skill/skillBehaviors";
import { RotationSkill } from "@/app/types";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface ParamPopoverProps {
  skill: Skill;
  params: Record<string, number> | undefined;
  rotationSkills: RotationSkill[];
  disabled?: boolean;
  onParamChange: (key: string, value: number) => void;
}

export default function ParamPopover({
  skill,
  params,
  rotationSkills,
  disabled,
  onParamChange,
}: ParamPopoverProps) {
  const hasTidesActive = rotationSkills.some(
    (s) => s.id === "mystic_flute_of_the_tides" && !s.cancelled,
  );

  const schema = getSkillParamSchema(skill).filter(
    (p) => p.key !== "distance" || hasTidesActive,
  );

  if (schema.length === 0) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className="h-6 w-6 flex items-center justify-center rounded text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-40 disabled:pointer-events-none"
          title="Skill parameters"
        >
          ⚙
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={4} className="w-56 p-3 space-y-2">
        <p className="text-xs font-semibold text-foreground mb-2">Skill Parameters</p>
        {schema.map((p: ParamsSchemaItem) => (
          <div key={p.key} className="flex items-center justify-between gap-2">
            <label className="text-xs text-muted-foreground whitespace-nowrap">
              {p.label}
            </label>
            <input
              type="number"
              min={p.min}
              max={p.max}
              step={p.step ?? "1"}
              value={params?.[p.key] ?? p.default ?? 0}
              disabled={disabled}
              onChange={(e) => {
                if (disabled) return;
                let v = Number(e.target.value);
                if (!Number.isFinite(v)) v = p.default ?? 0;
                if (typeof p.min === "number") v = Math.max(p.min, v);
                if (typeof p.max === "number") v = Math.min(p.max, v);
                onParamChange(p.key, v);
              }}
              className="w-16 bg-accent text-xs border border-border rounded px-1 py-0.5 text-foreground text-center"
            />
          </div>
        ))}
      </PopoverContent>
    </Popover>
  );
}
