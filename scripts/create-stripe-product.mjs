// One-time setup script: creates the Stripe product + price for the e-book.
// Run locally once (re-run only if you need to change price/description —
// Stripe prices are immutable, so a price change creates a new price and
// you'll need to update STRIPE_PRICE_ID in Netlify afterwards).
//
// PowerShell:
//   $env:STRIPE_SECRET_KEY="sk_test_..."; node scripts/create-stripe-product.mjs
import Stripe from "stripe";

const secretKey = process.env.STRIPE_SECRET_KEY;
if (!secretKey) {
  console.error("Set STRIPE_SECRET_KEY before running this script.");
  process.exit(1);
}

const stripe = new Stripe(secretKey);

const product = await stripe.products.create(
  {
    name: "Couch to Hyrox (e-book)",
    description: "The Ultimate 3-Month Guide to Your First Race",
    // Digital e-book tax code — required for Managed Payments eligibility.
    tax_code: "txcd_10103100",
    default_price_data: {
      unit_amount: 93, // EUR 0.93
      currency: "eur",
    },
  },
  { apiVersion: "2026-02-25.preview" }
);

console.log("Product created:", product.id);
console.log("Price created:", product.default_price);
console.log("\nSet this in your Netlify environment variables:");
console.log(`STRIPE_PRICE_ID=${product.default_price}`);
