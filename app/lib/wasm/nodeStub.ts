/**
 * Empty stand-in for Node built-ins that engine bundles reference but never
 * call in the browser. coherentpdf ships js_of_ocaml output whose file-channel
 * constructor does `require("fs")`; nothing on the browser path constructs it,
 * so an empty module is enough to let the bundler resolve the import.
 */
export default {};
