import nodemailer from "nodemailer";
import type { Order } from "../models/Order.js";
import type { OrderItem } from "../models/OrderItem.js";
import { EmailNotificationLog, NotificationRecipient } from "../models/index.js";

interface OrderConfirmation {
  order: Order;
  items: Pick<OrderItem, "title" | "artistName" | "quantity" | "unitPrice" | "imageUrl">[];
}

/* -------------------------------------------------------------------------- */
/*  Transport                                                                  */
/* -------------------------------------------------------------------------- */

function createTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const password = process.env.SMTP_PASSWORD;
  const from = process.env.SMTP_FROM;

  if (!host || !Number.isInteger(port) || port < 1 || port > 65535 || !from) {
    throw new Error("SMTP_HOST, a valid SMTP_PORT, and SMTP_FROM are required.");
  }
  if ((user && !password) || (!user && password)) {
    throw new Error("SMTP_USER and SMTP_PASSWORD must be configured together.");
  }

  return {
    from,
    transporter: nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
      ...(user && password ? { auth: { user, pass: password } } : {}),
    }),
  };
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character]!;
  });
}

const BRAND = {
  name: "Niyo Arts",
  ink: "#1a1a1a",
  accent: process.env.BRAND_COLOR || "#9a6b2f",
  muted: "#6b6b6b",
  line: "#e8e4dd",
  page: "#f5f3ef",
  card: "#ffffff",
  soft: "#faf8f4",
};

const FONT = "'Helvetica Neue',Helvetica,Arial,sans-serif";

function money(currency: string, value: unknown): string {
  return `${currency} ${Number(value).toFixed(2)}`;
}

function humanize(value: string): string {
  const text = value.replaceAll("_", " ").trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function supportContact(): string {
  return process.env.CONTACT_TO || "Niyo Arts support";
}

function frontendBase(): string {
  return process.env.FRONTEND_URL || "http://localhost:3000";
}

/** Public page where a customer can follow their order. Override with ORDER_TRACKING_URL. */
function orderTrackingPageUrl(order: Order): string {
  try {
    const base =
      process.env.ORDER_TRACKING_URL || new URL("/track-order", frontendBase()).toString();
    const url = new URL(base);
    url.searchParams.set("reference", order.reference);
    return url.toString();
  } catch {
    return frontendBase();
  }
}

function button(url: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0">
    <tr><td style="background:${BRAND.ink};border-radius:6px">
      <a href="${escapeHtml(url)}" target="_blank" style="display:inline-block;padding:13px 28px;font-family:${FONT};font-size:14px;font-weight:600;letter-spacing:.3px;color:#ffffff;text-decoration:none">${escapeHtml(label)}</a>
    </td></tr></table>`;
}

function badge(label: string, tone: "success" | "pending" | "neutral" = "neutral"): string {
  const tones = {
    success: { bg: "#e6f4ea", fg: "#1e6b34" },
    pending: { bg: "#fdf1dc", fg: "#8a5a00" },
    neutral: { bg: "#efece6", fg: "#444444" },
  } as const;
  const t = tones[tone];
  return `<span style="display:inline-block;padding:3px 10px;border-radius:999px;background:${t.bg};color:${t.fg};font-family:${FONT};font-size:12px;font-weight:600">${escapeHtml(label)}</span>`;
}

function paymentTone(status: string): "success" | "pending" | "neutral" {
  if (status === "successful") return "success";
  if (status === "pending") return "pending";
  return "neutral";
}

function heading(text: string): string {
  return `<h1 style="margin:0 0 12px;font-family:Georgia,'Times New Roman',serif;font-size:26px;line-height:1.3;font-weight:normal;color:${BRAND.ink}">${escapeHtml(text)}</h1>`;
}

function paragraph(html: string): string {
  return `<p style="margin:0 0 16px;font-family:${FONT};font-size:15px;line-height:1.65;color:#333333">${html}</p>`;
}

function sectionTitle(text: string): string {
  return `<p style="margin:28px 0 10px;font-family:${FONT};font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:${BRAND.accent}">${escapeHtml(text)}</p>`;
}

function card(inner: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BRAND.soft};border:1px solid ${BRAND.line};border-radius:8px">
    <tr><td style="padding:18px 20px;font-family:${FONT};font-size:14px;line-height:1.7;color:#333333">${inner}</td></tr></table>`;
}

function detailRows(rows: Array<[string, string]>): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rows
    .map(
      ([label, value]) => `<tr>
        <td style="padding:6px 0;font-family:${FONT};font-size:13px;color:${BRAND.muted};width:42%;vertical-align:top">${escapeHtml(label)}</td>
        <td style="padding:6px 0;font-family:${FONT};font-size:14px;color:${BRAND.ink};vertical-align:top">${value}</td>
      </tr>`,
    )
    .join("")}</table>`;
}

function totalsTable(order: Order): string {
  const row = (label: string, value: string, bold = false) => `<tr>
    <td style="padding:5px 0;font-family:${FONT};font-size:${bold ? 16 : 14}px;font-weight:${bold ? 700 : 400};color:${bold ? BRAND.ink : BRAND.muted}">${label}</td>
    <td align="right" style="padding:5px 0;font-family:${FONT};font-size:${bold ? 16 : 14}px;font-weight:${bold ? 700 : 400};color:${BRAND.ink}">${escapeHtml(value)}</td>
  </tr>`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:8px;border-top:1px solid ${BRAND.line}">
    <tr><td colspan="2" style="height:8px;line-height:8px;font-size:0">&nbsp;</td></tr>
    ${row("Subtotal", money(order.currency, order.subtotal))}
    ${row("Shipping", money(order.currency, order.shippingCost))}
    <tr><td colspan="2" style="border-top:1px solid ${BRAND.line};height:6px;line-height:6px;font-size:0">&nbsp;</td></tr>
    ${row("Total", money(order.currency, order.total), true)}
  </table>`;
}

