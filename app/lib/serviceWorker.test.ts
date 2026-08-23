import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

interface FetchEventMock {
  request: Request;
  respondWith(response: Response | Promise<Response>): void;
  waitUntil(promise: Promise<unknown>): void;
}

type FetchListener = (event: FetchEventMock) => void;

function navigationRequest(url: string) {
  const request = new Request(url);
  Object.defineProperty(request, "mode", { value: "navigate" });
  return request;
}

function createHarness() {
  const listeners = new Map<string, FetchListener>();
  const entries = new Map<string, Response>();
  const cacheKey = (request: RequestInfo | URL) =>
    request instanceof Request
      ? request.url
      : typeof request === "string"
        ? request
        : request.toString();
  const cache = {
    async addAll() {},
    async match(request: RequestInfo | URL) {
      return entries.get(cacheKey(request))?.clone();
    },
    async put(request: RequestInfo | URL, response: Response) {
      entries.set(cacheKey(request), response.clone());
    },
  };
  const cacheStorage = {
    async delete() {
      return true;
    },
    async keys() {
      return ["pdfcmprs-v2"];
    },
    async open() {
      return cache;
    },
  };
  const scope = {
    addEventListener(type: string, listener: FetchListener) {
      listeners.set(type, listener);
    },
    clients: { async claim() {} },
    async skipWaiting() {},
  };
  let networkCalls = 0;
  let networkResponse = new Response("network");
  let offline = false;
  const fetcher = async () => {
    networkCalls += 1;
    if (offline) throw new TypeError("offline");
    return networkResponse.clone();
  };

  const source = readFileSync(join(process.cwd(), "public/sw.js"), "utf8");
  new Function("self", "caches", "fetch", "location", source)(
    scope,
    cacheStorage,
    fetcher,
    { origin: "https://pdfcmprs.test" },
  );

  async function dispatch(request: Request) {
    const waits: Promise<unknown>[] = [];
    let response: Promise<Response> | undefined;
    let dispatching = true;
    listeners.get("fetch")?.({
      request,
      respondWith(value) {
        response = Promise.resolve(value);
      },
      waitUntil(promise) {
        if (!dispatching) {
          throw new Error("waitUntil called after event dispatch");
        }
        waits.push(promise);
      },
    });
    dispatching = false;
    if (!response) throw new Error("Service worker did not handle request");
    const result = await response;
    await Promise.all(waits);
    return result;
  }

  function isHandled(request: Request) {
    let handled = false;
    listeners.get("fetch")?.({
      request,
      respondWith() {
        handled = true;
      },
      waitUntil() {},
    });
    return handled;
  }

  return {
    dispatch,
    entries,
    isHandled,
    get networkCalls() {
      return networkCalls;
    },
    setNetworkResponse(body: string) {
      networkResponse = new Response(body);
    },
    setOffline(value: boolean) {
      offline = value;
    },
  };
}

describe("service worker caching", () => {
  test("refreshes navigations and falls back to the cached page offline", async () => {
    const harness = createHarness();
    const url = "https://pdfcmprs.test/compress-pdf";
    harness.entries.set(url, new Response("old"));
    harness.setNetworkResponse("fresh");

    const online = await harness.dispatch(navigationRequest(url));
    expect(await online.text()).toBe("fresh");
    expect(await harness.entries.get(url)?.clone().text()).toBe("fresh");

    harness.setOffline(true);
    const offline = await harness.dispatch(navigationRequest(url));
    expect(await offline.text()).toBe("fresh");
  });

  test("keeps hashed Next.js assets cache-first", async () => {
    const harness = createHarness();
    const url = "https://pdfcmprs.test/_next/static/chunks/app.js";
    harness.entries.set(url, new Response("cached"));
    harness.setNetworkResponse("network");

    const response = await harness.dispatch(new Request(url));
    expect(await response.text()).toBe("cached");
    expect(harness.networkCalls).toBe(0);
  });

  test("serves public assets immediately while refreshing their cache", async () => {
    const harness = createHarness();
    const url = "https://pdfcmprs.test/wasm/engine.wasm";
    harness.entries.set(url, new Response("cached"));
    harness.setNetworkResponse("updated");

    const response = await harness.dispatch(new Request(url));
    expect(await response.text()).toBe("cached");
    expect(await harness.entries.get(url)?.text()).toBe("updated");
  });

  test("leaves byte-range requests to the network", () => {
    const harness = createHarness();
    const request = new Request("https://pdfcmprs.test/wasm/engine.wasm", {
      headers: { Range: "bytes=0-1023" },
    });

    expect(harness.isHandled(request)).toBe(false);
    expect(harness.networkCalls).toBe(0);
  });
});
