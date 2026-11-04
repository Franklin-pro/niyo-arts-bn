import { Request, Response } from "express";
import { Op } from "sequelize";
import { sequelize } from "../config/database.js";
import {
  Artist,
  Collection,
  ContactMessage,
  EmailNotificationLog,
  NotificationRecipient,
  Order,
  OrderItem,
  OrderNote,
  OrderStatusHistory,
  PaymentAttempt,
  Product,
} from "../models/index.js";
import { HttpError } from "../utils/http-error.js";
import { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import {
  sendDigitalDeliveryNotification,
  sendOrderStatusNotification,
  sendShippingNotification,
  sendTrackedNotification,
} from "../services/email.service.js";
import {
  artistAdminSchema,
  adminOrderQuerySchema,
  collectionAdminSchema,
  contactStatusSchema,
  digitalDeliverySchema,
  idParamSchema,
  notificationRecipientSchema,
  orderNoteSchema,
  orderStatusSchema,
  productAdminSchema,
  shippingUpdateSchema,
} from "../validators/admin.validators.js";
import { slugParamSchema } from "../validators/catalog.validators.js";
import { uploadImage } from "../services/cloudinary.service.js";

export async function uploadAdminImage(
  req: Request,
  res: Response,
): Promise<void> {
  if (!req.file) {
    throw new HttpError(400, "An image file is required in the 'image' field.");
  }
  res.status(201).json({ data: await uploadImage(req.file) });
}

export async function listAdminProducts(_req: Request, res: Response): Promise<void> {
  const products = await Product.findAll({
    include: [{ model: Artist, as: "artist", required: true }],
    order: [["createdAt", "DESC"]],
  });
  res.status(200).json({ data: products });
}

export async function createAdminProduct(req: Request, res: Response): Promise<void> {
  const input = productAdminSchema.parse(req.body);
  if (!(await Artist.findByPk(input.artistId))) {
    throw new HttpError(400, "The selected artist does not exist.");
  }
  if (input.currency === "RWF" && !Number.isInteger(input.price)) {
    throw new HttpError(400, "RWF product prices must be whole numbers.");
  }
  const product = await Product.create({ ...input, price: input.price.toFixed(2) });
  res.status(201).json({ data: product });
}

export async function updateAdminProduct(req: Request, res: Response): Promise<void> {
  const { slug } = slugParamSchema.parse(req.params);
  const input = productAdminSchema.partial().strict().parse(req.body);
  const product = await Product.findOne({ where: { slug } });
  if (!product) throw new HttpError(404, "Artwork not found.");
  if (input.slug !== undefined && input.slug !== product.slug) {
    throw new HttpError(409, "Product slugs cannot be changed after creation.");
  }
  if (input.artistId && !(await Artist.findByPk(input.artistId))) {
    throw new HttpError(400, "The selected artist does not exist.");
  }
  if (
    (input.currency || product.currency) === "RWF" &&
    !Number.isInteger(input.price ?? Number(product.price))
  ) {
    throw new HttpError(400, "RWF product prices must be whole numbers.");
  }
  const updates = Object.fromEntries(
    Object.entries(input)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [
        key,
        key === "price" && typeof value === "number" ? value.toFixed(2) : value,
      ]),
  );
  await product.update(updates);
  res.status(200).json({ data: product });
}

export async function deleteAdminProduct(req: Request, res: Response): Promise<void> {
  const { slug } = slugParamSchema.parse(req.params);
  const product = await Product.findOne({ where: { slug } });
  if (!product) throw new HttpError(404, "Artwork not found.");
  await product.update({ isActive: false });
  res.status(204).end();
}

export async function listAdminArtists(_req: Request, res: Response): Promise<void> {
  res.status(200).json({ data: await Artist.findAll({ order: [["name", "ASC"]] }) });
}
export async function adminArtistDetails(req: Request, res: Response): Promise<void> {
  const { slug } = slugParamSchema.parse(req.params);
  const artist = await Artist.findOne({
    where: { slug },
    include: [{ model: Product, as: "products" }],
  });
  if (!artist) throw new HttpError(404, "Artist not found.");
  res.status(200).json({ data: artist });
}

