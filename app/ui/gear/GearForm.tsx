// app/gear/GearForm.tsx
"use client";

import { useEffect, useRef, useState, type DragEvent } from "react";
import { useGear } from "../../providers/GearContext";
import { CustomGear, GearSlot, InputStats } from "../../types";
import { GEAR_SLOTS, STAT_GROUPS } from "../../constants";
import { getStatLabel } from "@/app/utils/statLabel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { callGeminiVision } from "@/lib/gemini";
import { normalizeStatKey } from "@/lib/normalizeStat";
import { fileToBase64 } from "@/lib/utils";
import { GEAR_OCR_PROMPT } from "../../domain/gear/gearOcrSchema";
import { GearOcrResult } from "../../domain/gear/gearOcrSchema";
import { GripVertical, Loader2 } from "lucide-react";


/* =======================
   Types
======================= */

type GearStatKey = keyof InputStats;

type GearStatRow = {
  id: string;
  stat: GearStatKey;
  value: number;
};

interface GearFormProps {
  initialGear?: CustomGear | null;
  onSuccess?: () => void;
}

const STAT_OPTION_GROUPS: { label: string; options: GearStatKey[] }[] = [
  ...Object.entries(STAT_GROUPS).map(([label, options]) => ({
    label,
    options: options as GearStatKey[],
  })),
  {
    label: "Special",
    options: ["ChargeSkillDamageBoost"],
  },
];

const renderStatOptions = () =>
  STAT_OPTION_GROUPS.map(group => (
    <optgroup key={group.label} label={group.label}>
      {Array.from(new Set(group.options)).map(statKey => (
        <option key={statKey} value={statKey}>
          {getStatLabel(String(statKey))}
        </option>
      ))}
    </optgroup>
  ));

/* Armor slots that should NOT have main attributes */
const ARMOR_SLOTS: GearSlot[] = ["head", "chest", "hand", "leg"];

type DragSource = "mains" | "subs" | "addition";

type DraggedStat =
  | { source: "mains" | "subs"; rowId: string }
  | { source: "addition" };

const readDraggedFromDataTransfer = (e: DragEvent): DraggedStat | null => {
  const raw = e.dataTransfer.getData("application/wwm-gear-stat");
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as DraggedStat;
    if (!parsed || typeof parsed !== "object" || !("source" in parsed)) return null;
    if (parsed.source === "addition") return { source: "addition" };
    if (parsed.source === "mains" || parsed.source === "subs") {
      if (typeof (parsed as any).rowId !== "string") return null;
      return { source: parsed.source, rowId: (parsed as any).rowId };
    }
    return null;
  } catch {
    return null;
  }
};


/* =======================
   Component
======================= */

