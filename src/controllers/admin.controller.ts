import { Request, Response } from "express";
import {
  Artist,
  Collection,
  ContactMessage,
  Order,
  OrderItem,
  PaymentAttempt,
  Product,
} from "../models/index.js";
import { HttpError } from "../utils/http-error.js";
import {
  artistAdminSchema,
  collectionAdminSchema,
  contactStatusSchema,
  idParamSchema,
  orderStatusSchema,
  productAdminSchema,
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

export async function listAdminOrders(_req: Request, res: Response): Promise<void> {
  const orders = await Order.findAll({
    include: [
      { model: OrderItem, as: "items" },
      { model: PaymentAttempt, as: "paymentAttempts" },
    ],
    order: [["createdAt", "DESC"]],
    limit: 100,
  });
  res.status(200).json({ data: orders });
}

export async function updateAdminOrder(req: Request, res: Response): Promise<void> {
  const { slug: reference } = slugParamSchema.parse({ slug: req.params.reference });
  const { status } = orderStatusSchema.parse(req.body);
  const order = await Order.findOne({ where: { reference } });
  if (!order) throw new HttpError(404, "Order not found.");
  if (["processing", "shipped", "delivered"].includes(status) &&
      order.paymentStatus !== "successful") {
    throw new HttpError(409, "The order must be paid before fulfillment can advance.");
  }
  const nextStatuses: Record<string, string[]> = {
    pending_payment: ["cancelled"],
    processing: ["shipped", "cancelled"],
    shipped: ["delivered", "cancelled"],
    delivered: [],
    cancelled: [],
  };
  if (order.status !== status && !nextStatuses[order.status]?.includes(status)) {
    throw new HttpError(409, `Order cannot move from ${order.status} to ${status}.`);
  }
  await order.update({ status });
  res.status(200).json({ data: order });
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
