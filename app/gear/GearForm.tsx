"use client";

import { useEffect, useState } from "react";
import { useGear } from "../gear/GearContext";
import { CustomGear, GearSlot, InputStats } from "../types";
import { GEAR_SLOTS, STAT_GROUPS } from "../constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/* =======================
   Types
======================= */

type GearStatKey = keyof InputStats;

interface GearFormProps {
  initialGear?: CustomGear | null;
  onSuccess?: () => void;
}

/* Flatten stat options */
const STAT_OPTIONS: GearStatKey[] = Object.values(STAT_GROUPS).flat();

/* =======================
   Component
======================= */

export default function GearForm({ initialGear, onSuccess }: GearFormProps) {
  const { setCustomGears, setEquipped } = useGear();

  const [name, setName] = useState("");
  const [slot, setSlot] = useState<GearSlot>("weapon_1");

  /** 🔥 MULTI MAIN */
  const [mains, setMains] = useState<
    { stat: GearStatKey; value: number }[]
  >([{ stat: "MaxPhysicalAttack", value: 0 }]);

  const [subs, setSubs] = useState<
    { stat: GearStatKey; value: number }[]
  >([]);

  const [addition, setAddition] = useState<
    { stat: GearStatKey; value: number } | null
  >(null);

  /* -------------------- init (edit mode) -------------------- */
  useEffect(() => {
    if (!initialGear) return;

    setName(initialGear.name);
    setSlot(initialGear.slot);

    setMains(initialGear.mains);

    setSubs(initialGear.subs ?? []);
    setAddition(initialGear.addition ?? null);
  }, [initialGear]);

  /* -------------------- submit -------------------- */
  const submit = () => {
    if (!name || mains.length === 0) return;

    const id = initialGear?.id ?? crypto.randomUUID();

    const gear: CustomGear = {
      id,
      name,
      slot,
      mains,
      subs,
      addition: addition ?? undefined,
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
  };

  /* -------------------- helpers -------------------- */
  const addMain = () =>
    setMains(m => [...m, { stat: "MaxPhysicalAttack", value: 0 }]);

  const removeMain = (i: number) =>
    setMains(m => m.filter((_, idx) => idx !== i));

  const addSub = () =>
    setSubs(s => [...s, { stat: "CriticalRate", value: 0 }]);

  const removeSub = (i: number) =>
    setSubs(s => s.filter((_, idx) => idx !== i));

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

        {mains.map((m, i) => (
          <div key={i} className="flex gap-2">
            <select
              className="flex-1 border rounded px-2 py-1"
              value={m.stat}
              onChange={e => {
                const v = [...mains];
                v[i].stat = e.target.value as GearStatKey;
                setMains(v);
              }}
            >
              {STAT_OPTIONS.map(s => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            <Input
              type="number"
              value={m.value}
              onChange={e => {
                const v = [...mains];
                v[i].value = Number(e.target.value);
                setMains(v);
              }}
            />

            {mains.length > 1 && (
              <Button
                size="icon"
                variant="ghost"
                onClick={() => removeMain(i)}
              >
                ✕
              </Button>
            )}
          </div>
        ))}
      </div>

      {/* Sub attributes */}
      <div className="border rounded p-3 space-y-2">
        <div className="flex justify-between items-center">
          <p className="text-sm font-medium">Sub Attributes</p>
          <Button size="sm" variant="secondary" onClick={addSub}>
            + Add
          </Button>
        </div>

        {subs.map((s, i) => (
          <div key={i} className="flex gap-2">
            <select
              className="flex-1 border rounded px-2 py-1"
              value={s.stat}
              onChange={e => {
                const v = [...subs];
                v[i].stat = e.target.value as GearStatKey;
                setSubs(v);
              }}
            >
              {STAT_OPTIONS.map(st => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>

            <Input
              type="number"
              value={s.value}
              onChange={e => {
                const v = [...subs];
                v[i].value = Number(e.target.value);
                setSubs(v);
              }}
            />

            <Button size="icon" variant="ghost" onClick={() => removeSub(i)}>
              ✕
            </Button>
          </div>
        ))}
      </div>

      {/* Addition */}
      <div className="border rounded p-3 space-y-2">
        <p className="text-sm font-medium">Additional Attribute</p>

        {addition ? (
          <div className="flex gap-2">
            <select
              className="flex-1 border rounded px-2 py-1"
              value={addition.stat}
              onChange={e =>
                setAddition({ ...addition, stat: e.target.value as GearStatKey })
              }
            >
              {STAT_OPTIONS.map(s => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
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
              setAddition({ stat: "CriticalRate", value: 0 })
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

        <Button variant="outline" disabled>
          OCR (TODO)
        </Button>
      </div>
    </div>
  );
}
