import "server-only";
import { randomBytes } from "crypto";
import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import path from "path";

// Local file storage for uploaded images (product photos). Files live under
// UPLOAD_DIR (default ./uploads — a docker volume in production) and are
// served through /api/files/<name>, never from a user-controlled path.

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads");

export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;

// Allowed types, sniffed from magic bytes — the extension/mime the browser
// sends is not trusted.
const SIGNATURES: { ext: string; mime: string; match: (b: Buffer) => boolean }[] = [
  { ext: "jpg", mime: "image/jpeg", match: (b) => b[0] === 0xff && b[1] === 0xd8 },
  {
    ext: "png",
    mime: "image/png",
    match: (b) => b.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47])),
  },
  {
    ext: "webp",
    mime: "image/webp",
    match: (b) =>
      b.subarray(0, 4).toString("ascii") === "RIFF" &&
      b.subarray(8, 12).toString("ascii") === "WEBP",
  },
];

export function sniffImage(buf: Buffer): { ext: string; mime: string } | null {
  if (buf.length < 12) return null;
  const hit = SIGNATURES.find((s) => s.match(buf));
  return hit ? { ext: hit.ext, mime: hit.mime } : null;
}

const SAFE_NAME = /^[a-z0-9-]+\.(jpg|png|webp)$/;

export async function saveImage(buf: Buffer): Promise<string> {
  const kind = sniffImage(buf);
  if (!kind) throw new Error("unsupported_type");
  await mkdir(UPLOAD_DIR, { recursive: true });
  const name = `${randomBytes(12).toString("hex")}.${kind.ext}`;
  await writeFile(path.join(UPLOAD_DIR, name), buf);
  return `/api/files/${name}`;
}

export async function readStoredFile(
  name: string,
): Promise<{ buf: Buffer; mime: string } | null> {
  if (!SAFE_NAME.test(name)) return null;
  try {
    const buf = await readFile(path.join(UPLOAD_DIR, name));
    const kind = sniffImage(buf);
    return { buf, mime: kind?.mime ?? "application/octet-stream" };
  } catch {
    return null;
  }
}

/** Delete a stored file given its public /api/files/<name> url. */
export async function deleteStoredUrl(url: string): Promise<void> {
  const name = url.split("/").pop() ?? "";
  if (!SAFE_NAME.test(name)) return;
  try {
    await unlink(path.join(UPLOAD_DIR, name));
  } catch {
    // Already gone — fine.
  }
}

/** Buffer for a local /api/files url (PDF embedding); null for anything else. */
export async function bufferForStoredUrl(url: string): Promise<Buffer | null> {
  if (!url.startsWith("/api/files/")) return null;
  const file = await readStoredFile(url.split("/").pop() ?? "");
  // pdfkit embeds jpeg/png only.
  if (!file || file.mime === "image/webp") return null;
  return file.buf;
}
