import { Router } from "express";
import { createOrder } from "../controllers/order.controller.js";
import { asyncHandler } from "../utils/async-handler.js";

const router = Router();
router.post("/", asyncHandler(createOrder));

export default router;
