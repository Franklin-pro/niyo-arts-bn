import { v2 as cloudinary } from "cloudinary";
import { HttpError } from "../utils/http-error.js";

export interface UploadedImage {
  imageUrl: string;
  publicId: string;
}

export function uploadImage(
  image: Express.Multer.File,
): Promise<UploadedImage> {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } =
    process.env;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    throw new HttpError(503, "Image uploads are not configured.");
  }

  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure: true,
  });

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: process.env.CLOUDINARY_FOLDER || "niyo-arts",
        resource_type: "image",
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
