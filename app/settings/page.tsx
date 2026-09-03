"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Navbar } from "@/components/site/navbar";
import { SiteFooter } from "../components/site/SiteFooter";
import {
  DEFAULT_SETTINGS,
  LANGUAGES,
  normalizeSettings,
  useSettings,
  type AppSettings,
  type Language,
} from "../lib/settings";

export default function SettingsPage() {
  const [settings, setSettings, ready] = useSettings();
  const [saved, setSaved] = useState<string>("");
  const [importError, setImportError] = useState<string>("");
  const importRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!ready) return;
    document.documentElement.lang = settings.language;
    document.documentElement.setAttribute(
      "data-compact",
      settings.compact ? "true" : "false",
    );
  }, [settings, ready]);

  const update = (patch: Partial<AppSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    setSaved("Saved");
    window.setTimeout(() => setSaved(""), 1600);
  };

  const exportSettings = () => {
    const blob = new Blob([JSON.stringify(settings, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "pdfcmprs-settings.json";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const importSettings = async (file?: File) => {
    if (!file) return;
    try {
      update(normalizeSettings(JSON.parse(await file.text())));
      setImportError("");
    } catch {
      setImportError("That file is not valid settings JSON.");
    }
  };

  return (
    <div className="relative z-10">
      <Navbar />
      <main id="main-content" className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
        <Link
          href="/"
          className="font-mono text-xs uppercase tracking-widest text-muted-foreground"
        >
          ← All Tools
        </Link>
        <div className="mt-5 flex items-end justify-between gap-4 border-b border-border pb-4">
          <div>
            <h1 className="text-balance font-heading text-4xl">Settings</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Tune <span translate="no">pdfcmprs</span> for this browser.
            </p>
          </div>
          <p
            className="font-mono text-[10px] uppercase tracking-[0.16em] text-success"
            aria-live="polite"
          >
            {saved}
          </p>
        </div>
        <div
          className="mt-6 grid gap-8 rounded-lg border border-border bg-card p-5 sm:p-6"
          aria-busy={!ready}
        >
          <section aria-labelledby="display-settings" className="grid gap-5">
            <div>
              <h2 id="display-settings" className="text-balance font-heading text-2xl scroll-mt-20">
                Display
              </h2>
              <p className="text-sm text-muted-foreground">
                Language and content density.
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="language">Language</Label>
              <Select
                items={Object.entries(LANGUAGES).map(([value, label]) => ({
                  value,
                  label,
                }))}
                value={settings.language}
                onValueChange={(value) =>
                  value && update({ language: value as Language })
                }
                disabled={!ready}
              >
                <SelectTrigger id="language" aria-label="Language">
                  <SelectValue />
                </SelectTrigger>
                <SelectPopup>
                  {Object.entries(LANGUAGES).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectPopup>
              </Select>
            </div>
            <Label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-4">
              <Checkbox
                disabled={!ready}
                checked={settings.compact}
                onCheckedChange={(checked) => update({ compact: checked })}
                aria-label="Compact content width"
              />
              <span>
                <span className="block font-medium">Compact content width</span>
                <span className="mt-0.5 block text-sm font-normal text-muted-foreground">
                  Keep tools in a narrower reading column.
                </span>
              </span>
            </Label>
          </section>

          <section
            aria-labelledby="interaction-settings"
            className="grid gap-4 border-t border-border pt-6"
          >
            <div>
              <h2 id="interaction-settings" className="text-balance font-heading text-2xl scroll-mt-20">
                Interaction
              </h2>
              <p className="text-sm text-muted-foreground">
                Optional keyboard navigation.
              </p>
            </div>
            <Label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-4">
              <Checkbox
                disabled={!ready}
                checked={settings.shortcuts}
                onCheckedChange={(checked) => update({ shortcuts: checked })}
                aria-label="Keyboard shortcuts"
              />
              <span>
                <span className="block font-medium">Keyboard shortcuts</span>
                <span className="mt-0.5 block text-sm font-normal text-muted-foreground">
                  <kbd>/</kbd> focuses search. <kbd>Esc</kbd> clears focus.
                </span>
              </span>
            </Label>
          </section>

          <div className="flex flex-wrap gap-2 border-t border-border pt-5">
            <Button disabled={!ready} onClick={exportSettings}>
              Export Settings
            </Button>
            <Button
              disabled={!ready}
              variant="outline"
              onClick={() => importRef.current?.click()}
            >
              Import Settings
            </Button>
            <Button
              disabled={!ready}
              variant="outline"
              onClick={() => update(DEFAULT_SETTINGS)}
            >
              Reset
            </Button>
            <input
              ref={importRef}
              id="import-settings-input"
              name="settingsFile"
              autoComplete="off"
              aria-label="Import settings file"
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(event) => importSettings(event.target.files?.[0])}
            />
          </div>
          {importError && (
            <p role="alert" className="text-sm text-destructive">
              {importError}
            </p>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
