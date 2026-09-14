import { createHmac, timingSafeEqual } from "node:crypto";
import { getStore } from "@netlify/blobs";

function verifyDownloadToken(token: string): { sessionId: string } | null {
  const secret = process.env.DOWNLOAD_TOKEN_SECRET as string;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;

  const expectedSig = createHmac("sha256", secret).update(payload).digest("base64url");
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }

  const { sessionId, exp } = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  if (typeof exp !== "number" || Date.now() > exp) return null;
  return { sessionId };
}

export default async (req: Request) => {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  if (!token) return new Response("Missing token", { status: 400 });

  const claims = verifyDownloadToken(token);
  if (!claims) {
    return new Response("Invalid or expired download link. Go back to your order confirmation page to get a fresh one.", {
      status: 403,
    });
  }

  const store = getStore("ebooks");
  const file = await store.get("couch-to-hyrox", { type: "arrayBuffer" });
  if (!file) {
    return new Response("E-book file not found — has it been uploaded to the blob store yet?", { status: 500 });
  }

  return new Response(file, {
    status: 200,
    headers: {
      "Content-Type": "application/epub+zip",
      "Content-Disposition": 'attachment; filename="Couch-to-Hyrox.epub"',
    },
  });
};
