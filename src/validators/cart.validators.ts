import { z } from "zod";

export const cartIdParamSchema = z.object({
  cartId: z.string().uuid(),
});

export const cartItemParamSchema = cartIdParamSchema.extend({
  productSlug: z.string().trim().min(1).max(160),
});

export const addCartItemSchema = z.object({
  productSlug: z.string().trim().min(1).max(160),
  quantity: z.number().int().min(1).max(20),
}).strict();

export const updateCartItemSchema = z.object({
  quantity: z.number().int().min(1).max(20),
}).strict();
