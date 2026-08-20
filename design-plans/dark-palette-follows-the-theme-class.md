# The dark palette follows the theme class instead of the OS media query

Written against: `d7fd72d1d72ae9e2aefd94fc04989ceff901c0c4`

## Evidence chain

- Surface: every route: `/` (`app/page.tsx`), `/<slug>` (`app/[slug]/page.tsx`), `/settings` (`app/settings/page.tsx`): all wrapped by `app/layout.tsx` → `components/theme-provider.tsx`.
- Problem: the dark palette is reachable only through the operating-system preference. `components/theme-provider.tsx` offers a theme override (a `d` keypress, persisted to `localStorage.theme`) that toggles a `dark` class on `<html>`, but no stylesheet rule in the project matches that class, so toggling it changes nothing on screen. A user whose OS is light and whose stored preference is `dark` sees the light palette on every surface, and the reverse for a dark OS with a stored `light`.
- Design evidence:
  - `app/globals.css:21-39`: the entire dark token set (`--paper`, `--ink`, `--accent`, `--rule-soft`, `--grain-opacity`, `color-scheme`) is declared under `@media (prefers-color-scheme: dark)`. These feed `@theme inline` at `app/globals.css:41-66`, which defines `--color-background`, `--color-foreground`, `--color-card`, `--color-border`, `--color-primary`, and the rest.
  - `app/globals.css` contains no `.dark` selector and no `@custom-variant dark` declaration. `grep -rn "\.dark\|@custom-variant" app/globals.css` returns only the two `prefers-color-scheme`/`color-scheme` lines.
  - Because no `@custom-variant dark` is declared, Tailwind v4's built-in `dark` variant stays bound to `@media (prefers-color-scheme: dark)`. Every `dark:` utility in the design system therefore also ignores the class: `components/ui/card.tsx:15,35`, `components/ui/input.tsx:40`, `components/ui/select.tsx:18,150`, `components/ui/button.tsx:38,43`, `components/ui/badge.tsx:29-36`, `components/ui/tabs.tsx:52`.
  - `components/theme-provider.tsx:8-25`: reads `localStorage.getItem("theme")`, falls back to `matchMedia("(prefers-color-scheme: dark)").matches`, and calls `root.classList.toggle("dark", …)`; the `d` handler at line 21 toggles the class and writes the result back to `localStorage`.
- Owner: `app/globals.css` owns the palette tokens and the `dark` variant definition. `components/theme-provider.tsx` owns which theme is active.
- Scope and affected surfaces: `app/globals.css`, `components/theme-provider.tsx`, `app/layout.tsx`. Visually: every route, since the tokens reach all of them through `@theme inline`.
- Uncertainty: none about the mismatch. The first-paint sequencing does need care: see the Design decision and Changes step 3.

## Design decision

Bind the dark palette to the `dark` class and declare the matching Tailwind variant, so one selector governs both the token block and every `dark:` utility in `components/ui/*`. Resolve the class before first paint from stored preference, falling back to the OS preference, so the current default behavior is preserved for users who never override.

This is the correct scope because the two halves are already written against different selectors; changing only the provider (to write a media-query override it cannot express) or only the tokens (leaving `dark:` utilities on the media query) would split the palette across two mechanisms and produce mixed-theme surfaces.

## Reuse

- The existing token names and values in `app/globals.css:21-39`: move them, do not re-pick them.
- The existing `@theme inline` mapping at `app/globals.css:41-66`: unchanged; it already reads whatever `:root`/`.dark` resolves to.
- The existing `localStorage` key `theme` and its `"dark"`/`"light"` values, written by `components/theme-provider.tsx:22`.
- Exemplar: `app/components/site/AppRuntime.tsx:8-11`, which already applies a document-level setting (`data-compact`) that `app/globals.css:99` styles by attribute selector.

No new primitive is required.

## Changes

