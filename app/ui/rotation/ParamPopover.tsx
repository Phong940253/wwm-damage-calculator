"use client";

import { useState, useEffect, useRef, memo } from "react";
import { createPortal } from "react-dom";
import { Skill } from "@/app/domain/skill/types";
import { getSkillParamSchema, type ParamsSchemaItem } from "@/app/domain/skill/skillBehaviors";
import { RotationSkill } from "@/app/types";

interface ParamPopoverProps {
  skill: Skill;
  params: Record<string, number> | undefined;
  rotationSkills: RotationSkill[];
  disabled?: boolean;
  onParamChange: (key: string, value: number) => void;
}

function ParamPopoverInner({
  skill,
  params,
  rotationSkills,
  disabled,
  onParamChange,
}: ParamPopoverProps) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const hasTidesActive = rotationSkills.some(
    (s) => s.id === "mystic_flute_of_the_tides" && !s.cancelled,
  );

  const schema = getSkillParamSchema(skill).filter(
    (p) => p.key !== "distance" || hasTidesActive,
  );

  const [localParams, setLocalParams] = useState<Record<string, number>>({});

  useEffect(() => {
    setLocalParams(params ?? {});
  }, [params]);

  // Close on click outside panel + gear button
  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) {
        for (const p of schema) {
          const v = localParams[p.key] ?? p.default ?? 0;
          if (v !== (params?.[p.key] ?? p.default ?? 0)) {
            onParamChange(p.key, v);
          }
        }
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open, localParams, params, schema, onParamChange]);

  // Close on scroll/resize
  useEffect(() => {
    if (!open) return;
    const handle = () => setOpen(false);
    window.addEventListener("scroll", handle, true);
    window.addEventListener("resize", handle);
    return () => {
      window.removeEventListener("scroll", handle, true);
      window.removeEventListener("resize", handle);
    };
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handle = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, [open]);

  // Position panel
  useEffect(() => {
    if (!open || !btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    setPos({
      top: rect.bottom + 4,
      left: Math.max(4, rect.right - 224),
    });
  }, [open]);

  const handleOpen = () => {
    if (disabled) return;
    if (open) {
      setOpen(false);
      return;
    }
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({
        top: rect.bottom + 4,
        left: Math.max(4, rect.right - 224),
      });
    }
    setOpen(true);
  };

  if (schema.length === 0) return null;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        disabled={disabled}
        onClick={handleOpen}
        className="h-6 w-6 flex items-center justify-center rounded text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-40 disabled:pointer-events-none"
        title="Skill parameters"
      >
        ⚙
      </button>
      {open && pos && createPortal(
        <div
          ref={panelRef}
          style={{ position: "fixed", top: pos.top, left: pos.left, zIndex: 999999, pointerEvents: "auto" }}
          className="w-56 p-3 space-y-2 rounded border border-border bg-background shadow-lg"
        >
          <p className="text-xs font-semibold text-foreground mb-2">Skill Parameters</p>
          {schema.map((p: ParamsSchemaItem) => {
            const currentVal = localParams[p.key] ?? p.default ?? 0;
            return (
              <div key={p.key} className="flex items-center justify-between gap-2">
                <label className="text-xs text-muted-foreground whitespace-nowrap">
                  {p.label}
                </label>
                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    tabIndex={-1}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      const dec = Math.max(
                        typeof p.min === "number" ? p.min : -Infinity,
                        currentVal - (p.step ?? 1),
                      );
                      setLocalParams((prev) => ({ ...prev, [p.key]: dec }));
                      onParamChange(p.key, dec);
                    }}
                    className="h-6 w-5 flex items-center justify-center rounded-l border border-border bg-accent text-xs text-foreground hover:bg-muted select-none"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min={p.min}
                    max={p.max}
                    step={p.step ?? "1"}
                    value={currentVal}
                    disabled={disabled}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                    }}
                    onChange={(e) => {
                      if (disabled) return;
                      let v = Number(e.target.value);
                      if (!Number.isFinite(v)) v = p.default ?? 0;
                      if (typeof p.min === "number") v = Math.max(p.min, v);
                      if (typeof p.max === "number") v = Math.min(p.max, v);
                      setLocalParams((prev) => ({ ...prev, [p.key]: v }));
                      onParamChange(p.key, v);
                    }}
                    className="w-12 h-6 bg-accent text-xs border-y border-border px-0.5 text-foreground text-center outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      const inc = Math.min(
                        typeof p.max === "number" ? p.max : Infinity,
                        currentVal + (p.step ?? 1),
                      );
                      setLocalParams((prev) => ({ ...prev, [p.key]: inc }));
                      onParamChange(p.key, inc);
                    }}
                    className="h-6 w-5 flex items-center justify-center rounded-r border border-border bg-accent text-xs text-foreground hover:bg-muted select-none"
                  >
                    +
                  </button>
                </div>
              </div>
            );
          })}
        </div>,
        document.body,
      )}
    </>
  );
}

export default memo(ParamPopoverInner);
