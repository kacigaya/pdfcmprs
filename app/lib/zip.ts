function makeCrcTable(): Uint32Array {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
}

const CRC_TABLE = makeCrcTable();

export function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export interface ZipEntry {
  filename: string;
  bytes: Uint8Array;
}

const LOCAL_HEADER_SIZE = 30;
const CENTRAL_HEADER_SIZE = 46;
const END_RECORD_SIZE = 22;

/** Sequential writer over a preallocated buffer. */
class ByteWriter {
  private readonly view: DataView;
  private offset = 0;

  constructor(readonly bytes: Uint8Array) {
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  }

  get position(): number {
    return this.offset;
  }

  u16(value: number): void {
    this.view.setUint16(this.offset, value, true);
    this.offset += 2;
  }

  u32(value: number): void {
    this.view.setUint32(this.offset, value, true);
    this.offset += 4;
  }

  raw(data: Uint8Array): void {
    this.bytes.set(data, this.offset);
    this.offset += data.length;
  }
}

/**
 * Minimal ZIP writer using the STORE method (no compression). Supports
 * bundling already-compressed output like PNG/JPG pages or a set of PDFs.
 *
 * Writes into a preallocated buffer rather than a number[]: entries here are
 * routinely multi-megabyte, and spreading those into an array argument list
 * overflows the call stack.
 */
export function createStoredZip(entries: ZipEntry[]): Blob {
  if (entries.length > 0xffff) throw new Error("Too many files for a ZIP archive.");
  const encoder = new TextEncoder();
  const usedNames = new Set<string>();
  const prepared = entries.map((entry) => {
    // Keep document package paths, but reject paths that can escape extraction.
    const path = entry.filename.replace(/\\/g, "/");
    if (!path || path.startsWith("/") || /^[a-z]:/i.test(path) || path.includes("\0") || path.split("/").some((part) => part === ".." || part === ".")) {
      throw new Error(`Unsafe ZIP filename: ${entry.filename}`);
    }
    const dot = path.lastIndexOf(".");
    const extensionAt = dot > path.lastIndexOf("/") + 1 ? dot : path.length;
    let name = path;
    for (let suffix = 2; usedNames.has(name); suffix += 1) {
      name = `${path.slice(0, extensionAt)} (${suffix})${path.slice(extensionAt)}`;
    }
    usedNames.add(name);
    const encoded = encoder.encode(name);
    if (encoded.length > 0xffff) throw new Error("ZIP filename is too long.");
    return { name: encoded, bytes: entry.bytes, crc: crc32(entry.bytes) };
  });

  const localSize = prepared.reduce(
    (sum, entry) => sum + LOCAL_HEADER_SIZE + entry.name.length + entry.bytes.length,
    0,
  );
  const centralSize = prepared.reduce(
    (sum, entry) => sum + CENTRAL_HEADER_SIZE + entry.name.length,
    0,
  );
  if (localSize + centralSize + END_RECORD_SIZE > 0xffffffff) {
    throw new Error("This archive exceeds the 4 GB ZIP limit.");
  }

  const writer = new ByteWriter(
    new Uint8Array(localSize + centralSize + END_RECORD_SIZE),
  );

  const offsets: number[] = [];
  for (const entry of prepared) {
    offsets.push(writer.position);
    writer.u32(0x04034b50);
    writer.u16(20); // version needed
    writer.u16(0x0800); // UTF-8 filenames
    writer.u16(0); // method: store
    writer.u16(0); // mod time
    writer.u16(0); // mod date
    writer.u32(entry.crc);
    writer.u32(entry.bytes.length);
    writer.u32(entry.bytes.length);
    writer.u16(entry.name.length);
    writer.u16(0); // extra field length
    writer.raw(entry.name);
    writer.raw(entry.bytes);
  }

  const centralOffset = writer.position;
  prepared.forEach((entry, index) => {
    writer.u32(0x02014b50);
    writer.u16(20); // version made by
    writer.u16(20); // version needed
    writer.u16(0x0800); // UTF-8 filenames
    writer.u16(0); // method: store
    writer.u16(0); // mod time
    writer.u16(0); // mod date
    writer.u32(entry.crc);
    writer.u32(entry.bytes.length);
    writer.u32(entry.bytes.length);
    writer.u16(entry.name.length);
    writer.u16(0); // extra field length
    writer.u16(0); // comment length
    writer.u16(0); // disk number
    writer.u16(0); // internal attributes
    writer.u32(0); // external attributes
    writer.u32(offsets[index]);
    writer.raw(entry.name);
  });

  writer.u32(0x06054b50);
  writer.u16(0); // disk number
  writer.u16(0); // central directory disk
  writer.u16(prepared.length);
  writer.u16(prepared.length);
  writer.u32(centralSize);
  writer.u32(centralOffset);
  writer.u16(0); // comment length

  return new Blob([writer.bytes as BlobPart], { type: "application/zip" });
}