export default function GearForm({ initialGear, onSuccess }: GearFormProps) {
  const { setCustomGears, setEquipped } = useGear();

  const [name, setName] = useState("");
  const [slot, setSlot] = useState<GearSlot>("weapon_1");

  /** 🔥 MULTI MAIN */

  const fileRef = useRef<HTMLInputElement | null>(null);
  const [mains, setMains] = useState<
    GearStatRow[]
  >([{ id: crypto.randomUUID(), stat: "MaxPhysicalAttack", value: 0 }]);

  const [subs, setSubs] = useState<
    GearStatRow[]
  >([]);

  const [addition, setAddition] = useState<
    GearStatRow | null
  >(null);

  const [dragged, setDragged] = useState<DraggedStat | null>(null);
  const [dragOver, setDragOver] = useState<
    | { zone: Exclude<DragSource, "addition">; insertIndex: number }
    | { zone: "addition" }
    | null
  >(null);

  const findRowIndexById = (list: GearStatRow[], rowId: string) =>
    list.findIndex(r => r.id === rowId);

  const getDraggedItem = (d: DraggedStat): GearStatRow | null => {
    if (d.source === "addition") return addition;
    const list = d.source === "mains" ? mains : subs;
    const idx = findRowIndexById(list, d.rowId);
    return idx >= 0 ? list[idx] : null;
  };

  const removeFromSource = (d: DraggedStat) => {
    if (d.source === "addition") {
      setAddition(null);
      return;
    }

    if (d.source === "mains") {
      setMains(prev => prev.filter(r => r.id !== d.rowId));
      return;
    }

    setSubs(prev => prev.filter(r => r.id !== d.rowId));
  };

  const insertIntoList = (
    target: Exclude<DragSource, "addition">,
    item: GearStatRow,
    insertIndex?: number
  ) => {
    const setter = target === "mains" ? setMains : setSubs;
    setter(prev => {
      const next = [...prev];
      if (insertIndex === undefined || insertIndex < 0 || insertIndex > next.length) {
        next.push(item);
      } else {
        next.splice(insertIndex, 0, item);
      }
      return next;
    });
  };

  const startDrag = (d: DraggedStat) => (e: DragEvent) => {
    setDragged(d);
    setDragOver(null);
    try {
      e.dataTransfer.setData("application/wwm-gear-stat", JSON.stringify(d));
      e.dataTransfer.effectAllowed = "move";
    } catch {
      // ignore
    }
  };

  const allowDropIfAllowed = (e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const computeInsertIndexFromPointer = (
    e: DragEvent,
    rowElement: HTMLElement,
    rowIndex: number
  ) => {
    const rect = rowElement.getBoundingClientRect();
    const isTopHalf = e.clientY < rect.top + rect.height / 2;
    return isTopHalf ? rowIndex : rowIndex + 1;
  };

  const dropOnList = (
    targetList: Exclude<DragSource, "addition">,
    insertIndex?: number
  ) => (e: DragEvent) => {
    e.preventDefault();
    const d = dragged ?? readDraggedFromDataTransfer(e);
    if (!d) return;

    const item = getDraggedItem(d);
    if (!item) return;

    const targetListItems = targetList === "mains" ? mains : subs;
    const targetInsertIndex =
      insertIndex ??
      (dragOver?.zone === targetList ? dragOver.insertIndex : targetListItems.length);

    // Same-list reorder adjustment / no-op
    if (d.source === targetList && (d.source === "mains" || d.source === "subs")) {
      const sourceList = d.source === "mains" ? mains : subs;
      const sourceIndex = findRowIndexById(sourceList, d.rowId);
      if (sourceIndex < 0) {
        setDragged(null);
        setDragOver(null);
        return;
      }

      // No-op drops (same position / adjacent)
      if (targetInsertIndex === sourceIndex || targetInsertIndex === sourceIndex + 1) {
        setDragged(null);
        setDragOver(null);
        return;
      }

      let adjustedInsertIndex = targetInsertIndex;
      if (adjustedInsertIndex > sourceIndex) adjustedInsertIndex -= 1;
      removeFromSource(d);
      insertIntoList(targetList, item, adjustedInsertIndex);
    } else {
      // Cross-group move (including addition -> list)
      removeFromSource(d);
      insertIntoList(targetList, item, targetInsertIndex);
    }

    setDragged(null);
    setDragOver(null);
  };

  const dropOnAddition = () => (e: DragEvent) => {
    e.preventDefault();
    const d = dragged ?? readDraggedFromDataTransfer(e);
    if (!d) return;

    const item = getDraggedItem(d);
    if (!item) return;

    // Swap behavior: if addition exists, put it back to the source list (append)
    const prevAddition = addition;
    removeFromSource(d);
    setAddition(item);

    if (prevAddition && d.source !== "addition") {
      if (d.source === "mains") insertIntoList("mains", prevAddition);
      else if (d.source === "subs") insertIntoList("subs", prevAddition);
    }

    setDragged(null);
    setDragOver(null);
  };

  const [ocrLoading, setOcrLoading] = useState(false);
  const handleOcr = async (file: File) => {
    console.log("OCR start", file.name, file.size);
    setOcrLoading(true);

    try {
      const base64 = await fileToBase64(file);
      const result: GearOcrResult = await callGeminiVision(
        base64,
        GEAR_OCR_PROMPT
      ) as GearOcrResult;

      if (result.name) setName(result.name);
      if (result.slot) setSlot(result.slot as GearSlot);

      if (result.mains) {
        const parsedMains: GearStatRow[] =
          result.mains
            .map((m: { stat: string; value: number }) => {
              const stat = normalizeStatKey(m.stat);
              if (!stat) return null;
              return { id: crypto.randomUUID(), stat, value: m.value };
            })
            .filter(
              (v): v is GearStatRow =>
                v !== null
            );

        setMains(parsedMains);
      }

      if (result.subs) {
        const parsedSubs: GearStatRow[] =
          result.subs
            .map((s: { stat: string; value: number }) => {
              const stat = normalizeStatKey(s.stat);
              if (!stat) return null;
              return { id: crypto.randomUUID(), stat, value: s.value };
            })
            .filter(
              (v): v is GearStatRow =>
                v !== null
            );

        setSubs(parsedSubs);
      }


      if (result.addition) {
        const stat = normalizeStatKey(result.addition.stat);
        if (stat) {
          setAddition({
            id: crypto.randomUUID(),
            stat,
            value: result.addition.value,
          });
        }
      }

    } catch (error) {
      console.error("OCR failed:", error);
      alert("OCR failed. Please try again or enter manually.");
    } finally {
      setOcrLoading(false);
    }
  };

  /* -------------------- init (edit mode) -------------------- */
  useEffect(() => {
    if (!initialGear) return;

    setName(initialGear.name);
    setSlot(initialGear.slot);

    setMains(initialGear.mains.map(m => ({ id: crypto.randomUUID(), ...m })));

    setSubs((initialGear.subs ?? []).map(s => ({ id: crypto.randomUUID(), ...s })));
    setAddition(
      initialGear.addition
        ? { id: crypto.randomUUID(), ...initialGear.addition }
        : null
    );
  }, [initialGear]);

  /* -------------------- submit -------------------- */
  const submit = () => {
    // Validate name
    if (!name.trim()) {
      alert("Please enter a gear name");
      return;
    }

    // Check if current slot is armor
    const isArmor = ARMOR_SLOTS.includes(slot);

    // Validate mains for non-armor slots
    if (!isArmor && mains.length === 0) {
      alert("Please add at least one main attribute");
      return;
    }

    try {
      const id = initialGear?.id ?? crypto.randomUUID();

      const gear: CustomGear = {
        id,
        name,
        slot,
        mains: mains.map(({ stat, value }) => ({ stat, value })),
        subs: subs.map(({ stat, value }) => ({ stat, value })),
        addition: addition ? { stat: addition.stat, value: addition.value } : undefined,
      };

      setCustomGears(g =>
        initialGear
          ? g.map(x => (x.id === id ? gear : x))
          : [...g, gear]
      );

      if (initialGear) {
        setEquipped(prev => {
          const next = { ...prev };
          if (prev[initialGear.slot] === id) {
            delete next[initialGear.slot];
            next[slot] = id;
          }
          return next;
        });
      }

      onSuccess?.();
    } catch (error) {
      console.error("Failed to save gear:", error);
      alert("Failed to save gear. Please try again.");
    }
  };

  /* -------------------- helpers -------------------- */
  const addMain = () =>
    setMains(m => [...m, { id: crypto.randomUUID(), stat: "MaxPhysicalAttack", value: 0 }]);

  const removeMain = (rowId: string) =>
    setMains(m => m.filter(r => r.id !== rowId));

  const addSub = () =>
    setSubs(s => [...s, { id: crypto.randomUUID(), stat: "CriticalRate", value: 0 }]);

  const removeSub = (rowId: string) =>
    setSubs(s => s.filter(r => r.id !== rowId));

  /* =======================
     UI
  ======================= */

  return (
    <div className="space-y-4">

      {/* Basic info */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs">Gear Name</label>
          <Input value={name} onChange={e => setName(e.target.value)} />
        </div>

        <div>
          <label className="text-xs">Slot</label>
          <select
            className="w-full border rounded px-2 py-2"
            value={slot}
            onChange={e => setSlot(e.target.value as GearSlot)}
          >
            {GEAR_SLOTS.map(s => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 🔥 Main attributes */}

      <div className="border rounded p-3 space-y-2">
        <div className="flex justify-between items-center">
          <p className="text-sm font-medium">Main Attributes</p>
          <Button size="sm" variant="secondary" onClick={addMain}>
            + Add
          </Button>
        </div>

        <div
          onDragOver={e => {
            // Avoid overwriting row-level insertion index due to bubbling.
            if (e.currentTarget !== e.target) return;
            allowDropIfAllowed(e);
            setDragOver({ zone: "mains", insertIndex: mains.length });
          }}
          onDragLeave={() =>
            setDragOver(prev => (prev?.zone === "mains" ? null : prev))
          }
          onDrop={dropOnList("mains")}
          className={`space-y-2 rounded ${dragOver?.zone === "mains" ? "ring-1 ring-slate-300" : ""}`}
        >
          {dragOver?.zone === "mains" && dragOver.insertIndex === 0 && (
            <div className="h-0.5 bg-sky-500/80 rounded" />
          )}
          {mains.map((m, i) => (
            <div key={m.id}>
              {dragOver?.zone === "mains" && dragOver.insertIndex === i && (
                <div className="h-0.5 bg-sky-500/80 rounded" />
              )}
              <div
                className={`flex gap-2 rounded`}
                onDragOver={e => {
                  const el = e.currentTarget as HTMLElement;
                  allowDropIfAllowed(e);
                  const insertIndex = computeInsertIndexFromPointer(e, el, i);
                  setDragOver({ zone: "mains", insertIndex });
                }}
                onDrop={e => {
                  e.stopPropagation();
                  const insertIndex =
                    dragOver?.zone === "mains" ? dragOver.insertIndex : undefined;
                  dropOnList("mains", insertIndex)(e);
                }}
              >
                <div
                  className="flex items-center px-1 text-muted-foreground cursor-grab select-none"
                  draggable
                  onDragStart={startDrag({ source: "mains", rowId: m.id })}
                  onDragEnd={() => {
                    setDragged(null);
                    setDragOver(null);
                  }}
                  title="Drag to reorder"
                >
                  <GripVertical className="w-4 h-4" />
                </div>
                <select
                  className="flex-1 border rounded px-2 py-1"
                  value={m.stat}
                  onChange={e => {
                    const nextStat = e.target.value as GearStatKey;
                    setMains(prev =>
                      prev.map(r => (r.id === m.id ? { ...r, stat: nextStat } : r))
                    );
                  }}
                >
                  {renderStatOptions()}
                </select>

                <Input
                  type="number"
                  value={m.value}
                  onChange={e => {
                    const nextValue = Number(e.target.value);
                    setMains(prev =>
                      prev.map(r => (r.id === m.id ? { ...r, value: nextValue } : r))
                    );
                  }}
                />

                {mains.length > 1 && (
                  <Button size="icon" variant="ghost" onClick={() => removeMain(m.id)}>
                    ✕
                  </Button>
                )}
              </div>
            </div>
          ))}
          {dragOver?.zone === "mains" && dragOver.insertIndex === mains.length && (
            <div className="h-0.5 bg-sky-500/80 rounded" />
          )}
        </div>
      </div>

      {/* Sub attributes */}
      <div className="border rounded p-3 space-y-2">
        <div className="flex justify-between items-center">
          <p className="text-sm font-medium">Sub Attributes</p>
          <Button size="sm" variant="secondary" onClick={addSub}>
            + Add
          </Button>
        </div>

        <div
          onDragOver={e => {
            // Avoid overwriting row-level insertion index due to bubbling.
            if (e.currentTarget !== e.target) return;
            allowDropIfAllowed(e);
            setDragOver({ zone: "subs", insertIndex: subs.length });
          }}
          onDragLeave={() =>
            setDragOver(prev => (prev?.zone === "subs" ? null : prev))
          }
          onDrop={dropOnList("subs")}
          className={`space-y-2 rounded ${dragOver?.zone === "subs" ? "ring-1 ring-slate-300" : ""}`}
        >
          {dragOver?.zone === "subs" && dragOver.insertIndex === 0 && (
            <div className="h-0.5 bg-sky-500/80 rounded" />
          )}
          {subs.map((s, i) => (
            <div key={s.id}>
              {dragOver?.zone === "subs" && dragOver.insertIndex === i && (
                <div className="h-0.5 bg-sky-500/80 rounded" />
              )}
              <div
                className="flex gap-2 rounded"
                onDragOver={e => {
                  const el = e.currentTarget as HTMLElement;
                  allowDropIfAllowed(e);
                  const insertIndex = computeInsertIndexFromPointer(e, el, i);
                  setDragOver({ zone: "subs", insertIndex });
                }}
                onDrop={e => {
                  e.stopPropagation();
                  const insertIndex =
                    dragOver?.zone === "subs" ? dragOver.insertIndex : undefined;
                  dropOnList("subs", insertIndex)(e);
                }}
              >
                <div
                  className="flex items-center px-1 text-muted-foreground cursor-grab select-none"
                  draggable
                  onDragStart={startDrag({ source: "subs", rowId: s.id })}
                  onDragEnd={() => {
                    setDragged(null);
                    setDragOver(null);
                  }}
                  title="Drag to reorder"
                >
                  <GripVertical className="w-4 h-4" />
                </div>
                <select
                  className="flex-1 border rounded px-2 py-1"
                  value={s.stat}
                  onChange={e => {
                    const nextStat = e.target.value as GearStatKey;
                    setSubs(prev =>
                      prev.map(r => (r.id === s.id ? { ...r, stat: nextStat } : r))
                    );
                  }}
                >
                  {renderStatOptions()}
                </select>

                <Input
                  type="number"
                  value={s.value}
                  onChange={e => {
                    const nextValue = Number(e.target.value);
                    setSubs(prev =>
                      prev.map(r => (r.id === s.id ? { ...r, value: nextValue } : r))
                    );
                  }}
                />

                <Button size="icon" variant="ghost" onClick={() => removeSub(s.id)}>
                  ✕
                </Button>
              </div>
            </div>
          ))}
          {dragOver?.zone === "subs" && dragOver.insertIndex === subs.length && (
            <div className="h-0.5 bg-sky-500/80 rounded" />
          )}
        </div>
      </div>

      {/* Addition */}
      <div
        className={`border rounded p-3 space-y-2 ${dragOver?.zone === "addition" ? "ring-1 ring-slate-300" : ""}`}
        onDragOver={e => {
          allowDropIfAllowed(e);
          setDragOver({ zone: "addition" });
        }}
        onDragLeave={() => setDragOver(prev => (prev?.zone === "addition" ? null : prev))}
        onDrop={dropOnAddition()}
      >
        <p className="text-sm font-medium">Additional Attribute</p>

        {addition ? (
          <div className="flex gap-2">
            <div
              className="flex items-center px-1 text-muted-foreground cursor-grab select-none"
              draggable
              onDragStart={startDrag({ source: "addition" })}
              onDragEnd={() => {
                setDragged(null);
                setDragOver(null);
              }}
              title="Drag to move"
            >
              <GripVertical className="w-4 h-4" />
            </div>
            <select
              className="flex-1 border rounded px-2 py-1"
              value={addition.stat}
              onChange={e =>
                setAddition({ ...addition, stat: e.target.value as GearStatKey })
              }
            >
              {renderStatOptions()}
            </select>

            <Input
              type="number"
              value={addition.value}
              onChange={e =>
                setAddition({ ...addition, value: Number(e.target.value) })
              }
            />

            <Button size="icon" variant="ghost" onClick={() => setAddition(null)}>
              ✕
            </Button>
          </div>
        ) : (
          <Button
            size="sm"
            variant="secondary"
            onClick={() =>
              setAddition({ id: crypto.randomUUID(), stat: "CriticalRate", value: 0 })
            }
          >
            + Add Additional Attribute
          </Button>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-between pt-2">
        <Button onClick={submit}>
          {initialGear ? "Save Changes" : "Add Gear"}
        </Button>
        <Button
          variant="outline"
          onClick={() => fileRef.current?.click()}
          disabled={ocrLoading}
        >
          {ocrLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            "OCR"
          )}
        </Button>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;

            console.log("Selected file:", file); // 🔍 DEBUG
            handleOcr(file);

            // allow re-select same image
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}
