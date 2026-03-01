export const GEMINI_SETTINGS_STORAGE_KEY = "wwm_gemini_settings";

export type GeminiRuntimeSettings = {
  apiKey: string;
  model: string;
};

export const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

function parseStoredSettings(raw: string | null): Partial<GeminiRuntimeSettings> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Partial<GeminiRuntimeSettings>;
    return {
      apiKey: String(parsed.apiKey ?? "").trim(),
      model: String(parsed.model ?? "").trim(),
    };
  } catch {
    return {};
  }
}

export function getGeminiRuntimeSettings(): GeminiRuntimeSettings {
  const envApiKey = String(process.env.NEXT_PUBLIC_GEMINI_API_KEY ?? "").trim();
  const envModel = String(process.env.NEXT_PUBLIC_GEMINI_MODEL ?? "").trim();

  const base: GeminiRuntimeSettings = {
    apiKey: envApiKey,
    model: envModel || DEFAULT_GEMINI_MODEL,
  };

  if (typeof window === "undefined") {
    return base;
  }

  const stored = parseStoredSettings(localStorage.getItem(GEMINI_SETTINGS_STORAGE_KEY));

  return {
    apiKey: stored.apiKey || base.apiKey,
    model: stored.model || base.model,
  };
}

export function getStoredGeminiSettings(): Partial<GeminiRuntimeSettings> {
  if (typeof window === "undefined") return {};
  return parseStoredSettings(localStorage.getItem(GEMINI_SETTINGS_STORAGE_KEY));
}

export function saveGeminiSettings(settings: GeminiRuntimeSettings): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    GEMINI_SETTINGS_STORAGE_KEY,
    JSON.stringify({
      apiKey: settings.apiKey.trim(),
      model: settings.model.trim(),
    })
  );
}
