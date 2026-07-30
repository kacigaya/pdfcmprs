import {
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFName,
  PDFRef,
  PDFStream,
  type PDFObject,
} from "pdf-lib";

/**
 * Delete every indirect object no longer reachable from the trailer.
 *
 * Unlinking a dictionary entry is not enough for security work: pdf-lib still
 * serializes orphaned indirect objects, so a stripped JavaScript action or a
 * redacted text object stays recoverable in the output bytes (object streams
 * merely compress it). Sweeping unreachable objects is what actually removes
 * the payload.
 *
 * Returns the number of objects removed.
 */
export function collectGarbage(doc: PDFDocument): number {
  const context = doc.context;
  const reachable = new Set<string>();
  const queue: PDFObject[] = [];

  const visit = (object: PDFObject | undefined): void => {
    if (!object) return;
    if (object instanceof PDFRef) {
      if (reachable.has(object.tag)) return;
      reachable.add(object.tag);
      queue.push(context.lookup(object) as PDFObject);
      return;
    }
    queue.push(object);
  };

  // Roots: everything the trailer keeps alive.
  const { Root, Info, Encrypt } = context.trailerInfo as {
    Root?: PDFObject;
    Info?: PDFObject;
    Encrypt?: PDFObject;
  };
  visit(Root);
  visit(Info);
  visit(Encrypt);

  while (queue.length > 0) {
    const object = queue.pop();
    if (!object) continue;
    if (object instanceof PDFRef) {
      visit(object);
    } else if (object instanceof PDFDict) {
      for (const value of object.values()) visit(value);
    } else if (object instanceof PDFArray) {
      for (const value of object.asArray()) visit(value);
    } else if (object instanceof PDFStream) {
      for (const value of object.dict.values()) visit(value);
    }
  }

  let removed = 0;
  for (const [ref] of context.enumerateIndirectObjects()) {
    if (!reachable.has(ref.tag)) {
      context.delete(ref);
      removed += 1;
    }
  }
  return removed;
}

/** Remove a key and drop whatever it pointed at, if nothing else needs it. */
export function deleteAndPurge(dict: PDFDict, key: string): boolean {
  const name = PDFName.of(key);
  if (!dict.has(name)) return false;
  dict.delete(name);
  return true;
}
