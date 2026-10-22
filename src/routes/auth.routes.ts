import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  currentUser,
  forgotPassword,
  login,
  register,
  resetPassword,
} from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

const router = Router();
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});

router.post("/register", authRateLimit, asyncHandler(register));
router.post("/login", authRateLimit, asyncHandler(login));
router.post("/forgot-password", authRateLimit, asyncHandler(forgotPassword));
router.post("/reset-password", authRateLimit, asyncHandler(resetPassword));
router.get("/me", asyncHandler(requireAuth), asyncHandler(currentUser));

export default router;
