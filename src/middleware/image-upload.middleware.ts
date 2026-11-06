import multer from "multer";
import { HttpError } from "../utils/http-error.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 3 },
  fileFilter: (_req, file, callback) => {
    if (
      !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(
        file.mimetype,
      )
    ) {
      callback(
        new HttpError(400, "Only JPEG, PNG, WebP, and GIF images are allowed."),
      );
      return;
    }
    callback(null, true);
  },
});

export const uploadSingleImage = upload.single("image");
export const uploadProductImages = upload.fields([
  { name: "front", maxCount: 1 },
  { name: "right", maxCount: 1 },
  { name: "left", maxCount: 1 },
]);

const pdfUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (
      file.mimetype !== "application/pdf" ||
      !file.originalname.toLowerCase().endsWith(".pdf")
    ) {
      callback(new HttpError(400, "Only PDF menu files are allowed."));
      return;
    }
    callback(null, true);
  },
});

export const uploadSinglePdf = pdfUpload.single("menu");
