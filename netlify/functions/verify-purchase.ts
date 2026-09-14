import Stripe from "stripe";
import { createHmac } from "node:crypto";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);
const TOKEN_TTL_MS = 15 * 60 * 1000;
const MANAGED_PAYMENTS_API_VERSION = "2026-02-25.preview";

function signDownloadToken(sessionId: string): string {
  const exp = Date.now() + TOKEN_TTL_MS;
  const payload = Buffer.from(JSON.stringify({ sessionId, exp })).toString("base64url");
  const secret = process.env.DOWNLOAD_TOKEN_SECRET as string;
  const sig = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export default async (req: Request) => {
  const url = new URL(req.url);
  const sessionId = url.searchParams.get("session_id");
  if (!sessionId) {
    return new Response(JSON.stringify({ ok: false, error: "Missing session_id" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    // Retrieved under the same preview API version the session was created
    // with, since Managed Payments fields only exist on that version's shape.
    const session = await stripe.checkout.sessions.retrieve(
      sessionId,
      {},
      { apiVersion: MANAGED_PAYMENTS_API_VERSION } as any
    );

    const priceId = process.env.STRIPE_PRICE_ID;
    const paid = session.payment_status === "paid";

    // Defense in depth: confirm this session actually paid for our e-book
    // price, not just any successful Stripe session someone might supply.
    const lineItems = await stripe.checkout.sessions.listLineItems(sessionId);
    const boughtOurPrice = lineItems.data.some((li) => li.price?.id === priceId);

    if (!paid || !boughtOurPrice) {
      return new Response(JSON.stringify({ ok: false, error: "Payment not confirmed" }), {
        status: 402,
        headers: { "Content-Type": "application/json" },
      });
    }

    const token = signDownloadToken(sessionId);
    return new Response(
      JSON.stringify({
        ok: true,
        downloadUrl: `/.netlify/functions/download-ebook?token=${encodeURIComponent(token)}`,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("verify-purchase failed", err);
    return new Response(JSON.stringify({ ok: false, error: "Could not verify purchase" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
