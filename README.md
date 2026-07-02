<p align="center">
  <img src="public/icon.svg" alt="Logo" width="200">
</p>

<p align="center">
   <strong>Browser PDF tools built with Next.js.</strong><br>
   <em>Compress, merge, split, and convert PDFs without uploading them anywhere.</em>
</p>

## Features

- Compress PDFs with object streams, leaving images and layout untouched
- Merge several PDFs into one, in the order you choose
- Split a PDF and pull out specific pages
- Inspect page count, dimensions, PDF version, and metadata
- Extract selectable text to a plain .txt file
- Convert images to a PDF, or render PDF pages as PNG/JPG
- Everything runs in the browser and keeps working offline once loaded

## Tech stack

- Next.js 16 (App Router) with React 19
- Tailwind CSS 4 and [coss ui](https://coss.com/ui) components
- `pdf-lib` and `pdfjs-dist` for the PDF work
- TypeScript, Bun

## Getting started

### Prerequisites

- Node.js 24+ or Bun

### Installation

```bash
bun install
```

### Development

```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

### Project structure

```
app/               # Next.js App Router pages, styles, and layouts
app/components/    # Workspace panels and PDF components
app/features/      # PDF services and hooks
app/lib/           # File handling and download helpers
components/        # Shared UI: coss ui primitives and the navbar
lib/               # cn() class helper
public/            # Static assets and the pdf.js worker
```
