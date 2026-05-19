const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const Stripe = require("stripe");

admin.initializeApp();
const db = admin.firestore();

const STRIPE_SECRET = defineSecret("STRIPE_SECRET");
const STRIPE_WEBHOOK_SECRET = defineSecret("STRIPE_WEBHOOK_SECRET");

exports.createCheckoutSession = onCall(
  { secrets: [STRIPE_SECRET], cors: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "You must be signed in to pay.");
    }

    const orderId = request.data.orderId;
    if (!orderId) {
      throw new HttpsError("invalid-argument", "Missing orderId.");
    }

    const orderSnap = await db.collection("orders").doc(orderId).get();
    if (!orderSnap.exists) {
      throw new HttpsError("not-found", "Order not found.");
    }

    const order = orderSnap.data();

    if (order.customerId !== request.auth.uid) {
      throw new HttpsError("permission-denied", "This order does not belong to you.");
    }

    if (order.status !== "confirmed") {
      throw new HttpsError("failed-precondition", "Order is not yet confirmed.");
    }

    const stripe = Stripe(STRIPE_SECRET.value());

    const lineItems = (order.items || []).map((item) => ({
      price_data: {
        currency: "usd",
        product_data: { name: item.name + (item.type ? " (" + item.type + ")" : "") },
        unit_amount: Math.round(item.price * 100),
      },
      quantity: item.qty || 1,
    }));

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: lineItems,
      metadata: { orderId, customerId: request.auth.uid },
      success_url: request.data.origin + "/Brood/?payment=success&order=" + orderId,
      cancel_url: request.data.origin + "/Brood/?payment=cancelled",
    });

    return { url: session.url };
  }
);

exports.stripeWebhook = onRequest(
  { secrets: [STRIPE_WEBHOOK_SECRET] },
  async (req, res) => {
    const sig = req.headers["stripe-signature"];
    if (!sig) {
      res.status(400).send("Missing stripe-signature header.");
      return;
    }

    const stripe = Stripe(STRIPE_SECRET.value());

    let event;
    try {
      event = stripe.webhooks.constructEvent(
        req.rawBody,
        sig,
        STRIPE_WEBHOOK_SECRET.value()
      );
    } catch (err) {
      console.error("Webhook signature verification failed:", err.message);
      res.status(400).send("Webhook signature verification failed.");
      return;
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const orderId = session.metadata.orderId;

      if (orderId) {
        await db.collection("orders").doc(orderId).update({
          status: "paid",
          paidAt: admin.firestore.FieldValue.serverTimestamp(),
          stripeSessionId: session.id,
        });
        console.log("Order " + orderId + " marked paid.");
      }
    }

    res.status(200).send("OK");
  }
);
