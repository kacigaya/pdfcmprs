"use client";

import Link from "next/link";
import { useRef, useState } from "react";
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
import {
  DEFAULT_SETTINGS,
  LANGUAGES,
  normalizeSettings,
  useSettings,
  type AppSettings,
  type Language,
} from "../lib/settings";
import { SiteFooter } from "../components/site/SiteFooter";

export default function SettingsPage() {
  const [settings, setSettings, ready] = useSettings();
  const [importError, setImportError] = useState("");
  const [saved, setSaved] = useState("Saved automatically");
  const importRef = useRef<HTMLInputElement>(null);
  const update = (patch: Partial<AppSettings>) => {
    setSaved("Saving…");
    setSettings({ ...settings, ...patch });
    window.setTimeout(() => setSaved("Saved automatically"), 200);
  };
  const exportSettings = () => {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(settings, null, 2)], {
        type: "application/json",
      }),
    );
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
      <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
        <Link
          href="/"
          className="font-mono text-xs uppercase tracking-widest text-muted-foreground"
        >
          ← All tools
        </Link>
        <div className="mt-5 flex items-end justify-between gap-4 border-b border-border pb-4">
          <div>
            <h1 className="font-heading text-4xl">Settings</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Tune pdfcmprs for this browser.
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
              <h2 id="display-settings" className="font-heading text-2xl">
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
              <h2 id="interaction-settings" className="font-heading text-2xl">
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
              Export settings
            </Button>
            <Button
              disabled={!ready}
              variant="outline"
              onClick={() => importRef.current?.click()}
            >
              Import settings
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
