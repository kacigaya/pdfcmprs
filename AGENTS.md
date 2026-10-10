<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Development and validation

- Package manager: Bun `1.3.11` in `package.json` and CI. Runtime: Node.js `24.x`.
- `bun run dev` copies local engine assets and starts Next.js on port `3000`.
- `bun run check` runs TypeScript, unit tests, and the production build.
- `bun run test:e2e` runs Chromium on `127.0.0.1:3100`; Playwright starts a dev server when that port is free.
- Install the browser with `bunx playwright install chromium --only-shell`.
- `bun run build:static` writes `out/`. Project-site exports use `NEXT_PUBLIC_BASE_PATH` and `NEXT_PUBLIC_SITE_URL`.
- Generated engine assets come from `scripts/copy-assets.ts` and are ignored by Git.

## Privacy pages and deployment facts

- Public VPS URL: `https://pdfcmprs.duckdns.org`. Netlify URLs in older files are stale.
- Caddy routes this hostname through Dokploy on `127.0.0.1:8080`.
- Active Caddy config verified on 2026-09-15: `/var/log/caddy/pdfcmprs-access.log`, default file rotation, no IP masking.
- Privacy and cookie pages live in `app/(legal)`. Update both pages and `updated.ts` when data handling changes.
- Browser storage includes theme, `pdfcmprs-settings-v1`, service-worker assets, and Tesseract language-model caches. Timestamping can make an external request.

- VPS provider verified from cloud-init metadata on 2026-09-15: Oracle, availability zone `eu-paris-1-ad-1`.
