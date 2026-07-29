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
