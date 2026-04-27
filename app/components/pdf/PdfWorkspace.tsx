"use client";

import {
  type ToolId,
  usePdfWorkspace,
} from "../../features/pdf/hooks/usePdfWorkspace";
import { CompressPanel } from "./panels/CompressPanel";
import { MergePanel } from "./panels/MergePanel";
import { SplitPanel } from "./panels/SplitPanel";
import { ResultCard } from "./ResultCard";

interface ToolDefinition {
  id: ToolId;
  numeral: string;
  label: string;
  subtitle: string;
}

const tools: ReadonlyArray<ToolDefinition> = [
  {
    id: "compress",
    numeral: "I",
    label: "Compress",
    subtitle: "Reduce file size",
  },
  {
    id: "merge",
    numeral: "II",
    label: "Merge",
    subtitle: "Combine multiple PDFs",
  },
  { id: "split", numeral: "III", label: "Split", subtitle: "Extract pages" },
];

export function PdfWorkspace() {
  const workspace = usePdfWorkspace();
  const activeTool = tools.find((tool) => tool.id === workspace.tool);
  const sectionRoman = activeTool?.numeral ?? "—";

  return (
    <>
      <header className="masthead">
        <h1 className="masthead-title">
          pdf<em>cmprs</em>
        </h1>
        <div className="masthead-bottom">
          <p className="masthead-tagline">
            A typeset press to <em>compress</em>, <em>merge</em>, and{" "}
            <em>split</em> your PDFs no server, fully in the browser.
          </p>
        </div>
      </header>

      <nav className="toc" aria-label="Outils PDF">
        {tools.map((tool) => (
          <button
            key={tool.id}
            type="button"
            className="toc-item"
            data-active={workspace.tool === tool.id}
            onClick={() => workspace.setTool(tool.id)}
            data-testid={`tab-${tool.id}`}
          >
            <span className="toc-numeral">{tool.numeral}.</span>
            <span className="toc-text">
              <span className="toc-label">{tool.label}</span>
              <span className="toc-sub">{tool.subtitle}</span>
            </span>
          </button>
        ))}
      </nav>

      <div className="workspace">
        <div>
          {workspace.tool === "compress" ? (
            <CompressPanel workspace={workspace} />
          ) : null}
          {workspace.tool === "merge" ? (
            <MergePanel workspace={workspace} />
          ) : null}
          {workspace.tool === "split" ? (
            <SplitPanel workspace={workspace} />
          ) : null}
        </div>
        <ResultCard
          status={workspace.status}
          progress={workspace.progress}
          result={workspace.result}
          isRunning={workspace.isRunning}
        />
      </div>

      <footer className="colophon">
        <span>Processed client-side · No server upload</span>
        <span>
          <a
            href="https://github.com/kacigaya/pdfcmprs"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
          {" · "}
          <em>pdfcmprs</em> · {new Date().getFullYear()}
        </span>
      </footer>
    </>
  );
}
