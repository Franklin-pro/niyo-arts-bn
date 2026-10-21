import { Request, Response } from "express";
import { ContactMessage } from "../models/index.js";
import { createContactMessageSchema } from "../validators/contact.validators.js";

export async function createContactMessage(
  req: Request,
  res: Response,
): Promise<void> {
  const input = createContactMessageSchema.parse(req.body);
  const message = await ContactMessage.create({
    name: input.name,
    email: input.email.toLowerCase(),
    subject: input.subject || null,
    message: input.message,
  });
  res.status(201).json({
    message: "Your message has been received.",
    data: { id: message.id, status: message.status },
  });
}
