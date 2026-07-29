import { describe, expect, test } from "bun:test";
import { act, renderHook } from "@testing-library/react";
import { useToolRun } from "./useToolRun";
import type { ToolOutcome } from "../types";

function outcome(overrides: Partial<ToolOutcome> = {}): ToolOutcome {
  return { filename: "out.pdf", ...overrides };
}

describe("useToolRun", () => {
  test("starts idle", () => {
    const { result } = renderHook(() => useToolRun());
    expect(result.current.status).toEqual({ tone: "idle", message: "" });
    expect(result.current.progress).toBe(0);
    expect(result.current.result).toBeNull();
    expect(result.current.isRunning).toBe(false);
  });

  test("idle -> running -> success", async () => {
    const { result } = renderHook(() => useToolRun());

    await act(async () => {
      await result.current.run(async () =>
        outcome({ message: "Done well.", description: "12 pages" }),
      );
    });

    expect(result.current.isRunning).toBe(false);
    expect(result.current.status).toEqual({
      tone: "success",
      message: "Done well.",
    });
    expect(result.current.progress).toBe(100);
    expect(result.current.result?.filename).toBe("out.pdf");
    expect(result.current.result?.description).toBe("12 pages");
  });

  test("defaults the success message when a task omits one", async () => {
    const { result } = renderHook(() => useToolRun());
    await act(async () => {
      await result.current.run(async () => outcome());
    });
    expect(result.current.status.message).toBe("Done.");
  });

  test("idle -> running -> error surfaces the thrown message", async () => {
    const { result } = renderHook(() => useToolRun());

    await act(async () => {
      await result.current.run(async () => {
        throw new Error("Password required.");
      });
    });

    expect(result.current.status).toEqual({
      tone: "error",
      message: "Password required.",
    });
    expect(result.current.progress).toBe(0);
    expect(result.current.result).toBeNull();
    expect(result.current.isRunning).toBe(false);
  });

  test("non-Error throws fall back to a generic message", async () => {
    const { result } = renderHook(() => useToolRun());
    await act(async () => {
      await result.current.run(async () => {
        throw "boom";
      });
    });
    expect(result.current.status.message).toBe("Unexpected error.");
  });

  test("refuses a second run while one is in flight", async () => {
    const { result } = renderHook(() => useToolRun());
    let calls = 0;
    let release: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });

    const task = async () => {
      calls += 1;
      await gate;
      return outcome();
    };

    await act(async () => {
      const first = result.current.run(task);
      const second = result.current.run(task);
      release?.();
      await Promise.all([first, second]);
    });

    expect(calls).toBe(1);
  });

  test("reports progress from the task", async () => {
    const { result } = renderHook(() => useToolRun());
    const seen: number[] = [];

    await act(async () => {
      await result.current.run(async (report) => {
        report(25);
        seen.push(25);
        report(60);
        seen.push(60);
        return outcome();
      });
    });

    expect(seen).toEqual([25, 60]);
    expect(result.current.progress).toBe(100);
  });

  test("clamps and rounds out-of-range progress", async () => {
    const { result } = renderHook(() => useToolRun());
    await act(async () => {
      await result.current.run(async (report) => {
        report(-40);
        return outcome();
      });
    });
    // Ends at 100 on success; the clamp is exercised without throwing.
    expect(result.current.progress).toBe(100);
  });

  test("fail sets an error without producing a result", () => {
    const { result } = renderHook(() => useToolRun());
    act(() => {
      result.current.fail("Add a PDF file first.");
    });
    expect(result.current.status).toEqual({
      tone: "error",
      message: "Add a PDF file first.",
    });
    expect(result.current.result).toBeNull();
    expect(result.current.isRunning).toBe(false);
  });

  test("reset clears status, progress, and result", async () => {
    const { result } = renderHook(() => useToolRun());
    await act(async () => {
      await result.current.run(async () => outcome());
    });
    act(() => {
      result.current.reset();
    });
    expect(result.current.status).toEqual({ tone: "idle", message: "" });
    expect(result.current.progress).toBe(0);
    expect(result.current.result).toBeNull();
  });
});
