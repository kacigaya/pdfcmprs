# The output empty state stops naming a position it cannot guarantee

Written against: `d7fd72d1d72ae9e2aefd94fc04989ceff901c0c4`

## Evidence chain

- Surface: the output card rendered by `app/components/pdf/ResultCard.tsx` on every idle `/<slug>` route.
- Problem: the idle copy reads "Pick a file on the left and run a tool. Results land here." The card is only to the right of the form at `lg` and above; below that breakpoint it stacks underneath the form, so "on the left" names a position that does not exist on any phone or small tablet. The same sentence says "run a tool" on a page that presents exactly one tool, already named in the panel heading beside it.
- Design evidence:
  - `app/components/pdf/ResultCard.tsx:144`: `Pick a file on the left and run a tool. Results land here.`
  - `app/components/pdf/ToolShell.tsx:39`: `className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]"`. The two-column rule is `lg`-prefixed, so below 1024px the grid is single-column and the `ResultCard` (rendered second, at `ToolShell.tsx:60`) falls below the panel `Card`.
  - `app/components/pdf/PanelHeader.tsx:16` renders `tool.title` directly above, so the tool is already identified on the surface.
  - The two sibling states in the same component use direction-free copy: `ResultCard.tsx:132-141` renders `status.message`, and the result state renders `result.description`. The empty state is the only string on this surface that describes layout.
- Owner: `app/components/pdf/ResultCard.tsx` owns all three output-card states and their copy.
- Scope and affected surfaces: `app/components/pdf/ResultCard.tsx` only. `ResultCard` has a single consumer, `app/components/pdf/ToolShell.tsx:60`, which every tool route renders.
- Uncertainty: none. `grep -rn "on the left" app/ e2e/` finds this string in no test and no other component; the only other hit is an unrelated code comment in `app/features/pdf/services/impositionOps.ts:25`.

## Design decision

Replace the empty-state sentence with copy that describes the sequence rather than the layout, and that refers to "the tool" rather than "a tool" to match the single-tool page. Copy is the right scope: the two-column-above-`lg` layout is a deliberate, working responsive branch, and rewriting the grid to satisfy a sentence would be the wrong correction.

## Reuse

- The existing empty-state element and its classes at `app/components/pdf/ResultCard.tsx:142-146`: `text-pretty font-heading italic leading-normal text-muted-foreground`.
- Exemplar: `app/components/pdf/FileUploadZone.tsx:190-196`, whose empty state pairs a short instruction with a mono-uppercase hint and names no direction.

No new primitive is required.

## Changes

1. `app/components/pdf/ResultCard.tsx`
   - Change: replace the string at line 144 with `Add a file and run the tool. Your result appears here.`
   - Preserve: the surrounding `<p>` element, its class list, the `italic` heading-font treatment, and the conditional chain at lines 122-146 that selects between result, `status.message`, and empty states. Do not alter `data-testid="status-message"` on the sibling branch.
   - Verify: `/compress-pdf` at 375px shows an output card, below the form, whose idle copy names no direction.

## Scope

- Inherit: every `/<slug>` tool route in its idle state.
- Verify: the card's long-string behavior is unchanged. The replacement is one character shorter than the original and wraps in the same two lines at `lg` width.
- Exclude: the `lg:grid-cols-…` breakpoint in `app/components/pdf/ToolShell.tsx:39`; the `sticky top-20` positioning on the card; the `stampLabel`/`stampTone` status vocabulary at `ResultCard.tsx:29-46`; the other two audit findings (`app/components/pdf/panels/CompressPanel.tsx` option drift, and dark-palette token wiring in `app/globals.css`).

## Validation

- Product: open any tool route without uploading anything. The output card explains what to do next without referring to a position.
- Interface: check `/compress-pdf` and `/merge-pdf` at 375px, 768px, and 1280px. Confirm the sentence works in stacked and side-by-side layouts. Confirm the error branch (`status.tone === "error"`) and result branch are unchanged.
- System: `grep -rn "on the left" app/components/` returns nothing; no other user-facing string on the tool surface describes layout position.
- Repository: `bun run check` → passes. `bun run test:e2e` → passes; no spec asserts on this string.

## Stop conditions

- Stop if a unit or Playwright spec asserts the old sentence. Update the assertion in the same change.
- Stop if the correction seems to require moving or restyling the card; that is a different, unproven finding.

## Design documentation

- After acceptance and validation: record in `README.md` (or a new `DESIGN.md`) that interface copy must not describe on-screen position, because the tool surface is single-column below `lg`.
