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
import {
  getAdditionStatGroupsBySlot,
  getAdditionStatsBySlot,
  isValidAdditionStatForSlot,
} from "@/app/domain/gear/additionRules";
import { GripVertical, Loader2 } from "lucide-react";
import { GearStatSelect } from "./GearStatSelect";
import { useGearStatDnD, type DragOver, type DraggedStat, type GearStatRow } from "./useGearStatDnD";
import { useI18n } from "@/app/providers/I18nProvider";
import { MartialArtWeaponType } from "@/app/domain/skill/types";


/* =======================
   Types
======================= */


interface GearFormProps {
  initialGear?: CustomGear | null;
  onSuccess?: () => void;
}

/* Armor slots that should NOT have main attributes */
const ARMOR_SLOTS: GearSlot[] = ["head", "chest", "hand", "leg"];
const WEAPON_SLOTS: GearSlot[] = ["weapon_1", "weapon_2"];

const WEAPON_TYPE_OPTIONS: Array<{
  value: MartialArtWeaponType;
  label: string;
}> = [
    { value: "sword", label: "Sword" },
    { value: "spear", label: "Spear" },
    { value: "umbrella", label: "Umbrella" },
    { value: "fan", label: "Fan" },
    { value: "horizontal_blade", label: "Horizontal Blade" },
    { value: "mo_blade", label: "Mo Blade" },
    { value: "rope_dart", label: "Rope Dart" },
    { value: "dual_blades", label: "Dual Blades" },
  ];

function isWeaponSlot(slot: GearSlot): boolean {
  return WEAPON_SLOTS.includes(slot);
}


/* =======================
   Component
======================= */

