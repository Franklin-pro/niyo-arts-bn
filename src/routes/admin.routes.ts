import { Router } from "express";
import {
  createAdminArtist,
  createAdminCollection,
  createAdminProduct,
  deleteAdminArtist,
  deleteAdminCollection,
  deleteAdminContact,
  deleteAdminProduct,
  listAdminArtists,
  listAdminCollections,
  listAdminContacts,
  listAdminOrders,
  listAdminProducts,
  updateAdminArtist,
  updateAdminCollection,
  updateAdminContact,
  updateAdminOrder,
  updateAdminProduct,
} from "../controllers/admin.controller.js";
import { requireAdmin, requireAuth } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

const router = Router();
router.use(asyncHandler(requireAuth), requireAdmin);

router.get("/products", asyncHandler(listAdminProducts));
router.post("/products", asyncHandler(createAdminProduct));
router.put("/products/:slug", asyncHandler(updateAdminProduct));
router.delete("/products/:slug", asyncHandler(deleteAdminProduct));

router.get("/artists", asyncHandler(listAdminArtists));
router.post("/artists", asyncHandler(createAdminArtist));
router.put("/artists/:slug", asyncHandler(updateAdminArtist));
router.delete("/artists/:slug", asyncHandler(deleteAdminArtist));

router.get("/collections", asyncHandler(listAdminCollections));
router.post("/collections", asyncHandler(createAdminCollection));
router.put("/collections/:slug", asyncHandler(updateAdminCollection));
router.delete("/collections/:slug", asyncHandler(deleteAdminCollection));

router.get("/orders", asyncHandler(listAdminOrders));
router.patch("/orders/:reference", asyncHandler(updateAdminOrder));

router.get("/contacts", asyncHandler(listAdminContacts));
router.patch("/contacts/:id", asyncHandler(updateAdminContact));
router.delete("/contacts/:id", asyncHandler(deleteAdminContact));

export default router;
