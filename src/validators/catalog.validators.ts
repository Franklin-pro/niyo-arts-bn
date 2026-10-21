import { z } from "zod";

export const productQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  category: z.string().trim().max(80).optional(),
  sort: z.enum(["featured", "price_asc", "price_desc"]).default("featured"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(24),
});

export const slugParamSchema = z.object({
  slug: z.string().trim().min(1).max(160),
});
