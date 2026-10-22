import { Router } from "express";
import { createOrder, getMyOrder, listMyOrders } from "../controllers/order.controller.js";
import { asyncHandler } from "../utils/async-handler.js";
import { requireAuth, requireUser } from "../middleware/auth.middleware.js";

const router = Router();
router.use(asyncHandler(requireAuth), requireUser);
router.get("/", asyncHandler(listMyOrders));
router.post("/", asyncHandler(createOrder));
router.get("/:reference", asyncHandler(getMyOrder));

export default router;