1. `app/globals.css`
   - Change: add `@custom-variant dark (&:where(.dark, .dark *));` immediately after `@import "tailwindcss";`. Replace the `@media (prefers-color-scheme: dark) { :root { … } }` block at lines 21-39 with a `.dark { … }` rule holding the same declarations, `color-scheme: dark` included.
   - Preserve: every token name and hex value; `--grain-opacity: 0.09` in dark and `0.05` in light; the `:root` light block; the `@theme inline` mapping; the near-sharp `--radius-*` scale and the comment above it.
   - Verify: adding `class="dark"` to `<html>` in devtools repaints the background, cards, borders, and accent. The design-system `dark:` utilities (card inner shadow, input `bg-input/32`) must also change.

2. `components/theme-provider.tsx`
   - Change: keep the effect's resolution logic, and add a `matchMedia("(prefers-color-scheme: dark)")` `change` listener that re-applies the class when no `localStorage.theme` is stored, so an OS theme switch still follows through now that CSS no longer does it automatically. Remove the listener on cleanup.
   - Preserve: the `d` shortcut, its guard against `input, textarea, select, [contenteditable]` targets, the `localStorage` key and values, and the stored-preference-wins precedence.
   - Verify: with no stored preference, switching the OS theme repaints the page live; with a stored preference, it does not.

3. `app/layout.tsx`
   - Change: render a small blocking inline script inside `<head>` that applies the same resolution before first paint: read `localStorage.theme`, fall back to `matchMedia("(prefers-color-scheme: dark)").matches`, add the `dark` class to `document.documentElement`. Wrap it in `try {} catch {}` so a blocked-storage browser still paints light rather than throwing.
   - Preserve: the font variable classes on `<body>`, `suppressHydrationWarning` on `<html>`, the `viewport.themeColor` entries at lines 69-72, and the `ThemeProvider`/`AppRuntime` nesting.
   - Verify: hard-reload a dark-preferring browser and confirm no light palette flashes first.

## Scope

- Inherit: `/`, `/settings`, and all `/<slug>` tool routes; every `components/ui/*` primitive using a `dark:` utility.
- Verify: check the paper-grain overlay (`app/globals.css:129-138`, `mix-blend-mode: multiply` at `--grain-opacity`) and the three body radial gradients (`app/globals.css:107-122`) against the dark background. They use fixed light-palette rgba values rather than tokens.
- Exclude: adding a visible theme toggle to `components/site/navbar.tsx` or `/settings`. The repository documents no intent for one, and the `d` shortcut is the only control that exists; introducing UI here would invent product intent. Exclude retuning any palette value. Exclude the `viewport.themeColor` media entries: browser chrome color is a separate mechanism and cannot read the class.

## Validation

- Product: on `/compress-pdf`, press `d` and confirm the palette changes immediately. Reload and confirm it stays changed. Press `d` again, reload, and confirm it stays light.
- Interface: `/`, `/compress-pdf`, and `/settings` in both themes at 375px and 1280px. Check the catalog card `hover:border-primary` state, the dropzone `stripes` and `stripes-accent` drag state in `app/components/pdf/FileUploadZone.tsx`, the `ResultCard` badge tones (`idle`/`info`/`success`/`error`), select trigger and popup, disabled inputs mid-run, and focus rings. Nothing may render a light-palette panel inside a dark page or vice versa.
- System: `grep -rn "prefers-color-scheme" app/ components/` returns only `app/layout.tsx` (`viewport.themeColor`) and the provider's `matchMedia` call. No palette rule remains keyed on the media query.
- Repository: `bun run check` → passes. `bun run test:e2e` → passes.

## Stop conditions

- Stop if the light palette shifts at all in a light-preferring browser; the light path must be byte-identical in outcome.
- Stop if the inline script cannot run before first paint under the project's Next.js 16 App Router setup without `dangerouslySetInnerHTML` on a `<script>` in `<head>`. Rework the approach instead of accepting a theme flash.
- Stop if the change requires editing a file under `components/ui/`. Those primitives already use the `dark:` variant and inherit the fix.

## Design documentation

- After acceptance and validation, record in `README.md` or a new `DESIGN.md` that `.dark` on `<html>` controls the palette through `@custom-variant dark`. New dark-specific styling must use the `dark:` variant rather than a `prefers-color-scheme` media query.
