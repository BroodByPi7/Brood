const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const crypto = require("crypto");

admin.initializeApp();
const db = admin.firestore();

const OMISE_SECRET = defineSecret("OMISE_SECRET");

/**
 * Creates a PromptPay charge via Omise and returns the QR image URL.
 * Called from the client when the user clicks Pay.
 */
exports.createPromptPayCharge = onCall(
  { secrets: [OMISE_SECRET], cors: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "You must be signed in.");
    }

    const orderId = request.data.orderId;
    if (!orderId) throw new HttpsError("invalid-argument", "Missing orderId.");

    const snap = await db.collection("orders").doc(orderId).get();
    if (!snap.exists) throw new HttpsError("not-found", "Order not found.");

    const order = snap.data();
    if (order.customerId !== request.auth.uid) {
      throw new HttpsError("permission-denied", "Not your order.");
    }
    if (order.status !== "confirmed") {
      throw new HttpsError("failed-precondition", "Order not confirmed yet.");
    }

    const omise = require("omise")({ secretKey: OMISE_SECRET.value() });
    const amountSatang = Math.round((order.total || 0) * 100);

    const charge = await omise.charges.create({
      amount: amountSatang,
      currency: "thb",
      source: { type: "promptpay" },
      metadata: { orderId, customerId: request.auth.uid },
    });

    const qrUrl = charge.source && charge.source.scannable_code
      ? charge.source.scannable_code.image.downloadable
      : charge.source && charge.source.instructions
        ? charge.source.instructions.qr_image
        : null;

    await db.collection("orders").doc(orderId).update({
      omiseChargeId: charge.id,
      omiseQrUrl: qrUrl,
    });

    return { qrUrl, chargeId: charge.id };
  }
);

/**
 * Receives the Omise webhook when a payment completes.
 * The webhook URL needs to be registered in the Omise dashboard
 * (e.g. https://REGION-PROJECT.cloudfunctions.net/omiseWebhook).
 * Omise sends a POST with JSON body and X-Omise-Signature header.
 */
exports.omiseWebhook = onRequest(
  { secrets: [OMISE_SECRET], cors: false },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).send("Method not allowed.");
      return;
    }

    // Verify Omise webhook signature
    const signature = req.headers["x-omise-signature"];
    if (!signature) {
      res.status(400).send("Missing X-Omise-Signature header.");
      return;
    }

    const rawBody = typeof req.rawBody === "string" ? req.rawBody : JSON.stringify(req.body);
    const expected = crypto
      .createHmac("sha256", OMISE_SECRET.value())
      .update(rawBody)
      .digest("hex");

    if (signature !== expected) {
      console.warn("Omise webhook signature mismatch");
      res.status(401).send("Invalid signature.");
      return;
    }

    const event = req.body;
    if (event.key === "charge.complete" && event.data) {
      const chargeId = event.data.id;
      const metadata = event.data.metadata || {};
      const orderId = metadata.orderId;

      if (orderId && chargeId) {
        await db.collection("orders").doc(orderId).update({
          status: "paid",
          paidAt: admin.firestore.FieldValue.serverTimestamp(),
          omiseChargeId: chargeId,
        });
        console.log("Order " + orderId + " marked paid via Omise webhook.");
      }
    }

    res.status(200).send("OK");
  }
);
