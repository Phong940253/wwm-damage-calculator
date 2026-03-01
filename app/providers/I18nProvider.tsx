"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type UILanguage = "en" | "vi";

export const LANGUAGE_STORAGE_KEY = "wwm_ui_language";

const MESSAGES = {
    en: {
        app: {
            title: "Where Winds Meet – DMG Optimizer",
            realtime: "Realtime",
            loading: "Loading...",
        },
        status: {
            main: "Main",
            gear: "Gear",
            stats: "Stats",
            rotation: "Rotation",
            importExport: "Import / Export",
            settings: "Settings",
            customizeGear: "Customize Gear",
            equippedGear: "Equipped Gear",
            compareGear: "Compare Gear",
        },
        settings: {
            language: "Language",
            english: "English",
            vietnamese: "Vietnamese",
            settingsTitle: "Gemini Settings",
            settingsDescription: "Configure Gemini OCR runtime settings. Values are stored in the current browser.",
            apiKeyLabel: "Gemini API Key",
            hideApiKey: "Hide API key",
            showApiKey: "Show API key",
            apiKeyStored: "Using the locally stored API key.",
            apiKeyFallback: "No local key found, falling back to NEXT_PUBLIC_GEMINI_API_KEY.",
            apiKeyMissing: "No API key configured. OCR will fail unless a valid key is provided.",
            modelLabel: "Gemini Model",
            modelDescription: "Model used for the generateContent endpoint (for example: gemini-2.5-flash).",
            saveSettings: "Save Settings",
            resetDefaults: "Reset to Env Defaults",
            saved: "Saved",
        },
        mainTab: {
            saveCurrentConfirm: "Save current stats?",
            saveSuccess: "Stats saved!",
        },
        guide: {
            sendFeedback: "Send Feedback",
            feedback: "Feedback",
            setupGuide: "Setup Guide",
            optimizeGuide: "Optimize Guide",
            startSetupGuide: "Start Setup Guide",
            startOptimizeGuide: "Start Optimize Guide",
            openHelpActions: "Open help actions",
        },
    },
    vi: {
        app: {
            title: "Where Winds Meet – Trình tối ưu sát thương",
            realtime: "Thời gian thực",
            loading: "Đang tải...",
        },
        status: {
            main: "Chính",
            gear: "Trang bị",
            stats: "Chỉ số",
            rotation: "Chuỗi chiêu",
            importExport: "Nhập / Xuất",
            settings: "Cài đặt",
            customizeGear: "Tùy chỉnh trang bị",
            equippedGear: "Đang trang bị",
            compareGear: "So sánh trang bị",
        },
        settings: {
            language: "Ngôn ngữ",
            english: "Tiếng Anh",
            vietnamese: "Tiếng Việt",
            settingsTitle: "Cài đặt Gemini",
            settingsDescription: "Cấu hình OCR runtime cho Gemini. Giá trị được lưu trong trình duyệt hiện tại.",
            apiKeyLabel: "Gemini API Key",
            hideApiKey: "Ẩn API key",
            showApiKey: "Hiện API key",
            apiKeyStored: "Đang dùng API key đã lưu local.",
            apiKeyFallback: "Chưa có key local, đang fallback sang NEXT_PUBLIC_GEMINI_API_KEY.",
            apiKeyMissing: "Chưa có API key. OCR sẽ lỗi nếu không nhập key hợp lệ.",
            modelLabel: "Gemini Model",
            modelDescription: "Model dùng cho endpoint generateContent (ví dụ: gemini-2.5-flash).",
            saveSettings: "Lưu cài đặt",
            resetDefaults: "Khôi phục mặc định từ biến môi trường",
            saved: "Đã lưu",
        },
        mainTab: {
            saveCurrentConfirm: "Lưu chỉ số hiện tại?",
            saveSuccess: "Đã lưu chỉ số!",
        },
        guide: {
            sendFeedback: "Gửi phản hồi",
            feedback: "Phản hồi",
            setupGuide: "Hướng dẫn thiết lập",
            optimizeGuide: "Hướng dẫn tối ưu",
            startSetupGuide: "Bắt đầu hướng dẫn thiết lập",
            startOptimizeGuide: "Bắt đầu hướng dẫn tối ưu",
            openHelpActions: "Mở trợ giúp",
        },
    },
} as const;

interface MessageNode {
    [key: string]: string | MessageNode;
}

type I18nContextValue = {
    language: UILanguage;
    setLanguage: (language: UILanguage) => void;
    t: (key: string) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

const resolveMessage = (messages: MessageNode, key: string): string | null => {
    const parts = key.split(".");
    let current: string | MessageNode | undefined = messages;

    for (const part of parts) {
        if (typeof current !== "object" || current === null || !(part in current)) {
            return null;
        }
        current = current[part];
    }

    return typeof current === "string" ? current : null;
};

export function I18nProvider({ children }: { children: React.ReactNode }) {
    const [language, setLanguageState] = useState<UILanguage>("en");

    useEffect(() => {
        const rawLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
        if (rawLanguage === "vi" || rawLanguage === "en") {
            setLanguageState(rawLanguage);
        }
    }, []);

    const setLanguage = (nextLanguage: UILanguage) => {
        setLanguageState(nextLanguage);
        window.localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
    };

    const value = useMemo<I18nContextValue>(() => {
        return {
            language,
            setLanguage,
            t: (key: string) => {
                const localized = resolveMessage(MESSAGES[language] as unknown as MessageNode, key);
                if (localized) return localized;

                const fallback = resolveMessage(MESSAGES.en as unknown as MessageNode, key);
                return fallback ?? key;
            },
        };
    }, [language]);

    return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
    const context = useContext(I18nContext);
    if (!context) {
        throw new Error("useI18n must be used within I18nProvider");
    }
    return context;
}
