import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  createOrder,
  getMyOrder,
  listMyOrders,
  trackPublicOrder,
} from "../controllers/order.controller.js";
import { asyncHandler } from "../utils/async-handler.js";
import { optionalAuth, requireAuth, requireUser } from "../middleware/auth.middleware.js";

const router = Router();
router.post(
  "/track",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: "draft-8",
    legacyHeaders: false,
  }),
  asyncHandler(trackPublicOrder),
);
router.post("/", asyncHandler(optionalAuth), asyncHandler(createOrder));
router.use(asyncHandler(requireAuth), requireUser);
router.get("/", asyncHandler(listMyOrders));
router.get("/:reference", asyncHandler(getMyOrder));

export default router;
