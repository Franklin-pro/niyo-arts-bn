import { Response } from "express";
import { Op, Transaction } from "sequelize";
import { sequelize } from "../config/database.js";
import { Artist, Cart, CartItem, Product } from "../models/index.js";
import { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import { HttpError } from "../utils/http-error.js";
import {
  addCartItemSchema,
  cartIdParamSchema,
  cartItemParamSchema,
  updateCartItemSchema,
} from "../validators/cart.validators.js";
import { serializeProduct } from "./catalog.controller.js";

async function findCart(
  cartId: string,
  userId: string,
  transaction?: Transaction,
) {
  const cart = await Cart.findOne({
    where: { id: cartId, userId },
    ...(transaction ? { transaction, lock: transaction.LOCK.UPDATE } : {}),
  });
  if (!cart) throw new HttpError(404, "Cart not found.");
  return cart;
}

async function loadCart(cartId: string, userId: string) {
  const cart = await Cart.findOne({
    where: { id: cartId, userId },
    include: [
      {
        model: CartItem,
        as: "items",
        include: [
          {
            model: Product,
            as: "product",
            where: { isActive: true },
            required: false,
            include: [{ model: Artist, as: "artist", required: true }],
          },
        ],
      },
    ],
    order: [[{ model: CartItem, as: "items" }, "createdAt", "ASC"]],
  });
  if (!cart) throw new HttpError(404, "Cart not found.");
  return cart;
}

function serializeCart(cart: Cart) {
  const items = (cart.items || []).map((item) => {
    const product = item.product?.artist ? serializeProduct(item.product) : null;
    return {
      productSlug: item.productSlug,
      quantity: item.quantity,
      product,
      unavailable: product === null,
    };
  });
  const currencies = (cart.items || [])
    .map((item) => item.product?.currency)
    .filter((currency): currency is string => Boolean(currency));
  const currency = currencies[0] || "USD";
  const subtotalCents = (cart.items || []).reduce((sum, item) => {
    if (!item.product?.artist) return sum;
    return sum + Math.round(Number(item.product.price) * 100) * item.quantity;
  }, 0);

  return {
    id: cart.id,
    items,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    subtotal: subtotalCents / 100,
    currency,
  };
}

async function requireActiveProduct(
  productSlug: string,
  transaction: Transaction,
): Promise<Product> {
  const product = await Product.findOne({
    where: { slug: productSlug, isActive: true },
    transaction,
  });
  if (!product) throw new HttpError(404, "Artwork not found.");
  return product;
}

async function ensureCartCurrency(
  cartId: string,
  product: Product,
  transaction: Transaction,
  excludeSlug?: string,
): Promise<void> {
  const items = await CartItem.findAll({
    where: { cartId, ...(excludeSlug ? { productSlug: { [Op.ne]: excludeSlug } } : {}) },
    include: [{ model: Product, as: "product", required: true }],
    transaction,
  });
  if (items.some((item) => item.product?.currency !== product.currency)) {
    throw new HttpError(400, "A cart cannot contain artwork priced in different currencies.");
  }
}

export async function createCart(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const cart = await Cart.create({ userId: req.user!.id });
  res.status(201).json({
    data: { id: cart.id, items: [], itemCount: 0, subtotal: 0, currency: "USD" },
  });
}

export async function getCart(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const { cartId } = cartIdParamSchema.parse(req.params);
  res.status(200).json({ data: serializeCart(await loadCart(cartId, req.user!.id)) });
}

export async function deleteCart(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const { cartId } = cartIdParamSchema.parse(req.params);
  await sequelize.transaction(async (transaction) => {
    const cart = await findCart(cartId, req.user!.id, transaction);
    await cart.destroy({ transaction });
  });
  res.status(204).end();
}

export async function clearCart(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const { cartId } = cartIdParamSchema.parse(req.params);
  await sequelize.transaction(async (transaction) => {
    const cart = await findCart(cartId, req.user!.id, transaction);
    await CartItem.destroy({ where: { cartId: cart.id }, transaction });
  });
  res.status(200).json({ data: serializeCart(await loadCart(cartId, req.user!.id)) });
}

export async function addCartItem(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const { cartId } = cartIdParamSchema.parse(req.params);
  const input = addCartItemSchema.parse(req.body);
  await sequelize.transaction(async (transaction) => {
    const cart = await findCart(cartId, req.user!.id, transaction);
    const product = await requireActiveProduct(input.productSlug, transaction);
    await ensureCartCurrency(cart.id, product, transaction);
    const existing = await CartItem.findOne({
      where: { cartId: cart.id, productSlug: input.productSlug },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    const quantity = (existing?.quantity || 0) + input.quantity;
    if (quantity > 20) {
      throw new HttpError(400, "A maximum of 20 copies of an artwork may be ordered.");
    }
    if (existing) {
      await existing.update({ quantity }, { transaction });
    } else {
      const itemCount = await CartItem.count({ where: { cartId: cart.id }, transaction });
      if (itemCount >= 50) {
        throw new HttpError(400, "A cart may contain at most 50 different artworks.");
      }
      await CartItem.create(
        { cartId: cart.id, productSlug: input.productSlug, quantity },
        { transaction },
      );
    }
  });
  res.status(200).json({ data: serializeCart(await loadCart(cartId, req.user!.id)) });
}

export async function updateCartItem(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const { cartId, productSlug } = cartItemParamSchema.parse(req.params);
  const { quantity } = updateCartItemSchema.parse(req.body);
  await sequelize.transaction(async (transaction) => {
    const cart = await findCart(cartId, req.user!.id, transaction);
    const product = await requireActiveProduct(productSlug, transaction);
    await ensureCartCurrency(cart.id, product, transaction, productSlug);
    const item = await CartItem.findOne({
      where: { cartId: cart.id, productSlug },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!item) throw new HttpError(404, "Cart item not found.");
    await item.update({ quantity }, { transaction });
  });
  res.status(200).json({ data: serializeCart(await loadCart(cartId, req.user!.id)) });
}

export async function deleteCartItem(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const { cartId, productSlug } = cartItemParamSchema.parse(req.params);
  await sequelize.transaction(async (transaction) => {
    const cart = await findCart(cartId, req.user!.id, transaction);
    const item = await CartItem.findOne({
      where: { cartId: cart.id, productSlug },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!item) throw new HttpError(404, "Cart item not found.");
    await item.destroy({ transaction });
  });
  res.status(200).json({ data: serializeCart(await loadCart(cartId, req.user!.id)) });
}
