/**
 * Encoders for the formats canvas.toBlob() cannot produce.
 *
 * Browsers ship PNG, JPEG, and (nearly everywhere) WebP encoders. BMP and TIFF
 * are not among them, so those are written here from the raw RGBA a canvas
 * hands back. Kept free of DOM access so the pixel maths is unit-testable.
 */

/** Convert RGBA in place to luminance-weighted grey. Returns the same buffer. */
export function toGreyscale(rgba: Uint8ClampedArray | Uint8Array) {
  for (let i = 0; i < rgba.length; i += 4) {
    // Rec. 601 luma — matches how humans weight the channels.
    const grey = Math.round(
      rgba[i] * 0.299 + rgba[i + 1] * 0.587 + rgba[i + 2] * 0.114,
    );
    rgba[i] = grey;
    rgba[i + 1] = grey;
    rgba[i + 2] = grey;
  }
  return rgba;
}

/** Invert RGB in place, leaving alpha alone. Returns the same buffer. */
export function invertColors(rgba: Uint8ClampedArray | Uint8Array) {
  for (let i = 0; i < rgba.length; i += 4) {
    rgba[i] = 255 - rgba[i];
    rgba[i + 1] = 255 - rgba[i + 1];
    rgba[i + 2] = 255 - rgba[i + 2];
  }
  return rgba;
}

/**
 * Apply brightness, contrast, and saturation in place.
 * Brightness and contrast are multipliers around 1; saturation 0 is grey.
 */
export function adjustColors(
  rgba: Uint8ClampedArray | Uint8Array,
  options: { brightness: number; contrast: number; saturation: number },
) {
  const { brightness, contrast, saturation } = options;
  const clamp = (value: number) => (value < 0 ? 0 : value > 255 ? 255 : value);
  for (let i = 0; i < rgba.length; i += 4) {
    let r = rgba[i] * brightness;
    let g = rgba[i + 1] * brightness;
    let b = rgba[i + 2] * brightness;

    // Contrast pivots around mid-grey.
    r = (r - 128) * contrast + 128;
    g = (g - 128) * contrast + 128;
    b = (b - 128) * contrast + 128;

    if (saturation !== 1) {
      const grey = r * 0.299 + g * 0.587 + b * 0.114;
      r = grey + (r - grey) * saturation;
      g = grey + (g - grey) * saturation;
      b = grey + (b - grey) * saturation;
    }

    rgba[i] = clamp(Math.round(r));
    rgba[i + 1] = clamp(Math.round(g));
    rgba[i + 2] = clamp(Math.round(b));
  }
  return rgba;
}

const BMP_FILE_HEADER_SIZE = 14;
const BMP_INFO_HEADER_SIZE = 40;

/**
 * Encode RGBA as an uncompressed 24-bit BMP.
 *
 * BMP stores rows bottom-up and pads each row to a 4-byte boundary, and the
 * channel order is BGR rather than RGB.
 */
export function encodeBmp(
  rgba: Uint8ClampedArray | Uint8Array,
  width: number,
  height: number,
): Uint8Array {
  if (width <= 0 || height <= 0) {
    throw new Error("BMP dimensions must be positive.");
  }
  const rowStride = width * 3;
  const padding = (4 - (rowStride % 4)) % 4;
  const paddedStride = rowStride + padding;
  const pixelBytes = paddedStride * height;
  const size = BMP_FILE_HEADER_SIZE + BMP_INFO_HEADER_SIZE + pixelBytes;

  const out = new Uint8Array(size);
  const view = new DataView(out.buffer);

  out[0] = 0x42; // 'B'
  out[1] = 0x4d; // 'M'
  view.setUint32(2, size, true);
  view.setUint32(10, BMP_FILE_HEADER_SIZE + BMP_INFO_HEADER_SIZE, true);

  view.setUint32(14, BMP_INFO_HEADER_SIZE, true);
  view.setInt32(18, width, true);
  view.setInt32(22, height, true);
  view.setUint16(26, 1, true); // colour planes
  view.setUint16(28, 24, true); // bits per pixel
  view.setUint32(30, 0, true); // BI_RGB, no compression
  view.setUint32(34, pixelBytes, true);
  view.setInt32(38, 2835, true); // ~72 DPI, pixels per metre
  view.setInt32(42, 2835, true);

  let offset = BMP_FILE_HEADER_SIZE + BMP_INFO_HEADER_SIZE;
  for (let y = height - 1; y >= 0; y -= 1) {
    let cursor = offset;
    const rowStart = y * width * 4;
    for (let x = 0; x < width; x += 1) {
      const source = rowStart + x * 4;
      out[cursor] = rgba[source + 2]; // B
      out[cursor + 1] = rgba[source + 1]; // G
      out[cursor + 2] = rgba[source]; // R
      cursor += 3;
    }
    offset += paddedStride;
  }

  return out;
}

/** Encode RGBA as an uncompressed TIFF via UTIF. */
export async function encodeTiff(
  rgba: Uint8ClampedArray | Uint8Array,
  width: number,
  height: number,
): Promise<Uint8Array> {
  const utif = await import("utif2");
  const encoded = utif.encodeImage(
    rgba instanceof Uint8Array ? rgba : new Uint8Array(rgba),
    width,
    height,
  );
  return new Uint8Array(encoded);
}
