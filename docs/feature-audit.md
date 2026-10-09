# Feature audit — 2026-10-09

The audit covers the 117 registered tools, shared upload/run/download paths,
catalog navigation, settings, theme controls, metadata, security headers, and
offline behavior. Browser processing uses representative fixtures and alternate
options; route checks cover every registered tool. This establishes working
processing paths, rather than fidelity for every document a tool can accept.

| Tool category | Routes audited |
| --- | ---: |
| Secure & Optimize | 21 |
| Organize | 19 |
| Convert from PDF | 20 |
| Convert to PDF | 33 |
| Edit | 22 |
| Automate | 2 |

## Repairs

| Area | Failure | Repair |
| --- | --- | --- |
| PDF editor redaction | Black overlays left the underlying image pixels recoverable. Annotations could also paint over a mask. | Flatten annotations before editing, then rasterize the masked result. Regression checks inspect embedded image pixels and extracted text. |
| Sanitization | Scripts in form fields and action chains, and page attachment payloads, survived catalog-only cleanup. | Traverse PDF dictionaries and arrays, unlink active content and attachments, then remove unreachable objects. Preserve ordinary forms. |
| Office conversion | The document CSP also applied to LibreOffice workers, blocking their generated function bindings. | Allow string evaluation only on the engine asset responses. Refresh the service-worker cache to remove assets with old headers. Keep the main document CSP restricted and remove the ARM browser-test bypass. |
| Encryption and engine failures | 40-bit and 128-bit commands failed or selected the wrong cipher. Empty or partial output could still be offered for download. | Explicitly enable legacy RC4 for 40-bit and AES for 128-bit. Accept only successful exits with nonempty output, including qpdf's documented warning exit. |
| Attachment extraction | coherentpdf returned a wrapped string instead of a JavaScript filename. | Decode wrapped filenames with `toUtf16`; test Unicode names and attachment payloads through ZIP extraction. |
| ZIP downloads | Duplicate names overwrote files during extraction; Unicode names lacked the UTF-8 flag. | Disambiguate names, flag UTF-8, reject unsafe extraction paths, and enforce classic ZIP limits. Preserve Office package directory paths. |
| Custom rotation | Content moved outside the output page; blank, cropped, and already rotated pages behaved incorrectly. | Normalize visible bounds, include existing rotation, and translate all transformed corners into the output page. |
| Numeric and structured inputs | Invalid counts and unsupported workflow steps reached processing; a shared validator rejected valid decimal dimensions. | Validate finite values, limits, and explicit steps. Declare integer steps on counters and grids; preserve fractional sizes and margins. Validate editor geometry and workflow steps. |
| Result state | Reordering merge inputs and navigating between tools retained an earlier download. Validation failures could retain a successful result. | Clear results on reorder, remount the tool state on route changes, and clear results on validation failure. Lock file changes during processing. |
| Pickers and passwords | Document and attachment dialogs advertised PDF-only inputs. Password fields exposed plaintext; cancelling a preview password could leave loading pending. | Match accepted types to the tool, mask passwords with appropriate autocomplete, and destroy cancelled or failed PDF loading tasks. |
| Text extraction | Page headings made an empty or scanned PDF look like successful text extraction. | Require actual selectable text and report an error otherwise. |
| Labels, settings, and metadata | Labels began at zero. Theme shortcuts ignored settings, labels drifted, inherited language keys were accepted, and Settings inherited the home canonical. | Use positive page-label starts, respect shortcut preferences, synchronize theme labels and settings events, validate language own keys, and add Settings metadata. |

## Validation

Final validation results are recorded before the PR is opened.

## Dependency scan and limitations

The full public lockfile scan queried OSV for 244 exact package versions. Updates
addressed reported vulnerabilities in Next.js, sharp, baseline-browser-mapping,
and source-map-js without adding production dependencies.

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
