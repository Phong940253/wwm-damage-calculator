"use client";

import { useEffect, useMemo, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  DEFAULT_GEMINI_MODEL,
  getGeminiRuntimeSettings,
  getStoredGeminiSettings,
  saveGeminiSettings,
} from "@/app/utils/geminiSettings";
import { useI18n } from "@/app/providers/I18nProvider";

const MODEL_SUGGESTIONS = [
  "gemini-2.5-flash",
  "gemini-2.5-pro",
  "gemini-2.0-flash",
  "gemini-1.5-pro",
] as const;

export default function SettingsTab() {
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState(DEFAULT_GEMINI_MODEL);
  const [saved, setSaved] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const { language, setLanguage, t } = useI18n();

  const envInfo = useMemo(() => {
    const runtime = getGeminiRuntimeSettings();
    const stored = getStoredGeminiSettings();

    return {
      usingStoredApiKey: Boolean(stored.apiKey),
      hasFallbackEnvApiKey: Boolean(runtime.apiKey && !stored.apiKey),
    };
  }, []);

  useEffect(() => {
    const runtime = getGeminiRuntimeSettings();
    const stored = getStoredGeminiSettings();

    setApiKey(stored.apiKey ?? runtime.apiKey ?? "");
    setModel(stored.model ?? runtime.model ?? DEFAULT_GEMINI_MODEL);
  }, []);

  const handleSave = () => {
    const nextModel = model.trim() || DEFAULT_GEMINI_MODEL;
    saveGeminiSettings({
      apiKey: apiKey.trim(),
      model: nextModel,
    });
    setModel(nextModel);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1500);
  };

  const resetToDefaults = () => {
    const runtime = getGeminiRuntimeSettings();
    const fallbackModel = runtime.model || DEFAULT_GEMINI_MODEL;

    setApiKey(String(process.env.NEXT_PUBLIC_GEMINI_API_KEY ?? ""));
    setModel(fallbackModel);
    saveGeminiSettings({
      apiKey: String(process.env.NEXT_PUBLIC_GEMINI_API_KEY ?? ""),
      model: fallbackModel,
    });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div className="space-y-4 pb-3">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("settings.settingsTitle")}</CardTitle>
          <p className="text-xs text-muted-foreground">
            {t("settings.settingsDescription")}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{t("settings.language")}</label>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant={language === "en" ? "default" : "outline"}
                onClick={() => setLanguage("en")}
              >
                {t("settings.english")}
              </Button>
              <Button
                type="button"
                variant={language === "vi" ? "default" : "outline"}
                onClick={() => setLanguage("vi")}
              >
                {t("settings.vietnamese")}
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">{t("settings.apiKeyLabel")}</label>
            <div className="relative">
              <Input
                type={showApiKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIza..."
                autoComplete="off"
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setShowApiKey((v) => !v)}
                className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
                title={showApiKey ? t("settings.hideApiKey") : t("settings.showApiKey")}
                aria-label={showApiKey ? t("settings.hideApiKey") : t("settings.showApiKey")}
              >
                {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {envInfo.usingStoredApiKey
                ? t("settings.apiKeyStored")
                : envInfo.hasFallbackEnvApiKey
                  ? t("settings.apiKeyFallback")
                  : t("settings.apiKeyMissing")}
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">{t("settings.modelLabel")}</label>
            <Input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder={DEFAULT_GEMINI_MODEL}
              list="gemini-model-options"
            />
            <datalist id="gemini-model-options">
              {MODEL_SUGGESTIONS.map((m) => (
                <option value={m} key={m} />
              ))}
            </datalist>
            <p className="text-xs text-muted-foreground">
              {t("settings.modelDescription")}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={handleSave}>{t("settings.saveSettings")}</Button>
            <Button variant="secondary" onClick={resetToDefaults}>
              {t("settings.resetDefaults")}
            </Button>
            {saved && <span className="text-xs text-emerald-500 self-center">{t("settings.saved")}</span>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
