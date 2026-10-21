import { NextFunction, Request, Response } from "express";
import { UniqueConstraintError, ValidationError } from "sequelize";
import { ZodError } from "zod";
import { HttpError } from "../utils/http-error.js";

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (error instanceof ZodError) {
    res.status(400).json({
      message: "Request validation failed.",
      errors: error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
    return;
  }
  if (error instanceof HttpError) {
    res.status(error.statusCode).json({ message: error.message });
    return;
  }
  if (error instanceof UniqueConstraintError) {
    res.status(409).json({ message: "A record with that value already exists." });
    return;
  }
  if (error instanceof ValidationError) {
    res.status(400).json({ message: "The submitted data is invalid." });
    return;
  }
  if (
    error instanceof SyntaxError &&
    "status" in error &&
    error.status === 400
  ) {
    res.status(400).json({ message: "Request body contains invalid JSON." });
    return;
  }
  console.error("Unhandled API error:", error);
  res.status(500).json({
    message: "Internal server error",
  });
}
