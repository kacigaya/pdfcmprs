"use client";

import { useCallback, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type OptionValue = string | number | boolean;
export type OptionValues = Record<string, OptionValue>;

interface FieldBase {
  name: string;
  label: string;
  hint?: string;
  /** Hide this field unless the predicate passes. Used for dependent options. */
  visibleWhen?: (values: OptionValues) => boolean;
}

export type OptionField =
  | (FieldBase & {
      kind: "select";
      options: ReadonlyArray<{ label: string; value: string }>;
      default: string;
    })
  | (FieldBase & {
      kind: "number";
      default: number;
      min?: number;
      max?: number;
      step?: number;
    })
  | (FieldBase & {
      kind: "text";
      default: string;
      placeholder?: string;
      mono?: boolean;
    })
  | (FieldBase & {
      kind: "password";
      default: string;
      placeholder?: string;
    })
  | (FieldBase & {
      kind: "textarea";
      default: string;
      placeholder?: string;
      mono?: boolean;
      rows?: number;
    })
  | (FieldBase & { kind: "checkbox"; default: boolean })
  | (FieldBase & { kind: "color"; default: string });

const LABEL_CLASS_NAME =
  "font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground";

const HINT_CLASS_NAME =
  "font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground/80";

export function defaultOptionValues(
  fields: ReadonlyArray<OptionField>,
): OptionValues {
  const values: OptionValues = {};
  for (const field of fields) values[field.name] = field.default;
  return values;
}

/** Option state for a tool panel, seeded from the field defaults. */
export function useOptions(fields: ReadonlyArray<OptionField>) {
  const initial = useMemo(() => defaultOptionValues(fields), [fields]);
  const [values, setValues] = useState<OptionValues>(initial);

  const setValue = useCallback((name: string, value: OptionValue) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  }, []);

  const reset = useCallback(() => setValues(initial), [initial]);

  return { values, setValue, reset };
}

interface OptionsFormProps {
  fields: ReadonlyArray<OptionField>;
  values: OptionValues;
  onChange: (name: string, value: OptionValue) => void;
  disabled?: boolean;
  className?: string;
}

export function OptionsForm({
  fields,
  values,
  onChange,
  disabled,
  className,
}: OptionsFormProps) {
  const visible = fields.filter(
    (field) => !field.visibleWhen || field.visibleWhen(values),
  );
  if (visible.length === 0) return null;

  return (
    <div className={cn("mt-6 grid gap-4 sm:grid-cols-2", className)}>
      {visible.map((field) => {
        const id = `option-${field.name}`;
        return (
          <div
            key={field.name}
            className={cn(
              "grid gap-1.5",
              (field.kind === "checkbox" || field.kind === "textarea") &&
                "sm:col-span-2",
            )}
          >
            {field.kind === "checkbox" ? (
              <Label
                htmlFor={id}
                className="flex cursor-pointer items-center gap-2.5 text-sm normal-case"
              >
                <input
                  id={id}
                  type="checkbox"
                  disabled={disabled}
                  checked={Boolean(values[field.name])}
                  onChange={(event) =>
                    onChange(field.name, event.target.checked)
                  }
                  className="size-4 shrink-0 cursor-pointer rounded-xs border border-input accent-primary"
                  data-testid={id}
                />
                {field.label}
              </Label>
            ) : (
              <>
                <Label htmlFor={id} className={LABEL_CLASS_NAME}>
                  {field.label}
                </Label>
                {field.kind === "select" ? (
                  <Select
                    items={field.options as { label: string; value: string }[]}
                    value={String(values[field.name])}
                    disabled={disabled}
                    onValueChange={(value) =>
                      value !== null && onChange(field.name, value)
                    }
                  >
                    <SelectTrigger id={id} data-testid={id}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectPopup>
                      {field.options.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectPopup>
                  </Select>
                ) : null}
                {field.kind === "number" ? (
                  <Input
                    id={id}
                    type="number"
                    nativeInput
                    disabled={disabled}
                    min={field.min}
                    max={field.max}
                    step={field.step}
                    className="font-mono"
                    value={String(values[field.name])}
                    onChange={(event) => {
                      const parsed = Number(event.target.value);
                      onChange(
                        field.name,
                        Number.isFinite(parsed) ? parsed : field.default,
                      );
                    }}
                    data-testid={id}
                  />
                ) : null}
                {field.kind === "text" ? (
                  <Input
                    id={id}
                    type="text"
                    disabled={disabled}
                    placeholder={field.placeholder}
                    className={field.mono ? "font-mono" : undefined}
                    value={String(values[field.name])}
                    onValueChange={(value) => onChange(field.name, value)}
                    data-testid={id}
                  />
                ) : null}
                {field.kind === "password" ? (
                  <Input
                    id={id}
                    type="password"
                    nativeInput
                    disabled={disabled}
                    placeholder={field.placeholder}
                    value={String(values[field.name])}
                    onChange={(event) => onChange(field.name, event.target.value)}
                    autoComplete="current-password"
                    data-testid={id}
                  />
                ) : null}
                {field.kind === "textarea" ? (
                  <textarea
                    id={id}
                    disabled={disabled}
                    placeholder={field.placeholder}
                    rows={field.rows ?? 6}
                    className={cn(
                      "w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50",
                      field.mono && "font-mono",
                    )}
                    value={String(values[field.name])}
                    onChange={(event) =>
                      onChange(field.name, event.target.value)
                    }
                    data-testid={id}
                  />
                ) : null}
                {field.kind === "color" ? (
                  <Input
                    id={id}
                    type="color"
                    nativeInput
                    disabled={disabled}
                    className="h-9 [&_input]:h-full [&_input]:cursor-pointer [&_input]:px-1"
                    value={String(values[field.name])}
                    onChange={(event) =>
                      onChange(field.name, event.target.value)
                    }
                    data-testid={id}
                  />
                ) : null}
              </>
            )}
            {field.hint ? <p className={HINT_CLASS_NAME}>{field.hint}</p> : null}
          </div>
        );
      })}
    </div>
  );
}
