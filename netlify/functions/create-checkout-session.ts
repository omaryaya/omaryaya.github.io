import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

// Stripe's Managed Payments feature is a preview API as of this writing
// (stripe-version 2026-02-25.preview). Its fields aren't in the published
// stripe-node types yet, so we cast the request options rather than guess
// at a type name that may not exist.
const MANAGED_PAYMENTS_API_VERSION = "2026-02-25.preview";

export default async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const priceId = process.env.STRIPE_PRICE_ID;
  if (!priceId) {
    return new Response("Server misconfigured: STRIPE_PRICE_ID is not set", { status: 500 });
  }

  const origin = process.env.URL || new URL(req.url).origin;

  try {
    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${origin}/hyrox-ebook/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/hyrox-ebook?cancelled=1`,
        // Stripe acts as merchant of record and handles global tax
        // collection/remittance for this sale. Requires the product to have
        // an eligible tax_code (set in scripts/create-stripe-product.mjs).
        managed_payments: { enabled: true },
      } as any,
      { apiVersion: MANAGED_PAYMENTS_API_VERSION } as any
    );

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("create-checkout-session failed", err);
    return new Response(JSON.stringify({ error: "Could not create checkout session" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
