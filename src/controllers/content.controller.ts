import { Request, Response } from "express";
import {
  CafeGalleryImage,
  CafeMenu,
  NiyoEvent,
} from "../models/index.js";
import { uploadCafeMenuPdf, uploadImage } from "../services/cloudinary.service.js";
import { HttpError } from "../utils/http-error.js";
import { idParamSchema, niyoEventSchema } from "../validators/admin.validators.js";

const CURRENT_MENU_ID = "current";

export async function getCafeMenu(_req: Request, res: Response): Promise<void> {
  const menu = await CafeMenu.findByPk(CURRENT_MENU_ID);
  if (!menu) throw new HttpError(404, "The cafe menu has not been uploaded yet.");
  res.status(200).json({ data: menu });
}

export async function uploadAdminCafeMenu(
  req: Request,
  res: Response,
): Promise<void> {
  if (!req.file) {
    throw new HttpError(400, "A PDF file is required in the 'menu' field.");
  }
  if (req.file.buffer.subarray(0, 5).toString("ascii") !== "%PDF-") {
    throw new HttpError(400, "The uploaded file is not a valid PDF.");
  }

  const existingMenu = await CafeMenu.findByPk(CURRENT_MENU_ID);
  const uploaded = await uploadCafeMenuPdf(req.file);
  await CafeMenu.upsert({
    id: CURRENT_MENU_ID,
    pdfUrl: uploaded.pdfUrl,
    publicId: uploaded.publicId,
  });
  const menu = await CafeMenu.findByPk(CURRENT_MENU_ID);
  if (!menu) throw new Error("The uploaded cafe menu could not be loaded.");
  res.status(req.method === "POST" && !existingMenu ? 201 : 200).json({ data: menu });
}
export async function listMenu(_req: Request, res: Response): Promise<void> {
  const menus = await CafeMenu.findAll({ order: [["createdAt", "DESC"]] });
  res.status(200).json({ data: menus });
}

export async function listCafeGallery(
  _req: Request,
  res: Response,
): Promise<void> {
  const images = await CafeGalleryImage.findAll({ order: [["createdAt", "DESC"]] });
  res.status(200).json({ data: images });
}

export async function uploadAdminCafeGalleryImage(
  req: Request,
  res: Response,
): Promise<void> {
  if (!req.file) {
    throw new HttpError(400, "An image file is required in the 'image' field.");
  }
  const uploaded = await uploadImage(req.file, "cafe/gallery");
  const image = await CafeGalleryImage.create({
    imageUrl: uploaded.imageUrl,
    publicId: uploaded.publicId,
  });
  res.status(201).json({ data: image });
}

export async function deleteAdminCafeGalleryImage(
  req: Request,
  res: Response,
): Promise<void> {
  const { id } = idParamSchema.parse(req.params);
  const image = await CafeGalleryImage.findByPk(id);
  if (!image) throw new HttpError(404, "Cafe gallery image not found.");
  await image.destroy();
  res.status(204).end();
}

export async function listNiyoEvents(
  _req: Request,
  res: Response,
): Promise<void> {
  const events = await NiyoEvent.findAll({ order: [["createdAt", "DESC"]] });
  res.status(200).json({ data: events });
}

export async function getNiyoEvent(req: Request, res: Response): Promise<void> {
  const { id } = idParamSchema.parse(req.params);
  const event = await NiyoEvent.findByPk(id);
  if (!event) throw new HttpError(404, "Event not found.");
  res.status(200).json({ data: event });
}

export async function createAdminNiyoEvent(
  req: Request,
  res: Response,
): Promise<void> {
  const input = niyoEventSchema.parse(req.body);
  const event = await NiyoEvent.create(input);
  res.status(201).json({ data: event });
}

export async function updateAdminNiyoEvent(
  req: Request,
  res: Response,
): Promise<void> {
  const { id } = idParamSchema.parse(req.params);
  const input = niyoEventSchema.partial().strict().parse(req.body);
  const event = await NiyoEvent.findByPk(id);
  if (!event) throw new HttpError(404, "Event not found.");
  await event.update(Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined),
  ));
  res.status(200).json({ data: event });
}

export async function deleteAdminNiyoEvent(
  req: Request,
  res: Response,
): Promise<void> {
  const { id } = idParamSchema.parse(req.params);
  const event = await NiyoEvent.findByPk(id);
  if (!event) throw new HttpError(404, "Event not found.");
  await event.destroy();
  res.status(204).end();
}
