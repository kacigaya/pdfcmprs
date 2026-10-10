import { expect, test } from "bun:test";
import { act, renderHook } from "@testing-library/react";
import { useFileList } from "./useFiles";

test("moving uploaded files invalidates the previous result", () => {
  let resets = 0;
  const { result } = renderHook(() => useFileList(() => { resets += 1; }));
  const first = new File(["a"], "a.pdf");
  const second = new File(["b"], "b.pdf");
  act(() => result.current.onFiles([first, second]));
  act(() => result.current.onMove(1, -1));
  expect(result.current.files).toEqual([second, first]);
  expect(resets).toBe(2);
});
