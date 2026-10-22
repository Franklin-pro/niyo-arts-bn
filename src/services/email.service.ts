import nodemailer from "nodemailer";
import type { Order } from "../models/Order.js";
import type { OrderItem } from "../models/OrderItem.js";

interface OrderConfirmation {
  order: Order;
  items: Pick<OrderItem, "title" | "artistName" | "quantity" | "unitPrice">[];
}

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

export async function sendOrderConfirmation({
  order,
  items,
}: OrderConfirmation): Promise<void> {
  const { from, transporter } = createTransporter();
  const itemRows = items
    .map(
      (item) =>
        `<li>${escapeHtml(item.title)} by ${escapeHtml(item.artistName)} — ${item.quantity} × ${order.currency} ${Number(item.unitPrice).toFixed(2)}</li>`,
    )
    .join("");
  const itemLines = items
    .map(
      (item) =>
        `- ${item.title} by ${item.artistName}: ${item.quantity} x ${order.currency} ${Number(item.unitPrice).toFixed(2)}`,
    )
    .join("\n");
  const address = order.shippingAddress;
  const shippingAddress = [
    address.address,
    address.city,
    address.postcode,
    address.country,
  ]
    .filter(Boolean)
    .join(", ");

  await transporter.sendMail({
    from,
    to: order.customerEmail,
    subject: `Order confirmation ${order.reference}`,
    text: [
      `Thank you for your order, ${order.customerName}.`,
      `Order reference: ${order.reference}`,
      `Status: ${order.status}`,
      "",
      "Items:",
      itemLines,
      "",
      `Total: ${order.currency} ${Number(order.total).toFixed(2)}`,
      `Shipping address: ${shippingAddress}`,
      "Your order is awaiting payment confirmation.",
    ].join("\n"),
    html: `<p>Thank you for your order, ${escapeHtml(order.customerName)}.</p>
      <p>Order reference: <strong>${escapeHtml(order.reference)}</strong><br>
      Status: ${escapeHtml(order.status)}</p>
      <ul>${itemRows}</ul>
      <p>Total: ${escapeHtml(order.currency)} ${Number(order.total).toFixed(2)}</p>
      <p>Shipping address: ${escapeHtml(shippingAddress)}</p>
      <p>Your order is awaiting payment confirmation.</p>`,
  });
}

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
    html: `<p>Hello ${escapeHtml(name)},</p>
      <p>A request was made to reset your Niyo Arts password.</p>
      <p><a href="${escapeHtml(resetUrl)}">Reset your password</a></p>
      <p>This link expires in 30 minutes. If you did not request a reset, ignore this email.</p>`,
  });
}

export async function sendContactNotification(input: {
  name: string;
  email: string;
  subject?: string | undefined;
  message: string;
}): Promise<void> {
  const to = process.env.CONTACT_TO || process.env.ADMIN_EMAIL;
  if (!to) throw new Error("CONTACT_TO or ADMIN_EMAIL must be configured.");
  const { from, transporter } = createTransporter();
  const subject = (input.subject || "New Niyo Arts contact message")
    .replace(/[\r\n]+/g, " ");
  await transporter.sendMail({
    from,
    to,
    replyTo: { name: input.name, address: input.email },
    subject: `Contact: ${subject}`,
    text: `From: ${input.name} <${input.email}>\n\n${input.message}`,
    html: `<p><strong>From:</strong> ${escapeHtml(input.name)} &lt;${escapeHtml(input.email)}&gt;</p>
      <p><strong>Subject:</strong> ${escapeHtml(subject)}</p>
      <p>${escapeHtml(input.message).replace(/\r?\n/g, "<br>")}</p>`,
  });
}
