"use client";

import { FinalStatSection } from "@/app/domain/damage/type";
import {
  ChevronDown,
  Info,
  Brackets,
  Layers,
  TrendingUp,
  Sparkles,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import type {
  DamageContext,
  StatExplanation,
  StatSourceKind,
} from "@/app/domain/damage/damageContext";

export default function FinalStatPanel({
  sections,
  ctx,
}: {
  sections: FinalStatSection[];
  ctx: DamageContext;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<{
    sectionTitle: string;
    rowLabel: string;
    keys: string[];
  } | null>(null);

  const explanations = useMemo(() => {
    if (!open || !selected) return [] as StatExplanation[];
    const explain = ctx.explain;
    if (!explain) return [];
    return selected.keys
      .map((k) => explain(k))
      .filter((x): x is StatExplanation => Boolean(x));
  }, [ctx, open, selected]);

  return (
    <>
      <div className="space-y-2">
        {sections.map((section) => (
          <Section
            key={section.title}
            section={section}
            onOpenDetails={(rowLabel, keys) => {
              setSelected({ sectionTitle: section.title, rowLabel, keys });
              setOpen(true);
            }}
          />
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="left-auto top-0 right-0 h-[100dvh] w-full max-w-[520px] translate-x-0 translate-y-0 rounded-none border-l border-white/10 bg-gradient-to-b from-card/95 to-card/60 p-0 data-[state=open]:slide-in-from-right-full data-[state=closed]:slide-out-to-right-full">
          <div className="flex h-full flex-col">
            <DialogHeader className="px-5 pt-5">
              <DialogTitle className="flex items-center gap-2">
                <Info className="h-4 w-4 text-emerald-400" />
                Stat backpropagation
              </DialogTitle>
              <DialogDescription className="text-xs">
                {selected ? (
                  <span>
                    <span className="text-zinc-200">{selected.sectionTitle}</span>
                    <span className="text-muted-foreground"> · </span>
                    <span className="text-zinc-200">{selected.rowLabel}</span>
                  </span>
                ) : (
                  ""
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-5 pb-5 pt-4 space-y-4">
              {!ctx.explain && (
                <div className="rounded-lg border border-white/10 bg-black/20 p-4 text-sm text-muted-foreground">
                  No explanation data available for this context.
                </div>
              )}

              {explanations.map((ex) => (
                <div key={ex.key} className="rounded-xl border border-white/10 bg-black/20">
                  <div className="flex items-start justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Brackets className="h-4 w-4 text-zinc-400" />
                        <div className="text-sm font-semibold truncate">{ex.key}</div>
                      </div>
                      {ex.formula && (
                        <div className="mt-1 text-xs text-muted-foreground flex items-center gap-2">
                          <Sparkles className="h-3.5 w-3.5 text-purple-300" />
                          {ex.formula}
                        </div>
                      )}
                    </div>
                    <Badge className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 shrink-0">
                      {ex.total.toFixed(4)}
                    </Badge>
                  </div>

                  <div className="px-4 pb-4 space-y-2">
                    {ex.lines.length === 0 ? (
                      <div className="text-sm text-muted-foreground">No breakdown.</div>
                    ) : (
                      ex.lines.map((line, idx) => (
                        <div
                          key={idx}
                          className="flex items-start justify-between gap-3 rounded-lg border border-white/10 bg-black/10 px-3 py-2"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span
                                className={
                                  "h-2 w-2 rounded-full " +
                                  kindToDotClass(line.kind)
                                }
                              />
                              <div className="text-sm font-medium truncate">{line.label}</div>
                            </div>
                            {line.note && (
                              <div className="mt-0.5 text-xs text-muted-foreground">
                                {line.note}
                              </div>
                            )}
                          </div>

                          <div className="text-sm font-mono text-zinc-200 shrink-0">
                            {formatSigned(line.value)}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}

              <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Layers className="h-4 w-4 text-zinc-400" /> Legend
                </div>
                <div className="mt-3 grid gap-2 text-xs text-muted-foreground">
                  <LegendRow kind="base" label="Base" note="Your saved/base stat value" />
                  <LegendRow kind="increase" label="Increase" note="Temporary increase inputs" />
                  <LegendRow kind="gear" label="Gear/Modifiers" note="Gear bonus + passive modifiers" />
                  <LegendRow kind="derived" label="Derived" note="Computed from attributes" />
                  <LegendRow kind="element-other" label="Other elements" note="Summed from non-selected elements" />
                </div>
              </div>

              <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-3.5 w-3.5" />
                Values are best-effort and additive where possible.
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Section({
  section,
  onOpenDetails,
}: {
  section: FinalStatSection;
  onOpenDetails: (rowLabel: string, keys: string[]) => void;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div className="rounded-xl bg-black/30 border border-white/10">
      <button
        onClick={() => setOpen(!open)}
        className="
          w-full flex items-center justify-between
          px-4 py-2 text-sm font-medium
          text-zinc-200
          hover:bg-white/5
        "
      >
        {section.title}
        <ChevronDown
          size={16}
          className={`transition ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="px-4 pb-2 space-y-1">
          {section.rows.map((row, i) => (
            <div key={i} className="flex items-center justify-between gap-3 text-sm">
              <span className="text-muted-foreground">{row.label}</span>

              <div className="flex items-center gap-2">
                <span
                  className={
                    row.highlight
                      ? "text-yellow-400 font-semibold"
                      : "text-zinc-100"
                  }
                >
                  {row.value}
                </span>

                {row.ctxKeys && row.ctxKeys.length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-zinc-300 hover:text-zinc-100"
                    onClick={() => onOpenDetails(row.label, row.ctxKeys!)}
                    title="Show breakdown"
                  >
                    <Info className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatSigned(v: number) {
  const abs = Math.abs(v);
  const s = abs >= 1000 ? abs.toFixed(2) : abs.toFixed(4);
  return `${v >= 0 ? "+" : "-"}${s}`;
}

function kindToDotClass(kind: StatSourceKind) {
  switch (kind) {
    case "base":
      return "bg-zinc-400";
    case "increase":
      return "bg-amber-400";
    case "gear":
      return "bg-blue-400";
    case "derived":
      return "bg-purple-400";
    case "element-other":
      return "bg-emerald-400";
    default:
      return "bg-zinc-400";
  }
}

function LegendRow({
  kind,
  label,
  note,
}: {
  kind: StatSourceKind;
  label: string;
  note: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <span className={"h-2 w-2 rounded-full " + kindToDotClass(kind)} />
        <span className="text-zinc-200">{label}</span>
      </div>
      <span className="truncate">{note}</span>
    </div>
  );
}
