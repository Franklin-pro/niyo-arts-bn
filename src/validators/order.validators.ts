import { z } from "zod";

const checkoutItemSchema = z.object({
  productSlug: z.string().trim().min(1).max(160),
  quantity: z.number().int().min(1).max(20),
});

export const createOrderSchema = z.object({
  cartId: z.string().uuid().optional(),
  shippingAddress: z.object({
    address: z.string().trim().min(3).max(240),
    city: z.string().trim().min(2).max(120),
    postcode: z.string().trim().max(30).optional(),
    country: z.string().trim().min(2).max(120),
  }),
  items: z.array(checkoutItemSchema).min(1).max(50).optional(),
  payment: z.discriminatedUnion("method", [
    z.object({
      method: z.literal("mobile_money"),
      provider: z.enum(["MTN Mobile Money", "Airtel Money"]),
      phone: z.string().trim().min(5).max(40),
    }).strict(),
    z.object({
      method: z.literal("card"),
      provider: z.string().trim().max(120).optional(),
    }).strict(),
  ]),
}).strict().refine(
  (input) => input.cartId !== undefined || input.items !== undefined,
  { message: "Provide a cartId or items.", path: ["items"] },
).refine(
  (input) => input.cartId === undefined || input.items === undefined,
  { message: "Provide either cartId or items, but not both.", path: ["cartId"] },
);
