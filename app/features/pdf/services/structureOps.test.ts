import { expect, test } from "bun:test";
import { PDFDocument } from "pdf-lib";
import { addAttachments, extractAttachments } from "./structureOps";

test("embedded attachments retain Unicode filenames and payloads through ZIP extraction", async () => {
  const doc = await PDFDocument.create();
  doc.addPage();
  const input = new File([await doc.save() as BlobPart], "source.pdf");
  const attached = await addAttachments(input, [new File(["private attachment"], "résumé.txt")]);
  const result = await extractAttachments(new File([attached.blob], attached.filename));
  const bytes = new Uint8Array(await result.blob.arrayBuffer());
  const view = new DataView(bytes.buffer);
  const nameLength = view.getUint16(26, true);
  const extraLength = view.getUint16(28, true);
  const dataLength = view.getUint32(18, true);
  const dataStart = 30 + nameLength + extraLength;
  expect(new TextDecoder().decode(bytes.subarray(30, 30 + nameLength))).toBe("résumé.txt");
  expect(new TextDecoder().decode(bytes.subarray(dataStart, dataStart + dataLength))).toBe("private attachment");
  expect(result.count).toBe(1);
});
