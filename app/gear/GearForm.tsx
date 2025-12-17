"use client";

import { useState } from "react";
import { useGear } from "../hooks/useGear";
import { CustomGear, GearSlot } from "../types";
import { GEAR_SLOTS } from "../constants";

export default function GearForm() {
  const { setCustomGears } = useGear();

  const [name, setName] = useState("");
  const [slot, setSlot] = useState<GearSlot>("weapon_1");

  const addGear = () => {
    if (!name) return;

    const gear: CustomGear = {
      id: crypto.randomUUID(),
      name,
      slot,
      main: { stat: "MaxPhysicalAttack", value: 50 },
      subs: [],
      addition: undefined,
    };

    setCustomGears(g => [...g, gear]);
    setName("");
  };

  return (
    <div className="flex gap-2 items-end">
      <div className="flex-1">
        <label className="text-xs">Gear Name</label>
        <input
          className="w-full border rounded px-2 py-1"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div>
        <label className="text-xs">Slot</label>
        <select
          className="border rounded px-2 py-1"
          value={slot}
          onChange={(e) => setSlot(e.target.value as GearSlot)}
        >
          {GEAR_SLOTS.map(s => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={addGear}
        className="px-3 py-2 rounded bg-emerald-500/20 text-emerald-400"
      >
        Add
      </button>

      {/* OCR stub */}
      <button
        disabled
        className="px-3 py-2 rounded border opacity-50 text-xs"
      >
        OCR (TODO)
      </button>
    </div>
  );
}
