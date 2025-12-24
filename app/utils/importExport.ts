// utils/importExport.ts
export interface ExportPayload {
  version: "1.0";
  stats?: Record<string, number>;
  elementStats?: Record<string, number | string>;
  gear?: {
    customGears: any[];
    equipped: Record<string, string>;
  };
}

export function exportToClipboard(payload: ExportPayload) {
  const text = JSON.stringify(payload, null, 2);
  return navigator.clipboard.writeText(text);
}

export function importFromClipboard(): Promise<ExportPayload> {
  return navigator.clipboard.readText().then((text) => {
    const parsed = JSON.parse(text);
    if (!parsed.version) {
      throw new Error("Invalid import data (missing version)");
    }
    return parsed;
  });
}
