import { z } from "zod";

export const productAdminSchema = z.object({
  slug: z.string().trim().min(1).max(160),
  title: z.string().trim().min(1).max(200),
  artistId: z.string().uuid(),
  kind: z.enum(["physical", "digital"]).default("physical"),
  type: z.string().trim().min(1).max(120),
  category: z.string().trim().min(1).max(80),
  price: z.number().positive().finite(),
  currency: z.string().trim().regex(/^[A-Za-z]{3}$/).transform((value) => value.toUpperCase()),
  imageUrl: z.string().url(),
  description: z.string().trim().min(1),
  isActive: z.boolean().optional(),
}).strict();

export const artistAdminSchema = z.object({
  slug: z.string().trim().min(1).max(120),
  name: z.string().trim().min(1).max(160),
  location: z.string().trim().min(1).max(120),
  medium: z.string().trim().min(1).max(200),
  bio: z.string().trim().min(1),
  imageUrl: z.preprocess(
    (value) => typeof value === "string" && value.trim() === "" ? undefined : value,
    z.string().url().nullable().optional(),
  ),
}).strict();

export const collectionAdminSchema = z.object({
  slug: z.string().trim().min(1).max(160),
  title: z.string().trim().min(1).max(200),
  line: z.string().trim().min(1).max(240),
  description: z.string().trim().min(1),
  imageUrl: z.string().url(),
  productSlugs: z.array(z.string().trim().min(1).max(160)).max(100),
  displayOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
}).strict();

export const orderStatusSchema = z.object({
  status: z.enum([
    "confirmed",
    "processing",
    "ready_for_shipment",
    "shipped",
    "in_transit",
    "delivered",
    "cancelled",
    "refunded",
  ]),
}).strict();

export const orderNoteSchema = z.object({
  note: z.string().trim().min(1).max(5000),
}).strict();

export const shippingUpdateSchema = z.object({
  trackingNumber: z.string().trim().min(1).max(120).nullable().optional(),
  trackingUrl: z.string().url().max(2048).nullable().optional(),
  shippedAt: z.string().datetime().nullable().optional(),
  shippingNotes: z.string().trim().max(5000).nullable().optional(),
  status: z.enum(["ready_for_shipment", "shipped", "in_transit", "delivered"]).optional(),
}).strict();

export const notificationRecipientSchema = z.object({
  email: z.string().trim().email().max(254),
}).strict();

export const adminOrderQuerySchema = z.object({
  q: z.string().trim().max(160).optional(),
  status: z.enum([
    "pending_payment",
    "confirmed",
    "processing",
    "ready_for_shipment",
    "shipped",
    "in_transit",
    "delivered",
    "cancelled",
    "refunded",
  ]).optional(),
  paymentStatus: z.enum(["pending", "successful", "failed", "refunded"]).optional(),
  from: z.string().date().optional(),
  to: z.string().date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
}).strict();

export const digitalDeliverySchema = z.object({
  itemId: z.string().uuid(),
  deliveryUrl: z.string().url().max(2048).refine(
    (value) => new URL(value).protocol === "https:",
    "The delivery URL must use HTTPS.",
  ),
}).strict();

export const contactStatusSchema = z.object({
  status: z.enum(["new", "read", "replied"]),
}).strict();

export const idParamSchema = z.object({
  id: z.string().uuid(),
});
