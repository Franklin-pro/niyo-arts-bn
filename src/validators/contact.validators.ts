import { z } from "zod";

export const createContactMessageSchema = z.object({
  name: z.string().trim().min(2).max(160),
  email: z.string().trim().email().max(254),
  subject: z.string().trim().max(200).optional(),
  message: z.string().trim().min(10).max(5000),
});
