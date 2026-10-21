import { Router } from "express";
import {
  getArtist,
  getCollection,
  getProduct,
  listArtists,
  listCollections,
  listProducts,
} from "../controllers/catalog.controller.js";
import { asyncHandler } from "../utils/async-handler.js";

const router = Router();

router.get("/products", asyncHandler(listProducts));
router.get("/products/:slug", asyncHandler(getProduct));
router.get("/artists", asyncHandler(listArtists));
router.get("/artists/:slug", asyncHandler(getArtist));
router.get("/collections", asyncHandler(listCollections));
router.get("/collections/:slug", asyncHandler(getCollection));

export default router;
