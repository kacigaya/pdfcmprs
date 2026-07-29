import { describe, expect, test } from "bun:test";
import { allPages, formatPageSelection, parsePageSelection } from "./pages";

describe("parsePageSelection", () => {
  test("parses single pages", () => {
    expect(parsePageSelection("1", 10)).toEqual([1]);
    expect(parsePageSelection("1,3,5", 10)).toEqual([1, 3, 5]);
  });

  test("parses ranges", () => {
    expect(parsePageSelection("2-5", 10)).toEqual([2, 3, 4, 5]);
    expect(parsePageSelection("1, 3, 5-7", 10)).toEqual([1, 3, 5, 6, 7]);
  });

  test("sorts and de-duplicates overlapping input", () => {
    expect(parsePageSelection("5,1,3,1,4-5", 10)).toEqual([1, 3, 4, 5]);
  });

  test("accepts reversed ranges", () => {
    expect(parsePageSelection("7-5", 10)).toEqual([5, 6, 7]);
  });

  test("tolerates whitespace and en/em dashes", () => {
    expect(parsePageSelection("  1 , 3 - 4  ", 10)).toEqual([1, 3, 4]);
    expect(parsePageSelection("2–4", 10)).toEqual([2, 3, 4]);
    expect(parsePageSelection("2—4", 10)).toEqual([2, 3, 4]);
  });

  test("supports open-ended ranges", () => {
    expect(parsePageSelection("8-", 10)).toEqual([8, 9, 10]);
    expect(parsePageSelection("-3", 10)).toEqual([1, 2, 3]);
  });

  test("supports the all keyword", () => {
    expect(parsePageSelection("all", 4)).toEqual([1, 2, 3, 4]);
    expect(parsePageSelection("ALL", 2)).toEqual([1, 2]);
  });

  test("rejects an empty selection", () => {
    expect(() => parsePageSelection("", 10)).toThrow(/empty/i);
    expect(() => parsePageSelection("   ", 10)).toThrow(/empty/i);
  });

  test("rejects out-of-bounds pages", () => {
    expect(() => parsePageSelection("11", 10)).toThrow(/out of bounds/i);
    expect(() => parsePageSelection("9-12", 10)).toThrow(/out of bounds/i);
    expect(() => parsePageSelection("-12", 10)).toThrow(/out of bounds/i);
  });

  test("rejects page zero and negative-looking input", () => {
    expect(() => parsePageSelection("0", 10)).toThrow();
    expect(() => parsePageSelection("0-3", 10)).toThrow();
  });

  test("rejects garbage", () => {
    expect(() => parsePageSelection("abc", 10)).toThrow(/invalid/i);
    expect(() => parsePageSelection("1..3", 10)).toThrow(/invalid/i);
    expect(() => parsePageSelection("1.5", 10)).toThrow(/invalid/i);
    expect(() => parsePageSelection("1-2-3", 10)).toThrow(/invalid/i);
  });
});

describe("formatPageSelection", () => {
  test("collapses consecutive runs", () => {
    expect(formatPageSelection([1, 2, 3, 7])).toBe("1-3, 7");
    expect(formatPageSelection([1, 3, 5])).toBe("1, 3, 5");
    expect(formatPageSelection([4])).toBe("4");
  });

  test("sorts and de-duplicates before formatting", () => {
    expect(formatPageSelection([3, 1, 2, 2])).toBe("1-3");
  });

  test("returns an empty string for no pages", () => {
    expect(formatPageSelection([])).toBe("");
  });

  test("round-trips through parsePageSelection", () => {
    const pages = [1, 2, 3, 6, 9, 10];
    expect(parsePageSelection(formatPageSelection(pages), 10)).toEqual(pages);
  });
});

describe("allPages", () => {
  test("is 1-based and inclusive", () => {
    expect(allPages(3)).toEqual([1, 2, 3]);
    expect(allPages(0)).toEqual([]);
  });
});
