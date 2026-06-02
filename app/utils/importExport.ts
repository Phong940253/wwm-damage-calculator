// app/utils/importExport.ts
import { CustomGear, GearSlot, Rotation } from "@/app/types";

export interface ExportPayload {
  version: "1.0";
  stats?: Record<string, number>;
  elementStats?: Record<string, number | string>;
  gear?: {
    customGears: CustomGear[];
    equipped: Partial<Record<GearSlot, string>>;
  };
  rotations?: {
    list: Rotation[];
    selectedId?: string;
  };
}

export function exportToClipboard(payload: ExportPayload): Promise<void> {
  const text = JSON.stringify(payload, null, 2);
  return navigator.clipboard.writeText(text);
}

export function exportToJsonFile(payload: ExportPayload, filename = "wwm_data.json"): void {
  const text = JSON.stringify(payload, null, 2);
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function importFromClipboard(): Promise<ExportPayload> {
  const text = await navigator.clipboard.readText();
  const parsed: unknown = JSON.parse(text);

  if (typeof parsed !== "object" || parsed === null || !("version" in parsed)) {
    throw new Error("Invalid import data");
  }

  return parsed as ExportPayload;
}

export function importFromJsonFile(file: File): Promise<ExportPayload> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed: unknown = JSON.parse(text);
        if (typeof parsed !== "object" || parsed === null || !("version" in parsed)) {
          reject(new Error("Invalid import data"));
        } else {
          resolve(parsed as ExportPayload);
        }
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("File read error"));
    reader.readAsText(file);
  });
}
