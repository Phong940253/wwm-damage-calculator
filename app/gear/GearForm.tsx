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

/* Flatten stat options from STAT_GROUPS */
const STAT_OPTIONS: GearStatKey[] = Object.values(STAT_GROUPS).flat();

/* =======================
   Component
======================= */

export default function GearForm({
  initialGear,
  onSuccess,
}: GearFormProps) {
  const { setCustomGears, setEquipped } = useGear();


  const [name, setName] = useState("");
  const [slot, setSlot] = useState<GearSlot>("weapon_1");

  const [main, setMain] = useState<{
    stat: GearStatKey;
    value: number;
  }>({
    stat: "MaxPhysicalAttack",
    value: 0,
  });

  const [subs, setSubs] = useState<
    { stat: GearStatKey; value: number }[]
  >([]);

  const [addition, setAddition] = useState<
    { stat: GearStatKey; value: number } | null
  >(null);

  /* -------------------- init for edit -------------------- */
  useEffect(() => {
    if (!initialGear) return;

    setName(initialGear.name);
    setSlot(initialGear.slot);
    setMain(initialGear.main);
    setSubs(initialGear.subs ?? []);
    setAddition(initialGear.addition ?? null);
  }, [initialGear]);

  /* -------------------- submit -------------------- */
  const submit = () => {
    if (!name) return;

    const id = initialGear?.id ?? crypto.randomUUID();

    const gear: CustomGear = {
      id,
      name,
      slot,
      main,
      subs,
      addition: addition ?? undefined,
    };

    setCustomGears(g =>
      initialGear
        ? g.map(x => (x.id === id ? gear : x))
        : [...g, gear]
    );

    // 🔥 migrate equipped safely
    if (initialGear) {
      setEquipped(prev => {
        const next = { ...prev };

        // if this gear was equipped before
        const prevSlot = initialGear.slot;
        const newSlot = slot;

        if (prev[prevSlot] === id) {
          // remove old slot
          delete next[prevSlot];

          // assign new slot
          next[newSlot] = id;
        }

        return next;
      });
    }

    onSuccess?.();
  };


  /* -------------------- helpers -------------------- */
  const addSub = () => {
    setSubs(s => [...s, { stat: "CriticalRate", value: 0 }]);
  };

  const removeSub = (idx: number) => {
    setSubs(s => s.filter((_, i) => i !== idx));
  };

  /* -------------------- UI -------------------- */
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

      {/* Main attribute */}
      <div className="border rounded p-3 space-y-2">
        <p className="text-sm font-medium">Main Attribute</p>

        <div className="flex gap-2">
          <select
            className="flex-1 border rounded px-2 py-1"
            value={main.stat}
            onChange={e =>
              setMain({ ...main, stat: e.target.value as GearStatKey })
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
            value={main.value}
            onChange={e =>
              setMain({ ...main, value: Number(e.target.value) })
            }
          />
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

            <Button
              size="icon"
              variant="ghost"
              onClick={() => removeSub(i)}
            >
              ✕
            </Button>
          </div>
        ))}
      </div>

      {/* Addition attribute */}
      <div className="border rounded p-3 space-y-2">
        <p className="text-sm font-medium">Additional Attribute</p>

        {addition ? (
          <div className="flex gap-2">
            <select
              className="flex-1 border rounded px-2 py-1"
              value={addition.stat}
              onChange={e =>
                setAddition({
                  ...addition,
                  stat: e.target.value as GearStatKey,
                })
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
                setAddition({
                  ...addition,
                  value: Number(e.target.value),
                })
              }
            />

            <Button
              size="icon"
              variant="ghost"
              onClick={() => setAddition(null)}
            >
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
      <div className="flex justify-between items-center pt-2">
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
