import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { User } from "../models/index.js";
import { HttpError } from "../utils/http-error.js";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: "user" | "admin";
    email: string;
  };
}

interface AccessTokenPayload {
  sub: string;
  role: "user" | "admin";
  tokenVersion: number;
}

export function issueAccessToken(user: User): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET must be configured.");
  return jwt.sign(
    { role: user.role, tokenVersion: user.tokenVersion },
    secret,
    { subject: user.id, expiresIn: "1h" },
  );
}

export async function requireAuth(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const authorization = req.header("authorization");
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : "";
  if (!token) throw new HttpError(401, "Authentication is required.");

  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET must be configured.");
  let payload: AccessTokenPayload;
  try {
    payload = jwt.verify(token, secret) as AccessTokenPayload;
  } catch {
    throw new HttpError(401, "The access token is invalid or expired.");
  }
  if (typeof payload.sub !== "string") {
    throw new HttpError(401, "The access token is invalid or expired.");
  }

  const user = await User.findByPk(payload.sub);
  if (!user) throw new HttpError(401, "The account for this token no longer exists.");
  if (payload.tokenVersion !== user.tokenVersion) {
    throw new HttpError(401, "The access token is no longer valid.");
  }
  req.user = { id: user.id, role: user.role, email: user.email };
  next();
}

export function requireAdmin(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
): void {
  if (req.user?.role !== "admin") {
    throw new HttpError(403, "Administrator access is required.");
  }
  next();
}

export function requireUser(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
): void {
  if (req.user?.role !== "user") {
    throw new HttpError(403, "A customer account is required for this action.");
  }
  next();
}
