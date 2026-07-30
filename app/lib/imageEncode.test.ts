import { describe, expect, test } from "bun:test";
import {
  adjustColors,
  encodeBmp,
  encodeTiff,
  invertColors,
  toGreyscale,
} from "./imageEncode";

/** width x height of solid RGBA pixels. */
function solid(
  width: number,
  height: number,
  [r, g, b, a]: [number, number, number, number],
): Uint8ClampedArray {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
    data[i + 3] = a;
  }
  return data;
}

describe("toGreyscale", () => {
  test("collapses the channels to one luma value", () => {
    const out = toGreyscale(new Uint8ClampedArray([255, 0, 0, 255]));
    // Rec. 601: 255 * 0.299 = 76.2
    expect([out[0], out[1], out[2]]).toEqual([76, 76, 76]);
  });

  test("leaves neutral pixels untouched", () => {
    const out = toGreyscale(new Uint8ClampedArray([128, 128, 128, 255]));
    expect([out[0], out[1], out[2]]).toEqual([128, 128, 128]);
  });

  test("preserves alpha", () => {
    const out = toGreyscale(new Uint8ClampedArray([10, 20, 30, 77]));
    expect(out[3]).toBe(77);
  });

  test("weights green above red above blue", () => {
    const red = toGreyscale(new Uint8ClampedArray([255, 0, 0, 255]))[0];
    const green = toGreyscale(new Uint8ClampedArray([0, 255, 0, 255]))[0];
    const blue = toGreyscale(new Uint8ClampedArray([0, 0, 255, 255]))[0];
    expect(green).toBeGreaterThan(red);
    expect(red).toBeGreaterThan(blue);
  });
});

describe("invertColors", () => {
  test("flips each colour channel", () => {
    const out = invertColors(new Uint8ClampedArray([0, 128, 255, 255]));
    expect([out[0], out[1], out[2]]).toEqual([255, 127, 0]);
  });

  test("leaves alpha alone", () => {
    const out = invertColors(new Uint8ClampedArray([0, 0, 0, 40]));
    expect(out[3]).toBe(40);
  });

  test("is its own inverse", () => {
    const original = [12, 200, 77, 255];
    const out = invertColors(invertColors(new Uint8ClampedArray(original)));
    expect(Array.from(out)).toEqual(original);
  });
});

describe("adjustColors", () => {
  const NEUTRAL = { brightness: 1, contrast: 1, saturation: 1 };

  test("is a no-op at neutral settings", () => {
    const original = [40, 90, 160, 255];
    const out = adjustColors(new Uint8ClampedArray(original), NEUTRAL);
    expect(Array.from(out)).toEqual(original);
  });

  test("brightness scales the channels", () => {
    const out = adjustColors(new Uint8ClampedArray([50, 50, 50, 255]), {
      ...NEUTRAL,
      brightness: 2,
    });
    expect(out[0]).toBe(100);
  });

  test("clamps rather than wrapping past 255", () => {
    const out = adjustColors(new Uint8ClampedArray([200, 200, 200, 255]), {
      ...NEUTRAL,
      brightness: 4,
    });
    expect(out[0]).toBe(255);
  });

  test("clamps at zero rather than going negative", () => {
    const out = adjustColors(new Uint8ClampedArray([10, 10, 10, 255]), {
      ...NEUTRAL,
      contrast: 5,
    });
    expect(out[0]).toBe(0);
  });

  test("contrast pivots around mid-grey", () => {
    const out = adjustColors(new Uint8ClampedArray([128, 128, 128, 255]), {
      ...NEUTRAL,
      contrast: 3,
    });
    expect(out[0]).toBe(128);
  });

  test("zero saturation greys the pixel out", () => {
    const out = adjustColors(new Uint8ClampedArray([255, 0, 0, 255]), {
      ...NEUTRAL,
      saturation: 0,
    });
    expect(out[0]).toBe(out[1]);
    expect(out[1]).toBe(out[2]);
  });
});

describe("encodeBmp", () => {
  test("writes the BM signature and declared file size", () => {
    const bmp = encodeBmp(solid(2, 2, [255, 0, 0, 255]), 2, 2);
    expect([bmp[0], bmp[1]]).toEqual([0x42, 0x4d]);
    const view = new DataView(bmp.buffer);
    expect(view.getUint32(2, true)).toBe(bmp.length);
  });

  test("declares 24-bit uncompressed pixels", () => {
    const bmp = encodeBmp(solid(2, 2, [1, 2, 3, 255]), 2, 2);
    const view = new DataView(bmp.buffer);
    expect(view.getUint16(28, true)).toBe(24); // bits per pixel
    expect(view.getUint32(30, true)).toBe(0); // BI_RGB
  });

  test("pads each row to a four-byte boundary", () => {
    // 3 px * 3 bytes = 9 bytes, padded to 12.
    const bmp = encodeBmp(solid(3, 1, [0, 0, 0, 255]), 3, 1);
    expect(bmp.length).toBe(14 + 40 + 12);
  });

  test("needs no padding when the row is already aligned", () => {
    // 4 px * 3 bytes = 12 bytes.
    const bmp = encodeBmp(solid(4, 1, [0, 0, 0, 255]), 4, 1);
    expect(bmp.length).toBe(14 + 40 + 12);
  });

  test("stores channels as BGR, not RGB", () => {
    const bmp = encodeBmp(new Uint8ClampedArray([10, 20, 30, 255]), 1, 1);
    const pixel = bmp.slice(54, 57);
    expect(Array.from(pixel)).toEqual([30, 20, 10]);
  });

  test("writes rows bottom-up", () => {
    // Two rows: top red, bottom blue. BMP stores bottom first.
    const data = new Uint8ClampedArray([
      255, 0, 0, 255, // row 0 (top) red
      0, 0, 255, 255, // row 1 (bottom) blue
    ]);
    const bmp = encodeBmp(data, 1, 2);
    const firstStored = bmp.slice(54, 57);
    // Blue in BGR is [255, 0, 0].
    expect(Array.from(firstStored)).toEqual([255, 0, 0]);
  });

  test("rejects non-positive dimensions", () => {
    expect(() => encodeBmp(new Uint8ClampedArray(4), 0, 1)).toThrow(/positive/i);
    expect(() => encodeBmp(new Uint8ClampedArray(4), 1, -2)).toThrow(/positive/i);
  });
});

describe("encodeTiff", () => {
  test("writes a recognisable TIFF header", async () => {
    const tiff = await encodeTiff(solid(4, 4, [200, 100, 50, 255]), 4, 4);
    const magic = String.fromCharCode(tiff[0], tiff[1]);
    // "II" little-endian or "MM" big-endian, then the 42 version marker.
    expect(["II", "MM"]).toContain(magic);
    expect(tiff.length).toBeGreaterThan(8);
  });

  test("round-trips back to the original pixels", async () => {
    const width = 3;
    const height = 2;
    const source = solid(width, height, [10, 220, 30, 255]);
    const tiff = await encodeTiff(source, width, height);

    const utif = await import("utif2");
    const buffer = tiff.buffer as ArrayBuffer;
    const pages = utif.decode(buffer);
    utif.decodeImage(buffer, pages[0]);
    const rgba = utif.toRGBA8(pages[0]);

    expect(pages[0].width).toBe(width);
    expect(pages[0].height).toBe(height);
    expect([rgba[0], rgba[1], rgba[2]]).toEqual([10, 220, 30]);
  });
});