function itemsTable(order: Order, items: OrderConfirmation["items"]): string {
  const rows = items
    .map((item) => {
      const lineTotal = Number(item.unitPrice) * item.quantity;
      const image = item.imageUrl
        ? `<img src="${escapeHtml(item.imageUrl)}" alt="" width="64" height="64" style="display:block;width:64px;height:64px;object-fit:cover;border-radius:6px;border:1px solid ${BRAND.line}">`
        : "";
      return `<tr>
        <td width="76" style="padding:14px 12px 14px 0;border-bottom:1px solid ${BRAND.line};vertical-align:top">${image}</td>
        <td style="padding:14px 0;border-bottom:1px solid ${BRAND.line};vertical-align:top;font-family:${FONT}">
          <div style="font-size:15px;font-weight:600;color:${BRAND.ink}">${escapeHtml(item.title)}</div>
          <div style="font-size:13px;color:${BRAND.muted};margin-top:2px">by ${escapeHtml(item.artistName)}</div>
          <div style="font-size:13px;color:${BRAND.muted};margin-top:4px">Qty ${item.quantity} × ${escapeHtml(money(order.currency, item.unitPrice))}</div>
        </td>
        <td align="right" style="padding:14px 0 14px 12px;border-bottom:1px solid ${BRAND.line};vertical-align:top;font-family:${FONT};font-size:14px;font-weight:600;color:${BRAND.ink};white-space:nowrap">${escapeHtml(money(order.currency, lineTotal))}</td>
      </tr>`;
    })
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rows}</table>`;
}

function timeline(steps: Array<{ title: string; text: string; done?: boolean }>): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${steps
    .map(
      (step, index) => `<tr>
        <td width="36" valign="top" style="padding:0 0 14px">
          <div style="width:24px;height:24px;line-height:24px;border-radius:50%;text-align:center;font-family:${FONT};font-size:12px;font-weight:700;background:${step.done ? BRAND.ink : "#ffffff"};color:${step.done ? "#ffffff" : BRAND.ink};border:1px solid ${step.done ? BRAND.ink : "#c9c3b8"}">${step.done ? "&#10003;" : index + 1}</div>
        </td>
        <td valign="top" style="padding:0 0 14px;font-family:${FONT}">
          <div style="font-size:14px;font-weight:600;color:${BRAND.ink}">${escapeHtml(step.title)}</div>
          <div style="font-size:13px;line-height:1.55;color:${BRAND.muted};margin-top:2px">${escapeHtml(step.text)}</div>
        </td>
      </tr>`,
    )
    .join("")}</table>`;
}

