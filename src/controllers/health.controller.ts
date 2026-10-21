import { Request, Response } from "express";

export function getHealth(_req: Request, res: Response): void {
  res.status(200).json({
    status: "ok",
    service: "niyo-arts-backend",
    timestamp: new Date().toISOString(),
  });
}
