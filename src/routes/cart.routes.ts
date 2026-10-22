import { Router } from "express";
import {
  addCartItem,
  clearCart,
  createCart,
  deleteCart,
  deleteCartItem,
  getCart,
  updateCartItem,
} from "../controllers/cart.controller.js";
import { asyncHandler } from "../utils/async-handler.js";
import { requireAuth, requireUser } from "../middleware/auth.middleware.js";

const router = Router();
router.use(asyncHandler(requireAuth), requireUser);

router.post("/", asyncHandler(createCart));
router.get("/:cartId", asyncHandler(getCart));
router.delete("/:cartId", asyncHandler(deleteCart));
router.delete("/:cartId/items", asyncHandler(clearCart));
router.post("/:cartId/items", asyncHandler(addCartItem));
router.put("/:cartId/items/:productSlug", asyncHandler(updateCartItem));
router.delete("/:cartId/items/:productSlug", asyncHandler(deleteCartItem));

export default router;
