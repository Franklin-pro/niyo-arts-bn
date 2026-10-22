import { Router } from "express";
import {
  flutterwaveCallback,
  flutterwaveWebhook,
  startFlutterwavePayment,
} from "../controllers/payment.controller.js";
import { requireAuth, requireUser } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

const router = Router();
router.post("/flutterwave/webhook", asyncHandler(flutterwaveWebhook));
router.get("/flutterwave/callback", asyncHandler(flutterwaveCallback));
router.post(
  "/orders/:reference/flutterwave",
  asyncHandler(requireAuth),
  requireUser,
  asyncHandler(startFlutterwavePayment),
);

export default router;
