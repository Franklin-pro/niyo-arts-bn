import multer from "multer";
import { HttpError } from "../utils/http-error.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
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
