"use client";

/**
 * Lazy, cached loaders for the WASM engines. Glue + binaries are served from
 * /wasm/<engine>/ (see scripts/copy-assets.ts) rather than bundled, so nothing
 * is fetched until a tool that needs it actually runs, and a self-hosted copy
 * stays air-gapped.
 */

const CACHE = new Map<string, Promise<unknown>>();

/**
 * Import a module by runtime URL. The specifier is a variable on purpose:
 * that keeps the bundler from trying to resolve /wasm/* at build time, so the
 * glue is fetched from public/ exactly as copy-assets.ts laid it out.
 */
function importByUrl<T>(url: string): Promise<T> {
  return import(/* webpackIgnore: true */ /* turbopackIgnore: true */ url) as Promise<T>;
}

function memo<T>(key: string, factory: () => Promise<T>): Promise<T> {
  const existing = CACHE.get(key);
  if (existing) return existing as Promise<T>;
  const created = factory().catch((error) => {
    // Don't cache failures — a transient network error should be retryable.
    CACHE.delete(key);
    throw error;
  });
  CACHE.set(key, created);
  return created;
}

/** Minimal slice of the Emscripten runtime the qpdf/ghostscript tools use. */
export interface EmscriptenFs {
  writeFile(path: string, data: Uint8Array): void;
  readFile(path: string): Uint8Array;
  unlink(path: string): void;
  mkdir(path: string): void;
  readdir(path: string): string[];
  stat(path: string): unknown;
}

/** MEMFS throws an opaque ErrnoError for a missing path; there is no exists(). */
function fileExists(fs: EmscriptenFs, path: string): boolean {
  try {
    fs.stat(path);
    return true;
  } catch {
    return false;
  }
}

export interface EmscriptenInstance {
  callMain(args: string[]): number;
  FS: EmscriptenFs;
}

export type EmscriptenFactory = (
  options: Record<string, unknown>,
) => Promise<EmscriptenInstance>;

/**
 * Emscripten glue built as a classic script assigns a global `Module`, and
 * qpdf and ghostscript both use that same name — so script loads are
 * serialized and the global is captured immediately after each one.
 */
let scriptQueue: Promise<unknown> = Promise.resolve();

function loadGlobalScript(src: string): Promise<EmscriptenFactory> {
  const next = scriptQueue.then(async () => {
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.head.appendChild(script);
    });
    const scope = globalThis as unknown as { Module?: EmscriptenFactory };
    const factory = scope.Module;
    if (typeof factory !== "function") {
      throw new Error(`${src} did not expose an Emscripten module factory.`);
    }
    // `var Module` at global scope is not configurable, so overwrite instead
    // of deleting before the next engine's script runs.
    scope.Module = undefined;
    return factory;
  });
  scriptQueue = next.catch(() => undefined);
  return next;
}

/**
 * Run a command-line style WASM tool: stage inputs in the in-memory FS,
 * invoke main, read the produced file back out.
 */
export async function runCliTool(
  factory: EmscriptenFactory,
  options: {
    args: string[];
    inputs: Record<string, Uint8Array>;
    output: string;
    locateFile: (path: string) => string;
  },
): Promise<Uint8Array> {
  const instance = await factory({
    noInitialRun: true,
    locateFile: options.locateFile,
  });

  for (const [name, data] of Object.entries(options.inputs)) {
    instance.FS.writeFile(name, data);
  }

  // These builds ignore Module.print/printErr/out/err and write straight to
  // the console, so the only way to surface the engine's own diagnostics is
  // to intercept console during the call. callMain is synchronous, so nothing
  // else can interleave.
  const captured: string[] = [];
  const original = {
    log: console.log,
    warn: console.warn,
    error: console.error,
  };
  const collect = (...parts: unknown[]) => {
    captured.push(parts.map(String).join(" "));
  };

  let code: number;
  let thrown: unknown;
  console.log = collect;
  console.warn = collect;
  console.error = collect;
  try {
    code = instance.callMain(options.args);
  } catch (error) {
    code = -1;
    thrown = error;
  } finally {
    console.log = original.log;
    console.warn = original.warn;
    console.error = original.error;
  }

  const produced = fileExists(instance.FS, options.output);
  if (!produced) {
    const detail = captured
      .map((line) => line.replace(/^[^:]*\.(mjs|js):\s*/, "").trim())
      .filter(Boolean)
      .join(" · ");
    if (detail) throw new Error(detail);
    if (thrown instanceof Error) throw new Error(thrown.message);
    throw new Error(`Engine exited with code ${code} and produced no output.`);
  }

  const result = instance.FS.readFile(options.output);
  // Copy out of the WASM heap before the instance is dropped.
  return new Uint8Array(result);
}

