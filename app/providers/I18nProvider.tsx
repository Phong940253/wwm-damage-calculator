"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { MESSAGES } from "./i18nMessages";

export type UILanguage = "en" | "vi";

export const LANGUAGE_STORAGE_KEY = "wwm_ui_language";

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
