"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  exportToClipboard,
  importFromClipboard,
} from "@/app/utils/importExport";

export default function ImportExportTab() {
  const [exportStats, setExportStats] = useState(true);
  const [exportGear, setExportGear] = useState(true);
  const [status, setStatus] = useState<string | null>(null);

  const handleExport = async () => {
    try {
      const payload: any = { version: "1.0" };

      if (exportStats) {
        const stats = localStorage.getItem("wwm_dmg_current_stats");
        const elements = localStorage.getItem("wwm_element_stats");

        if (stats) payload.stats = JSON.parse(stats);
        if (elements) payload.elementStats = JSON.parse(elements);
      }

      if (exportGear) {
        const customGears = localStorage.getItem("wwm_custom_gear");
        const equipped = localStorage.getItem("wwm_equipped");

        payload.gear = {
          customGears: customGears ? JSON.parse(customGears) : [],
          equipped: equipped ? JSON.parse(equipped) : {},
        };
      }

      await exportToClipboard(payload);
      setStatus("✅ Exported to clipboard");
    } catch (e: any) {
      setStatus("❌ Export failed");
    }
  };

  const handleImport = async () => {
    try {
      const data = await importFromClipboard();

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

      if (data.gear) {
        localStorage.setItem(
          "wwm_custom_gear",
          JSON.stringify(data.gear.customGears || [])
        );
        localStorage.setItem(
          "wwm_equipped",
          JSON.stringify(data.gear.equipped || {})
        );
      }

      setStatus("✅ Imported! Reload page to apply.");
    } catch {
      setStatus("❌ Invalid clipboard data");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import / Export Data</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
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
        </div>

        <div className="flex gap-2">
          <Button onClick={handleExport}>Export to Clipboard</Button>
          <Button variant="outline" onClick={handleImport}>
            Import from Clipboard
          </Button>
        </div>

        {status && (
          <div className="text-sm text-muted-foreground">{status}</div>
        )}
      </CardContent>
    </Card>
  );
}