/* ------------------------------------------------------------------ qpdf */

export function loadQpdf(): Promise<EmscriptenFactory> {
  return memo("qpdf", () => loadGlobalScript("/wasm/qpdf/qpdf.js"));
}

export async function runQpdf(
  args: string[],
  inputs: Record<string, Uint8Array>,
  output: string,
): Promise<Uint8Array> {
  const factory = await loadQpdf();
  return runCliTool(factory, {
    args,
    inputs,
    output,
    locateFile: () => "/wasm/qpdf/qpdf.wasm",
  });
}

/* ---------------------------------------------------------- ghostscript */

export function loadGhostscript(): Promise<EmscriptenFactory> {
  return memo("ghostscript", () =>
    loadGlobalScript("/wasm/ghostscript/gs.js"),
  );
}

export async function runGhostscript(
  args: string[],
  inputs: Record<string, Uint8Array>,
  output: string,
): Promise<Uint8Array> {
  const factory = await loadGhostscript();
  return runCliTool(factory, {
    args,
    inputs,
    output,
    locateFile: () => "/wasm/ghostscript/gs.wasm",
  });
}

/* ----------------------------------------------------------------- mupdf */

export type MupdfModule = typeof import("mupdf");

export function loadMupdf(): Promise<MupdfModule> {
  return memo("mupdf", () => importByUrl<MupdfModule>("/wasm/mupdf/mupdf.js"));
}

/* ------------------------------------------------------------------ vips */

export interface VipsInstance {
  Image: {
    newFromBuffer(buffer: Uint8Array, options?: string): VipsImage;
  };
  shutdown?: () => void;
}

export interface VipsImage {
  width: number;
  height: number;
  writeToBuffer(suffix: string, options?: Record<string, unknown>): Uint8Array;
  colourspace(space: string): VipsImage;
  delete(): void;
}

type VipsFactory = (options: Record<string, unknown>) => Promise<VipsInstance>;

export function loadVips(): Promise<VipsInstance> {
  return memo("vips", async () => {
    const module = await importByUrl<{ default: VipsFactory }>(
      "/wasm/vips/vips-es6.js",
    );
    return module.default({
      dynamicLibraries: ["vips-heif.wasm"],
      locateFile: (path: string) => `/wasm/vips/${path}`,
      // wasm-vips spawns pthreads; without cross-origin isolation it falls
      // back to a single-threaded path, which is fine for one-shot conversions.
      preRun: () => undefined,
    });
  });
}

/* ---------------------------------------------------------------- opencv */

export interface OpenCvModule {
  onRuntimeInitialized?: () => void;
  [key: string]: unknown;
}

export function loadOpenCv(): Promise<OpenCvModule> {
  return memo("opencv", async () => {
    const scope = globalThis as unknown as { cv?: OpenCvModule };
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "/wasm/opencv/opencv.js";
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load OpenCV."));
      document.head.appendChild(script);
    });
    const cv = scope.cv;
    if (!cv) throw new Error("OpenCV did not initialise.");
    // Newer builds resolve a promise; older ones use onRuntimeInitialized.
    if (typeof (cv as { then?: unknown }).then === "function") {
      return (await cv) as OpenCvModule;
    }
    if (!("Mat" in cv)) {
      await new Promise<void>((resolve) => {
        cv.onRuntimeInitialized = () => resolve();
      });
    }
    return cv;
  });
}

/* ------------------------------------------------------------------ cpdf */

export function loadCpdf(): Promise<typeof import("coherentpdf")> {
  return memo("cpdf", async () => {
    const module = await import("coherentpdf");
    return (module.default ?? module) as typeof import("coherentpdf");
  });
}

/* ------------------------------------------------------------- tesseract */

export function loadTesseract(): Promise<typeof import("tesseract.js")> {
  return memo("tesseract", () => import("tesseract.js"));
}
