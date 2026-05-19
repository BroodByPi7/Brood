const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

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
 * Verifies the charge by re-fetching it from the Omise API.
 *
 * Register in Omise dashboard → Webhooks:
 *   URL: https://omiseWebhook-REGION-PROJECTID.cloudfunctions.net/omiseWebhook
 *   Events: charge.complete
 */
exports.omiseWebhook = onRequest(
  { secrets: [OMISE_SECRET], cors: false },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).send("Method not allowed.");
      return;
    }

    const event = req.body;
    const chargeId = event.data && event.data.id;
    const metadata = event.data && event.data.metadata;

    if (!chargeId || !metadata || !metadata.orderId) {
      res.status(400).send("Missing charge ID or order ID in webhook.");
      return;
    }

    // Verify by re-fetching the charge from Omise to confirm it's really paid
    try {
      const omise = require("omise")({ secretKey: OMISE_SECRET.value() });
      const charge = await omise.charges.retrieve(chargeId);

      if (charge.status !== "successful") {
        console.warn("Charge " + chargeId + " status is " + charge.status + " — not marking paid.");
        res.status(200).send("Charge not yet successful.");
        return;
      }

      const orderId = metadata.orderId;
      await db.collection("orders").doc(orderId).update({
        status: "paid",
        paidAt: admin.firestore.FieldValue.serverTimestamp(),
        omiseChargeId: chargeId,
      });
      console.log("Order " + orderId + " marked paid via Omise webhook.");
    } catch (err) {
      console.error("Omise webhook verification failed:", err.message);
      res.status(500).send("Verification failed.");
      return;
    }

    res.status(200).send("OK");
  }
);

/**
 * Daily at midnight (Asia/Bangkok), archive confirmed/paid orders
 * whose pickup date has passed.
 */
exports.dailyArchiveOrders = onSchedule(
  { schedule: "0 0 * * *", timeZone: "Asia/Bangkok" },
  async () => {
    const today = new Date();
    const todayStr = today.getFullYear() + "-"
      + String(today.getMonth() + 1).padStart(2, "0") + "-"
      + String(today.getDate()).padStart(2, "0");

    const snap = await db.collection("orders")
      .where("status", "in", ["confirmed", "paid"])
      .get();

    let count = 0;
    const batch = db.batch();

    snap.forEach((doc) => {
      const data = doc.data();
      if (data.date && data.date < todayStr) {
        batch.update(doc.ref, { status: "archived", archivedAt: admin.firestore.FieldValue.serverTimestamp() });
        count++;
      }
    });

    if (count > 0) await batch.commit();
    console.log("Archived " + count + " orders at midnight.");
  }
);

const GMAIL_EMAIL = defineSecret("GMAIL_EMAIL");
const GMAIL_APP_PASSWORD = defineSecret("GMAIL_APP_PASSWORD");

/**
 * Sends a confirmation email when an order status changes to "paid".
 */
exports.onOrderPaid = onDocumentUpdated(
  {
    document: "orders/{orderId}",
    secrets: [GMAIL_EMAIL, GMAIL_APP_PASSWORD],
  },
  async (event) => {
    const before = event.data.before.data();
    const after = event.data.after.data();

    if (!before || !after) return;
    if (before.status === "paid" || after.status !== "paid") return;

    const order = after;
    const customerEmail = order.customerContact && order.customerContact.includes("@")
      ? order.customerContact
      : null;
    if (!customerEmail) {
      console.log("No email in customerContact, skipping email for order", event.params.orderId);
      return;
    }

    const items = (order.items || [])
      .map((i) => `${i.qty}× ${i.name}${i.type ? " (" + i.type + ")" : ""}`)
      .join("<br>");

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: GMAIL_EMAIL.value(),
        pass: GMAIL_APP_PASSWORD.value(),
      },
    });

    const mailOptions = {
      from: GMAIL_EMAIL.value(),
      to: customerEmail,
      subject: "Your Brood order is confirmed and paid!",
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto">
          <h2 style="color:#073f9e">Thank you for your order!</h2>
          <p>Hi ${order.customerName || ""},</p>
          <p>Your order has been paid. See you at the shop!</p>
          <table style="width:100%;border-collapse:collapse;margin:1rem 0">
            <tr><td style="padding:0.4rem 0;font-weight:700">Date</td><td>${order.date || "—"}</td></tr>
            <tr><td style="padding:0.4rem 0;font-weight:700">Time</td><td>${order.time || "—"}</td></tr>
            <tr><td style="padding:0.4rem 0;font-weight:700">Items</td><td>${items}</td></tr>
            <tr><td style="padding:0.4rem 0;font-weight:700">Total</td><td>$${(order.total || 0).toFixed(2)} USD</td></tr>
            ${order.notes ? `<tr><td style="padding:0.4rem 0;font-weight:700">Notes</td><td>${order.notes}</td></tr>` : ""}
          </table>
          <p style="color:#48618b;font-size:0.85rem">Brood Bakery — broodbypi7@gmail.com</p>
        </div>
      `,
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log("Confirmation email sent to", customerEmail);
    } catch (err) {
      console.error("Failed to send email:", err.message);
    }
  }
);
