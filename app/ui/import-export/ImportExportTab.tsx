"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useI18n } from "@/app/providers/I18nProvider";

import {
  exportToClipboard,
  importFromClipboard,
} from "@/app/utils/importExport";

import { mergeCustomGears, mergeEquipped } from "@/app/utils/mergeGear";

import { ExportPayload } from "@/app/utils/importExport";
import { CustomGear, GearSlot, Rotation } from "@/app/types";

const ROTATIONS_KEY = "wwm_rotations";
const ROTATIONS_SELECTED_ID_KEY = "wwm_rotations_selected_id";

type StatusState =
  | { variant: "default" | "secondary" | "destructive"; text: string }
  | null;

export default function ImportExportTab() {
  const { language } = useI18n();
  const text = language === "vi"
    ? {
      clearConfirm:
        "Thao tác này sẽ xóa toàn bộ dữ liệu đã lưu (chỉ số, trang bị, rotation) trên trình duyệt này. Tiếp tục?",
      cleared: "Đã xóa dữ liệu local. Tải lại để áp dụng.",
      clearFailed: "Xóa thất bại",
      exported: "Đã xuất vào clipboard",
      exportFailed: "Xuất thất bại",
      importedMerged: "Đã nhập (đã gộp trang bị). Tải lại để áp dụng.",
      imported: "Đã nhập. Tải lại để áp dụng.",
      invalidClipboard: "Dữ liệu clipboard không hợp lệ",
      title: "Nhập / Xuất dữ liệu",
      export: "Xuất",
      exportDesc: "Chọn phần dữ liệu cần đưa vào payload clipboard.",
      stats: "Chỉ số",
      statsExportDesc: "Chỉ số hiện tại + chỉ số nguyên tố",
      gear: "Trang bị",
      gearExportDesc: "Trang bị custom + ô đang trang bị",
      rotations: "Rotations",
      rotationsExportDesc: "Rotation đã lưu + rotation đang chọn",
      exportClipboard: "Xuất vào Clipboard",
      import: "Nhập",
      importDesc: "Dán payload từ clipboard và chọn mục muốn áp dụng.",
      statsImportDesc: "Ghi đè chỉ số local",
      gearImportDesc: "Ghi đè hoặc gộp (bên dưới)",
      rotationsImportDesc: "Ghi đè rotation đã lưu",
      mergeGear: "Gộp trang bị",
      mergeGearDesc: "Giữ item local; chỉ thêm item còn thiếu",
      importClipboard: "Nhập từ Clipboard",
      reload: "Tải lại",
      dangerZone: "Vùng nguy hiểm",
      dangerDesc: "Xóa vĩnh viễn toàn bộ dữ liệu đã lưu trong trình duyệt này.",
      clearData: "Xóa dữ liệu",
      overwriteSavedRotations: "Ghi đè rotation đã lưu",
    }
    : {
      clearConfirm:
        "This will clear all saved calculator data (stats, gear, rotations) from this browser. Continue?",
      cleared: "Cleared local data. Reload to apply.",
      clearFailed: "Clear failed",
      exported: "Exported to clipboard",
      exportFailed: "Export failed",
      importedMerged: "Imported (gear merged). Reload to apply.",
      imported: "Imported. Reload to apply.",
      invalidClipboard: "Invalid clipboard data",
      title: "Import / Export Data",
      export: "Export",
      exportDesc: "Choose what to include in the clipboard payload.",
      stats: "Stats",
      statsExportDesc: "Current stats + element stats",
      gear: "Gear",
      gearExportDesc: "Custom gear + equipped slots",
      rotations: "Rotations",
      rotationsExportDesc: "Saved rotations + selected rotation",
      exportClipboard: "Export to Clipboard",
      import: "Import",
      importDesc: "Paste a payload from clipboard and choose which sections to apply.",
      statsImportDesc: "Overwrite local stats",
      gearImportDesc: "Overwrite or merge (below)",
      rotationsImportDesc: "Overwrite saved rotations",
      mergeGear: "Merge gear",
      mergeGearDesc: "Keep local items; only add missing",
      importClipboard: "Import from Clipboard",
      reload: "Reload",
      dangerZone: "Danger zone",
      dangerDesc: "Permanently deletes all saved data in this browser.",
      clearData: "Clear Data",
      overwriteSavedRotations: "Overwrite saved rotations",
    };

  const [exportStats, setExportStats] = useState(true);
  const [exportGear, setExportGear] = useState(true);
  const [exportRotations, setExportRotations] = useState(true);

  const [importStats, setImportStats] = useState(true);
  const [importGear, setImportGear] = useState(true);
  const [importRotations, setImportRotations] = useState(true);
  const [mergeGear, setMergeGear] = useState(true);

  const [status, setStatus] = useState<StatusState>(null);

  /* =======================
     Clear Local Data
  ======================= */

  const handleClearData = () => {
    const ok = window.confirm(text.clearConfirm);
    if (!ok) return;

    try {
      const keysToRemove = Object.keys(localStorage).filter((k) =>
        k.startsWith("wwm_")
      );
      for (const key of keysToRemove) {
        localStorage.removeItem(key);
      }

      setStatus({ variant: "secondary", text: text.cleared });
    } catch {
      setStatus({ variant: "destructive", text: text.clearFailed });
    }
  };

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

      if (exportRotations) {
        const rotationsRaw = localStorage.getItem(ROTATIONS_KEY);
        const selectedRotationIdRaw = localStorage.getItem(
          ROTATIONS_SELECTED_ID_KEY
        );

        payload.rotations = {
          list: rotationsRaw ? (JSON.parse(rotationsRaw) as Rotation[]) : [],
          selectedId: selectedRotationIdRaw || undefined,
        };
      }

      await exportToClipboard(payload);
      setStatus({ variant: "default", text: text.exported });
    } catch {
      setStatus({ variant: "destructive", text: text.exportFailed });
    }
  };

  /* =======================
     Import (Merge Gear)
  ======================= */

  const handleImport = async () => {
    try {
      const data = await importFromClipboard();

      /* ---- stats ---- */
      if (importStats && data.stats) {
        localStorage.setItem(
          "wwm_dmg_current_stats",
          JSON.stringify(data.stats)
        );
      }

      if (importStats && data.elementStats) {
        localStorage.setItem(
          "wwm_element_stats",
          JSON.stringify(data.elementStats)
        );
      }

      /* ---- gear ---- */
      if (importGear && data.gear) {
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

      /* ---- rotations ---- */
      if (importRotations && data.rotations) {
        localStorage.setItem(ROTATIONS_KEY, JSON.stringify(data.rotations.list));
        if (data.rotations.selectedId) {
          localStorage.setItem(
            ROTATIONS_SELECTED_ID_KEY,
            String(data.rotations.selectedId)
          );
        }
      }

      setStatus({
        variant: "default",
        text:
          importGear && mergeGear
            ? text.importedMerged
            : text.imported,
      });
    } catch {
      setStatus({ variant: "destructive", text: text.invalidClipboard });
    }
  };

  /* =======================
     UI
  ======================= */

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle>{text.title}</CardTitle>
          {status && (
            <Badge variant={status.variant} className="shrink-0">
              {status.text}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Export */}
        <div className="space-y-3">
          <div className="space-y-1">
            <div className="text-sm font-medium">{text.export}</div>
            <div className="text-xs text-muted-foreground">
              {text.exportDesc}
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <label className="flex items-center gap-2 rounded-md border border-zinc-800 p-3">
              <Checkbox
                checked={exportStats}
                onCheckedChange={(v) => setExportStats(!!v)}
              />
              <div className="leading-tight">
                <div className="text-sm">{text.stats}</div>
                <div className="text-xs text-muted-foreground">
                  {text.statsExportDesc}
                </div>
              </div>
            </label>

            <label className="flex items-center gap-2 rounded-md border border-zinc-800 p-3">
              <Checkbox
                checked={exportGear}
                onCheckedChange={(v) => setExportGear(!!v)}
              />
              <div className="leading-tight">
                <div className="text-sm">{text.gear}</div>
                <div className="text-xs text-muted-foreground">
                  {text.gearExportDesc}
                </div>
              </div>
            </label>

            <label className="flex items-center gap-2 rounded-md border border-zinc-800 p-3 sm:col-span-2">
              <Checkbox
                checked={exportRotations}
                onCheckedChange={(v) => setExportRotations(!!v)}
              />
              <div className="leading-tight">
                <div className="text-sm">{text.rotations}</div>
                <div className="text-xs text-muted-foreground">
                  {text.rotationsExportDesc}
                </div>
              </div>
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={handleExport}>{text.exportClipboard}</Button>
          </div>
        </div>

        <Separator />

        {/* Import */}
        <div className="space-y-3">
          <div className="space-y-1">
            <div className="text-sm font-medium">{text.import}</div>
            <div className="text-xs text-muted-foreground">
              {text.importDesc}
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <label className="flex items-center gap-2 rounded-md border border-zinc-800 p-3">
              <Checkbox
                checked={importStats}
                onCheckedChange={(v) => setImportStats(!!v)}
              />
              <div className="leading-tight">
                <div className="text-sm">{text.stats}</div>
                <div className="text-xs text-muted-foreground">
                  {text.statsImportDesc}
                </div>
              </div>
            </label>

            <label className="flex items-center gap-2 rounded-md border border-zinc-800 p-3">
              <Checkbox
                checked={importGear}
                onCheckedChange={(v) => setImportGear(!!v)}
              />
              <div className="leading-tight">
                <div className="text-sm">{text.gear}</div>
                <div className="text-xs text-muted-foreground">
                  {text.gearImportDesc}
                </div>
              </div>
            </label>

            <label className="flex items-center gap-2 rounded-md border border-zinc-800 p-3">
              <Checkbox
                checked={importRotations}
                onCheckedChange={(v) => setImportRotations(!!v)}
              />
              <div className="leading-tight">
                <div className="text-sm">{text.rotations}</div>
                <div className="text-xs text-muted-foreground">
                  {text.overwriteSavedRotations}
                </div>
              </div>
            </label>

            <label className="flex items-center gap-2 rounded-md border border-zinc-800 p-3">
              <Checkbox
                checked={mergeGear}
                onCheckedChange={(v) => setMergeGear(!!v)}
                disabled={!importGear}
              />
              <div className="leading-tight">
                <div className="text-sm">{text.mergeGear}</div>
                <div className="text-xs text-muted-foreground">
                  {text.mergeGearDesc}
                </div>
              </div>
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button data-tour="import-gear-button" variant="outline" onClick={handleImport}>
              {text.importClipboard}
            </Button>
            <Button
              variant="secondary"
              onClick={() => window.location.reload()}
              type="button"
            >
              {text.reload}
            </Button>
          </div>
        </div>

        <Separator />

        {/* Danger zone */}
        <div className="space-y-3">
          <div className="space-y-1">
            <div className="text-sm font-medium text-destructive">
              {text.dangerZone}
            </div>
            <div className="text-xs text-muted-foreground">
              {text.dangerDesc}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="destructive" onClick={handleClearData} type="button">
              {text.clearData}
            </Button>
            <Button
              variant="secondary"
              onClick={() => window.location.reload()}
              type="button"
            >
              {text.reload}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
