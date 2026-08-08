# Compress renders its option through the shared options system

Written against: `d7fd72d1d72ae9e2aefd94fc04989ceff901c0c4`

## Evidence chain

- Surface: route `/compress-pdf`, rendered by `app/components/pdf/panels/CompressPanel.tsx` inside `app/components/pdf/ToolShell.tsx`.
- Problem: the Compression level control is a bare native `<select>` under a sentence-case `text-sm font-medium` label. It renders with operating-system dropdown chrome and a label style that appears nowhere else in the panel, which is otherwise mono-uppercase. Every other tool in the registry renders its options through `OptionsForm`, so this is the only escaped form control on the tool surface — on the tool the product is named after.
- Design evidence:
  - `app/components/pdf/OptionsForm.tsx:63-67` — `LABEL_CLASS_NAME = "font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground"` and `HINT_CLASS_NAME` own field label and hint presentation.
  - `app/components/pdf/OptionsForm.tsx:140-160` — `kind: "select"` fields render via `Select` / `SelectTrigger` / `SelectPopup` / `SelectItem` from `components/ui/select.tsx`.
  - `app/components/pdf/panels/CompressPanel.tsx:65-75` — the divergent `<label>` + `<select>`.
  - `components/ui/select.tsx:18` — the design-system trigger: `rounded-lg border border-input bg-background`, `shadow-xs/5`, `ring-ring/24`, `focus-visible:ring-[3px]`, `sm:text-sm`. The native `<select>` receives none of this.
  - Rendered `/compress-pdf`: OS dropdown and sentence-case label sit directly below a `stripes` dropzone and above a `border-t border-border` action row whose surrounding text is mono-uppercase.
- Owner: `app/components/pdf/OptionsForm.tsx` (fields, labels, hints, control primitives) with `useOptions` for state.
- Scope and affected surfaces: `app/components/pdf/panels/CompressPanel.tsx` only. `/compress-pdf` is the sole route loading it (`app/features/pdf/registry.ts:216-224`); the entry has no `preset`, so no alias slug reuses this panel.
- Uncertainty: none for the presentation change. The Playwright suite selects this control as a native `<select>` (see Changes step 2) and must be updated in the same change.

## Design decision

Move the Compression level control onto `OptionsForm` with a `kind: "select"` field, so it inherits the label, hint, spacing, and select primitive every other tool already uses. Keep `CompressPanel` bespoke — it owns multi-file batching and the "Saved N%" result copy, which `ToolForm`'s generic batch path does not produce. The root problem is that this one control bypasses the field owner, not that the panel is bespoke; routing the field through the owner fixes it without touching run behavior.

## Reuse

- `OptionsForm` (`fields`, `values`, `onChange`, `disabled` props) — `app/components/pdf/OptionsForm.tsx`.
- `useOptions` — `app/components/pdf/OptionsForm.tsx:73-86`, seeds state from field defaults.
- `OptionField` type, `kind: "select"` variant.
- Exemplar: `app/components/pdf/panels/SplitPanel.tsx` — a bespoke panel that still renders its options through `OptionsForm`.

No new primitive is required.

## Changes

1. `app/components/pdf/panels/CompressPanel.tsx`
   - Change: declare a module-level `const COMPRESSION_FIELDS: ReadonlyArray<OptionField>` holding one field — `{ kind: "select", name: "level", label: "Compression level", default: "balanced", options: [{ label: "Lossless rewrite", value: "lossless" }, { label: "Light", value: "light" }, { label: "Balanced", value: "balanced" }, { label: "Aggressive", value: "aggressive" }] }`. Replace the `useState<CompressionLevel>("balanced")` with `const options = useOptions(COMPRESSION_FIELDS)` and read `options.values.level as CompressionLevel` where `compressPdf` is called. Replace the `<label>`/`<select>` block at lines 65-75 with `<OptionsForm fields={COMPRESSION_FIELDS} values={options.values} onChange={options.setValue} disabled={run.isRunning} />`. Declare the field array outside the component so `useOptions`' `useMemo` on `fields` stays stable.
   - Preserve: `balanced` as the default level; the four level values and their order; the `data-testid="compress-panel"` and `data-testid="run-compress"` hooks; the batch loop, ZIP packaging, and "Saved N%" / "No size reduction" result copy verbatim; disabling the control while `run.isRunning`.
   - Verify: the level control renders as the design-system select trigger with a mono-uppercase "COMPRESSION LEVEL" label, matching the option controls on `/split-pdf` and `/pdf-to-pdfa`.

2. `e2e/process.spec.ts`
   - Change: in the "alternate option, structured edit, form, bookmark, and layer branches" test, replace `configure: async (current) => { await current.locator("select").selectOption(level); }` with the existing `choose` helper (`e2e/process.spec.ts:221-224`), which clicks `[data-testid="option-<name>"]` and then the matching `role="option"`. Iterate label/value pairs rather than raw values: `[["lossless", "Lossless rewrite"], ["light", "Light"], ["aggressive", "Aggressive"]]`, calling `await choose(current, "level", label)`.
   - Preserve: the three non-default levels exercised, the `runId: "run-compress"` override, and the 180s timeout.
   - Verify: `bun run test:e2e` still drives all four compression branches.

## Scope

- Inherit: `/compress-pdf` — the only consumer.
- Verify: no other panel selects a control by tag name. `grep -rn 'locator("select")' e2e/` must return nothing after the change.
- Exclude: converting `CompressPanel` to `ToolForm`/`createToolPanel`; the `FileUploadZone` `onClear` prop this panel does not pass; the two other findings from the audit (dark-theme token wiring in `app/globals.css`, and the "on the left" empty-state copy in `app/components/pdf/ResultCard.tsx`). Do not restyle `OptionsForm` itself.

## Validation

- Product: on `/compress-pdf`, drop a PDF, pick each of the four levels, run. Each run reaches `Ready` and offers a download; the multi-file path still yields `compressed-pdfs.zip`.
- Interface: `/compress-pdf` at 375px, 768px, and 1280px — the field occupies the full width below `sm` and half the grid at `sm` and up, like every other single-option tool. Check the disabled appearance mid-run, the open popup, and keyboard focus (the trigger must show the `ring-ring/24` focus ring, not the browser default). Compare side by side with `/split-pdf`.
- System: `grep -rn "<select" app/` returns no hits under `app/components/`; the level control resolves to `components/ui/select.tsx`, and no second select pattern remains on the tool surface.
- Repository: `bun run check` → passes (typecheck, unit tests, build). `bun run test:e2e` → passes.

## Stop conditions

- Stop if `useOptions` cannot express the level default without re-rendering the panel on every keystroke — that would mean the field array is being recreated per render, and the array must move to module scope before continuing.
- Stop if moving to the design-system select changes which value `compressPdf` receives for any of the four levels.
- Stop if the change would require editing `OptionsForm`, `components/ui/select.tsx`, or any file outside the two listed above — the scope has widened past this plan.

## Design documentation

- After acceptance and validation: record in `README.md` (or a new `DESIGN.md` if one is introduced) that tool option controls are owned by `app/components/pdf/OptionsForm.tsx`, and that bespoke panels render their options through it rather than hand-rolling controls.
