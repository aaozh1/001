import { readStoredFile } from "@/lib/files/storage";

// GET /api/files/:name — serve an uploaded image (public: product photos are
// public catalog content). Name is whitelisted server-side; no path traversal.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  const { name } = await params;
  const file = await readStoredFile(name);
  if (!file) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(file.buf), {
    headers: {
      "Content-Type": file.mime,
      // Names are random — content at a name never changes.
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
