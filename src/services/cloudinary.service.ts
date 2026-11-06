import { v2 as cloudinary } from "cloudinary";
import { randomUUID } from "node:crypto";
import { HttpError } from "../utils/http-error.js";

export interface UploadedImage {
  imageUrl: string;
  publicId: string;
}

export interface UploadedPdf {
  pdfUrl: string;
  publicId: string;
}

function configureCloudinary(): void {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } =
    process.env;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    throw new HttpError(503, "Cloudinary uploads are not configured.");
  }

  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure: true,
  });
}

export function uploadImage(
  image: Express.Multer.File,
  subfolder?: string,
): Promise<UploadedImage> {
  configureCloudinary();
  const folder = [process.env.CLOUDINARY_FOLDER || "niyo-arts", subfolder]
    .filter(Boolean)
    .join("/");

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
        public_id: randomUUID(),
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }
        if (!result) {
          reject(new Error("Cloudinary did not return an upload result."));
          return;
        }
        resolve({ imageUrl: result.secure_url, publicId: result.public_id });
      },
    );
    stream.end(image.buffer);
  });
}

export function uploadCafeMenuPdf(
  pdf: Express.Multer.File,
): Promise<UploadedPdf> {
  configureCloudinary();
  const folder = [process.env.CLOUDINARY_FOLDER || "niyo-arts", "cafe"]
    .join("/");

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "raw",
        public_id: `menu-${randomUUID()}.pdf`,
        use_filename: false,
        unique_filename: false,
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }
        if (!result) {
          reject(new Error("Cloudinary did not return an upload result."));
          return;
        }
        resolve({ pdfUrl: result.secure_url, publicId: result.public_id });
      },
    );
    stream.end(pdf.buffer);
  });
}
