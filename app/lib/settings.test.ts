import { expect, test } from "bun:test";
import { DEFAULT_SETTINGS, normalizeSettings } from "./settings";

test("normalizeSettings accepts only supported setting values", () => {
  expect(normalizeSettings({ language: "ja", compact: true, shortcuts: false })).toEqual({ language: "ja", compact: true, shortcuts: false });
  expect(normalizeSettings({ language: "xx", compact: "yes", shortcuts: null })).toEqual(DEFAULT_SETTINGS);
  expect(normalizeSettings(null)).toEqual(DEFAULT_SETTINGS);
});
