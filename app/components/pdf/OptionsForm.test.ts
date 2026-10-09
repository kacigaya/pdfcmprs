import { expect, test } from "bun:test";
import { validateOptionValues, type OptionField } from "./OptionsForm";

const fields: OptionField[] = [
  { kind: "number", name: "count", label: "Count", default: 1, min: 1, max: 100, step: 1 },
  { kind: "number", name: "angle", label: "Angle", default: 5, min: -359, max: 359, step: 0.1 },
];

test("tool options enforce finite values, bounds, and integer steps before execution", () => {
  for (const count of [0, 101, 1.5, Infinity, NaN]) {
    expect(validateOptionValues(fields, { count, angle: 5 })).not.toBeNull();
  }
  expect(validateOptionValues(fields, { count: 2, angle: 5.3 })).toBeNull();
  expect(validateOptionValues(fields, { count: 2, angle: 5.35 })).not.toBeNull();
  expect(validateOptionValues([
    { kind: "number", name: "size", label: "Font size", default: 10, min: 1 },
  ], { size: 10.5 })).toBeNull();
});
