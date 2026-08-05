"use client";

import { useEffect, useState } from "react";

export const LANGUAGES = {
  en: "English", es: "Español", fr: "Français", de: "Deutsch", it: "Italiano", pt: "Português",
  nl: "Nederlands", pl: "Polski", tr: "Türkçe", ru: "Русский", ja: "日本語", zh: "中文",
} as const;
export type Language = keyof typeof LANGUAGES;

export interface AppSettings {
  language: Language;
  compact: boolean;
  shortcuts: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = { language: "en", compact: false, shortcuts: true };
const KEY = "pdfcmprs-settings-v1";

export function readSettings(): AppSettings {
  if (typeof localStorage === "undefined") return DEFAULT_SETTINGS;
  try { return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(KEY) || "{}") }; }
  catch { return DEFAULT_SETTINGS; }
}

export function writeSettings(settings: AppSettings) {
  localStorage.setItem(KEY, JSON.stringify(settings));
  window.dispatchEvent(new CustomEvent("pdfcmprs-settings", { detail: settings }));
}

export function useSettings() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  useEffect(() => {
    const update = () => setSettings(readSettings());
    update();
    window.addEventListener("pdfcmprs-settings", update);
    return () => window.removeEventListener("pdfcmprs-settings", update);
  }, []);
  return [settings, (next: AppSettings) => { writeSettings(next); setSettings(next); }] as const;
}

const COPY: Record<Language, { search: string; available: string; matched: string; tools: string; settings: string }> = {
  en: { search: "Search tools", available: "available", matched: "matched", tools: "tools", settings: "Settings" },
  es: { search: "Buscar herramientas", available: "disponibles", matched: "coinciden", tools: "herramientas", settings: "Ajustes" },
  fr: { search: "Rechercher des outils", available: "disponibles", matched: "trouvés", tools: "outils", settings: "Réglages" },
  de: { search: "Werkzeuge suchen", available: "verfügbar", matched: "gefunden", tools: "Werkzeuge", settings: "Einstellungen" },
  it: { search: "Cerca strumenti", available: "disponibili", matched: "trovati", tools: "strumenti", settings: "Impostazioni" },
  pt: { search: "Pesquisar ferramentas", available: "disponíveis", matched: "encontradas", tools: "ferramentas", settings: "Definições" },
  nl: { search: "Hulpmiddelen zoeken", available: "beschikbaar", matched: "gevonden", tools: "hulpmiddelen", settings: "Instellingen" },
  pl: { search: "Szukaj narzędzi", available: "dostępne", matched: "znalezione", tools: "narzędzia", settings: "Ustawienia" },
  tr: { search: "Araçlarda ara", available: "kullanılabilir", matched: "eşleşti", tools: "araç", settings: "Ayarlar" },
  ru: { search: "Поиск инструментов", available: "доступно", matched: "найдено", tools: "инструментов", settings: "Настройки" },
  ja: { search: "ツールを検索", available: "利用可能", matched: "件一致", tools: "ツール", settings: "設定" },
  zh: { search: "搜索工具", available: "可用", matched: "个匹配", tools: "工具", settings: "设置" },
};

export function copy(language: Language) { return COPY[language] || COPY.en; }
