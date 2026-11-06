import { Router } from "express";
import {
  getCafeMenu,
  getNiyoEvent,
  listCafeGallery,
  listMenu,
  listNiyoEvents,
} from "../controllers/content.controller.js";
import { asyncHandler } from "../utils/async-handler.js";

const router = Router();

router.get("/cafe/menu", asyncHandler(listMenu));
router.get("/cafe/gallery", asyncHandler(listCafeGallery));
router.get("/events", asyncHandler(listNiyoEvents));
router.get("/events/:id", asyncHandler(getNiyoEvent));

export default router;
