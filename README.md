<p align="center">
  <img src="public/icon.svg" alt="Logo" width="200">
</p>

<p align="center">
   <strong>Browser PDF tools built with Next.js.</strong><br>
   <em>Compress, merge, split, inspect, extract text from, and convert PDFs without uploading files.</em>
</p>

## Features

- Compress PDF files to reduce file size
- Merge multiple PDFs into a single document
- Split PDFs and extract specific pages
- Process files in the browser without uploading them
- Work offline after the app loads

## Tech stack

- Framework: Next.js 16 (App Router)
- UI: React 19
- Core libraries: `pdf-lib`, `pdfjs-dist`
- Language: TypeScript
- Package manager: Bun

## Getting started

### Prerequisites

- Node.js 20+ or Bun

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
app/components/    # Reusable UI components and workspace panels
app/features/      # PDF business logic, services, and hooks
app/lib/           # Utilities for file handling and downloads
public/            # Static assets and compiled PDF workers
```
