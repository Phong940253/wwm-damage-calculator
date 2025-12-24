"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

import {
  exportToClipboard,
  importFromClipboard,
} from "@/app/utils/importExport";

import { mergeCustomGears, mergeEquipped } from "@/app/utils/mergeGear";

import { ExportPayload } from "@/app/utils/importExport";
import { CustomGear, GearSlot } from "@/app/types";

export default function ImportExportTab() {
  const [exportStats, setExportStats] = useState(true);
  const [exportGear, setExportGear] = useState(true);
  const [mergeGear, setMergeGear] = useState(true);
  const [status, setStatus] = useState<string | null>(null);

  /* =======================
     Export
  ======================= */

  const handleExport = async () => {
    try {
      const payload: ExportPayload = { version: "1.0" };

      if (exportStats) {
        const statsRaw = localStorage.getItem("wwm_dmg_current_stats");
        const elementRaw = localStorage.getItem("wwm_element_stats");

        if (statsRaw) {
          payload.stats = JSON.parse(statsRaw) as Record<string, number>;
        }

        if (elementRaw) {
          payload.elementStats = JSON.parse(elementRaw) as Record<
            string,
            number | string
          >;
        }
      }

      if (exportGear) {
        const customRaw = localStorage.getItem("wwm_custom_gear");
        const equippedRaw = localStorage.getItem("wwm_equipped");

        payload.gear = {
          customGears: customRaw ? (JSON.parse(customRaw) as CustomGear[]) : [],
          equipped: equippedRaw
            ? (JSON.parse(equippedRaw) as Partial<Record<GearSlot, string>>)
            : {},
        };
      }

      await exportToClipboard(payload);
      setStatus("✅ Exported to clipboard");
    } catch {
      setStatus("❌ Export failed");
    }
  };

  /* =======================
     Import (Merge Gear)
  ======================= */

  const handleImport = async () => {
    try {
      const data = await importFromClipboard();

      /* ---- stats ---- */
      if (data.stats) {
        localStorage.setItem(
          "wwm_dmg_current_stats",
          JSON.stringify(data.stats)
        );
      }

      if (data.elementStats) {
        localStorage.setItem(
          "wwm_element_stats",
          JSON.stringify(data.elementStats)
        );
      }

      /* ---- gear ---- */
      if (data.gear) {
        const localCustomRaw = localStorage.getItem("wwm_custom_gear");
        const localEquippedRaw = localStorage.getItem("wwm_equipped");

        const localCustom: CustomGear[] = localCustomRaw
          ? (JSON.parse(localCustomRaw) as CustomGear[])
          : [];

        const localEquipped: Partial<Record<GearSlot, string>> =
          localEquippedRaw
            ? (JSON.parse(localEquippedRaw) as Partial<
                Record<GearSlot, string>
              >)
            : {};

        const nextCustom = mergeGear
          ? mergeCustomGears(localCustom, data.gear.customGears)
          : data.gear.customGears;

        const nextEquipped = mergeGear
          ? mergeEquipped(localEquipped, data.gear.equipped)
          : data.gear.equipped;

        localStorage.setItem("wwm_custom_gear", JSON.stringify(nextCustom));

        localStorage.setItem("wwm_equipped", JSON.stringify(nextEquipped));
      }

      setStatus(
        mergeGear
          ? "✅ Imported (gear merged). Reload page to apply."
          : "✅ Imported (gear overwritten). Reload page to apply."
      );
    } catch {
      setStatus("❌ Invalid clipboard data");
    }
  };

  /* =======================
     UI
  ======================= */

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import / Export Data</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Options */}
        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <Checkbox
              checked={exportStats}
              onCheckedChange={(v) => setExportStats(!!v)}
            />
            Stats & Element Stats
          </label>

          <label className="flex items-center gap-2">
            <Checkbox
              checked={exportGear}
              onCheckedChange={(v) => setExportGear(!!v)}
            />
            Gear (Custom + Equipped)
          </label>

          <label className="flex items-center gap-2">
            <Checkbox
              checked={mergeGear}
              onCheckedChange={(v) => setMergeGear(!!v)}
            />
            Merge gear (do not override local)
          </label>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button onClick={handleExport}>Export to Clipboard</Button>
          <Button variant="outline" onClick={handleImport}>
            Import from Clipboard
          </Button>
        </div>

        {/* Status */}
        {status && (
          <div className="text-sm text-muted-foreground">{status}</div>
        )}
      </CardContent>
    </Card>
  );
}
