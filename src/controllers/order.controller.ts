import { randomBytes } from "node:crypto";
import { Request, Response } from "express";
import { Op } from "sequelize";
import { sequelize } from "../config/database.js";
import {
  Artist,
  Cart,
  CartItem,
  Order,
  OrderItem,
  PaymentAttempt,
  Product,
  User,
} from "../models/index.js";
import { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import { sendOrderConfirmation } from "../services/email.service.js";
import { HttpError } from "../utils/http-error.js";
import { slugParamSchema } from "../validators/catalog.validators.js";
import { createOrderSchema } from "../validators/order.validators.js";

export async function createOrder(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const input = createOrderSchema.parse(req.body);
  const customer = await User.findByPk(req.user!.id);
  if (!customer || !customer.phone) {
    throw new HttpError(400, "Add a phone number to your account before ordering.");
  }
  const customerPhone = customer.phone;

  const { order, items: orderItems } = await sequelize.transaction(async (transaction) => {
    let requestedItems = input.items ?? [];
    if (input.cartId) {
      const cart = await Cart.findOne({
        where: { id: input.cartId, userId: customer.id },
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
    const totalCents = orderLines.reduce(
      (sum, line) => sum + Math.round(Number(line.product.price) * 100) * line.quantity,
      0,
    );

    const orderRecord = await Order.create(
      {
        reference: `NY-${randomBytes(5).toString("hex").toUpperCase()}`,
        userId: customer.id,
        customerName: customer.name,
        customerEmail: customer.email,
        customerPhone,
        shippingAddress: {
          address: input.shippingAddress.address,
          city: input.shippingAddress.city,
          country: input.shippingAddress.country,
          ...(input.shippingAddress.postcode
            ? { postcode: input.shippingAddress.postcode }
            : {}),
        },
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
      quantity,
      unitPrice: product.price,
    }));
    await OrderItem.bulkCreate(createdItems, { transaction });
    if (input.cartId) {
      await CartItem.destroy({
        where: { cartId: input.cartId },
        transaction,
      });
    }
    return {
      order: orderRecord,
      items: createdItems.map(({ title, artistName, quantity, unitPrice }) => ({
        title,
        artistName,
        quantity,
        unitPrice,
      })),
    };
  });

  let emailSent = true;
  try {
    await sendOrderConfirmation({ order, items: orderItems });
  } catch (error) {
    emailSent = false;
    console.error(`Failed to send order confirmation for ${order.reference}:`, error);
  }

  res.status(201).json({
    data: {
      reference: order.reference,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      paymentProvider: order.paymentProvider,
      total: Number(order.total),
      currency: order.currency,
      email: order.customerEmail,
      createdAt: order.createdAt,
      confirmationEmail: emailSent ? "sent" : "failed",
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
