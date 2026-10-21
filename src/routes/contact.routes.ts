import { Router } from "express";
import { createContactMessage } from "../controllers/contact.controller.js";
import { asyncHandler } from "../utils/async-handler.js";

const router = Router();
router.post("/", asyncHandler(createContactMessage));

export default router;
