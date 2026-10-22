import { z } from "zod";

const passwordSchema = z.string().min(8).max(128);

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(160),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().min(5).max(40),
  password: passwordSchema,
}).strict();

export const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(128),
}).strict();

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email().max(254),
}).strict();

export const resetPasswordSchema = z.object({
  token: z.string().min(32).max(256),
  password: passwordSchema,
}).strict();
