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

export async function importFromClipboard(): Promise<ExportPayload> {
  const text = await navigator.clipboard.readText();
  const parsed: unknown = JSON.parse(text);

  if (typeof parsed !== "object" || parsed === null || !("version" in parsed)) {
    throw new Error("Invalid import data");
  }

  return parsed as ExportPayload;
}
