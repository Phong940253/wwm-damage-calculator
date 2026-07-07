"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useI18n } from "@/app/providers/I18nProvider";

import {
  exportToClipboard,
  exportToJsonFile,
  importFromClipboard,
  importFromJsonFile,
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
  const { t } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    const ok = window.confirm(t("importExport.clearConfirm"));
    if (!ok) return;

    try {
      const keysToRemove = Object.keys(localStorage).filter((k) =>
        k.startsWith("wwm_")
      );
      for (const key of keysToRemove) {
        localStorage.removeItem(key);
      }

      setStatus({ variant: "secondary", text: t("importExport.cleared") });
    } catch {
      setStatus({ variant: "destructive", text: t("importExport.clearFailed") });
    }
  };

  /* =======================
     Export
  ======================= */

  const buildExportPayload = (): ExportPayload => {
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

    return payload;
  };

  const handleExport = async () => {
    try {
      const payload = buildExportPayload();
      await exportToClipboard(payload);
      setStatus({ variant: "default", text: t("importExport.exported") });
    } catch {
      setStatus({ variant: "destructive", text: t("importExport.exportFailed") });
    }
  };

  const handleExportFile = () => {
    try {
      const payload = buildExportPayload();
      exportToJsonFile(payload);
      setStatus({ variant: "default", text: t("importExport.exportedFile") });
    } catch {
      setStatus({ variant: "destructive", text: t("importExport.exportFailed") });
    }
  };

  /* =======================
     Import Logic
  ======================= */

  const processImportPayload = (data: ExportPayload) => {
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
          ? t("importExport.importedMerged")
          : t("importExport.imported"),
    });
  };

  /* =======================
     Import Actions
  ======================= */

  const handleImport = async () => {
    try {
      const data = await importFromClipboard();
      processImportPayload(data);
    } catch {
      setStatus({ variant: "destructive", text: t("importExport.invalidClipboard") });
    }
  };

  const handleImportFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await importFromJsonFile(file);
      processImportPayload(data);
    } catch {
      setStatus({ variant: "destructive", text: t("importExport.invalidClipboard") });
    } finally {
      // clear input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };


  /* =======================
     UI
  ======================= */

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle>{t("importExport.title")}</CardTitle>
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
            <div className="text-sm font-medium">{t("importExport.export")}</div>
            <div className="text-xs text-muted-foreground">
              {t("importExport.exportDesc")}
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <label className="flex items-center gap-2 rounded-md border border-border p-3">
              <Checkbox
                checked={exportStats}
                onCheckedChange={(v) => setExportStats(!!v)}
              />
              <div className="leading-tight">
                <div className="text-sm">{t("importExport.stats")}</div>
                <div className="text-xs text-muted-foreground">
                  {t("importExport.statsExportDesc")}
                </div>
              </div>
            </label>

            <label className="flex items-center gap-2 rounded-md border border-border p-3">
              <Checkbox
                checked={exportGear}
                onCheckedChange={(v) => setExportGear(!!v)}
              />
              <div className="leading-tight">
                <div className="text-sm">{t("importExport.gear")}</div>
                <div className="text-xs text-muted-foreground">
                  {t("importExport.gearExportDesc")}
                </div>
              </div>
            </label>

            <label className="flex items-center gap-2 rounded-md border border-border p-3 sm:col-span-2">
              <Checkbox
                checked={exportRotations}
                onCheckedChange={(v) => setExportRotations(!!v)}
              />
              <div className="leading-tight">
                <div className="text-sm">{t("importExport.rotations")}</div>
                <div className="text-xs text-muted-foreground">
                  {t("importExport.rotationsExportDesc")}
                </div>
              </div>
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={handleExport}>{t("importExport.exportClipboard")}</Button>
            <Button variant="outline" onClick={handleExportFile}>{t("importExport.exportFile")}</Button>
          </div>
        </div>

        <Separator />

        {/* Import */}
        <div className="space-y-3">
          <div className="space-y-1">
            <div className="text-sm font-medium">{t("importExport.import")}</div>
            <div className="text-xs text-muted-foreground">
              {t("importExport.importDesc")}
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <label className="flex items-center gap-2 rounded-md border border-border p-3">
              <Checkbox
                checked={importStats}
                onCheckedChange={(v) => setImportStats(!!v)}
              />
              <div className="leading-tight">
                <div className="text-sm">{t("importExport.stats")}</div>
                <div className="text-xs text-muted-foreground">
                  {t("importExport.statsImportDesc")}
                </div>
              </div>
            </label>

            <label className="flex items-center gap-2 rounded-md border border-border p-3">
              <Checkbox
                checked={importGear}
                onCheckedChange={(v) => setImportGear(!!v)}
              />
              <div className="leading-tight">
                <div className="text-sm">{t("importExport.gear")}</div>
                <div className="text-xs text-muted-foreground">
                  {t("importExport.gearImportDesc")}
                </div>
              </div>
            </label>

            <label className="flex items-center gap-2 rounded-md border border-border p-3">
              <Checkbox
                checked={importRotations}
                onCheckedChange={(v) => setImportRotations(!!v)}
              />
              <div className="leading-tight">
                <div className="text-sm">{t("importExport.rotations")}</div>
                <div className="text-xs text-muted-foreground">
                  {t("importExport.overwriteSavedRotations")}
                </div>
              </div>
            </label>

            <label className="flex items-center gap-2 rounded-md border border-border p-3">
              <Checkbox
                checked={mergeGear}
                onCheckedChange={(v) => setMergeGear(!!v)}
                disabled={!importGear}
              />
              <div className="leading-tight">
                <div className="text-sm">{t("importExport.mergeGear")}</div>
                <div className="text-xs text-muted-foreground">
                  {t("importExport.mergeGearDesc")}
                </div>
              </div>
            </label>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <Button data-tour="import-gear-button" variant="outline" onClick={handleImport}>
              {t("importExport.importClipboard")}
            </Button>
            
            <input
              type="file"
              accept=".json,application/json"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileChange}
            />
            <Button variant="outline" onClick={handleImportFileClick}>
              {t("importExport.importFile")}
            </Button>

            <Button
              variant="secondary"
              onClick={() => window.location.reload()}
              type="button"
            >
              {t("importExport.reload")}
            </Button>
          </div>
        </div>

        <Separator />

        {/* Danger zone */}
        <div className="space-y-3">
          <div className="space-y-1">
            <div className="text-sm font-medium text-destructive">
              {t("importExport.dangerZone")}
            </div>
            <div className="text-xs text-muted-foreground">
              {t("importExport.dangerDesc")}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="destructive" onClick={handleClearData} type="button">
              {t("importExport.clearData")}
            </Button>
            <Button
              variant="secondary"
              onClick={() => window.location.reload()}
              type="button"
            >
              {t("importExport.reload")}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