export async function createAdminArtist(req: Request, res: Response): Promise<void> {
  const input = artistAdminSchema.parse(req.body);
  res.status(201).json({ data: await Artist.create(input) });
}

export async function updateAdminArtist(req: Request, res: Response): Promise<void> {
  const { slug } = slugParamSchema.parse(req.params);
  const input = artistAdminSchema.partial().strict().parse(req.body);
  const artist = await Artist.findOne({ where: { slug } });
  if (!artist) throw new HttpError(404, "Artist not found.");
  await artist.update(Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined),
  ));
  res.status(200).json({ data: artist });
}

export async function deleteAdminArtist(req: Request, res: Response): Promise<void> {
  const { slug } = slugParamSchema.parse(req.params);
  const artist = await Artist.findOne({ where: { slug } });
  if (!artist) throw new HttpError(404, "Artist not found.");
  if (await Product.count({ where: { artistId: artist.id } })) {
    throw new HttpError(409, "Reassign or remove this artist's products before deleting the artist.");
  }
  await artist.destroy();
  res.status(204).end();
}

export async function listAdminCollections(_req: Request, res: Response): Promise<void> {
  res.status(200).json({
    data: await Collection.findAll({ order: [["displayOrder", "ASC"]] }),
  });
}

export async function createAdminCollection(req: Request, res: Response): Promise<void> {
  const input = collectionAdminSchema.parse(req.body);
  const productCount = await Product.count({
    where: { slug: input.productSlugs, isActive: true },
  });
  if (productCount !== new Set(input.productSlugs).size) {
    throw new HttpError(400, "Every collection productSlug must match an active product.");
  }
  res.status(201).json({ data: await Collection.create(input) });
}

export async function updateAdminCollection(req: Request, res: Response): Promise<void> {
  const { slug } = slugParamSchema.parse(req.params);
  const input = collectionAdminSchema.partial().strict().parse(req.body);
  const collection = await Collection.findOne({ where: { slug } });
  if (!collection) throw new HttpError(404, "Collection not found.");
  if (input.productSlugs) {
    const productCount = await Product.count({
      where: { slug: input.productSlugs, isActive: true },
    });
    if (productCount !== new Set(input.productSlugs).size) {
      throw new HttpError(400, "Every collection productSlug must match an active product.");
    }
  }
  await collection.update(Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined),
  ));
  res.status(200).json({ data: collection });
}

export async function deleteAdminCollection(req: Request, res: Response): Promise<void> {
  const { slug } = slugParamSchema.parse(req.params);
  const collection = await Collection.findOne({ where: { slug } });
  if (!collection) throw new HttpError(404, "Collection not found.");
  await collection.update({ isActive: false });
  res.status(204).end();
}

export async function listAdminOrders(req: Request, res: Response): Promise<void> {
  const query = adminOrderQuerySchema.parse(req.query);
  const where = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.paymentStatus ? { paymentStatus: query.paymentStatus } : {}),
    ...(query.from || query.to
      ? {
          createdAt: {
            ...(query.from ? { [Op.gte]: new Date(`${query.from}T00:00:00.000Z`) } : {}),
            ...(query.to
              ? { [Op.lt]: new Date(new Date(`${query.to}T00:00:00.000Z`).getTime() + 86_400_000) }
              : {}),
          },
        }
      : {}),
    ...(query.q
      ? {
          [Op.or]: [
            { reference: { [Op.iLike]: `%${query.q}%` } },
            { customerName: { [Op.iLike]: `%${query.q}%` } },
            { customerEmail: { [Op.iLike]: `%${query.q}%` } },
            { customerPhone: { [Op.iLike]: `%${query.q}%` } },
          ],
        }
      : {}),
  };
  const { count, rows } = await Order.findAndCountAll({
    where,
    include: [
      { model: OrderItem, as: "items" },
      { model: PaymentAttempt, as: "paymentAttempts" },
    ],
    order: [["createdAt", "DESC"]],
    limit: query.limit,
    offset: (query.page - 1) * query.limit,
    distinct: true,
  });
  res.status(200).json({
    data: rows,
    pagination: { page: query.page, limit: query.limit, total: count },
  });
}

