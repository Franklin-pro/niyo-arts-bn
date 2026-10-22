import { randomBytes, createHash } from "node:crypto";
import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { UniqueConstraintError } from "sequelize";
import { sequelize } from "../config/database.js";
import { User } from "../models/index.js";
import { sendPasswordResetEmail } from "../services/email.service.js";
import { AuthenticatedRequest, issueAccessToken } from "../middleware/auth.middleware.js";
import { HttpError } from "../utils/http-error.js";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from "../validators/auth.validators.js";

function serializeUser(user: User) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
  };
}

export async function register(req: Request, res: Response): Promise<void> {
  const input = registerSchema.parse(req.body);
  const user = await User.create({
    name: input.name,
    email: input.email.toLowerCase(),
    phone: input.phone,
    passwordHash: await bcrypt.hash(input.password, 12),
    role: "user",
    resetTokenHash: null,
    resetTokenExpiresAt: null,
  }).catch((error: unknown) => {
    if (error instanceof UniqueConstraintError) {
      throw new HttpError(409, "An account with this email already exists.");
    }
    throw error;
  });

  res.status(201).json({
    data: { user: serializeUser(user), accessToken: issueAccessToken(user) },
  });
}

export async function login(req: Request, res: Response): Promise<void> {
  const input = loginSchema.parse(req.body);
  const user = await User.findOne({ where: { email: input.email.toLowerCase() } });
  if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
    throw new HttpError(401, "Email or password is incorrect.");
  }
  res.status(200).json({
    data: { user: serializeUser(user), accessToken: issueAccessToken(user) },
  });
}

export async function currentUser(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const user = await User.findByPk(req.user!.id);
  if (!user) throw new HttpError(401, "The account for this token no longer exists.");
  res.status(200).json({ data: serializeUser(user) });
}

export async function forgotPassword(
  req: Request,
  res: Response,
): Promise<void> {
  const { email } = forgotPasswordSchema.parse(req.body);
  const user = await User.findOne({ where: { email: email.toLowerCase() } });
  if (user) {
    const token = randomBytes(32).toString("hex");
    user.resetTokenHash = createHash("sha256").update(token).digest("hex");
    user.resetTokenExpiresAt = new Date(Date.now() + 30 * 60 * 1000);
    await user.save();

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const resetUrl = new URL("/reset-password", frontendUrl);
    resetUrl.searchParams.set("token", token);
    try {
      await sendPasswordResetEmail(user.email, user.name, resetUrl.toString());
    } catch (error) {
      console.error("Failed to send password reset email:", error);
    }
  }
  res.status(200).json({
    message: "If an account exists for that email, password reset instructions will be sent.",
  });
}

export async function resetPassword(
  req: Request,
  res: Response,
): Promise<void> {
  const input = resetPasswordSchema.parse(req.body);
  const tokenHash = createHash("sha256").update(input.token).digest("hex");
  await sequelize.transaction(async (transaction) => {
    const user = await User.findOne({
      where: { resetTokenHash: tokenHash },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!user || !user.resetTokenExpiresAt || user.resetTokenExpiresAt <= new Date()) {
      throw new HttpError(400, "The password reset link is invalid or expired.");
    }
    user.passwordHash = await bcrypt.hash(input.password, 12);
    user.tokenVersion += 1;
    user.resetTokenHash = null;
    user.resetTokenExpiresAt = null;
    await user.save({ transaction });
  });
  res.status(200).json({ message: "Your password has been reset. Please log in." });
}

export async function createBootstrapAdmin(): Promise<void> {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email && !password) return;
  if (!email || !password || password.length < 12) {
    throw new Error("Set both ADMIN_EMAIL and ADMIN_PASSWORD (at least 12 characters) to bootstrap an admin.");
  }
  const existing = await User.findOne({ where: { email } });
  if (existing) {
    if (existing.role !== "admin") {
      existing.role = "admin";
      existing.tokenVersion += 1;
      await existing.save();
    }
    return;
  }
  await User.create({
    name: process.env.ADMIN_NAME?.trim() || "Administrator",
    email,
    phone: null,
    passwordHash: await bcrypt.hash(password, 12),
    role: "admin",
    tokenVersion: 0,
    resetTokenHash: null,
    resetTokenExpiresAt: null,
  });
}
