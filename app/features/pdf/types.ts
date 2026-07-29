export type StatusTone = "idle" | "info" | "success" | "error";

export interface WorkspaceStatus {
  tone: StatusTone;
  message: string;
}

export interface DetailItem {
  label: string;
  value: string;
}

export interface WorkspaceResult {
  blob?: Blob;
  filename: string;
  description?: string;
  details?: DetailItem[];
  text?: string;
}

/** What a tool task resolves to: a result plus the success line to announce. */
export interface ToolOutcome extends WorkspaceResult {
  message?: string;
}

/** Services report real progress (0-100) through this instead of faking steps. */
export type ProgressReporter = (percent: number) => void;
