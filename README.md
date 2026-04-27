<p align="center">
  <img src="public/icon.svg" alt="Logo" width="200">
</p>

<h1 align="center">pdfcmprs</h1>

<p align="center">
   <strong>A press for your PDFs built with Next.js.</strong><br>
   <em>Compress, merge, and split your PDFs directly in the browser. No server upload, fully offline.</em>
</p>

## Features

- Compress PDF files to reduce file size
- Merge multiple PDFs into a single document
- Split PDFs and extract specific pages
- Fully client-side processing (no server upload)
- Fast, secure, and offline operations

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **UI:** React 19
- **Core Libraries:** `pdf-lib`, `pdfjs-dist`
- **Language:** TypeScript
- **Package Manager:** Bun

## Getting Started

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

### Project Structure

```
app/               # Next.js App Router pages, styles, and layouts
app/components/    # Reusable UI components and workspace panels
app/features/      # PDF business logic, services, and hooks
app/lib/           # Utilities for file handling and downloads
public/            # Static assets and compiled PDF workers
```
