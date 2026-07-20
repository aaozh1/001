import "server-only";

// PDF text extraction (unpdf = serverless-friendly pdf.js). This reads the
// TEXT LAYER of digital catalogs — scanned-image PDFs have no text layer and
// come back (near-)empty; the API reports that as `no_text` so the UI can
// point the seller to Excel/paste instead of failing silently.
export async function pdfToText(buffer: Buffer): Promise<string> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(pdf, { mergePages: false });
  // Page texts joined with blank lines keeps page furniture separated from
  // product blocks (the extractor works line-by-line).
  return (Array.isArray(text) ? text : [text]).join("\n\n");
}
