import { Router } from "express";
import {
  adminArtistDetails,
  addAdminOrderNote,
  addNotificationRecipient,
  createAdminArtist,
  createAdminCollection,
  createAdminProduct,
  deleteAdminArtist,
  deleteAdminCollection,
  deleteAdminContact,
  deleteAdminProduct,
  deleteNotificationRecipient,
  getAdminDashboard,
  listAdminArtists,
  listAdminCollections,
  listAdminContacts,
  listAdminOrders,
  getAdminOrder,
  listAdminProducts,
  listNotificationRecipients,
  updateAdminArtist,
  updateAdminCollection,
  updateAdminContact,
  updateAdminOrder,
  updateAdminShipping,
  updateAdminProduct,
  markDigitalDelivery,
  uploadAdminImage,
} from "../controllers/admin.controller.js";
import { requireAdmin, requireAuth } from "../middleware/auth.middleware.js";
import { uploadSingleImage } from "../middleware/image-upload.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

const router = Router();
router.use(asyncHandler(requireAuth), requireAdmin);

router.post("/images", uploadSingleImage, asyncHandler(uploadAdminImage));
router.get("/products", asyncHandler(listAdminProducts));
router.post("/products", asyncHandler(createAdminProduct));
router.put("/products/:slug", asyncHandler(updateAdminProduct));
router.delete("/products/:slug", asyncHandler(deleteAdminProduct));

router.get("/artists", asyncHandler(listAdminArtists));
router.get("/artists/:slug", asyncHandler(adminArtistDetails));
router.post("/artists", asyncHandler(createAdminArtist));
router.put("/artists/:slug", asyncHandler(updateAdminArtist));
router.delete("/artists/:slug", asyncHandler(deleteAdminArtist));

router.get("/collections", asyncHandler(listAdminCollections));
router.post("/collections", asyncHandler(createAdminCollection));
router.put("/collections/:slug", asyncHandler(updateAdminCollection));
router.delete("/collections/:slug", asyncHandler(deleteAdminCollection));

router.get("/dashboard", asyncHandler(getAdminDashboard));
router.get("/orders", asyncHandler(listAdminOrders));
router.get("/orders/:reference", asyncHandler(getAdminOrder));
router.patch("/orders/:reference", asyncHandler(updateAdminOrder));
router.post("/orders/:reference/notes", asyncHandler(addAdminOrderNote));
router.patch("/orders/:reference/shipping", asyncHandler(updateAdminShipping));
router.patch("/orders/:reference/digital-delivery", asyncHandler(markDigitalDelivery));
router.get("/notification-recipients", asyncHandler(listNotificationRecipients));
router.post("/notification-recipients", asyncHandler(addNotificationRecipient));
router.delete("/notification-recipients/:id", asyncHandler(deleteNotificationRecipient));

router.get("/contacts", asyncHandler(listAdminContacts));
router.patch("/contacts/:id", asyncHandler(updateAdminContact));
router.delete("/contacts/:id", asyncHandler(deleteAdminContact));

export default router;
