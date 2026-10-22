import { z } from "zod";

export const productAdminSchema = z.object({
  slug: z.string().trim().min(1).max(160),
  title: z.string().trim().min(1).max(200),
  artistId: z.string().uuid(),
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
  imageUrl: z.string().url(),
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
  status: z.enum(["processing", "shipped", "delivered", "cancelled"]),
}).strict();

export const contactStatusSchema = z.object({
  status: z.enum(["new", "read", "replied"]),
}).strict();

export const idParamSchema = z.object({
  id: z.string().uuid(),
});
