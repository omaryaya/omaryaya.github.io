import { getStore } from "@netlify/blobs";

// One-time/admin endpoint: pushes the e-book file's bytes into Netlify Blobs
// so it never has to live in this (public) git repo. Protected by a shared
// secret rather than a full auth system since it's only ever called by you,
// once, after each deploy where the file changes.
export default async (req: Request) => {
  if (req.method !== "PUT" && req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const adminSecret = process.env.ADMIN_UPLOAD_SECRET;
  if (!adminSecret || req.headers.get("x-admin-secret") !== adminSecret) {
    return new Response("Unauthorized", { status: 401 });
  }

  const bytes = await req.arrayBuffer();
  if (bytes.byteLength === 0) {
    return new Response("Empty request body", { status: 400 });
  }

  const store = getStore("ebooks");
  await store.set("couch-to-hyrox", bytes);

  return new Response(JSON.stringify({ ok: true, bytesStored: bytes.byteLength }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
