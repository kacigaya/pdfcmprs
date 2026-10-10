import { describe, expect, test } from "bun:test";
import { crc32, createStoredZip } from "./zip";

const TEXT = new TextEncoder();

async function zipBytes(
  entries: { filename: string; bytes: Uint8Array }[],
): Promise<Uint8Array> {
  return new Uint8Array(await createStoredZip(entries).arrayBuffer());
}

function readU32(bytes: Uint8Array, offset: number): number {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(
    offset,
    true,
  );
}

describe("crc32", () => {
  // Standard CRC-32/ISO-HDLC check vectors.
  test("matches known vectors", () => {
    expect(crc32(TEXT.encode(""))).toBe(0);
    expect(crc32(TEXT.encode("a"))).toBe(0xe8b7be43);
    expect(crc32(TEXT.encode("abc"))).toBe(0x352441c2);
    expect(crc32(TEXT.encode("123456789"))).toBe(0xcbf43926);
  });
});

describe("createStoredZip", () => {
  test("writes the local file header signature first", async () => {
    const bytes = await zipBytes([
      { filename: "a.txt", bytes: TEXT.encode("hello") },
    ]);
    expect(readU32(bytes, 0)).toBe(0x04034b50);
  });

  test("ends with the end-of-central-directory record", async () => {
    const bytes = await zipBytes([
      { filename: "a.txt", bytes: TEXT.encode("hello") },
    ]);
    expect(readU32(bytes, bytes.length - 22)).toBe(0x06054b50);
  });

  test("records the entry count in both end-record fields", async () => {
    const bytes = await zipBytes([
      { filename: "a.txt", bytes: TEXT.encode("one") },
      { filename: "b.txt", bytes: TEXT.encode("two") },
      { filename: "c.txt", bytes: TEXT.encode("three") },
    ]);
    const view = new DataView(bytes.buffer);
    const end = bytes.length - 22;
    expect(view.getUint16(end + 8, true)).toBe(3);
    expect(view.getUint16(end + 10, true)).toBe(3);
  });

  test("stores content uncompressed and intact", async () => {
    const payload = TEXT.encode("hello");
    const bytes = await zipBytes([{ filename: "a.txt", bytes: payload }]);
    // Local header is 30 bytes plus the 5-byte filename.
    const start = 30 + 5;
    expect(Array.from(bytes.slice(start, start + payload.length))).toEqual(
      Array.from(payload),
    );
  });

  test("central directory offset points at its signature", async () => {
    const bytes = await zipBytes([
      { filename: "a.txt", bytes: TEXT.encode("one") },
      { filename: "b.txt", bytes: TEXT.encode("two") },
    ]);
    const centralOffset = readU32(bytes, bytes.length - 22 + 16);
    expect(readU32(bytes, centralOffset)).toBe(0x02014b50);
  });

  test("produces a valid empty archive", async () => {
    const bytes = await zipBytes([]);
    expect(bytes.length).toBe(22);
    expect(readU32(bytes, 0)).toBe(0x06054b50);
  });

  test("handles entries far larger than the call-stack argument limit", async () => {
    // A number[]-based writer using spread overflows the stack around here.
    const big = new Uint8Array(2_000_000).fill(7);
    const bytes = await zipBytes([{ filename: "big.bin", bytes: big }]);
    expect(bytes.length).toBe(30 + 7 + big.length + 46 + 7 + 22);
  });
});

function localEntries(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const files: { name: string; text: string; flags: number }[] = [];
  let offset = 0;
  while (view.getUint32(offset, true) === 0x04034b50) {
    const size = view.getUint32(offset + 18, true);
    const length = view.getUint16(offset + 26, true);
    const data = offset + 30 + length + view.getUint16(offset + 28, true);
    files.push({ name: new TextDecoder().decode(bytes.slice(offset + 30, offset + 30 + length)), text: new TextDecoder().decode(bytes.slice(data, data + size)), flags: view.getUint16(offset + 6, true) });
    offset = data + size;
  }
  return files;
}

test("ZIP preserves duplicate outputs with distinct names and UTF-8 flags", async () => {
  const bytes = await zipBytes([
    { filename: "résumé.pdf", bytes: TEXT.encode("first") },
    { filename: "résumé.pdf", bytes: TEXT.encode("second") },
    { filename: "résumé (2).pdf", bytes: TEXT.encode("third") },
  ]);
  const files = localEntries(bytes);
  expect(files.map((file) => file.name)).toEqual(["résumé.pdf", "résumé (2).pdf", "résumé (2) (2).pdf"]);
  expect(files.map((file) => file.text)).toEqual(["first", "second", "third"]);
  expect(files.every((file) => file.flags === 0x0800)).toBe(true);
  const view = new DataView(bytes.buffer);
  const central = view.getUint32(bytes.length - 6, true);
  expect(view.getUint16(central + 8, true)).toBe(0x0800);
});

test("ZIP rejects traversal and absolute names while allowing document package directories", () => {
  for (const filename of ["../secret", "a/../../secret", "/tmp/secret", "C:\\secret", "a\\..\\secret", "a\0b"]) {
    expect(() => createStoredZip([{ filename, bytes: TEXT.encode("data") }])).toThrow("Unsafe ZIP filename");
  }
  expect(createStoredZip([{ filename: "word/document.xml", bytes: TEXT.encode("data") }]).size).toBeGreaterThan(0);
});