export default function GearForm({ initialGear, onSuccess }: GearFormProps) {
  const { language } = useI18n();
  const text = language === "vi"
    ? {
      ocrFailed: "OCR thất bại. Vui lòng thử lại hoặc nhập thủ công.",
      enterName: "Vui lòng nhập tên trang bị",
      addMainRequired: "Vui lòng thêm ít nhất một thuộc tính chính",
      saveFailed: "Lưu trang bị thất bại. Vui lòng thử lại.",
      gearName: "Tên trang bị",
      slot: "Vị trí",
      weaponType: "Loại vũ khí",
      weaponTypeRequired: "Vui lòng chọn loại vũ khí cho ô Weapon",
      rarity: "Độ hiếm",
      rarityPlaceholder: "ví dụ: Common, Rare, Epic, Legendary",
      mainAttributes: "Thuộc tính chính",
      subAttributes: "Thuộc tính phụ",
      additionalAttribute: "Thuộc tính bổ sung",
      addAdditionalAttribute: "+ Thêm thuộc tính bổ sung",
      add: "+ Thêm",
      dragToReorder: "Kéo để sắp xếp",
      dragToMove: "Kéo để di chuyển",
      tunedLine: "Dòng đã tune",
      markTuned: "Tune",
      tuned: "Đã tune",
      saveChanges: "Lưu thay đổi",
      addGear: "Thêm trang bị",
      processing: "Đang xử lý...",
      ocr: "OCR",
    }
    : {
      ocrFailed: "OCR failed. Please try again or enter manually.",
      enterName: "Please enter a gear name",
      addMainRequired: "Please add at least one main attribute",
      saveFailed: "Failed to save gear. Please try again.",
      gearName: "Gear Name",
      slot: "Slot",
      weaponType: "Weapon Type",
      weaponTypeRequired: "Please select a weapon type for weapon slots",
      rarity: "Rarity",
      rarityPlaceholder: "e.g. Common, Rare, Epic, Legendary",
      mainAttributes: "Main Attributes",
      subAttributes: "Sub Attributes",
      additionalAttribute: "Additional Attribute",
      addAdditionalAttribute: "+ Add Additional Attribute",
      add: "+ Add",
      dragToReorder: "Drag to reorder",
      dragToMove: "Drag to move",
      tunedLine: "Tuned line",
      markTuned: "Tune",
      tuned: "Tuned",
      saveChanges: "Save Changes",
      addGear: "Add Gear",
      processing: "Processing...",
      ocr: "OCR",
    };

  const sectionClass = "rounded-md border p-3 space-y-2";
  const labelClass = "mb-1 block text-xs font-medium text-muted-foreground";
  const slotSelectClass = "h-9 w-full rounded-md border border-input bg-background px-2 text-sm";
  const compactInputClass = "h-8 w-[6.5rem] shrink-0 text-sm sm:w-28";
  const iconButtonClass = "h-8 w-8 shrink-0";

  const { setCustomGears, setEquipped } = useGear();

  const [name, setName] = useState("");
  const [slot, setSlot] = useState<GearSlot>("weapon_1");
  const [weaponType, setWeaponType] = useState<MartialArtWeaponType | "">("sword");
  const [rarity, setRarity] = useState("");

  /** 🔥 MULTI MAIN */

  const fileRef = useRef<HTMLInputElement | null>(null);
  const [mains, setMains] = useState<
    GearStatRow[]
  >([{ id: crypto.randomUUID(), stat: "MaxPhysicalAttack", value: 0 }]);

  const [subs, setSubs] = useState<
    GearStatRow[]
  >([]);
  const [tunedSubRowId, setTunedSubRowId] = useState<string | null>(null);

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
  const additionOptions = getAdditionStatsBySlot(slot);
  const additionOptionGroups = getAdditionStatGroupsBySlot(slot);
  const defaultAdditionStat = additionOptions[0] ?? "PhysicalPenetration";

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
      const nextSlot = (result.slot as GearSlot) || slot;
      if (result.slot) setSlot(nextSlot);
      if (!isWeaponSlot(nextSlot)) {
        setWeaponType("");
      } else if (!weaponType) {
        setWeaponType("sword");
      }
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
        setTunedSubRowId(null);
      }


      if (result.addition) {
        const stat = normalizeStatKey(result.addition.stat);
        if (stat && isValidAdditionStatForSlot(nextSlot, String(stat))) {
          setAddition({
            id: crypto.randomUUID(),
            stat,
            value: result.addition.value,
          });
        } else {
          setAddition(null);
        }
      }

    } catch (error) {
      console.error("OCR failed:", error);
      alert(text.ocrFailed);
    } finally {
      setOcrLoading(false);
    }
  };

  /* -------------------- init (edit mode) -------------------- */
  useEffect(() => {
    if (!initialGear) return;

    setName(initialGear.name);
    setSlot(initialGear.slot);
    setWeaponType(initialGear.weaponType ?? (isWeaponSlot(initialGear.slot) ? "sword" : ""));
    setRarity(initialGear.rarity ?? "");

    setMains(initialGear.mains.map(m => ({ id: crypto.randomUUID(), ...m })));

    const mappedSubs = (initialGear.subs ?? []).map(s => ({
      id: crypto.randomUUID(),
      ...s,
    }));
    setSubs(mappedSubs);
    if (
      typeof initialGear.tunedSubIndex === "number" &&
      initialGear.tunedSubIndex >= 0 &&
      initialGear.tunedSubIndex < mappedSubs.length
    ) {
      setTunedSubRowId(mappedSubs[initialGear.tunedSubIndex].id);
    } else {
      setTunedSubRowId(null);
    }

    setAddition(
      initialGear.addition &&
        isValidAdditionStatForSlot(initialGear.slot, String(initialGear.addition.stat))
        ? { id: crypto.randomUUID(), ...initialGear.addition }
        : null
    );
  }, [initialGear]);

  useEffect(() => {
    if (isWeaponSlot(slot)) {
      if (!weaponType) setWeaponType("sword");
      return;
    }
    if (weaponType) setWeaponType("");
  }, [slot, weaponType]);

  useEffect(() => {
    if (!addition) return;
    if (isValidAdditionStatForSlot(slot, String(addition.stat))) return;

    setAddition({
      ...addition,
      stat: defaultAdditionStat,
    });
  }, [slot, addition, defaultAdditionStat]);

  useEffect(() => {
    if (!tunedSubRowId) return;
    if (!subs.some((s) => s.id === tunedSubRowId)) {
      setTunedSubRowId(null);
    }
  }, [subs, tunedSubRowId]);

  /* -------------------- submit -------------------- */
  const submit = () => {
    // Validate name
    if (!name.trim()) {
      alert(text.enterName);
      return;
    }

    // Check if current slot is armor
    const isArmor = ARMOR_SLOTS.includes(slot);

    // Validate mains for non-armor slots
    if (!isArmor && mains.length === 0) {
      alert(text.addMainRequired);
      return;
    }

    if (isWeaponSlot(slot) && !weaponType) {
      alert(text.weaponTypeRequired);
      return;
    }

    try {
      const id = initialGear?.id ?? crypto.randomUUID();

      const gear: CustomGear = {
        id,
        name,
        slot,
        weaponType: isWeaponSlot(slot) ? weaponType || undefined : undefined,
        mains: mains.map(({ stat, value }) => ({ stat, value })),
        subs: subs.map(({ stat, value }) => ({ stat, value })),
        addition:
          addition && isValidAdditionStatForSlot(slot, String(addition.stat))
            ? { stat: addition.stat, value: addition.value }
            : undefined,
        tunedSubIndex:
          tunedSubRowId === null
            ? null
            : (() => {
              const idx = subs.findIndex((s) => s.id === tunedSubRowId);
              return idx >= 0 ? idx : null;
            })(),
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
      alert(text.saveFailed);
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
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className={labelClass}>{text.gearName}</label>
          <Input value={name} onChange={e => setName(e.target.value)} />
        </div>

        <div>
          <label className={labelClass}>{text.slot}</label>
          <select
            className={slotSelectClass}
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

        {isWeaponSlot(slot) && (
          <div>
            <label className={labelClass}>{text.weaponType}</label>
            <select
              className={slotSelectClass}
              value={weaponType}
              onChange={(e) => setWeaponType(e.target.value as MartialArtWeaponType)}
            >
              {WEAPON_TYPE_OPTIONS.map((w) => (
                <option key={w.value} value={w.value}>
                  {w.label}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="sm:col-span-2">
          <label className={labelClass}>{text.rarity}</label>
          <Input
            value={rarity}
            onChange={(e) => setRarity(e.target.value)}
            placeholder={text.rarityPlaceholder}
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

      <div className={sectionClass}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium">{text.mainAttributes}</p>
          <Button className="h-8" size="sm" variant="secondary" onClick={addMain}>
            {text.add}
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
                className="flex flex-wrap items-center gap-1.5 rounded sm:flex-nowrap"
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
                  title={text.dragToReorder}
                >
                  <GripVertical className="w-4 h-4" />
                </div>
                <GearStatSelect
                  className="order-1 h-8 w-full border rounded px-2 text-sm sm:order-none sm:min-w-0 sm:flex-1"
                  value={m.stat}
                  onChange={nextStat =>
                    setMains(prev =>
                      prev.map(r => (r.id === m.id ? { ...r, stat: nextStat } : r))
                    )
                  }
                />

                <Input
                  className={compactInputClass}
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
                  <Button className={iconButtonClass} size="icon" variant="ghost" onClick={() => removeMain(m.id)}>
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
      <div className={sectionClass}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium">{text.subAttributes}</p>
          <div className="flex items-center gap-2">
            {tunedSubRowId && (
              <span className="hidden text-xs text-red-400 sm:inline">{text.tunedLine}</span>
            )}
            <Button className="h-8" size="sm" variant="secondary" onClick={addSub}>
              {text.add}
            </Button>
          </div>
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
                className="flex flex-wrap items-center gap-1.5 rounded sm:flex-nowrap"
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
                  title={text.dragToReorder}
                >
                  <GripVertical className="w-4 h-4" />
                </div>
                <GearStatSelect
                  className="order-1 h-8 w-full border rounded px-2 text-sm sm:order-none sm:min-w-0 sm:flex-1"
                  value={s.stat}
                  onChange={nextStat =>
                    setSubs(prev =>
                      prev.map(r => (r.id === s.id ? { ...r, stat: nextStat } : r))
                    )
                  }
                />

                <Input
                  className={compactInputClass}
                  type="number"
                  value={s.value}
                  onChange={e => {
                    const nextValue = Number(e.target.value);
                    setSubs(prev =>
                      prev.map(r => (r.id === s.id ? { ...r, value: nextValue } : r))
                    );
                  }}
                />

                <Button className={iconButtonClass} size="icon" variant="ghost" onClick={() => removeSub(s.id)}>
                  ✕
                </Button>
                <Button
                  className="h-8 w-full shrink-0 whitespace-nowrap px-2 text-xs sm:w-auto"
                  size="sm"
                  variant={tunedSubRowId === s.id ? "destructive" : "outline"}
                  onClick={() =>
                    setTunedSubRowId((prev) => (prev === s.id ? null : s.id))
                  }
                  title={text.markTuned}
                >
                  {tunedSubRowId === s.id ? text.tuned : text.markTuned}
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
        className={`${sectionClass} ${dragOver?.zone === "addition" ? "ring-1 ring-slate-300" : ""}`}
        onDragOver={e => {
          dnd.allowDrop(e);
          dnd.setDragOver({ zone: "addition" });
        }}
        onDragLeave={() => dnd.setDragOver(prev => (prev?.zone === "addition" ? null : prev))}
        onDrop={dnd.dropOnAddition()}
      >
        <p className="text-sm font-medium">{text.additionalAttribute}</p>

        {addition ? (
          <div>
            <div className="flex flex-wrap items-center gap-1.5 sm:flex-nowrap">
              <div
                className="flex items-center px-1 text-muted-foreground cursor-grab select-none"
                draggable
                onDragStart={dnd.startDrag({ source: "addition" })}
                onDragEnd={() => {
                  dnd.endDrag();
                }}
                title={text.dragToMove}
              >
                <GripVertical className="w-4 h-4" />
              </div>
              <GearStatSelect
                className="order-1 h-8 w-full border rounded px-2 text-sm sm:order-none sm:min-w-0 sm:flex-1"
                value={addition.stat}
                onChange={nextStat => setAddition({ ...addition, stat: nextStat })}
                optionGroups={additionOptionGroups}
              />

              <Input
                className={compactInputClass}
                type="number"
                value={addition.value}
                onChange={e =>
                  setAddition({ ...addition, value: Number(e.target.value) })
                }
              />

              <Button className={iconButtonClass} size="icon" variant="ghost" onClick={() => setAddition(null)}>
                ✕
              </Button>
            </div>
          </div>
        ) : (
          <Button
            className="w-full sm:w-auto"
            size="sm"
            variant="secondary"
            onClick={() =>
              setAddition({ id: crypto.randomUUID(), stat: defaultAdditionStat, value: 0 })
            }
          >
            {text.addAdditionalAttribute}
          </Button>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:flex-wrap sm:justify-between">
        <Button className="h-9 w-full sm:w-auto" data-tour={!initialGear ? "gear-add-submit" : undefined} onClick={submit}>
          {initialGear ? text.saveChanges : text.addGear}
        </Button>
        <Button
          className="h-9 w-full sm:w-auto"
          data-tour="gear-ocr"
          variant="outline"
          onClick={() => fileRef.current?.click()}
          disabled={ocrLoading}
        >
          {ocrLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {text.processing}
            </>
          ) : (
            text.ocr
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