export async function getAdminOrder(req: Request, res: Response): Promise<void> {
  const { slug: reference } = slugParamSchema.parse({ slug: req.params.reference });
  const order = await Order.findOne({
    where: { reference },
    include: [
      { model: OrderItem, as: "items" },
      { model: PaymentAttempt, as: "paymentAttempts" },
      { model: OrderStatusHistory, as: "history", order: [["createdAt", "ASC"]] },
      { model: OrderNote, as: "notes", order: [["createdAt", "ASC"]] },
      { model: EmailNotificationLog, as: "emailNotifications" },
    ],
  });
  if (!order) throw new HttpError(404, "Order not found.");
  res.status(200).json({ data: order });
}

export async function updateAdminOrder(req: Request, res: Response): Promise<void> {
  const { slug: reference } = slugParamSchema.parse({ slug: req.params.reference });
  const { status } = orderStatusSchema.parse(req.body);
  const result = await sequelize.transaction(async (transaction) => {
    const order = await Order.findOne({
      where: { reference },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!order) throw new HttpError(404, "Order not found.");
    if (status === "shipped") {
      throw new HttpError(409, "Use the shipping endpoint after saving the DHL tracking details.");
    }
    if (
      ["confirmed", "processing", "ready_for_shipment", "in_transit", "delivered"].includes(status) &&
      order.paymentStatus !== "successful"
    ) {
      throw new HttpError(409, "The order must be paid before fulfillment can advance.");
    }
    const nextStatuses: Record<string, string[]> = {
      pending_payment: ["cancelled"],
      confirmed: ["processing", "cancelled"],
      processing: ["ready_for_shipment", "delivered", "cancelled"],
      ready_for_shipment: ["cancelled"],
      shipped: ["in_transit", "delivered"],
      in_transit: ["delivered"],
      delivered: ["refunded"],
      cancelled: [],
      refunded: [],
    };
    if (order.status !== status && !nextStatuses[order.status]?.includes(status)) {
      throw new HttpError(409, `Order cannot move from ${order.status} to ${status}.`);
    }
    if (status === "refunded" && order.paymentStatus !== "refunded") {
      throw new HttpError(409, "Record and verify the refund before changing order status.");
    }
    if (status === "delivered") {
      const items = await OrderItem.findAll({ where: { orderId: order.id }, transaction });
      if (order.shippingAddress) {
        if (!["shipped", "in_transit"].includes(order.status)) {
          throw new HttpError(409, "Physical orders can only be marked delivered after shipment.");
        }
      } else if (
        items.length === 0 ||
        items.some((item) => item.productKind !== "digital" || item.digitalDeliveryStatus !== "sent")
      ) {
        throw new HttpError(409, "Digital-only orders can be delivered after every item has been sent.");
      }
    }
    if (order.status === status) return { order, changed: false };
    const previousStatus = order.status;
    await order.update({ status }, { transaction });
    await OrderStatusHistory.create({
      orderId: order.id,
      fromStatus: previousStatus,
      toStatus: status,
      actorUserId: (req as AuthenticatedRequest).user?.id ?? null,
      detail: null,
    }, { transaction });
    return { order, changed: true };
  });
  const notificationSent = result.changed
    ? await sendOrderStatusNotification(result.order, status)
    : undefined;
  res.status(200).json({
    data: result.order,
    ...(notificationSent === undefined ? {} : { notification: notificationSent ? "sent" : "failed" }),
  });
}

export async function addAdminOrderNote(req: Request, res: Response): Promise<void> {
  const { slug: reference } = slugParamSchema.parse({ slug: req.params.reference });
  const { note } = orderNoteSchema.parse(req.body);
  const order = await Order.findOne({ where: { reference } });
  if (!order) throw new HttpError(404, "Order not found.");
  const record = await OrderNote.create({
    orderId: order.id,
    authorUserId: (req as AuthenticatedRequest).user?.id ?? null,
    note,
  });
  res.status(201).json({ data: record });
}

export async function updateAdminShipping(req: Request, res: Response): Promise<void> {
  const { slug: reference } = slugParamSchema.parse({ slug: req.params.reference });
  const input = shippingUpdateSchema.parse(req.body);
  const result = await sequelize.transaction(async (transaction) => {
    const order = await Order.findOne({
      where: { reference },
      include: [{ model: OrderItem, as: "items" }],
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!order) throw new HttpError(404, "Order not found.");
    if (!order.shippingAddress) throw new HttpError(409, "This order does not require physical shipping.");
    if (order.paymentStatus !== "successful") {
      throw new HttpError(409, "The order must be paid before shipping can be managed.");
    }
    const nextStatus = input.status || order.status;
    const nextStatuses: Record<string, string[]> = {
      confirmed: ["processing"],
      processing: ["ready_for_shipment"],
      ready_for_shipment: ["shipped"],
      shipped: ["in_transit", "delivered"],
      in_transit: ["delivered"],
    };
    if (nextStatus !== order.status && !nextStatuses[order.status]?.includes(nextStatus)) {
      throw new HttpError(409, `Order cannot move from ${order.status} to ${nextStatus}.`);
    }
    const trackingNumber = input.trackingNumber === undefined
      ? order.trackingNumber
      : input.trackingNumber;
    const trackingUrl = input.trackingUrl === undefined
      ? order.trackingUrl
      : input.trackingUrl;
    const shippedAt = input.shippedAt === undefined
      ? order.shippedAt
      : input.shippedAt ? new Date(input.shippedAt) : null;
    if (nextStatus === "shipped" && (!trackingNumber || !shippedAt)) {
      throw new HttpError(400, "A DHL tracking number and confirmed shipping date are required before dispatch.");
    }
    const finalTrackingUrl = trackingUrl || (trackingNumber
      ? "https://www.dhl.com/global-en/home/tracking.html"
      : null);
    if (finalTrackingUrl && new URL(finalTrackingUrl).protocol !== "https:") {
      throw new HttpError(400, "The tracking URL must use HTTPS.");
    }
    const previousStatus = order.status;
    const shippingNotes = input.shippingNotes === undefined ? order.shippingNotes : input.shippingNotes;
    const shippingChanged =
      trackingNumber !== order.trackingNumber ||
      finalTrackingUrl !== order.trackingUrl ||
      shippedAt?.getTime() !== order.shippedAt?.getTime() ||
      shippingNotes !== order.shippingNotes;
    await order.update({
      trackingNumber,
      trackingUrl: finalTrackingUrl,
      shippedAt,
      shippingNotes,
      status: nextStatus,
    }, { transaction });
    if (nextStatus !== previousStatus || shippingChanged) {
      await OrderStatusHistory.create({
        orderId: order.id,
        fromStatus: previousStatus,
        toStatus: nextStatus,
        actorUserId: (req as AuthenticatedRequest).user?.id ?? null,
        detail: input.shippingNotes || (nextStatus === "shipped" ? "DHL dispatch confirmed." : "Shipping details updated."),
      }, { transaction });
    }
    return { order, previousStatus };
  });
  let notificationSent: boolean | undefined;
  if (result.order.status === "shipped") {
    notificationSent = await sendTrackedNotification({
      orderId: result.order.id,
      idempotencyKey: `shipment:${result.order.id}`,
      notificationType: "shipment_dispatched",
      recipient: result.order.customerEmail,
      send: () => sendShippingNotification(result.order, result.order.items || []),
    });
  }
  res.status(200).json({
    data: result.order,
    ...(notificationSent === undefined ? {} : { notification: notificationSent ? "sent" : "failed" }),
  });
}

export async function markDigitalDelivery(req: Request, res: Response): Promise<void> {
  const { slug: reference } = slugParamSchema.parse({ slug: req.params.reference });
  const input = digitalDeliverySchema.parse(req.body);
  const { order, item } = await sequelize.transaction(async (transaction) => {
    const order = await Order.findOne({
      where: { reference },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!order) throw new HttpError(404, "Order not found.");
    if (order.paymentStatus !== "successful") {
      throw new HttpError(409, "The order must be paid before digital artwork is delivered.");
    }
    if (["cancelled", "refunded"].includes(order.status)) {
      throw new HttpError(409, "Cancelled or refunded orders cannot receive digital delivery.");
    }
    const item = await OrderItem.findOne({
      where: { id: input.itemId, orderId: order.id },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!item) throw new HttpError(404, "Order item not found.");
    if (item.productKind !== "digital") {
      throw new HttpError(400, "Only digital artwork can be marked as delivered here.");
    }
    const deliveryUrl = input.deliveryUrl;
    const changed = item.digitalDeliveryStatus !== "sent" || item.digitalDeliveryUrl !== deliveryUrl;
    await item.update({
      digitalDeliveryStatus: "sent",
      digitalDeliveryUrl: deliveryUrl,
    }, { transaction });
    if (changed) {
      await OrderStatusHistory.create({
        orderId: order.id,
        fromStatus: order.status,
        toStatus: order.status,
        actorUserId: (req as AuthenticatedRequest).user?.id ?? null,
        detail: `Digital artwork delivery marked sent: ${item.title}.`,
      }, { transaction });
    }
    return { order, item };
  });
  const notificationSent = await sendTrackedNotification({
    orderId: order.id,
    idempotencyKey: `digital-delivery:${item.id}`,
    notificationType: "digital_delivery",
    recipient: order.customerEmail,
    send: () => sendDigitalDeliveryNotification({ order, item }),
  });
  res.status(200).json({
    data: item,
    notification: notificationSent ? "sent" : "failed",
  });
}

export async function listNotificationRecipients(_req: Request, res: Response): Promise<void> {
  res.status(200).json({
    data: await NotificationRecipient.findAll({ order: [["email", "ASC"]] }),
  });
}

export async function addNotificationRecipient(req: Request, res: Response): Promise<void> {
  const input = notificationRecipientSchema.parse(req.body);
  const [recipient, created] = await NotificationRecipient.findOrCreate({
    where: { email: input.email.toLowerCase() },
    defaults: { email: input.email.toLowerCase(), active: true },
  });
  if (!created && !recipient.active) await recipient.update({ active: true });
  res.status(created ? 201 : 200).json({ data: recipient });
}

export async function deleteNotificationRecipient(req: Request, res: Response): Promise<void> {
  const { id } = idParamSchema.parse(req.params);
  const recipient = await NotificationRecipient.findByPk(id);
  if (!recipient) throw new HttpError(404, "Notification recipient not found.");
  await recipient.update({ active: false });
  res.status(204).end();
}

export async function listAdminContacts(_req: Request, res: Response): Promise<void> {
  res.status(200).json({
    data: await ContactMessage.findAll({ order: [["createdAt", "DESC"]], limit: 100 }),
  });
}

export async function updateAdminContact(req: Request, res: Response): Promise<void> {
  const { id } = idParamSchema.parse(req.params);
  const { status } = contactStatusSchema.parse(req.body);
  const contact = await ContactMessage.findByPk(id);
  if (!contact) throw new HttpError(404, "Contact message not found.");
  await contact.update({ status });
  res.status(200).json({ data: contact });
}

export async function deleteAdminContact(req: Request, res: Response): Promise<void> {
  const { id } = idParamSchema.parse(req.params);
  const contact = await ContactMessage.findByPk(id);
  if (!contact) throw new HttpError(404, "Contact message not found.");
  await contact.destroy();
  res.status(204).end();
}
