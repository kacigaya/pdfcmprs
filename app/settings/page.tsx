"use client";

import Link from "next/link";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/site/navbar";
import { DEFAULT_SETTINGS, LANGUAGES, useSettings, type AppSettings, type Language } from "../lib/settings";
import { SiteFooter } from "../components/site/SiteFooter";

export default function SettingsPage() {
  const [settings, setSettings] = useSettings();
  const importRef = useRef<HTMLInputElement>(null);
  const update = (patch: Partial<AppSettings>) => setSettings({ ...settings, ...patch });
  const exportSettings = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(settings, null, 2)], { type: "application/json" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = "pdfcmprs-settings.json"; anchor.click(); URL.revokeObjectURL(url);
  };
  const importSettings = async (file?: File) => {
    if (!file) return;
    const parsed = JSON.parse(await file.text()) as Partial<AppSettings>;
    update(parsed);
  };
  return (
    <div className="relative z-10">
      <Navbar />
      <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
        <Link href="/" className="font-mono text-xs uppercase tracking-widest text-muted-foreground">← All tools</Link>
        <h1 className="mt-5 font-heading text-4xl">Settings</h1>
        <div className="mt-8 grid gap-6 rounded-lg border border-border bg-card p-6">
          <label className="grid gap-2 text-sm font-medium">Language
            <select className="rounded-md border border-input bg-background px-3 py-2" value={settings.language} onChange={(event) => update({ language: event.target.value as Language })}>
              {Object.entries(LANGUAGES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-3"><input type="checkbox" checked={settings.compact} onChange={(event) => update({ compact: event.target.checked })} /> Compact content width</label>
          <label className="flex items-center gap-3"><input type="checkbox" checked={settings.shortcuts} onChange={(event) => update({ shortcuts: event.target.checked })} /> Keyboard shortcuts (<kbd>/</kbd> search, <kbd>Esc</kbd> blur)</label>
          <div className="flex flex-wrap gap-2 border-t border-border pt-5">
            <Button onClick={exportSettings}>Export settings</Button>
            <Button variant="outline" onClick={() => importRef.current?.click()}>Import settings</Button>
            <Button variant="outline" onClick={() => setSettings(DEFAULT_SETTINGS)}>Reset</Button>
            <input ref={importRef} type="file" accept="application/json,.json" className="hidden" onChange={(event) => importSettings(event.target.files?.[0])} />
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