/** Shared responsive layout used by every email. */
function layout(options: { preheader: string; content: string; footerNote?: string }): string {
  const logo = process.env.BRAND_LOGO_URL
    ? `<img src="${escapeHtml(process.env.BRAND_LOGO_URL)}" alt="${BRAND.name}" height="44" style="display:block;margin:0 auto;height:44px;border:0">`
    : `<span style="font-family:Georgia,'Times New Roman',serif;font-size:24px;letter-spacing:3px;text-transform:uppercase;color:${BRAND.ink}">${BRAND.name}</span>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>${BRAND.name}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.page}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${escapeHtml(options.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BRAND.page}">
  <tr><td align="center" style="padding:32px 12px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px">
      <tr><td align="center" style="padding:0 0 20px">${logo}</td></tr>
      <tr><td style="background:${BRAND.card};border:1px solid ${BRAND.line};border-radius:10px;overflow:hidden">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr><td style="height:4px;background:${BRAND.accent};font-size:0;line-height:4px">&nbsp;</td></tr>
          <tr><td style="padding:34px 32px 30px">${options.content}</td></tr>
        </table>
      </td></tr>
      <tr><td align="center" style="padding:22px 16px 0;font-family:${FONT};font-size:12px;line-height:1.7;color:${BRAND.muted}">
        ${options.footerNote ? `${options.footerNote}<br>` : ""}
        Questions? Contact us at <strong style="color:${BRAND.ink}">${escapeHtml(supportContact())}</strong><br>
        &copy; ${new Date().getFullYear()} ${BRAND.name}. All rights reserved.
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

/* -------------------------------------------------------------------------- */
/*  Order confirmation                                                         */
/* -------------------------------------------------------------------------- */

export async function sendOrderConfirmation({
  order,
  items,
}: OrderConfirmation): Promise<void> {
  const { from, transporter } = createTransporter();
  const address = order.shippingAddress;
  const shippingAddress = [address?.address, address?.city, address?.postcode, address?.country]
    .filter(Boolean)
    .join(", ");
  const isPhysical = Boolean(shippingAddress);
  const paid = order.paymentStatus === "successful";
  const trackUrl = orderTrackingPageUrl(order);

  const trackingSteps = isPhysical
    ? [
        { title: "Order received", text: "We have your order and have started reviewing it.", done: true },
        {
          title: paid ? "Payment confirmed" : "Payment confirmation",
          text: paid
            ? "Your payment was received successfully."
            : "We are waiting for your payment to be confirmed.",
          done: paid,
        },
        {
          title: "Shipping coordination",
          text: "Our team will contact you by phone, WhatsApp, or email to arrange your delivery details.",
        },
        {
          title: "Dispatched with DHL",
          text: "Once your artwork is on its way, we will email you your DHL tracking number and tracking link.",
        },
        { title: "Delivered", text: "Your artwork arrives at your address." },
      ]
    : [
        { title: "Order received", text: "We have your order and have started reviewing it.", done: true },
        {
          title: paid ? "Payment confirmed" : "Payment confirmation",
          text: paid
            ? "Your payment was received successfully."
            : "We are waiting for your payment to be confirmed.",
          done: paid,
        },
        {
          title: "Digital delivery",
          text: "Our team will email your digital artwork to you directly.",
        },
      ];

  const trackingGuide = isPhysical
    ? `${paragraph(
        `You can follow your order in three ways:`,
      )}
      <ol style="margin:0 0 16px;padding-left:20px;font-family:${FONT};font-size:14px;line-height:1.7;color:#333333">
        <li><strong>Online:</strong> use the button below and your order reference <strong>${escapeHtml(order.reference)}</strong> to see your latest order status.</li>
        <li><strong>By email:</strong> as soon as your artwork is dispatched through DHL, we will send you a separate email with your <strong>DHL tracking number</strong> and a <strong>tracking link</strong>.</li>
        <li><strong>By contacting us:</strong> reply to this email or reach out to ${escapeHtml(supportContact())} and quote your order reference.</li>
      </ol>`
    : `${paragraph(
        `Because this order contains digital artwork, there is no courier tracking. Our team will deliver your artwork to <strong>${escapeHtml(order.customerEmail)}</strong>. You can check your order status online at any time with your reference <strong>${escapeHtml(order.reference)}</strong>.`,
      )}`;

  const itemLines = items
    .map(
      (item) =>
        `- ${item.title} by ${item.artistName}: ${item.quantity} x ${money(order.currency, item.unitPrice)}`,
    )
    .join("\n");

  const text = [
    `Thank you for your order, ${order.customerName}.`,
    "",
    `Order reference: ${order.reference}`,
    `Order date: ${formatDate(order.createdAt)}`,
    `Status: ${humanize(order.status)}`,
    `Payment status: ${humanize(order.paymentStatus)}`,
    "",
    "ITEMS",
    itemLines,
    "",
    `Subtotal: ${money(order.currency, order.subtotal)}`,
    `Shipping: ${money(order.currency, order.shippingCost)}`,
    `Total: ${money(order.currency, order.total)}`,
    "",
    isPhysical
      ? `Shipping address: ${shippingAddress}`
      : "This order contains digital artwork for manual delivery.",
    "",
    "HOW TO TRACK YOUR ORDER",
    ...(isPhysical
      ? [
          `1. Online: ${trackUrl} (order reference ${order.reference})`,
          "2. By email: once your artwork is dispatched through DHL, we will email you your tracking number and tracking link.",
          `3. By contacting us: ${supportContact()} (quote your order reference).`,
        ]
      : [
          `Our team will email your digital artwork to ${order.customerEmail}.`,
          `Check your order status online: ${trackUrl}`,
        ]),
    "",
    paid ? "Your payment has been confirmed." : "Your order is awaiting payment confirmation.",
    isPhysical
      ? "Thank you for shopping with Niyo Arts! Our team will contact you by phone, WhatsApp, or email to coordinate your shipping arrangements."
      : "Thank you for shopping with Niyo Arts! Our team will contact you by email to coordinate manual delivery of your digital artwork.",
    "",
    `Support: ${supportContact()}`,
  ].join("\n");

  const content = `
    ${heading("Thank you for your order")}
    ${paragraph(`Hello ${escapeHtml(order.customerName)}, your order has been received successfully. Here is everything you need to know.`)}

    ${card(
      detailRows([
        ["Order reference", `<strong>${escapeHtml(order.reference)}</strong>`],
        ["Order date", escapeHtml(formatDate(order.createdAt))],
        ["Order status", badge(humanize(order.status), "neutral")],
        ["Payment status", badge(humanize(order.paymentStatus), paymentTone(order.paymentStatus))],
      ]),
    )}

    ${sectionTitle("Your items")}
    ${itemsTable(order, items)}
    ${totalsTable(order)}

    ${sectionTitle(isPhysical ? "Shipping address" : "Delivery")}
    ${card(
      isPhysical
        ? `${escapeHtml(order.customerName)}<br>${escapeHtml(shippingAddress)}${order.customerPhone ? `<br>${escapeHtml(order.customerPhone)}` : ""}`
        : "This order contains digital artwork. Our team will deliver it manually by email.",
    )}

    ${sectionTitle("Track your order")}
    ${trackingGuide}
    ${button(trackUrl, "Track my order")}

    ${sectionTitle("What happens next")}
    ${timeline(trackingSteps)}

    ${paragraph(
      isPhysical
        ? "Thank you for shopping with Niyo Arts! Our team will contact you by phone, WhatsApp, or email to coordinate your shipping arrangements. Once your artwork has been dispatched through DHL, we will send you your tracking number and tracking link by email."
        : "Thank you for shopping with Niyo Arts! Our team will contact you by email to coordinate manual delivery of your digital artwork.",
    )}
  `;

  await transporter.sendMail({
    from,
    to: order.customerEmail,
    subject: `Order confirmation ${order.reference}`,
    text,
    html: layout({
      preheader: `Order ${order.reference} received. Here is how to track it.`,
      content,
      footerNote: `Keep this email: your order reference is ${escapeHtml(order.reference)}.`,
    }),
  });
}

/* -------------------------------------------------------------------------- */
/*  Tracked notifications                                                      */
/* -------------------------------------------------------------------------- */

export async function sendTrackedNotification(input: {
  orderId: string | null;
  idempotencyKey: string;
  notificationType: string;
  recipient: string;
  send: () => Promise<void>;
}): Promise<boolean> {
  let log = await EmailNotificationLog.findOne({
    where: { idempotencyKey: input.idempotencyKey },
  });
  if (log?.status === "sent") return true;
  if (!log) {
    log = await EmailNotificationLog.create({
      orderId: input.orderId,
      idempotencyKey: input.idempotencyKey,
      notificationType: input.notificationType,
      recipient: input.recipient,
      status: "pending",
      attempts: 0,
      lastError: null,
      sentAt: null,
    });
  }
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      await input.send();
      await log.update({
        status: "sent",
        attempts: log.attempts + 1,
        lastError: null,
        sentAt: new Date(),
      });
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Email delivery failed.";
      await log.update({
        status: attempt === 1 ? "failed" : "pending",
        attempts: log.attempts + 1,
        lastError: message.slice(0, 4000),
      });
      if (attempt === 1) {
        console.error(`Email notification failed (${input.notificationType}, ${input.recipient}):`, error);
        return false;
      }
    }
  }
  return false;
}

/* -------------------------------------------------------------------------- */
/*  Manager notification                                                       */
/* -------------------------------------------------------------------------- */

export async function sendOrderManagerNotification(
  order: Order,
  items: OrderConfirmation["items"],
  notificationType: "new_order" | "payment_confirmed" = "new_order",
): Promise<boolean> {
  const paymentConfirmed = notificationType === "payment_confirmed";
  const configuredRecipients = (process.env.ORDER_NOTIFICATION_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  const storedRecipients = await NotificationRecipient.findAll({
    where: { active: true },
    attributes: ["email"],
  });
  const recipients = [
    ...new Set([
      ...configuredRecipients,
      ...storedRecipients.map((recipient) => recipient.email.toLowerCase()),
      ...(process.env.ADMIN_EMAIL ? [process.env.ADMIN_EMAIL.trim().toLowerCase()] : []),
      ...(process.env.MANAGER_EMAIL ? [process.env.MANAGER_EMAIL.trim().toLowerCase()] : []),
    ]),
  ];
  if (recipients.length === 0) {
    console.error("Order manager notification skipped: no recipients are configured.");
    return false;
  }
  const adminUrl = new URL(
    `/admin/orders/${encodeURIComponent(order.reference)}`,
    frontendBase(),
  ).toString();
  const address = order.shippingAddress
    ? `${order.shippingAddress.address}, ${order.shippingAddress.city}, ${order.shippingAddress.country}`
    : "Digital order; no shipping address.";
  const itemText = items
    .map((item) => `${item.title}: ${item.quantity} x ${money(order.currency, item.unitPrice)}`)
    .join("\n");
  const notificationKey = paymentConfirmed ? "order-payment-confirmed" : "new-order";
  const subject = paymentConfirmed
    ? `Payment confirmed for Niyo Arts order ${order.reference}`
    : `New Niyo Arts order ${order.reference}`;
  const headingText = paymentConfirmed ? "Customer payment confirmed" : "New order received";
  const summaryText = paymentConfirmed
    ? `Payment for order <strong>${escapeHtml(order.reference)}</strong> has been confirmed.`
    : `A new order <strong>${escapeHtml(order.reference)}</strong> was placed on ${escapeHtml(formatDate(order.createdAt))}.`;
  const preheader = paymentConfirmed
    ? `Payment confirmed for order ${order.reference}`
    : `New order ${order.reference} from ${order.customerName}`;

  const content = `
    ${heading(headingText)}
    ${paragraph(summaryText)}

    ${sectionTitle("Customer")}
    ${card(
      detailRows([
        ["Name", escapeHtml(order.customerName)],
        ["Email", `<a href="mailto:${escapeHtml(order.customerEmail)}" style="color:${BRAND.accent}">${escapeHtml(order.customerEmail)}</a>`],
        ["Phone", escapeHtml(order.customerPhone)],
        ["Payment", badge(humanize(order.paymentStatus), paymentTone(order.paymentStatus))],
        ["Delivery", escapeHtml(address)],
      ]),
    )}

    ${sectionTitle("Items")}
    ${itemsTable(order, items)}
    ${totalsTable(order)}

    <div style="margin-top:24px">${button(adminUrl, "View order in admin dashboard")}</div>
  `;

  const results = await Promise.all(
    recipients.map((recipient) =>
      sendTrackedNotification({
        orderId: order.id,
        idempotencyKey: `${notificationKey}:${order.id}:${recipient}`,
        notificationType,
        recipient,
        send: async () => {
          const { from, transporter } = createTransporter();
          await transporter.sendMail({
            from,
            to: recipient,
            subject,
            text: [
              paymentConfirmed
                ? `Payment confirmed for order ${order.reference}`
                : `New order ${order.reference}`,
              `Customer: ${order.customerName} <${order.customerEmail}>`,
              `Phone: ${order.customerPhone}`,
              `Payment: ${order.paymentStatus}`,
              `Items:\n${itemText}`,
              `Subtotal: ${money(order.currency, order.subtotal)}`,
              `Shipping: ${money(order.currency, order.shippingCost)}`,
              `Total: ${money(order.currency, order.total)}`,
              `Address: ${address}`,
              `Created: ${order.createdAt.toISOString()}`,
              `Admin order: ${adminUrl}`,
            ].join("\n\n"),
            html: layout({
              preheader,
              content,
              footerNote: "Internal notification for Niyo Arts administrators and managers.",
            }),
          });
        },
      }),
    ),
  );
  return results.every(Boolean);
}

/* -------------------------------------------------------------------------- */
/*  Shipping notification                                                      */
/* -------------------------------------------------------------------------- */

export async function sendShippingNotification(
  order: Order,
  items: OrderConfirmation["items"],
): Promise<void> {
  if (!order.trackingNumber || !order.trackingUrl || !order.shippedAt) {
    throw new Error("Tracking number, tracking URL, and shipping date are required.");
  }
  const { from, transporter } = createTransporter();
  const orderPageUrl = orderTrackingPageUrl(order);

  const text = [
    `${order.customerName},`,
    "",
    "Great news! Your Niyo Arts order has been dispatched successfully.",
    "Your artwork is now on its way!",
    "",
    `Order: ${order.reference}`,
    `Items: ${items.map((item) => item.title).join(", ")}`,
    `Shipping date: ${formatDate(order.shippedAt)}`,
    `DHL tracking number: ${order.trackingNumber}`,
    `Track your shipment: ${order.trackingUrl}`,
    "",
    `View your order: ${orderPageUrl}`,
    "",
    "Thank you for choosing Niyo Arts. We appreciate your support!",
  ].join("\n");

  const content = `
    ${heading("Your artwork is on its way")}
    ${paragraph(`Hello ${escapeHtml(order.customerName)}, great news! Your Niyo Arts order has been dispatched successfully.`)}

    ${card(
      detailRows([
        ["Order reference", `<strong>${escapeHtml(order.reference)}</strong>`],
        ["Items", items.map((item) => escapeHtml(item.title)).join(", ")],
        ["Shipping date", escapeHtml(formatDate(order.shippedAt))],
        ["Carrier", "DHL"],
        ["Tracking number", `<strong>${escapeHtml(order.trackingNumber)}</strong>`],
      ]),
    )}

    <div style="margin-top:24px">${button(order.trackingUrl, "Track your shipment")}</div>
    ${paragraph(
      `You can also view your order details any time on our website: <a href="${escapeHtml(orderPageUrl)}" style="color:${BRAND.accent}">view my order</a>. Tracking updates from DHL may take a few hours to appear after dispatch.`,
    )}
    ${paragraph("Thank you for choosing Niyo Arts. We appreciate your support!")}
  `;

  await transporter.sendMail({
    from,
    to: order.customerEmail,
    subject: `Your Niyo Arts order ${order.reference} has shipped`,
    text,
    html: layout({
      preheader: `Your order ${order.reference} has shipped. DHL tracking: ${order.trackingNumber}`,
      content,
    }),
  });
}

/* -------------------------------------------------------------------------- */
/*  Status notification                                                        */
/* -------------------------------------------------------------------------- */

export async function sendOrderStatusNotification(
  order: Order,
  status: string,
): Promise<boolean> {
  const label = status.replaceAll("_", " ");
  const trackUrl = orderTrackingPageUrl(order);
  return sendTrackedNotification({
    orderId: order.id,
    idempotencyKey: `order-status:${order.id}:${status}`,
    notificationType: `order_status_${status}`,
    recipient: order.customerEmail,
    send: async () => {
      const { from, transporter } = createTransporter();
      await transporter.sendMail({
        from,
        to: order.customerEmail,
        subject: `Niyo Arts order ${order.reference}: ${label}`,
        text: `Hello ${order.customerName},\n\nYour order ${order.reference} is now ${label}.\n\nTrack your order: ${trackUrl}\n\nThank you for choosing Niyo Arts.`,
        html: layout({
          preheader: `Order ${order.reference} is now ${label}.`,
          content: `
            ${heading("Order update")}
            ${paragraph(`Hello ${escapeHtml(order.customerName)},`)}
            ${card(
              detailRows([
                ["Order reference", `<strong>${escapeHtml(order.reference)}</strong>`],
                ["New status", badge(humanize(status), "neutral")],
              ]),
            )}
            <div style="margin-top:24px">${button(trackUrl, "Track my order")}</div>
            ${paragraph("Thank you for choosing Niyo Arts.")}
          `,
        }),
      });
    },
  });
}

/* -------------------------------------------------------------------------- */
/*  Digital delivery                                                           */
/* -------------------------------------------------------------------------- */

export async function sendDigitalDeliveryNotification(input: {
  order: Order;
  item: OrderItem;
}): Promise<void> {
  const { from, transporter } = createTransporter();
  const url = input.item.digitalDeliveryUrl;

  await transporter.sendMail({
    from,
    to: input.order.customerEmail,
    subject: `Your digital artwork from Niyo Arts`,
    text: `Hello ${input.order.customerName},\n\nYour digital artwork "${input.item.title}" is ready.\n\n${url || "Please contact Niyo Arts support to receive your digital artwork."}\n\nThank you for choosing Niyo Arts.`,
    html: layout({
      preheader: `Your digital artwork "${input.item.title}" is ready.`,
      content: `
        ${heading("Your digital artwork is ready")}
        ${paragraph(`Hello ${escapeHtml(input.order.customerName)}, your digital artwork <strong>${escapeHtml(input.item.title)}</strong> is ready.`)}
        ${
          url
            ? button(url, "Access your artwork")
            : paragraph("Our team will contact you to deliver your artwork manually.")
        }
        ${paragraph("Thank you for choosing Niyo Arts.")}
      `,
    }),
  });
}

/* -------------------------------------------------------------------------- */
/*  Password reset                                                             */
/* -------------------------------------------------------------------------- */

export async function sendPasswordResetEmail(
  to: string,
  name: string,
  resetUrl: string,
): Promise<void> {
  const { from, transporter } = createTransporter();
  await transporter.sendMail({
    from,
    to,
    subject: "Reset your Niyo Arts password",
    text: [
      `Hello ${name},`,
      "A request was made to reset your Niyo Arts password.",
      `Use this link to choose a new password: ${resetUrl}`,
      "This link expires in 30 minutes. If you did not request a reset, ignore this email.",
    ].join("\n\n"),
    html: layout({
      preheader: "Choose a new password for your Niyo Arts account.",
      content: `
        ${heading("Reset your password")}
        ${paragraph(`Hello ${escapeHtml(name)}, a request was made to reset your Niyo Arts password.`)}
        ${button(resetUrl, "Reset your password")}
        ${paragraph(`This link expires in <strong>30 minutes</strong>. If you did not request a reset, you can safely ignore this email.`)}
        <p style="margin:0;font-family:${FONT};font-size:12px;line-height:1.6;color:${BRAND.muted};word-break:break-all">If the button does not work, copy this link into your browser:<br>${escapeHtml(resetUrl)}</p>
      `,
    }),
  });
}

/* -------------------------------------------------------------------------- */
/*  Contact form                                                               */
/* -------------------------------------------------------------------------- */

export async function sendContactNotification(input: {
  name: string;
  email: string;
  subject?: string | undefined;
  message: string;
}): Promise<void> {
  const to = process.env.CONTACT_TO || process.env.ADMIN_EMAIL;
  if (!to) throw new Error("CONTACT_TO or ADMIN_EMAIL must be configured.");
  const { from, transporter } = createTransporter();
  const subject = (input.subject || "New Niyo Arts contact message").replace(/[\r\n]+/g, " ");

  await transporter.sendMail({
    from,
    to,
    replyTo: { name: input.name, address: input.email },
    subject: `Contact: ${subject}`,
    text: `From: ${input.name} <${input.email}>\n\n${input.message}`,
    html: layout({
      preheader: `New message from ${input.name}`,
      content: `
        ${heading("New contact message")}
        ${card(
          detailRows([
            ["From", escapeHtml(input.name)],
            ["Email", `<a href="mailto:${escapeHtml(input.email)}" style="color:${BRAND.accent}">${escapeHtml(input.email)}</a>`],
            ["Subject", escapeHtml(subject)],
          ]),
        )}
        ${sectionTitle("Message")}
        ${paragraph(escapeHtml(input.message).replace(/\r?\n/g, "<br>"))}
        <p style="margin:0;font-family:${FONT};font-size:12px;color:${BRAND.muted}">Reply to this email to respond directly to the sender.</p>
      `,
      footerNote: "Internal notification for Niyo Arts.",
    }),
  });
}