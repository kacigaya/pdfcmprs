import { describe, expect, test } from "bun:test";
import { CATEGORIES, ENGINE_IDS, getTool, TOOLS } from "./registry";

/** Route segments that already exist as real files under app/. */
const RESERVED_SLUGS = new Set([
  "api",
  "robots.txt",
  "sitemap.xml",
  "_next",
  "wasm",
  "favicon.ico",
  "apple-icon.png",
]);

describe("tool registry", () => {
  test("slugs are unique", () => {
    const slugs = TOOLS.map((tool) => tool.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  test("slugs are URL-safe kebab-case", () => {
    for (const tool of TOOLS) {
      expect(tool.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });

  test("slugs do not collide with real routes or static assets", () => {
    for (const tool of TOOLS) {
      expect(RESERVED_SLUGS.has(tool.slug)).toBe(false);
    }
  });

  test("every tool has a loader", () => {
    for (const tool of TOOLS) {
      expect(typeof tool.load).toBe("function");
    }
  });

  test("every tool names a known engine", () => {
    for (const tool of TOOLS) {
      expect(ENGINE_IDS).toContain(tool.engine);
    }
  });

  test("every tool sits in a declared category", () => {
    const ids = new Set(CATEGORIES.map((category) => category.id));
    for (const tool of TOOLS) {
      expect(ids.has(tool.category)).toBe(true);
    }
  });

  test("every tool carries title, summary, and keywords", () => {
    for (const tool of TOOLS) {
      expect(tool.title.length).toBeGreaterThan(0);
      expect(tool.summary.length).toBeGreaterThan(0);
      expect(tool.keywords.length).toBeGreaterThan(0);
    }
  });

  test("category ids are unique", () => {
    const ids = CATEGORIES.map((category) => category.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("getTool resolves known slugs and rejects unknown ones", () => {
    expect(getTool(TOOLS[0].slug)?.slug).toBe(TOOLS[0].slug);
    expect(getTool("no-such-tool")).toBeUndefined();
  });
});
