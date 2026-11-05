import { createHash, randomBytes } from "node:crypto";
import { Request, Response } from "express";
import { Op } from "sequelize";
import { sequelize } from "../config/database.js";
import {
  Artist,
  Cart,
  CartItem,

  Order,
  OrderItem,
  OrderStatusHistory,
  PaymentAttempt,
  Product,
  User,
} from "../models/index.js";
import { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import {
  sendOrderConfirmation,
  sendOrderManagerNotification,
  sendTrackedNotification,
} from "../services/email.service.js";
import { HttpError } from "../utils/http-error.js";
import { slugParamSchema } from "../validators/catalog.validators.js";
import { getShippingCost } from "../services/shipping.service.js";
import { createOrderSchema, trackOrderSchema } from "../validators/order.validators.js";

function serializeCheckoutOrder(order: Order, idempotent: boolean) {
  return {
    reference: order.reference,
    status: order.status,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod,
    paymentProvider: order.paymentProvider,
    total: Number(order.total),
    subtotal: Number(order.subtotal),
    shippingCost: Number(order.shippingCost),
    currency: order.currency,
    email: order.customerEmail,
    createdAt: order.createdAt,
    ...(idempotent ? { idempotent: true } : {}),
  };
}

export async function createOrder(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const input = createOrderSchema.parse(req.body);
  const account = req.user ? await User.findByPk(req.user.id) : null;
  if (req.user && !account) throw new HttpError(401, "The customer account no longer exists.");
  const customerName = input.customer?.name || account?.name;
  const customerEmail = input.customer?.email?.toLowerCase() || account?.email;
  const customerPhone = input.customer?.phone || account?.phone;
  if (!customerName || !customerEmail || !customerPhone) {
    throw new HttpError(400, "Provide the customer's full name, email address, and phone number.");
  }
  const requestIdempotencyKey = req.header("Idempotency-Key")?.trim() ||
    (input.cartId ? `cart:${input.cartId}` : null);
  if (!requestIdempotencyKey) {
    throw new HttpError(400, "Checkout requires an Idempotency-Key header when submitting items directly.");
  }
  if (requestIdempotencyKey.length > 160) {
    throw new HttpError(400, "Idempotency-Key must not exceed 160 characters.");
  }
  const idempotencyScope = account?.id ?? (input.cartId
    ? `guest-cart:${input.cartId}`
    : customerEmail);
  const checkoutKey = createHash("sha256")
    .update(`${idempotencyScope}:${requestIdempotencyKey}`)
    .digest("hex");
  const existingOrder = (await Order.findOne({
    where: { checkoutKey, userId: account?.id ?? null },
    include: [{ model: OrderItem, as: "items" }],
  })) || (await Order.findOne({
      where: {
        checkoutKey: requestIdempotencyKey,
        userId: account?.id ?? null,
        customerEmail,
      },
      include: [{ model: OrderItem, as: "items" }],
    }));
  if (existingOrder) {
    res.status(200).json({
      data: serializeCheckoutOrder(existingOrder, true),
    });
    return;
  }

  const { order, items: orderItems } = await sequelize.transaction(async (transaction) => {
    let requestedItems = input.items ?? [];
    if (input.cartId) {
      const cart = await Cart.findOne({
        where: { id: input.cartId, userId: account?.id ?? null },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!cart) throw new HttpError(404, "Cart not found.");
      const cartItems = await CartItem.findAll({
        where: { cartId: cart.id },
        transaction,
      });
      if (!cartItems.length) throw new HttpError(400, "Cart is empty.");
      requestedItems = cartItems.map((item) => ({
        productSlug: item.productSlug,
        quantity: item.quantity,
      }));
    }

    const quantities = new Map<string, number>();
    for (const item of requestedItems) {
      const quantity = (quantities.get(item.productSlug) || 0) + item.quantity;
      if (quantity > 20) {
        throw new HttpError(400, "A maximum of 20 copies of an artwork may be ordered.");
      }
      quantities.set(item.productSlug, quantity);
    }

    const products = await Product.findAll({
      where: { slug: { [Op.in]: [...quantities.keys()] }, isActive: true },
      include: [{ model: Artist, as: "artist", required: true }],
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (products.length !== quantities.size) {
      throw new HttpError(400, "One or more requested artworks are unavailable.");
    }

    const productsBySlug = new Map(products.map((product) => [product.slug, product]));
    const orderLines = [...quantities.entries()].map(([slug, quantity]) => {
      const product = productsBySlug.get(slug);
      if (!product || !product.artist) {
        throw new HttpError(400, "One or more requested artworks are unavailable.");
      }
      return { product, quantity, artistName: product.artist.name };
    });
    const currency = orderLines[0]?.product.currency;
    if (!currency || orderLines.some((line) => line.product.currency !== currency)) {
      throw new HttpError(400, "An order cannot contain artwork priced in different currencies.");
    }
    const containsPhysicalArtwork = orderLines.some((line) => line.product.kind !== "digital");
    const shippingAddress = input.shippingAddress || null;
    const subtotalCents = orderLines.reduce(
      (sum, line) => sum + Math.round(Number(line.product.price) * 100) * line.quantity,
      0,
    );
    let shippingCents = 0;
    if (containsPhysicalArtwork) {
      if (!shippingAddress) {
        throw new HttpError(400, "A shipping address is required for physical artwork.");
      }
      shippingCents = Math.round(getShippingCost(shippingAddress.country, currency) * 100);
    }
    const totalCents = subtotalCents + shippingCents;

    const orderRecord = await Order.create(
      {
        reference: `NY-${randomBytes(16).toString("hex").toUpperCase()}`,
        checkoutKey,
        userId: account?.id ?? null,
        customerName,
        customerEmail,
        customerPhone,
        shippingAddress: shippingAddress
          ? {
              address: shippingAddress.address,
              city: shippingAddress.city,
              country: shippingAddress.country,
              ...(shippingAddress.postcode ? { postcode: shippingAddress.postcode } : {}),
              ...(shippingAddress.instructions
                ? { instructions: shippingAddress.instructions }
                : {}),
            }
          : null,
        subtotal: (subtotalCents / 100).toFixed(2),
        shippingCost: (shippingCents / 100).toFixed(2),
        paymentMethod: input.payment.method,
        paymentProvider: "Flutterwave",
        paymentPhone:
          input.payment.method === "mobile_money" ? input.payment.phone : null,
        paymentReference: null,
        paymentUrl: null,
        total: (totalCents / 100).toFixed(2),
        currency,
        status: "pending_payment",
        paymentStatus: "pending",
      },
      { transaction },
    );

    const createdItems = orderLines.map(({ product, quantity, artistName }) => ({
      orderId: orderRecord.id,
      productId: product.id,
      productSlug: product.slug,
      title: product.title,
      artistName,
      imageUrl: product.imageUrl,
      productKind: product.kind || "physical",
      quantity,
      unitPrice: product.price,
    }));
    await OrderItem.bulkCreate(createdItems, { transaction });
    await OrderStatusHistory.create(
      {
        orderId: orderRecord.id,
        fromStatus: null,
        toStatus: "pending_payment",
        actorUserId: account?.id ?? null,
        detail: "Order created.",
      },
      { transaction },
    );
    if (input.cartId) {
      await CartItem.destroy({
        where: { cartId: input.cartId },
        transaction,
      });
    }
    return {
      order: orderRecord,
      items: createdItems.map(({ title, artistName, quantity, unitPrice, imageUrl }) => ({
        title,
        artistName,
        quantity,
        unitPrice,
        imageUrl,
      })),
    };
  });

  const emailResults = await Promise.all([
    sendTrackedNotification({
      orderId: order.id,
      idempotencyKey: `order-confirmation:${order.id}:${order.customerEmail}`,
      notificationType: "order_confirmation",
      recipient: order.customerEmail,
      send: () => sendOrderConfirmation({ order, items: orderItems }),
    }),
    sendOrderManagerNotification(order, orderItems),
  ]);
  const emailSent = emailResults[0];

  res.status(201).json({
    data: {
      ...serializeCheckoutOrder(order, false),
      confirmationEmail: emailSent ? "sent" : "failed",
      managerNotification: emailResults[1] ? "sent" : "failed",
    },
    ...(!emailSent
      ? { message: "Order created, but the confirmation email could not be sent." }
      : {}),
  });
}

export async function listMyOrders(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const orders = await Order.findAll({
    where: { userId: req.user!.id },
    include: [
      { model: OrderItem, as: "items" },
      { model: PaymentAttempt, as: "paymentAttempts" },
    ],
    order: [["createdAt", "DESC"]],
    limit: 100,
  });
  res.status(200).json({ data: orders });
}

export async function getMyOrder(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const { slug: reference } = slugParamSchema.parse({ slug: req.params.reference });
  const order = await Order.findOne({
    where: { reference, userId: req.user!.id },
    include: [
      { model: OrderItem, as: "items" },
      { model: PaymentAttempt, as: "paymentAttempts" },
    ],
  });
  if (!order) throw new HttpError(404, "Order not found.");
  res.status(200).json({ data: order });
}

export async function trackPublicOrder(req: Request, res: Response): Promise<void> {
  const { reference, email } = trackOrderSchema.parse(req.body);
  const order = await Order.findOne({
    where: { reference, customerEmail: email.toLowerCase() },
    include: [
      { model: OrderItem, as: "items" },
      { model: OrderStatusHistory, as: "history", attributes: ["fromStatus", "toStatus", "detail", "createdAt"] },
    ],
  });
  if (!order) throw new HttpError(404, "Order not found.");
  res.status(200).json({
    data: {
      reference: order.reference,
      createdAt: order.createdAt,
      status: order.status,
      paymentStatus: order.paymentStatus,
      currency: order.currency,
      total: order.total,
      items: (order.items || []).map((item) => ({
        title: item.title,
        artistName: item.artistName,
        imageUrl: item.imageUrl,
        productKind: item.productKind,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        ...(item.productKind === "digital"
          ? { digitalDeliveryStatus: item.digitalDeliveryStatus }
          : {}),
      })),
      shipping: order.shippingAddress
        ? {
            address: order.shippingAddress,
            trackingNumber: order.trackingNumber,
            trackingUrl: order.trackingUrl,
            shippedAt: order.shippedAt,
          }
        : null,
      history: order.history,
    },
  });
}
