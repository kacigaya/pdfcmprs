/**
 * Registers a DOM on the global scope so React hooks can be exercised under
 * `bun test`. Loaded via the [test].preload entry in bunfig.toml.
 */
import { GlobalRegistrator } from "@happy-dom/global-registrator";

GlobalRegistrator.register();

// React 19 checks this before allowing act() to flush updates in tests.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;
