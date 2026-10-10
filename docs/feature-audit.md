# Feature audit, 2026-10-10

The audit started with 117 registered tools and retained 104 after removing 13
unavailable or unstable converters. It covers shared upload/run/download paths,
catalog navigation, settings, theme controls, metadata, security headers, and
offline behavior. Browser processing uses representative fixtures and alternate
options; route checks cover every registered tool. This establishes working
processing paths, rather than fidelity for every document a tool can accept.

| Tool category | Retained routes |
| --- | ---: |
| Secure & Optimize | 21 |
| Organize | 19 |
| Convert from PDF | 20 |
| Convert to PDF | 20 |
| Edit | 22 |
| Automate | 2 |

## Repairs

| Area | Failure | Repair |
| --- | --- | --- |
| PDF editor redaction | Black overlays left the underlying image pixels recoverable. Annotations could also paint over a mask. | Flatten annotations before editing, then rasterize the masked result. Regression checks inspect embedded image pixels and extracted text. |
| Sanitization | Scripts in form fields and action chains, and page attachment payloads, survived catalog-only cleanup. | Traverse PDF dictionaries and arrays, unlink active content and attachments, then remove unreachable objects. Preserve ordinary forms. |
| Document conversion | Five legacy formats failed; eight Office formats worked after initialization but stalled in fresh sessions. | Remove all 13 affected catalog entries, accepted extensions, the Office dependency, and its asset-copy path. Former routes return 404. Keep five verified ebook/document converters and reject unsupported formats before loading an engine. |
| Encryption and engine failures | 128-bit encryption selected RC4, and empty or partial engine output could be offered for download. | Preserve AES-only encryption and request AES explicitly for 128-bit output. Accept only successful exits with nonempty output, including qpdf's documented warning exit. |
| Attachment extraction | coherentpdf returned a wrapped string instead of a JavaScript filename. | Decode wrapped filenames with `toUtf16`; test Unicode names and attachment payloads through ZIP extraction. |
| ZIP downloads | Duplicate names overwrote files during extraction; Unicode names lacked the UTF-8 flag. | Disambiguate names, flag UTF-8, reject unsafe extraction paths, and enforce classic ZIP limits. Preserve Office package directory paths. |
| Custom rotation | Content moved outside the output page; blank, cropped, and already rotated pages behaved incorrectly. | Normalize visible bounds, include existing rotation, and translate all transformed corners into the output page. |
| Numeric and structured inputs | Invalid counts and unsupported workflow steps reached processing; a shared validator rejected valid decimal dimensions. | Validate finite values, limits, and explicit steps. Declare integer steps on counters and grids; preserve fractional sizes and margins. Validate editor geometry and workflow steps. |
| Result state | Reordering merge inputs and navigating between tools retained an earlier download. Validation failures could retain a successful result. | Clear results on reorder, remount the tool state on route changes, and clear results on validation failure. Lock file changes during processing. |
| Pickers and passwords | Document and attachment dialogs advertised PDF-only inputs. Password fields exposed plaintext; cancelling a preview password could leave loading pending. | Match accepted types to the tool, mask passwords with appropriate autocomplete, and destroy cancelled or failed PDF loading tasks. |
| Text extraction | Page headings made an empty or scanned PDF look like successful text extraction. | Require actual selectable text and report an error otherwise. |
| Labels, settings, and metadata | Labels began at zero. Theme shortcuts ignored settings, labels drifted, inherited language keys were accepted, and Settings inherited the home canonical. | Use positive page-label starts, respect shortcut preferences, synchronize theme labels and settings events, validate language own keys, and add Settings metadata. |

## Validation

- `bun run check`: TypeScript, 231 unit tests across 24 files, and the production
  build passed.
- `bun run test:e2e` against the production server: 121 Chromium tests passed
  without skips, covering all 104 routes, processing families, and regressions.
- `bun install --frozen-lockfile`: passed with the final dependency graph.
- A 390px browser session verified no horizontal overflow, service-worker cache
  migration from v3 to v4, cross-origin isolation, and compression after an
  offline reload. No browser errors occurred.
- A static export with `/pdfcmprs` as the base path passed. Settings uses the
  prefixed canonical URL; retired routes and Office engine assets are absent.
- Local and external diff review found no unresolved critical, high, or medium
  defects.

## Dependency scan and limitations

The full public lockfile scan queried OSV for 240 exact package versions. Updates
addressed reported vulnerabilities in Next.js, sharp, baseline-browser-mapping,
and source-map-js without adding production dependencies.

Office conversion is removed because fresh-session startup was unreliable in
ARM Chromium, despite successful conversions with a loaded engine. Reintroduce
it when initialization and first imports pass independently from fresh sessions.
XPS, EPUB, MOBI, FB2, and CBZ produce valid PDFs in the retained browser engine.

`node-forge@1.4.0`, used by the signing dependency, remains affected by
[GHSA-86w9-cpqp-85rv](https://osv.dev/vulnerability/GHSA-86w9-cpqp-85rv).
Aliases include CVE-2026-33894, CVE-2026-85393, and GHSA-ppp5-5v6c-4jwp. OSV lists
no fixed release range. Its supplied CVSS 3.1 vector is
`CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:H/A:N`. The affected behavior is RSA PKCS#1
v1.5 signature verification accepting nested DigestAlgorithm elements. Replace
the dependency or update it when a patched release becomes available; this audit
does not claim a vulnerability-free dependency graph.

Signature inspection checks byte-range structure, including overlap and file
coverage. It does not verify cryptographic signatures or certificate trust.
Editor redactions replace text, vectors, and forms with raster images and can
increase file size. Browser memory still bounds document size. Timestamping
requires a reachable authority permitted by the deployed CSP. Chromium coverage
does not establish behavior in Safari or Firefox.
