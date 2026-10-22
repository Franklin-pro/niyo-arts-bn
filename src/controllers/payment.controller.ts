import { randomBytes, timingSafeEqual } from "node:crypto";
import { Request, Response } from "express";
import { Order, PaymentAttempt } from "../models/index.js";
import { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import { HttpError } from "../utils/http-error.js";
import { slugParamSchema } from "../validators/catalog.validators.js";

const FLUTTERWAVE_API = "https://api.flutterwave.com/v3";

interface FlutterwaveTransaction {
  id: number | string;
  tx_ref: string;
  status: string;
  currency: string;
  amount: number | string;
}

function secureEquals(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

function requireFlutterwaveSecret(): string {
  const secret = process.env.FLW_SECRET_KEY;
  if (!secret) throw new Error("FLW_SECRET_KEY must be configured.");
  return secret;
}

export async function startFlutterwavePayment(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const { slug: reference } = slugParamSchema.parse({ slug: req.params.reference });
  const order = await Order.findOne({
    where: { reference, userId: req.user!.id },
  });
  if (!order) throw new HttpError(404, "Order not found.");
  if (order.paymentStatus === "successful") {
    throw new HttpError(409, "This order has already been paid.");
  }
  if (order.paymentMethod === "mobile_money" && order.currency !== "RWF") {
    throw new HttpError(400, "Rwanda mobile money checkout requires product prices in RWF.");
  }
  const pendingAttempt = await PaymentAttempt.findOne({
    where: { orderId: order.id, status: "pending" },
    order: [["createdAt", "DESC"]],
  });
  if (pendingAttempt) {
    res.status(200).json({
      data: {
        reference: order.reference,
        paymentReference: pendingAttempt.reference,
        paymentUrl: pendingAttempt.paymentUrl,
      },
    });
    return;
  }

  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  const redirectUrl = new URL("/payment-result", frontendUrl).toString();
  const secret = requireFlutterwaveSecret();
  const paymentReference = `${order.reference}-${randomBytes(6).toString("hex").toUpperCase()}`;
  let response: globalThis.Response;
  try {
    response = await fetch(`${FLUTTERWAVE_API}/payments`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tx_ref: paymentReference,
        amount: Number(order.total),
        currency: order.currency,
        redirect_url: redirectUrl,
        payment_options: order.paymentMethod === "mobile_money" ? "mobilemoneyrwanda" : "card",
        customer: {
          email: order.customerEmail,
          name: order.customerName,
          phonenumber: order.paymentPhone || order.customerPhone,
        },
        customizations: {
          title: "Niyo Arts",
          description: `Order ${order.reference}`,
        },
        meta: { orderReference: order.reference },
      }),
      signal: AbortSignal.timeout(15_000),
    });
  } catch (error) {
    console.error("Flutterwave checkout request failed:", error);
    throw new HttpError(502, "Could not connect to the payment provider.");
  }
  const payload = (await response.json().catch(() => null)) as {
    status?: string;
    data?: { link?: string };
  } | null;
  const paymentUrl = payload?.data?.link;
  let checkoutUrl: URL | null = null;
  if (paymentUrl) {
    try {
      checkoutUrl = new URL(paymentUrl);
    } catch {
      checkoutUrl = null;
    }
  }
  if (
    !response.ok ||
    payload?.status !== "success" ||
    !checkoutUrl ||
    checkoutUrl.protocol !== "https:" ||
    checkoutUrl.hostname !== "checkout.flutterwave.com"
  ) {
    console.error("Flutterwave rejected the checkout request:", payload);
    throw new HttpError(502, "The payment provider could not create checkout.");
  }
  if (!paymentUrl) {
    throw new HttpError(502, "The payment provider did not return a checkout URL.");
  }
  await PaymentAttempt.create({
    orderId: order.id,
    reference: paymentReference,
    paymentUrl,
    status: "pending",
    transactionId: null,
  });
  await order.update({
    paymentProvider: "Flutterwave",
    paymentReference,
    paymentUrl,
    paymentStatus: "pending",
  });
  res.status(200).json({
    data: {
      reference: order.reference,
      paymentReference,
      paymentUrl,
    },
  });
}

