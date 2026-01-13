// app/gear/GearForm.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useGear } from "../../providers/GearContext";
import { CustomGear, GearSlot } from "../../types";
import { GEAR_SLOTS } from "../../constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { callGeminiVision } from "@/lib/gemini";
import { normalizeStatKey } from "@/lib/normalizeStat";
import { fileToBase64 } from "@/lib/utils";
import { GEAR_OCR_PROMPT } from "../../domain/gear/gearOcrSchema";
import { GearOcrResult } from "../../domain/gear/gearOcrSchema";
import { GripVertical, Loader2 } from "lucide-react";
import { GearStatSelect } from "./GearStatSelect";
import { useGearStatDnD, type DragOver, type DraggedStat, type GearStatRow } from "./useGearStatDnD";


/* =======================
   Types
======================= */


interface GearFormProps {
  initialGear?: CustomGear | null;
  onSuccess?: () => void;
}

/* Armor slots that should NOT have main attributes */
const ARMOR_SLOTS: GearSlot[] = ["head", "chest", "hand", "leg"];


/* =======================
   Component
======================= */

export default function GearForm({ initialGear, onSuccess }: GearFormProps) {
  const { setCustomGears, setEquipped } = useGear();

  const [name, setName] = useState("");
  const [slot, setSlot] = useState<GearSlot>("weapon_1");
  const [rarity, setRarity] = useState("");

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
  const [dragOver, setDragOver] = useState<DragOver>(null);

  const dnd = useGearStatDnD({
    mains,
    setMains,
    subs,
    setSubs,
    addition,
    setAddition,
    dragged,
    setDragged,
    dragOver,
    setDragOver,
  });

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
      if (result.rarity) setRarity(String(result.rarity));

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
    setRarity(initialGear.rarity ?? "");

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
        rarity: rarity.trim() ? rarity.trim() : undefined,
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

        <div className="col-span-2">
          <label className="text-xs">Rarity</label>
          <Input
            value={rarity}
            onChange={(e) => setRarity(e.target.value)}
            placeholder="e.g. Common, Rare, Epic, Legendary"
            list="gear-rarity-options"
          />
          <datalist id="gear-rarity-options">
            <option value="Common" />
            <option value="Uncommon" />
            <option value="Rare" />
            <option value="Epic" />
            <option value="Legendary" />
          </datalist>
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
            dnd.allowDrop(e);
            dnd.setDragOver({ zone: "mains", insertIndex: mains.length });
          }}
          onDragLeave={() =>
            dnd.setDragOver(prev => (prev?.zone === "mains" ? null : prev))
          }
          onDrop={dnd.dropOnList("mains")}
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
                  dnd.allowDrop(e);
                  const insertIndex = dnd.computeInsertIndexFromPointer(e, el, i);
                  dnd.setDragOver({ zone: "mains", insertIndex });
                }}
                onDrop={e => {
                  e.stopPropagation();
                  const insertIndex =
                    dragOver?.zone === "mains" ? dragOver.insertIndex : undefined;
                  dnd.dropOnList("mains", insertIndex)(e);
                }}
              >
                <div
                  className="flex items-center px-1 text-muted-foreground cursor-grab select-none"
                  draggable
                  onDragStart={dnd.startDrag({ source: "mains", rowId: m.id })}
                  onDragEnd={() => {
                    dnd.endDrag();
                  }}
                  title="Drag to reorder"
                >
                  <GripVertical className="w-4 h-4" />
                </div>
                <GearStatSelect
                  value={m.stat}
                  onChange={nextStat =>
                    setMains(prev =>
                      prev.map(r => (r.id === m.id ? { ...r, stat: nextStat } : r))
                    )
                  }
                />

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
            dnd.allowDrop(e);
            dnd.setDragOver({ zone: "subs", insertIndex: subs.length });
          }}
          onDragLeave={() =>
            dnd.setDragOver(prev => (prev?.zone === "subs" ? null : prev))
          }
          onDrop={dnd.dropOnList("subs")}
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
                  dnd.allowDrop(e);
                  const insertIndex = dnd.computeInsertIndexFromPointer(e, el, i);
                  dnd.setDragOver({ zone: "subs", insertIndex });
                }}
                onDrop={e => {
                  e.stopPropagation();
                  const insertIndex =
                    dragOver?.zone === "subs" ? dragOver.insertIndex : undefined;
                  dnd.dropOnList("subs", insertIndex)(e);
                }}
              >
                <div
                  className="flex items-center px-1 text-muted-foreground cursor-grab select-none"
                  draggable
                  onDragStart={dnd.startDrag({ source: "subs", rowId: s.id })}
                  onDragEnd={() => {
                    dnd.endDrag();
                  }}
                  title="Drag to reorder"
                >
                  <GripVertical className="w-4 h-4" />
                </div>
                <GearStatSelect
                  value={s.stat}
                  onChange={nextStat =>
                    setSubs(prev =>
                      prev.map(r => (r.id === s.id ? { ...r, stat: nextStat } : r))
                    )
                  }
                />

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
          dnd.allowDrop(e);
          dnd.setDragOver({ zone: "addition" });
        }}
        onDragLeave={() => dnd.setDragOver(prev => (prev?.zone === "addition" ? null : prev))}
        onDrop={dnd.dropOnAddition()}
      >
        <p className="text-sm font-medium">Additional Attribute</p>

        {addition ? (
          <div className="flex gap-2">
            <div
              className="flex items-center px-1 text-muted-foreground cursor-grab select-none"
              draggable
              onDragStart={dnd.startDrag({ source: "addition" })}
              onDragEnd={() => {
                dnd.endDrag();
              }}
              title="Drag to move"
            >
              <GripVertical className="w-4 h-4" />
            </div>
            <GearStatSelect
              value={addition.stat}
              onChange={nextStat => setAddition({ ...addition, stat: nextStat })}
            />

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
