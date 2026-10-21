import { randomBytes } from "node:crypto";
import { Request, Response } from "express";
import { Op } from "sequelize";
import { sequelize } from "../config/database.js";
import { Artist, Order, OrderItem, Product } from "../models/index.js";
import { HttpError } from "../utils/http-error.js";
import { createOrderSchema } from "../validators/order.validators.js";

export async function createOrder(req: Request, res: Response): Promise<void> {
  const input = createOrderSchema.parse(req.body);
  const quantities = new Map<string, number>();
  for (const item of input.items) {
    const quantity = (quantities.get(item.productSlug) || 0) + item.quantity;
    if (quantity > 20) {
      throw new HttpError(400, "A maximum of 20 copies of an artwork may be ordered.");
    }
    quantities.set(item.productSlug, quantity);
  }

  const order = await sequelize.transaction(async (transaction) => {
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
      return { product, quantity };
    });
    const totalCents = orderLines.reduce(
      (sum, line) => sum + Math.round(Number(line.product.price) * 100) * line.quantity,
      0,
    );
    const paymentProvider =
      input.payment.method === "mobile_money"
        ? input.payment.provider
        : input.payment.provider || null;
    const orderRecord = await Order.create(
      {
        reference: `NY-${randomBytes(5).toString("hex").toUpperCase()}`,
        customerName: input.customer.name,
        customerEmail: input.customer.email.toLowerCase(),
        customerPhone: input.customer.phone,
        shippingAddress: {
          address: input.shippingAddress.address,
          city: input.shippingAddress.city,
          country: input.shippingAddress.country,
          ...(input.shippingAddress.postcode
            ? { postcode: input.shippingAddress.postcode }
            : {}),
        },
        paymentMethod: input.payment.method,
        paymentProvider,
        paymentPhone:
          input.payment.method === "mobile_money" ? input.payment.phone : null,
        total: (totalCents / 100).toFixed(2),
        currency: "USD",
        status: "pending_payment",
        paymentStatus: "pending",
      },
      { transaction },
    );

    await OrderItem.bulkCreate(
      orderLines.map(({ product, quantity }) => ({
        orderId: orderRecord.id,
        productId: product.id,
        productSlug: product.slug,
        title: product.title,
        artistName: product.artist!.name,
        imageUrl: product.imageUrl,
        quantity,
        unitPrice: product.price,
      })),
      { transaction },
    );
    return orderRecord;
  });

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
    },
  });
}