async function verifyTransaction(
  transactionId: string,
): Promise<{
  status: "successful" | "failed" | "pending";
  orderReference: string;
}> {
  const response = await fetch(
    `${FLUTTERWAVE_API}/transactions/${encodeURIComponent(transactionId)}/verify`,
    {
      headers: { Authorization: `Bearer ${requireFlutterwaveSecret()}` },
      signal: AbortSignal.timeout(15_000),
    },
  );
  const payload = (await response.json().catch(() => null)) as {
    status?: string;
    data?: FlutterwaveTransaction | null;
  } | null;
  if (!response.ok || payload?.status !== "success" || !payload.data) {
    throw new HttpError(502, "The payment transaction could not be verified.");
  }
  const transaction = payload.data;
  if (
    typeof transaction.tx_ref !== "string" ||
    typeof transaction.status !== "string" ||
    typeof transaction.currency !== "string" ||
    !Number.isFinite(Number(transaction.id)) ||
    !Number.isFinite(Number(transaction.amount))
  ) {
    throw new HttpError(502, "The payment provider returned invalid transaction details.");
  }
  const attempt = await PaymentAttempt.findOne({
    where: { reference: transaction.tx_ref },
    include: [{ model: Order, as: "order" }],
  });
  const order = attempt?.order;
  if (!attempt || !order) {
    throw new HttpError(404, "The payment does not match a known order.");
  }

  if (transaction.status.toLowerCase() === "successful") {
    if (
      transaction.currency !== order.currency ||
      Math.round(Number(transaction.amount) * 100) < Math.round(Number(order.total) * 100)
    ) {
      throw new HttpError(400, "The verified payment amount or currency does not match the order.");
    }
    if (attempt.status !== "successful") {
      await attempt.update({
        status: "successful",
        transactionId: String(transaction.id),
      });
    }
    if (order.paymentStatus !== "successful") {
      await order.update({
        paymentStatus: "successful",
        ...(order.status === "pending_payment" ? { status: "processing" } : {}),
      });
    }
    return { status: "successful", orderReference: order.reference };
  } else if (
    ["failed", "cancelled"].includes(transaction.status.toLowerCase()) &&
    attempt.status === "pending"
  ) {
    await attempt.update({
      status: "failed",
      transactionId: String(transaction.id),
    });
    const pendingAttempts = await PaymentAttempt.count({
      where: { orderId: order.id, status: "pending" },
    });
    if (pendingAttempts === 0 && order.paymentStatus !== "successful") {
      await order.update({ paymentStatus: "failed" });
    }
    return { status: "failed", orderReference: order.reference };
  }
  return { status: "pending", orderReference: order.reference };
}

export async function flutterwaveCallback(
  req: Request,
  res: Response,
): Promise<void> {
  const transactionId =
    typeof req.query.transaction_id === "string" ? req.query.transaction_id : "";
  const verification = transactionId
    ? await verifyTransaction(transactionId)
    : null;
  const transactionReference =
    typeof req.query.tx_ref === "string" ? req.query.tx_ref : "";
  const pendingAttempt = !verification && transactionReference
    ? await PaymentAttempt.findOne({
        where: { reference: transactionReference },
        include: [{ model: Order, as: "order" }],
      })
    : null;
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  const returnUrl = new URL("/payment-result", frontendUrl);
  const orderReference = verification?.orderReference || pendingAttempt?.order?.reference;
  if (orderReference) {
    returnUrl.searchParams.set("reference", orderReference);
  }
  returnUrl.searchParams.set("payment", verification?.status || "pending");
  res.redirect(303, returnUrl.toString());
}

export async function flutterwaveWebhook(
  req: Request,
  res: Response,
): Promise<void> {
  const secretHash = process.env.FLW_SECRET_HASH;
  const signature = req.header("verif-hash") || "";
  if (!secretHash || !secureEquals(secretHash, signature)) {
    throw new HttpError(401, "Invalid payment webhook signature.");
  }
  const body = req.body as {
    event?: unknown;
    data?: { id?: unknown };
  };
  if (body.event !== "charge.completed") {
    res.status(200).end();
    return;
  }
  if (typeof body.data?.id !== "number" && typeof body.data?.id !== "string") {
    throw new HttpError(400, "Payment webhook is missing a transaction ID.");
  }
  await verifyTransaction(String(body.data.id));
  res.status(200).end();
}
